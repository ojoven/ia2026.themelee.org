"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { pollHint } from "@/lib/live.mjs";
import { topics } from "@/lib/onboarding.mjs";
import { topicIcons } from "../app/icons";
import {
	CommandError,
	letters,
	type LivePoll,
	type LiveState,
	loadVoter,
	pct,
	saveVoter,
	sendVote,
	useLive,
} from "./use-live";

type Voter = ReturnType<typeof loadVoter>;

export function LivePhone() {
	const { state, connected } = useLive("phone");
	const [voter, setVoter] = useState<Voter | null>(null);

	useEffect(() => setVoter(loadVoter()), []);

	function remember(voteKey: string, choices: number[]) {
		if (!voter) return;
		const next = { ...voter, votes: { ...voter.votes, [voteKey]: choices } };
		setVoter(next);
		saveVoter(next);
	}

	const topic = topics.find((item) => item.id === state?.topic);
	const poll = state?.poll;
	const voteKey = state && poll ? `${state.session}:${poll.id}` : "";

	return (
		<>
			<header className="app-header wrap">
				<Link href="/" className="brand" aria-label="The Mêlée, volver a la landing">
					<Image src="/images/logo.webp" alt="" width={36} height={36} />
					<span>
						the mêlée<span className="brand-dot">.</span>
					</span>
				</Link>
				<span className={`lv-live ${connected ? "is-on" : ""}`} role="status">
					<span className="lv-dot" />
					{connected ? "En directo" : state ? "Reconectando…" : "Conectando…"}
				</span>
			</header>
			<main className="lv wrap">
				{!state ? (
					<p className="lv-status">Conectando con la sala…</p>
				) : (
					<>
						<section className="lv-topic">
							{topic ? (
								<>
									<p className="eyebrow">
										<Icon name={topicIcons[topic.id] ?? "talk"} /> AHORA HABLAMOS DE
									</p>
									<h1 className="lv-topic-title">{topic.label}</h1>
									<p className="lv-topic-tag">{topic.tag}</p>
								</>
							) : (
								<>
									<p className="eyebrow">
										<Icon name="talk" /> THE MÊLÉE · EN DIRECTO
									</p>
									<h1 className="lv-topic-title">
										IA, desarrollo <span>y producto.</span>
									</h1>
								</>
							)}
						</section>

						{poll && voter ? (
							<PollCard
								key={voteKey}
								poll={poll}
								state={state}
								voted={voter.votes[voteKey] ?? null}
								clientId={voter.clientId}
								onVoted={(choices) => remember(voteKey, choices)}
							/>
						) : (
							<div className="lv-waiting">
								<span className="lv-waiting-icon">
									<Icon name="chart" />
								</span>
								<p>
									<strong>Deja esta página abierta.</strong> Cuando abramos una votación aparecerá
									aquí, sin recargar.
								</p>
							</div>
						)}

						<p className="lv-note">
							<Icon name="lock" /> Votos anónimos: solo guardamos un identificador aleatorio de este
							navegador.
						</p>
					</>
				)}
			</main>
		</>
	);
}

function PollCard({
	poll,
	state,
	voted,
	clientId,
	onVoted,
}: {
	poll: LivePoll;
	state: LiveState;
	voted: number[] | null;
	clientId: string;
	onVoted: (choices: number[]) => void;
}) {
	const [selected, setSelected] = useState<number[]>(voted ?? []);
	const [editing, setEditing] = useState(voted === null);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const voters = state.results?.voters ?? 0;
	const counts = poll.revealed ? state.results?.counts : undefined;
	const full = poll.multi && poll.max !== null && selected.length >= poll.max;

	function toggle(index: number) {
		if (!poll.multi) return setSelected([index]);
		setSelected((current) =>
			current.includes(index)
				? current.filter((item) => item !== index)
				: full
					? current
					: [...current, index],
		);
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		setSending(true);
		setError("");
		try {
			const choices = [...selected].sort((a, b) => a - b);
			await sendVote(poll.id, clientId, choices);
			onVoted(choices);
			setEditing(false);
		} catch (caught) {
			const code = caught instanceof CommandError ? caught.code : "";
			setError(
				code === "poll_closed" || code === "poll_changed"
					? "La votación se ha cerrado antes de que llegara tu voto."
					: "No hemos podido enviar tu voto. Revisa la conexión e inténtalo otra vez.",
			);
		} finally {
			setSending(false);
		}
	}

	const status = (
		<p className={`lv-poll-status ${poll.open ? "is-open" : ""}`}>
			{poll.open && <span className="lv-dot" />}
			{poll.open ? "Votación abierta" : "Votación cerrada"}
		</p>
	);

	if (poll.open && editing) {
		return (
			<section className="lv-poll" aria-labelledby="lv-question">
				{status}
				<h2 id="lv-question" className="lv-question">
					{poll.question}
				</h2>
				<form onSubmit={submit}>
					<fieldset className="lv-options">
						<legend className="lv-hint">{pollHint(poll)}</legend>
						{poll.options.map((label, i) => {
							const on = selected.includes(i);
							return (
								<button
									key={i}
									type="button"
									className="lv-option"
									aria-pressed={on}
									disabled={!on && full}
									onClick={() => toggle(i)}
								>
									<span className="lv-letter">{letters[i]}</span>
									<span>{label}</span>
									<span className="ob-check">
										<Icon name="check" />
									</span>
								</button>
							);
						})}
					</fieldset>
					{error && (
						<p className="ob-error" role="alert">
							{error}
						</p>
					)}
					<button className="button lv-submit" type="submit" disabled={selected.length === 0 || sending}>
						{sending ? "Enviando…" : voted ? "Actualizar mi voto" : "Enviar voto"} <Icon name="arrow" />
					</button>
				</form>
			</section>
		);
	}

	return (
		<section className="lv-poll" aria-labelledby="lv-question">
			{status}
			<h2 id="lv-question" className="lv-question">
				{poll.question}
			</h2>
			{voted ? (
				<p className="lv-voted" role="status">
					<Icon name="check" /> ¡Voto registrado!
				</p>
			) : (
				<p className="lv-hint">Esta vez no has llegado a votar.</p>
			)}
			{counts ? (
				<ol className="lv-results">
					{poll.options.map((label, i) => {
						const share = pct(counts[i] ?? 0, voters);
						const mine = voted?.includes(i);
						return (
							<li key={i} className={mine ? "is-mine" : ""}>
								<span className="lv-result-label">
									{label}
									{mine && <em>tú</em>}
								</span>
								<strong>{share}%</strong>
								<span className="lv-bar">
									<span style={{ width: `${share}%` }} />
								</span>
							</li>
						);
					})}
				</ol>
			) : (
				voted && (
					<>
						<ul className="lv-mine">
							{voted.map((i) => (
								<li key={i}>
									<span className="lv-letter">{letters[i]}</span>
									{poll.options[i]}
								</li>
							))}
						</ul>
						<p className="lv-hint">Veremos los resultados juntos en la pantalla.</p>
					</>
				)
			)}
			<p className="lv-count">
				{voters} {voters === 1 ? "voto" : "votos"}
			</p>
			{poll.open && voted && (
				<button
					type="button"
					className="lv-change"
					onClick={() => {
						setSelected(voted);
						setEditing(true);
					}}
				>
					<Icon name="pen" /> Cambiar mi voto
				</button>
			)}
		</section>
	);
}
