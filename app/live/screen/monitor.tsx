"use client";

import { useEffect, useState } from "react";
import { LiveScreen } from "../screen-view";
import { useLive } from "../use-live";

const themeKey = "melee-ia2026-screen-theme";

export function Monitor() {
	const { state, connected, serverNow } = useLive("screen");
	const [origin, setOrigin] = useState("");
	const [dark, setDark] = useState(false);
	const [idle, setIdle] = useState(false);
	const [hint, setHint] = useState(true);

	useEffect(() => {
		setOrigin(window.location.origin);
		try {
			setDark(window.localStorage.getItem(themeKey) === "dark");
		} catch {
			// Storage can be blocked; light is the default.
		}
		const hideHint = window.setTimeout(() => setHint(false), 8000);

		const toggleFullscreen = () => {
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
			else document.documentElement.requestFullscreen().catch(() => {});
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key === "f") toggleFullscreen();
			if (event.key === "d") {
				setDark((current) => {
					try {
						window.localStorage.setItem(themeKey, current ? "light" : "dark");
					} catch {
						// Only this visit keeps the choice.
					}
					return !current;
				});
			}
		};

		let idleTimer = 0;
		const onMove = () => {
			setIdle(false);
			window.clearTimeout(idleTimer);
			idleTimer = window.setTimeout(() => setIdle(true), 2500);
		};

		// Keep the laptop driving the projector from sleeping mid-session.
		let lock: WakeLockSentinel | null = null;
		const keepAwake = () => {
			if (document.visibilityState !== "visible") return;
			navigator.wakeLock
				?.request("screen")
				.then((sentinel) => {
					lock = sentinel;
				})
				.catch(() => {});
		};

		window.addEventListener("keydown", onKey);
		window.addEventListener("dblclick", toggleFullscreen);
		window.addEventListener("mousemove", onMove);
		document.addEventListener("visibilitychange", keepAwake);
		keepAwake();
		onMove();
		return () => {
			window.clearTimeout(hideHint);
			window.clearTimeout(idleTimer);
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("dblclick", toggleFullscreen);
			window.removeEventListener("mousemove", onMove);
			document.removeEventListener("visibilitychange", keepAwake);
			lock?.release().catch(() => {});
		};
	}, []);

	return (
		<main className={`ls-page ${idle ? "is-idle" : ""}`}>
			<LiveScreen
				state={state}
				connected={connected}
				serverNow={serverNow}
				origin={origin}
				theme={dark ? "dark" : "light"}
			/>
			{hint && (
				<p className="ls-keys">
					<kbd>F</kbd> pantalla completa · <kbd>D</kbd> modo oscuro
				</p>
			)}
		</main>
	);
}
