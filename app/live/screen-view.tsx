"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { event } from "@/lib/event.mjs";
import { pollHint, topicDetails } from "@/lib/live.mjs";
import { roles, topics } from "@/lib/onboarding.mjs";
import { allocateSeats, ranked, roleColors, type Stats } from "../app/dashboard/dashboard";
import { topicIcons } from "../app/icons";
import { apiUrl, useCountUp } from "../app/progress";
import { QrCode } from "./qr-code";
import {
	formatClock,
	letters,
	type LivePoll,
	type LiveState,
	pct,
	type Timer,
	timeLeft,
	useTick,
} from "./use-live";

const details: Record<string, string> = topicDetails;
const labelOf = (list: { id: string; label: string }[], id: string | null) =>
	list.find((item) => item.id === id)?.label ?? "";

// Sized with container query units, so the same markup fills the projector
// and the small preview in the control panel.
export function LiveScreen({
	state,
	connected,
	serverNow,
	origin,
	theme = "light",
}: {
	state: LiveState | null;
	connected: boolean;
	serverNow: () => number;
	origin: string;
	theme?: "light" | "dark";
}) {
	const sceneKey = state
		? `${state.scene}:${state.scene === "poll" ? state.poll?.id : state.scene === "topic" ? state.topic : ""}`
		: "loading";
	return (
		<div className="ls" data-theme={theme}>
			<div className="ls-frame">
				<header className="ls-top">
					<span className="ls-brand">
						<Image src="/images/logo.webp" alt="" width={42} height={42} />
						<span>
							the mêlée<span className="brand-dot">.</span>
						</span>
					</span>
					{state?.timer && <Clock timer={state.timer} serverNow={serverNow} />}
				</header>
				<div className="ls-body" key={sceneKey}>
					{state ? <Scene state={state} origin={origin} /> : <p className="ls-waiting">Conectando…</p>}
				</div>
				{state && !connected && <p className="ls-offline">Reconectando…</p>}
			</div>
		</div>
	);
}

function Scene({ state, origin }: { state: LiveState; origin: string }) {
	if (state.scene === "circle") return <CircleScene />;
	if (state.scene === "topic") return <TopicScene state={state} origin={origin} />;
	if (state.scene === "poll" && state.poll) return <PollScene poll={state.poll} state={state} origin={origin} />;
	if (state.scene === "message") return <MessageScene message={state.message} />;
	return <WelcomeScene online={state.online} origin={origin} />;
}

function Clock({ timer, serverNow }: { timer: Timer; serverNow: () => number }) {
	useTick(timer.endsAt !== null);
	const left = timeLeft(timer, serverNow());
	const tone = left < 0 ? "is-over" : left <= 60_000 ? "is-low" : "";
	return (
		<div className={`ls-clock ${tone} ${timer.endsAt === null ? "is-paused" : ""}`} role="timer">
			<Icon name="clock" />
			<strong>{formatClock(left)}</strong>
			<span className="ls-clock-bar" aria-hidden="true">
				<span style={{ transform: `scaleX(${Math.max(0, Math.min(1, left / timer.total))})` }} />
			</span>
		</div>
	);
}

function JoinCard({ origin, online }: { origin: string; online: number }) {
	if (!origin) return null;
	return (
		<div className="ls-join">
			<QrCode value={`${origin}/live`} className="ls-qr" />
			<p className="ls-join-title">Participa desde tu móvil</p>
			<p className="ls-join-url">{new URL(origin).host}/live</p>
			{online > 0 && (
				<p className="ls-join-online">
					<span className="ls-dot" /> {online} {online === 1 ? "móvil conectado" : "móviles conectados"}
				</p>
			)}
		</div>
	);
}

function WelcomeScene({ online, origin }: { online: number; origin: string }) {
	return (
		<div className="ls-welcome">
			<div>
				<p className="ls-eyebrow">EN DIRECTO · {event.date.toUpperCase()}</p>
				<h1 className="ls-hero">
					IA, desarrollo
					<br />
					<span>y producto.</span>
				</h1>
				<p className="ls-lead">{event.venue}</p>
			</div>
			<JoinCard origin={origin} online={online} />
		</div>
	);
}

function CircleScene() {
	const [stats, setStats] = useState<Stats | null>(null);
	useEffect(() => {
		let alive = true;
		const load = () =>
			fetch(`${apiUrl}/stats`)
				.then((response) => (response.ok ? response.json() : null))
				.then((next) => alive && next && setStats(next))
				.catch(() => {});
		load();
		const id = window.setInterval(load, 30_000);
		return () => {
			alive = false;
			window.clearInterval(id);
		};
	}, []);

	if (!stats) return <p className="ls-waiting">Dibujando el mapa del círculo…</p>;
	if (stats.total === 0) {
		return (
			<div className="ls-center">
				<p className="ls-eyebrow">EL MAPA DEL CÍRCULO</p>
				<h1 className="ls-title">
					Todavía no hay <span>respuestas.</span>
				</h1>
			</div>
		);
	}
	const seats = allocateSeats(stats.roles, stats.total);
	const topicRanking = ranked(stats.topics);
	const topicMax = topicRanking[0]?.[1] ?? 0;
	return (
		<div className="ls-circle">
			<div className="ls-ring" role="img" aria-label="Reparto de perfiles del círculo">
				{seats.map((role, i) => (
					<span
						key={i}
						className="ls-seat"
						style={{
							background: roleColors[role],
							transform: `rotate(${(i * 360) / seats.length}deg) translateY(calc(-1 * var(--ring-radius)))`,
						}}
					/>
				))}
				<div className="ls-ring-center">
					<strong>{stats.total}</strong>
					<span>personas</span>
				</div>
			</div>
			<div>
				<p className="ls-eyebrow">EL MAPA DEL CÍRCULO</p>
				<h1 className="ls-title">
					Así viene <span>el círculo.</span>
				</h1>
				<div className="ls-circle-lists">
					<ul className="ls-legend">
						{ranked(stats.roles)
							.slice(0, 6)
							.map(([role, count]) => (
								<li key={role}>
									<span className="ls-swatch" style={{ background: roleColors[role] }} />
									<span>{labelOf(roles, role)}</span>
									<strong>{pct(count, stats.total)}%</strong>
								</li>
							))}
					</ul>
					<div>
						<p className="ls-list-title">Los temas que van primero</p>
						<ol className="ls-ranking">
							{topicRanking.map(([id, points], i) => (
								<li key={id}>
									<span className="ls-rank">{String(i + 1).padStart(2, "0")}</span>
									<span>{labelOf(topics, id)}</span>
									<span className="ls-bar">
										<span style={{ width: `${pct(points, topicMax)}%` }} />
									</span>
								</li>
							))}
						</ol>
					</div>
				</div>
			</div>
		</div>
	);
}

function TopicScene({ state, origin }: { state: LiveState; origin: string }) {
	const topic = topics.find((item) => item.id === state.topic);
	const poll = state.poll?.open ? state.poll : null;
	return (
		<div className="ls-topic">
			<div className="ls-topic-main">
				{topic ? (
					<>
						<p className="ls-eyebrow">
							<Icon name={topicIcons[topic.id] ?? "talk"} /> {topic.tag.toUpperCase()}
						</p>
						<h1 className="ls-title ls-title-xl">{topic.label}</h1>
						<p className="ls-lead">{details[topic.id]}</p>
					</>
				) : (
					<>
						<p className="ls-eyebrow">
							<Icon name="talk" /> LA CONVERSACIÓN
						</p>
						<h1 className="ls-title ls-title-xl">
							Conversación <span>abierta.</span>
						</h1>
					</>
				)}
			</div>
			{poll && origin && (
				<div className="ls-teaser">
					<QrCode value={`${origin}/live`} className="ls-qr" />
					<div>
						<p className="ls-eyebrow">
							<span className="ls-status is-open">Votación abierta</span> · {new URL(origin).host}/live
						</p>
						<p className="ls-teaser-question">{poll.question}</p>
					</div>
					<Votes value={state.results?.voters ?? 0} />
				</div>
			)}
		</div>
	);
}

function Votes({ value }: { value: number }) {
	const shown = useCountUp(value);
	return (
		<p className="ls-votes">
			<strong>{shown}</strong>
			<span>{value === 1 ? "voto" : "votos"}</span>
		</p>
	);
}

function PollScene({ poll, state, origin }: { poll: LivePoll; state: LiveState; origin: string }) {
	const voters = state.results?.voters ?? 0;
	const counts = poll.revealed ? state.results?.counts : undefined;
	const top = counts ? Math.max(0, ...counts) : 0;
	const tag = topics.find((item) => item.id === poll.topic)?.tag;
	return (
		<div className="ls-poll">
			<div className="ls-poll-main">
				<p className="ls-eyebrow">
					<span className={`ls-status ${poll.open ? "is-open" : ""}`}>
						{poll.open ? "Votación abierta" : "Votación cerrada"}
					</span>
					{tag && <> · {tag.toUpperCase()}</>}
				</p>
				<h1 className="ls-question">{poll.question}</h1>
				<p className="ls-hint">
					{pollHint(poll)}
					{counts && poll.multi && " · porcentaje de quienes han votado"}
				</p>
				<ol className={`ls-options ${counts ? "is-revealed" : ""} ${poll.options.length > 5 ? "is-long" : ""}`}>
					{poll.options.map((label, i) => {
						const share = pct(counts?.[i] ?? 0, voters);
						return (
							<li key={i} className={counts && top > 0 && counts[i] === top ? "is-top" : ""}>
								<span className="ls-letter">{letters[i]}</span>
								<span className="ls-option-label">{label}</span>
								{counts && (
									<>
										<strong className="ls-option-share">{share}%</strong>
										<span className="ls-bar">
											<span style={{ width: `${share}%` }} />
										</span>
									</>
								)}
							</li>
						);
					})}
				</ol>
			</div>
			<aside className="ls-poll-side">
				{poll.open && <JoinCard origin={origin} online={state.online} />}
				<Votes value={voters} />
			</aside>
		</div>
	);
}

function MessageScene({ message }: { message: string }) {
	return (
		<div className="ls-message">
			{message ? (
				<p>{message}</p>
			) : (
				<span className="ls-brand ls-brand-big">
					<Image src="/images/logo.webp" alt="" width={160} height={160} />
					<span>
						the mêlée<span className="brand-dot">.</span>
					</span>
				</span>
			)}
		</div>
	);
}
