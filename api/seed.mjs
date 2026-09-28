// Sends mock answers through the same endpoint the onboarding uses.
// `--clear` removes them again (client ids starting with "mock-").
import pg from "pg";
import { levels, suggestedTools, tools } from "../lib/onboarding.mjs";

if (process.argv.includes("--clear")) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { rowCount } = await pool.query(
    "DELETE FROM onboarding_responses WHERE client_id LIKE 'mock-%'",
  );
  console.log(`Removed ${rowCount} mock responses.`);
  await pool.end();
  process.exit(0);
}

const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8787}`;
const total = Number(process.argv[2] || 64);

let seed = 20261002;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const weighted = (weights) => {
  const entries = Object.entries(weights);
  let pick = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) {
    pick -= weight;
    if (pick <= 0) return key;
  }
  return entries[0][0];
};

const roleWeights = { dev: 30, lead: 10, product: 12, design: 7, data: 8, consulting: 9, business: 8, student: 10, other: 6 };
const levelWeights = {
  dev: { curious: 1, weekly: 3, daily: 10, core: 8, agents: 5 },
  lead: { curious: 1, weekly: 3, daily: 7, core: 5, agents: 4 },
  data: { curious: 1, weekly: 2, daily: 8, core: 6, agents: 4 },
  student: { curious: 5, weekly: 7, daily: 6, core: 2, agents: 1 },
  default: { curious: 3, weekly: 6, daily: 7, core: 3, agents: 1 },
};
const topicWeights = {
  dev: { daily: 10, roles: 3, adoption: 2, future: 6, agents: 9, trust: 3 },
  lead: { daily: 5, roles: 6, adoption: 9, future: 5, agents: 5, trust: 4 },
  product: { daily: 4, roles: 10, adoption: 6, future: 4, agents: 3, trust: 2 },
  design: { daily: 4, roles: 10, adoption: 3, future: 6, agents: 2, trust: 2 },
  consulting: { daily: 3, roles: 4, adoption: 10, future: 4, agents: 6, trust: 6 },
  business: { daily: 4, roles: 4, adoption: 10, future: 4, agents: 4, trust: 4 },
  default: { daily: 6, roles: 5, adoption: 5, future: 8, agents: 4, trust: 4 },
};
const questions = [
  "¿Cómo revisáis el código generado por IA sin que se convierta en un cuello de botella?",
  "¿Qué habilidades debería cuidar alguien junior si la IA escribe buena parte del código?",
  "¿Cómo convencéis a dirección de invertir en IA sin prometer humo?",
  "¿Alguien usa agentes en producción? ¿Qué les dejáis hacer y qué no?",
  "¿Cómo medís si la IA de verdad os hace más productivos?",
  "¿Qué hacéis con los datos sensibles? ¿Modelos locales o proveedores con contrato?",
  "Diseñadores abriendo PRs: ¿cómo lo organizáis sin romper nada?",
  "¿Qué flujo usáis para pasar de un prototipo en v0 o Lovable a producto real?",
  "¿Cómo gestionáis el coste de tantas suscripciones y tokens?",
  "¿Cursor, Claude Code o Codex? ¿Qué os funciona para qué?",
  "¿Cómo cambia el rol de PM cuando cualquiera puede prototipar?",
  "¿Qué política de uso de IA tenéis en vuestra empresa?",
];

const otherTools = tools.map((tool) => tool.id);
function mockAnswer(index) {
  const role = weighted(roleWeights);
  const level = weighted(levelWeights[role] ?? levelWeights.default);
  const intensity = levels.findIndex((item) => item.id === level) / (levels.length - 1);
  const picked = new Set();
  suggestedTools[role].forEach((tool, position) => {
    if (random() < 0.92 - position * 0.1 + intensity * 0.18) picked.add(tool);
  });
  const extras = Math.floor(random() * (1 + intensity * 3));
  for (let i = 0; i < extras; i++) {
    picked.add(otherTools[Math.floor(random() * otherTools.length)]);
  }
  if (picked.size === 0) picked.add("chatgpt");
  const priorities = topicWeights[role] ?? topicWeights.default;
  const chosen = Object.keys(priorities)
    .map((id) => ({ id, score: -Math.log(Math.max(random(), Number.EPSILON)) / priorities[id] }))
    .sort((a, b) => a.score - b.score)
    .map(({ id }) => id);
  return {
    clientId: `mock-${String(index).padStart(3, "0")}`,
    role,
    tools: [...picked],
    level,
    topics: chosen,
    question: random() < 0.35 ? questions[Math.floor(random() * questions.length)] : "",
  };
}

let sent = 0;
for (let index = 1; index <= total; index++) {
  const answer = mockAnswer(index);
  const response = await fetch(`${apiUrl}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer),
  });
  if (!response.ok) {
    console.error(`mock-${index}: ${response.status} ${await response.text()}`);
    continue;
  }
  sent++;
}
console.log(`Sent ${sent}/${total} mock responses to ${apiUrl}.`);
