import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(root, ".onboarding-demo");
const stateFile = path.join(stateDir, "processes.json");
const compose = ["compose", "-p", "ia2026-onboarding-demo", "-f", "api/docker-compose.demo.yml"];
const databaseUrl = "postgres://melee_demo:melee_demo@127.0.0.1:5440/melee_demo";
const apiPort = Number(process.env.DEMO_API_PORT || 8788);
const webPort = Number(process.env.DEMO_WEB_PORT || 3001);
if (![apiPort, webPort].every((port) => Number.isInteger(port) && port > 0 && port < 65536)) {
	throw new Error("DEMO_API_PORT and DEMO_WEB_PORT must be valid port numbers");
}
const apiUrl = `http://localhost:${apiPort}`;
const webUrl = `http://localhost:${webPort}`;
const adminKey = process.env.DEMO_ADMIN_KEY || "demo-local";

function run(command, args, env = process.env) {
	const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function runDocker(args) {
	const dockerArgs = [...compose, ...args];
	if (process.env.DEMO_USE_SUDO_DOCKER === "1") {
		run("sudo", ["-n", "docker", ...dockerArgs]);
	} else {
		run("docker", dockerArgs);
	}
}

function readProcesses() {
	try {
		return JSON.parse(readFileSync(stateFile, "utf8"));
	} catch {
		return {};
	}
}

function saveProcesses(processes) {
	mkdirSync(stateDir, { recursive: true });
	writeFileSync(stateFile, JSON.stringify(processes));
}

function stopProcess(pid, expected) {
	if (!Number.isInteger(pid)) return;
	let command;
	try {
		command = readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
	} catch {
		return;
	}
	if (!command.includes(expected)) return;
	try {
		process.kill(-pid, "SIGTERM");
	} catch (error) {
		if (error.code !== "ESRCH") throw error;
	}
}

function stopApps() {
	const processes = readProcesses();
	stopProcess(processes.web, "next/dist/bin/next");
	stopProcess(processes.api, "api/server.mjs");
	if (existsSync(stateFile)) rmSync(stateFile);
}

function stopDatabase() {
	runDocker(["down", "-v", "--remove-orphans"]);
}

function startProcess(args, env, logName) {
	mkdirSync(stateDir, { recursive: true });
	const log = openSync(path.join(stateDir, logName), "a");
	const child = spawn(process.execPath, args, {
		cwd: root,
		env,
		detached: true,
		stdio: ["ignore", log, log],
	});
	closeSync(log);
	if (!child.pid) throw new Error(`Could not start ${logName}`);
	child.unref();
	return child.pid;
}

async function waitFor(url, logName) {
	const deadline = Date.now() + 45_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch {
			// The process may still be starting.
		}
		await new Promise((resolve) => setTimeout(resolve, 350));
	}
	throw new Error(`${url} did not become ready. See ${path.join(stateDir, logName)}`);
}

const mode = process.argv[2];
if (!["empty", "few", "stop"].includes(mode)) {
	console.error("Usage: npm run demo:empty | npm run demo:few | npm run demo:stop");
	process.exit(1);
}

try {
	stopApps();
	if (mode === "stop") {
		stopDatabase();
		console.log("Demo services stopped; only the isolated demo database was removed.");
	} else {
		// Every start uses a new demo volume. The regular api/docker-compose.yml database is untouched.
		stopDatabase();
		await new Promise((resolve) => setTimeout(resolve, 500));
		runDocker(["up", "-d", "--wait"]);

		const api = startProcess(["api/server.mjs"], {
			...process.env,
			DATABASE_URL: databaseUrl,
			PORT: String(apiPort),
			HOST: "127.0.0.1",
			ADMIN_KEY: adminKey,
			ALLOWED_ORIGINS: [webUrl, process.env.DEMO_ALLOWED_ORIGIN].filter(Boolean).join(","),
		}, "api.log");
		saveProcesses({ api });
		await waitFor(`${apiUrl}/stats`, "api.log");

		const web = startProcess(["node_modules/next/dist/bin/next", "dev", "-p", String(webPort), "-H", "127.0.0.1"], {
			...process.env,
			NEXT_DEMO_DIST_DIR: ".next-demo",
			NEXT_PUBLIC_API_URL: apiUrl,
		}, "web.log");
		saveProcesses({ api, web });
		await waitFor(`${webUrl}/app`, "web.log");

		if (mode === "few") {
			run(process.execPath, ["api/seed.mjs", "3"], {
				...process.env,
				DATABASE_URL: databaseUrl,
				API_URL: apiUrl,
			});
		}

		console.log(`Demo mode: ${mode === "few" ? "3 responses" : "0 responses"}`);
		console.log(`Onboarding: ${webUrl}/app`);
		console.log(`Dashboard preview: ${webUrl}/app/dashboard#key=${process.env.DEMO_ADMIN_KEY ? "<DEMO_ADMIN_KEY>" : adminKey}`);
		console.log(`Live: ${webUrl}/live · ${webUrl}/live/screen · ${webUrl}/live/control#key=${process.env.DEMO_ADMIN_KEY ? "<DEMO_ADMIN_KEY>" : adminKey}`);
		console.log("Use npm run demo:empty or npm run demo:few to reset; npm run demo:stop to remove the demo database.");
	}
} catch (error) {
	console.error(error);
	stopApps();
	try {
		stopDatabase();
	} catch (cleanupError) {
		console.error(cleanupError);
	}
	process.exitCode = 1;
}
