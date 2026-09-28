import http from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import pg from "pg";
import {
  customToolPrefix,
  levels,
  maxCustomToolLength,
  maxCustomTools,
  maxNameLength,
  maxQuestionLength,
  maxTopics,
  roles,
  tools,
  topics,
} from "../lib/onboarding.mjs";
import { createLive } from "./live.mjs";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const adminKey = process.env.ADMIN_KEY || "";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));

const roleIds = new Set(roles.map((role) => role.id));
const toolIds = new Set(tools.map((tool) => tool.id));
const levelIds = new Set(levels.map((level) => level.id));
const topicIds = new Set(topics.map((topic) => topic.id));

const isSubset = (value, allowed, max) =>
  Array.isArray(value) &&
  value.length <= max &&
  new Set(value).size === value.length &&
  value.every((item) => allowed.has(item));

const validTools = (picked) => {
  if (!Array.isArray(picked) || picked.length > toolIds.size + maxCustomTools) return false;
  const custom = picked.filter((id) => typeof id === "string" && id.startsWith(customToolPrefix));
  if (custom.length > maxCustomTools) return false;
  if (new Set(picked.map((id) => typeof id === "string" ? id.toLocaleLowerCase("es") : id)).size !== picked.length) return false;
  return picked.every((id) => {
    if (toolIds.has(id)) return true;
    if (typeof id !== "string" || !id.startsWith(customToolPrefix)) return false;
    const name = id.slice(customToolPrefix.length);
    return name.length > 0 && name.length <= maxCustomToolLength &&
      name.trim() === name && !/[\x00-\x1f\x7f]/.test(name) &&
      !tools.some((tool) => tool.label.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
  });
};

function parseResponse(body) {
  const { clientId, name, role, tools: picked, level, topics: chosen, question } = body ?? {};
  if (typeof clientId !== "string" || !/^[\w-]{8,64}$/.test(clientId)) return null;
  if (name != null && (typeof name !== "string" || name.length > maxNameLength)) return null;
  if (!roleIds.has(role) || !levelIds.has(level)) return null;
  if (!validTools(picked)) return null;
  if (!isSubset(chosen, topicIds, maxTopics) || chosen.length === 0) return null;
  if (question != null && typeof question !== "string") return null;
  const trimmed = (question ?? "").trim().slice(0, maxQuestionLength);
  return { clientId, name: name?.trim() || null, role, tools: picked, level, topics: chosen, question: trimmed || null };
}

const count = (target, key) => {
  target[key] = (target[key] ?? 0) + 1;
};

async function stats() {
  const { rows } = await pool.query(
    "SELECT role, tools, level, topics FROM onboarding_responses",
  );
  const result = {
    total: rows.length,
    roles: {},
    levels: {},
    topics: {},
    tools: {},
    toolsByRole: {},
    toolSelections: 0,
    updatedAt: new Date().toISOString(),
  };
  for (const row of rows) {
    count(result.roles, row.role);
    count(result.levels, row.level);
    row.topics.forEach((topic, index) => {
      result.topics[topic] = (result.topics[topic] ?? 0) + maxTopics - index;
    });
    result.toolsByRole[row.role] ??= {};
    for (const tool of row.tools) {
      count(result.tools, tool);
      count(result.toolsByRole[row.role], tool);
    }
    result.toolSelections += row.tools.length;
  }
  return result;
}

function isAdmin(request) {
  const given = Buffer.from(
    (request.headers.authorization ?? "").replace(/^Bearer /, ""),
  );
  const expected = Buffer.from(adminKey);
  return (
    adminKey.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(given, expected)
  );
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) throw new Error("payload too large");
  }
  return JSON.parse(raw);
}

function send(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

const handleLive = await createLive({ pool, isAdmin, readJson, send });

http
  .createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    const { pathname } = url;
    try {
      if (await handleLive(request, response, url)) return;
      if (request.method === "POST" && pathname === "/responses") {
        let body;
        try {
          body = await readJson(request);
        } catch {
          return send(response, 400, { error: "invalid_body" });
        }
        const answer = parseResponse(body);
        if (!answer) return send(response, 400, { error: "invalid_answers" });
        await pool.query(
          `INSERT INTO onboarding_responses (client_id, name, role, tools, level, topics, question)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (client_id) DO UPDATE SET
             name = EXCLUDED.name, role = EXCLUDED.role, tools = EXCLUDED.tools, level = EXCLUDED.level,
             topics = EXCLUDED.topics, question = EXCLUDED.question,
             updated_at = now()`,
          [answer.clientId, answer.name, answer.role, answer.tools, answer.level, answer.topics, answer.question],
        );
        return send(response, 200, { ok: true });
      }
      if (request.method === "GET" && pathname === "/stats") {
        return send(response, 200, await stats());
      }
      if (request.method === "GET" && pathname === "/responses") {
        if (!isAdmin(request)) return send(response, 401, { error: "unauthorized" });
        const { rows } = await pool.query(
          `SELECT id, name, role, tools, level, topics, question, created_at, updated_at
           FROM onboarding_responses ORDER BY created_at DESC`,
        );
        return send(response, 200, { responses: rows });
      }
      send(response, 404, { error: "not_found" });
    } catch (error) {
      console.error(error);
      if (!response.headersSent) send(response, 500, { error: "server_error" });
    }
  })
  .listen(port, host, () => console.log(`Onboarding and live API on http://${host}:${port}`));
