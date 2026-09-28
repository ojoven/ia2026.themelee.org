#!/usr/bin/env node
// Renders video/showreel.html to MP4.
//
//   node video/render.mjs                         full render → video/the-melee-showreel.mp4
//   node video/render.mjs --stills 1.2,4.5,9.9    PNG stills + contact sheet
//   node video/render.mjs --samples 1 --scale .5  fast draft
//
// Each output frame averages --samples sub-frames spread over a 180° shutter,
// which gives true motion blur. The running time comes from video/timeline.json
// and the soundtrack from video/soundtrack.mjs.
import { chromium } from "playwright-core";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = Object.fromEntries(
	process.argv.slice(2).reduce((acc, a, i, all) => {
		if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
		return acc;
	}, []),
);
const fps = Number(args.fps ?? 60);
const samples = Number(args.samples ?? 5);
const shutter = Number(args.shutter ?? 0.5);
const scale = Number(args.scale ?? 1);
const workers = Number(args.workers ?? Math.max(2, Math.min(10, os.cpus().length - 4)));
const out = path.resolve(args.out ?? path.join(root, "video/the-melee-showreel.mp4"));
const framesDir = args.frames ?? (await mkdtemp(path.join(os.tmpdir(), "melee-frames-")));

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
	const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
	if (!file.startsWith(root)) return res.writeHead(403).end();
	try {
		const body = await readFile(file);
		res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(body);
	} catch {
		res.writeHead(404).end();
	}
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/video/showreel.html`;

const launchArgs = ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars"];
let browser;
try {
	browser = await chromium.launch({ args: launchArgs });
} catch {
	browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: launchArgs });
}

async function openPage() {
	const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
	const page = await ctx.newPage();
	page.on("pageerror", (e) => console.error("page error:", e.message));
	await page.goto(url);
	await page.evaluate(() => window.ready);
	const cdp = await ctx.newCDPSession(page);
	return {
		async shot(t, frame, file) {
			await page.evaluate(([t, f]) => window.render(t, f), [t, frame]);
			const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true, captureBeyondViewport: false });
			await writeFile(file, Buffer.from(data, "base64"));
		},
	};
}

function run(cmd, argv) {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, argv, { stdio: ["ignore", "inherit", "inherit"] });
		p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
	});
}

try {
	if (args.stills) {
		const times = args.stills.split(",").map(Number);
		const dir = path.resolve(args.dir ?? path.join(framesDir, "stills"));
		await mkdir(dir, { recursive: true });
		const page = await openPage();
		const files = [];
		for (const t of times) {
			const file = path.join(dir, `t${t.toFixed(3)}.png`);
			await page.shot(t, Math.round(t * fps), file);
			files.push(file);
		}
		const sharp = (await import("sharp")).default;
		const cols = Math.min(4, files.length), w = 480, h = 270;
		const rows = Math.ceil(files.length / cols);
		const tiles = await Promise.all(files.map((f) => sharp(f).resize(w, h).toBuffer()));
		await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#111" } })
			.composite(tiles.map((input, i) => ({ input, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
			.jpeg({ quality: 90 })
			.toFile(path.join(dir, "sheet.jpg"));
		console.log(dir);
	} else {
		const { duration } = JSON.parse(await readFile(path.join(root, "video/timeline.json"), "utf8"));
		const from = Number(args.from ?? 0);
		const to = Number(args.to ?? duration);
		const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
		const jobs = [];
		// one spare frame: the blur filter chain drops the last one
		for (let f = f0; f <= f1; f++)
			for (let k = 0; k < samples; k++)
				jobs.push({ t: (f + (samples > 1 ? (k / samples) * shutter - shutter / 2 + shutter / (2 * samples) : 0)) / fps, f, idx: (f - f0) * samples + k });
		await mkdir(framesDir, { recursive: true });
		console.log(`${f1 - f0} frames × ${samples} samples on ${workers} workers → ${framesDir}`);
		const started = Date.now();
		let next = 0, done = 0;
		const pages = await Promise.all(Array.from({ length: workers }, openPage));
		await Promise.all(
			pages.map(async (page) => {
				while (next < jobs.length) {
					const j = jobs[next++];
					await page.shot(Math.max(0, j.t), j.f, path.join(framesDir, `s${String(j.idx).padStart(6, "0")}.png`));
					if (++done % 200 === 0) process.stdout.write(`\r${done}/${jobs.length}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
				}
			}),
		);
		console.log(`\nrendered in ${((Date.now() - started) / 1000).toFixed(0)}s`);

		const audio = args.audio === "false" ? null : path.resolve(args.audio ?? path.join(framesDir, "soundtrack.wav"));
		if (audio && !args.audio) await run(process.execPath, [path.join(root, "video/soundtrack.mjs"), audio]);
		const vf = [
			samples > 1 ? `tmix=frames=${samples}` : null,
			samples > 1 ? `select='eq(mod(n\\,${samples})\\,${samples - 1})'` : null,
			`setpts=N/${fps}/TB`,
			"scale=out_color_matrix=bt709:out_range=tv",
			"format=yuv420p",
		].filter(Boolean).join(",");
		await run("ffmpeg", [
			"-y", "-loglevel", "error", "-stats",
			"-framerate", String(fps * samples), "-i", path.join(framesDir, "s%06d.png"),
			...(audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio] : []),
			"-vf", vf, "-r", String(fps),
			"-c:v", "libx264", "-preset", "slow", "-crf", String(args.crf ?? 17), "-profile:v", "high", "-tune", "animation",
			"-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
			...(audio ? ["-c:a", "aac", "-b:a", "256k"] : []),
			"-t", String(to - from), "-movflags", "+faststart", out,
		]);
		console.log(out);
		if (!args.frames && !args.keep) await rm(framesDir, { recursive: true, force: true });
	}
} finally {
	await browser.close();
	server.close();
}
