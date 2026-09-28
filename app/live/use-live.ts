import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../app/progress";

export type Poll = {
	id: string;
	topic: string | null;
	question: string;
	options: string[];
	multi: boolean;
	max: number | null;
	custom?: boolean;
};
export type LivePoll = Poll & { open: boolean; revealed: boolean };
export type Timer = { total: number; endsAt: number | null; left: number | null };
export type Results = { voters: number; counts?: number[] };
export type LiveState = {
	v: number;
	session: string;
	scene: string;
	topic: string | null;
	message: string;
	timer: Timer | null;
	poll: LivePoll | null;
	results: Results | null;
	online: number;
	now: number;
};

const staleAfterMs = 45_000;

// One EventSource per page. The server always sends the whole state, so a
// reconnect (or a phone waking up) is enough to be correct again.
export function useLive(as: "phone" | "screen" | "control") {
	const [state, setState] = useState<LiveState | null>(null);
	const [connected, setConnected] = useState(false);
	const offset = useRef(0);

	useEffect(() => {
		let source: EventSource | null = null;
		let retry = 0;
		let attempts = 0;
		let lastSeen = Date.now();
		const seen = (serverNow: number) => {
			lastSeen = Date.now();
			if (Number.isFinite(serverNow)) offset.current = serverNow - lastSeen;
		};
		const connect = () => {
			source?.close();
			window.clearTimeout(retry);
			lastSeen = Date.now();
			const current = new EventSource(`${apiUrl}/live/stream?as=${as}`);
			source = current;
			current.onmessage = (event) => {
				const next = JSON.parse(event.data) as LiveState;
				seen(next.now);
				attempts = 0;
				setState(next);
				setConnected(true);
			};
			current.addEventListener("ping", (event) => seen(Number((event as MessageEvent).data)));
			current.onerror = () => {
				setConnected(false);
				// Browsers retry network drops on their own but give up after an
				// HTTP error, such as a 502 from the proxy while the API restarts.
				if (current.readyState === EventSource.CLOSED) {
					retry = window.setTimeout(connect, Math.min(15_000, 1000 * 2 ** attempts++));
				}
			};
		};
		const watchdog = window.setInterval(() => {
			if (Date.now() - lastSeen > staleAfterMs) {
				setConnected(false);
				connect();
			}
		}, 5000);
		const wake = () => {
			if (document.visibilityState === "visible" && Date.now() - lastSeen > 25_000) connect();
		};
		document.addEventListener("visibilitychange", wake);
		window.addEventListener("online", connect);
		connect();
		return () => {
			source?.close();
			window.clearTimeout(retry);
			window.clearInterval(watchdog);
			document.removeEventListener("visibilitychange", wake);
			window.removeEventListener("online", connect);
		};
	}, [as]);

	const serverNow = useCallback(() => Date.now() + offset.current, []);
	return { state, connected, serverNow };
}

// Re-renders on an interval while `active`, for countdowns.
export function useTick(active: boolean, ms = 250) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active) return;
		const id = window.setInterval(() => setTick((tick) => tick + 1), ms);
		return () => window.clearInterval(id);
	}, [active, ms]);
}

export const timeLeft = (timer: Timer, now: number) =>
	timer.endsAt !== null ? timer.endsAt - now : (timer.left ?? 0);

export function formatClock(ms: number) {
	const over = ms < 0;
	const seconds = over ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
	return `${over ? "+" : ""}${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
export const letters = "ABCDEFG";

export class CommandError extends Error {
	constructor(
		public status: number,
		public code: string,
	) {
		super(code);
	}
}

export async function sendCommand(key: string, body: Record<string, unknown>) {
	let response: Response;
	try {
		response = await fetch(`${apiUrl}/live/command`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
			body: JSON.stringify(body),
		});
	} catch {
		throw new CommandError(0, "network");
	}
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) throw new CommandError(response.status, payload.error ?? "unknown");
	return payload;
}

const storageKey = "melee-ia2026-live";
type Stored = { clientId: string; votes: Record<string, number[]> };

const newClientId = () =>
	globalThis.crypto?.randomUUID?.() ??
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// Its own random id, not the onboarding one, so votes stay anonymous.
export function loadVoter(): Stored {
	try {
		const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Stored | null;
		if (saved?.clientId) return { clientId: saved.clientId, votes: saved.votes ?? {} };
	} catch {
		// Fall through to a fresh id.
	}
	const fresh = { clientId: newClientId(), votes: {} };
	saveVoter(fresh);
	return fresh;
}

export function saveVoter(stored: Stored) {
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(stored));
	} catch {
		// Private browsing can block storage; the vote still counts for this visit.
	}
}

export async function sendVote(pollId: string, clientId: string, choices: number[]) {
	let response: Response;
	try {
		response = await fetch(`${apiUrl}/live/vote`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ pollId, clientId, choices }),
		});
	} catch {
		throw new CommandError(0, "network");
	}
	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new CommandError(response.status, payload.error ?? "unknown");
	}
}
