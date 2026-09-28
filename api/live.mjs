// Live session: one state object that the operator changes and every screen
// receives in full over Server-Sent Events. Votes are written through to
// PostgreSQL and kept in memory so results never need a query.
import { topics } from "../lib/onboarding.mjs";
import {
  maxMessageLength,
  maxPollOptionLength,
  maxPollOptions,
  maxPollQuestionLength,
  minPollOptions,
  polls as preparedPolls,
  scenes,
} from "../lib/live.mjs";

const sceneIds = new Set(scenes.map((scene) => scene.id));
const topicIds = new Set(topics.map((topic) => topic.id));
const clientIdPattern = /^[\w-]{8,64}$/;
const maxClients = 2000;
const heartbeatMs = 20_000;
const throttleMs = 400;
const maxTimerSeconds = 3 * 60 * 60;

// `session` changes on reset so phones forget votes they remember locally.
const initialState = () => ({
  v: 0,
  session: Date.now().toString(36),
  scene: "welcome",
  topic: null,
  message: "",
  timer: null,
  poll: null,
});

const cleanText = (value) =>
  typeof value === "string" && !/[\x00-\x1f\x7f]/.test(value)
    ? value.trim().replace(/\s+/g, " ")
    : null;

const normalize = (poll) => ({
  id: poll.id,
  topic: poll.topic ?? null,
  question: poll.question,
  options: poll.options,
  multi: !!poll.multi,
  max: poll.max ?? null,
});

const fromRow = (row) => ({
  ...normalize({
    id: `c${row.id}`,
    topic: row.topic,
    question: row.question,
    options: row.options,
    multi: row.multi,
    max: row.max_choices,
  }),
  custom: true,
});

function parsePoll(body) {
  const question = cleanText(body?.question);
  if (!question || question.length > maxPollQuestionLength) return null;
  if (!Array.isArray(body.options)) return null;
  const options = body.options.map(cleanText);
  if (options.length < minPollOptions || options.length > maxPollOptions) return null;
  if (options.some((option) => !option || option.length > maxPollOptionLength)) return null;
  if (new Set(options.map((option) => option.toLocaleLowerCase("es"))).size !== options.length) return null;
  const topic = body.topic ?? null;
  if (topic !== null && !topicIds.has(topic)) return null;
  const multi = body.multi === true;
  const max =
    multi && Number.isInteger(body.max) && body.max >= 2 && body.max < options.length ? body.max : null;
  return { topic, question, options, multi, max };
}

const validChoices = (choices, poll) =>
  Array.isArray(choices) &&
  choices.length >= 1 &&
  (poll.multi || choices.length === 1) &&
  (!poll.max || choices.length <= poll.max) &&
  new Set(choices).size === choices.length &&
  choices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice < poll.options.length);

export async function createLive({ pool, isAdmin, readJson, send }) {
  const catalogue = new Map(preparedPolls.map((poll) => [poll.id, normalize(poll)]));
  const custom = await pool.query(
    "SELECT id, topic, question, options, multi, max_choices FROM live_polls ORDER BY id",
  );
  for (const row of custom.rows) catalogue.set(`c${row.id}`, fromRow(row));

  // pollId -> Map(clientId -> choices)
  const votes = new Map();
  const ballotsFor = (pollId) => {
    if (!votes.has(pollId)) votes.set(pollId, new Map());
    return votes.get(pollId);
  };
  const stored = await pool.query("SELECT poll_id, client_id, choices FROM live_votes");
  for (const row of stored.rows) ballotsFor(row.poll_id).set(row.client_id, row.choices);

  const saved = await pool.query("SELECT state FROM live_state WHERE id = 1");
  let state = { ...initialState(), ...saved.rows[0]?.state };

  const clients = new Map();
  let phones = 0;
  let pending = null;
  let saving = Promise.resolve();

  function tally(poll) {
    const counts = Array(poll.options.length).fill(0);
    const ballots = votes.get(poll.id);
    for (const choices of ballots?.values() ?? []) {
      for (const choice of choices) if (choice < counts.length) counts[choice]++;
    }
    return { voters: ballots?.size ?? 0, counts };
  }

  // Counts stay private until the operator reveals them, so the room doesn't herd.
  function snapshot() {
    const results = state.poll && tally(state.poll);
    return JSON.stringify({
      ...state,
      online: phones,
      now: Date.now(),
      results: results && (state.poll.revealed ? results : { voters: results.voters }),
    });
  }

  function broadcast() {
    clearTimeout(pending);
    pending = null;
    const frame = `data: ${snapshot()}\n\n`;
    for (const client of clients.keys()) {
      if (client.writableLength > 1 << 20) client.destroy();
      else client.write(frame);
    }
  }

  const scheduleBroadcast = () => {
    pending ??= setTimeout(broadcast, throttleMs);
  };

  function persist() {
    const json = JSON.stringify(state);
    saving = saving
      .then(() =>
        pool.query(
          `INSERT INTO live_state (id, state, updated_at) VALUES (1, $1, now())
           ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
          [json],
        ),
      )
      .catch((error) => console.error(error));
  }

  setInterval(() => {
    const frame = `event: ping\ndata: ${Date.now()}\n\n`;
    for (const client of clients.keys()) client.write(frame);
  }, heartbeatMs).unref();

  function stream(request, response, kind) {
    if (clients.size >= maxClients) return send(response, 503, { error: "busy" });
    request.socket.setNoDelay(true);
    request.socket.setKeepAlive(true);
    // no-transform keeps proxies (Apache mod_deflate) from buffering the stream.
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    clients.set(response, kind);
    if (kind === "phone") {
      phones++;
      scheduleBroadcast();
    }
    response.write(`retry: 3000\ndata: ${snapshot()}\n\n`);
    response.on("close", () => {
      clients.delete(response);
      if (kind === "phone") {
        phones--;
        scheduleBroadcast();
      }
    });
  }

  async function vote(body) {
    const { pollId, clientId, choices } = body ?? {};
    if (typeof clientId !== "string" || !clientIdPattern.test(clientId)) return [400, { error: "invalid_client" }];
    const poll = state.poll;
    if (!poll || poll.id !== pollId) return [409, { error: "poll_changed" }];
    if (!poll.open) return [409, { error: "poll_closed" }];
    if (!validChoices(choices, poll)) return [400, { error: "invalid_choices" }];
    const sorted = [...choices].sort((a, b) => a - b);
    await pool.query(
      `INSERT INTO live_votes (poll_id, client_id, choices) VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, client_id) DO UPDATE SET choices = EXCLUDED.choices, updated_at = now()`,
      [poll.id, clientId, sorted],
    );
    ballotsFor(poll.id).set(clientId, sorted);
    scheduleBroadcast();
    return [200, { ok: true }];
  }

  const invalid = [400, { error: "invalid_command" }];

  // Returns [status, payload]. Commands that change the shared state fall
  // through to the version bump, persistence and immediate broadcast below.
  async function command(body) {
    const now = Date.now();
    switch (body?.action) {
      case "scene": {
        if (!sceneIds.has(body.scene)) return invalid;
        if (body.scene === "poll" && !state.poll) return [409, { error: "no_poll" }];
        if (body.message !== undefined) {
          const message = cleanText(body.message);
          if (message === null || message.length > maxMessageLength) return invalid;
          state.message = message;
        }
        state.scene = body.scene;
        break;
      }
      case "topic": {
        if (body.topic !== null && !topicIds.has(body.topic)) return invalid;
        state.topic = body.topic;
        if (body.topic) state.scene = "topic";
        else if (state.scene === "topic") state.scene = "welcome";
        break;
      }
      case "timer": {
        const timer = state.timer;
        const seconds = body.seconds;
        if (body.op === "start") {
          if (!Number.isInteger(seconds) || seconds <= 0 || seconds > maxTimerSeconds) return invalid;
          state.timer = { total: seconds * 1000, endsAt: now + seconds * 1000, left: null };
        } else if (body.op === "add") {
          if (!timer || !Number.isInteger(seconds) || Math.abs(seconds) > maxTimerSeconds) return invalid;
          const ms = seconds * 1000;
          state.timer = {
            total: Math.max(1000, timer.total + ms),
            endsAt: timer.endsAt === null ? null : timer.endsAt + ms,
            left: timer.left === null ? null : timer.left + ms,
          };
        } else if (body.op === "pause") {
          if (timer?.endsAt == null) return [409, { error: "not_running" }];
          state.timer = { ...timer, endsAt: null, left: timer.endsAt - now };
        } else if (body.op === "resume") {
          if (timer?.left == null) return [409, { error: "not_paused" }];
          state.timer = { ...timer, endsAt: now + timer.left, left: null };
        } else if (body.op === "clear") {
          state.timer = null;
        } else {
          return invalid;
        }
        break;
      }
      case "poll.launch": {
        const poll = catalogue.get(body.pollId) ?? (state.poll?.id === body.pollId ? state.poll : null);
        if (!poll) return [404, { error: "unknown_poll" }];
        // Defaults open voting; the panel also relaunches old polls closed to show their results.
        state.poll = { ...normalize(poll), open: body.open !== false, revealed: body.revealed === true };
        state.scene = "poll";
        break;
      }
      case "poll.update": {
        if (!state.poll) return [409, { error: "no_poll" }];
        for (const key of ["open", "revealed"]) {
          if (body[key] === undefined) continue;
          if (typeof body[key] !== "boolean") return invalid;
          state.poll = { ...state.poll, [key]: body[key] };
        }
        break;
      }
      case "poll.clear": {
        state.poll = null;
        if (state.scene === "poll") state.scene = state.topic ? "topic" : "welcome";
        break;
      }
      case "poll.create": {
        const poll = parsePoll(body.poll);
        if (!poll) return invalid;
        const { rows } = await pool.query(
          `INSERT INTO live_polls (topic, question, options, multi, max_choices)
           VALUES ($1, $2, $3, $4, $5) RETURNING id, topic, question, options, multi, max_choices`,
          [poll.topic, poll.question, poll.options, poll.multi, poll.max],
        );
        const created = fromRow(rows[0]);
        catalogue.set(created.id, created);
        return [200, { poll: created }];
      }
      case "poll.delete": {
        const poll = catalogue.get(body.pollId);
        if (!poll?.custom) return [404, { error: "unknown_poll" }];
        if (state.poll?.id === poll.id) return [409, { error: "poll_live" }];
        await pool.query("DELETE FROM live_votes WHERE poll_id = $1", [poll.id]);
        await pool.query("DELETE FROM live_polls WHERE id = $1", [poll.id.slice(1)]);
        catalogue.delete(poll.id);
        votes.delete(poll.id);
        return [200, { ok: true }];
      }
      case "reset": {
        await pool.query("DELETE FROM live_votes");
        votes.clear();
        state = { ...initialState(), v: state.v };
        break;
      }
      default:
        return invalid;
    }
    state.v++;
    persist();
    broadcast();
    return [200, { ok: true }];
  }

  function adminView() {
    const results = {};
    for (const pollId of votes.keys()) {
      const poll = catalogue.get(pollId);
      if (poll) results[pollId] = tally(poll);
    }
    if (state.poll) results[state.poll.id] = tally(state.poll);
    return { polls: [...catalogue.values()].filter((poll) => poll.custom), results };
  }

  async function withBody(request, response, handler) {
    let body;
    try {
      body = await readJson(request);
    } catch {
      return send(response, 400, { error: "invalid_body" });
    }
    const [status, payload] = await handler(body);
    send(response, status, payload);
  }

  return async function handleLive(request, response, url) {
    const { pathname } = url;
    if (request.method === "GET" && pathname === "/live/stream") {
      stream(request, response, url.searchParams.get("as") === "phone" ? "phone" : "other");
      return true;
    }
    if (request.method === "POST" && pathname === "/live/vote") {
      await withBody(request, response, vote);
      return true;
    }
    if (pathname === "/live/admin" || pathname === "/live/command") {
      if (!isAdmin(request)) {
        send(response, 401, { error: "unauthorized" });
        return true;
      }
      if (request.method === "GET" && pathname === "/live/admin") {
        send(response, 200, adminView());
        return true;
      }
      if (request.method === "POST" && pathname === "/live/command") {
        await withBody(request, response, command);
        return true;
      }
    }
    return false;
  };
}
