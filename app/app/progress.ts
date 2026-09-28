import { useEffect, useRef, useState } from "react";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const storageKey = "melee-ia2026-onboarding";

export type Answers = {
	name: string;
	role: string | null;
	tools: string[];
	level: string | null;
	topics: string[];
	question: string;
};

export type Saved = {
	clientId: string;
	answers: Answers;
	completed: boolean;
	exploredMore?: boolean;
};

export const emptyAnswers: Answers = {
	name: "",
	role: null,
	tools: [],
	level: null,
	topics: [],
	question: "",
};

export function useCountUp(target: number) {
	const [value, setValue] = useState(target);
	const current = useRef(target);
	useEffect(() => {
		const start = current.current;
		if (start === target) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			current.current = target;
			setValue(target);
			return;
		}
		const startedAt = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / 650);
			current.current = Math.round(start + (target - start) * (1 - (1 - progress) ** 3));
			setValue(current.current);
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target]);
	return value;
}

export function loadSaved(): Saved | null {
	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return null;
		const saved = JSON.parse(raw) as Saved;
		return { ...saved, answers: { ...emptyAnswers, ...saved.answers } };
	} catch {
		return null;
	}
}

export function save(saved: Saved) {
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(saved));
	} catch {
		// Private browsing can block storage; the flow still works for this visit.
	}
}
