"use client";

import Image from "next/image";
import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import {
	maxMessageLength,
	maxPollOptionLength,
	maxPollOptions,
	maxPollQuestionLength,
	minPollOptions,
	pollHint,
	polls as catalogue,
	scenes,
	timerPresets,
} from "@/lib/live.mjs";
import { topics } from "@/lib/onboarding.mjs";
import { ranked, type Stats } from "../app/dashboard/dashboard";
import { topicIcons } from "../app/icons";
import { apiUrl } from "../app/progress";
import { LiveScreen } from "./screen-view";
import {
	CommandError,
	formatClock,
	letters,
	type LivePoll,
	type Poll,
	pct,
	type Results,
	sendCommand,
	type Timer,
	timeLeft,
	useLive,
	useTick,
} from "./use-live";

type Admin = { polls: Poll[]; results: Record<string, Results> };
type Run = (body: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
type Draft = { question: string; topic: string; multi: boolean; max: string; options: string[] };

const emptyDraft: Draft = { question: "", topic: "", multi: false, max: "", options: ["", ""] };
const preparedPolls: Poll[] = catalogue.map((poll) => ({
	id: poll.id,
	topic: poll.topic,
	question: poll.question,
	options: poll.options,
	multi: !!poll.multi,
	max: poll.max ?? null,
}));
const topicTag = (id: string | null) => topics.find((topic) => topic.id === id)?.tag;
const phones = (count: number) => `${count} ${count === 1 ? "móvil conectado" : "móviles conectados"}`;

const errorText: Record<string, string> = {
	network: "No hay conexión con la API. Revisa que esté en marcha.",
	unauthorized: "La clave de organización no es válida.",
	no_poll: "No hay ninguna votación lanzada.",
	poll_live: "No se puede borrar la votación que está en pantalla. Retírala primero.",
	invalid_command: "La API ha rechazado los datos. Revísalos e inténtalo de nuevo.",
	not_running: "El temporizador no está en marcha.",
	not_paused: "El temporizador no está en pausa.",
	unknown_poll: "Esa votación ya no existe.",
};

export function LiveControl() {
	const { state, connected, serverNow } = useLive("control");
	const [key, setKey] = useState<string | null>(null);
	const [denied, setDenied] = useState(false);
	const [admin, setAdmin] = useState<Admin | null>(null);
	const [refresh, setRefresh] = useState(0);
	const [stats, setStats] = useState<Stats | null>(null);
	const [origin, setOrigin] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [expanded, setExpanded] = useState<string[]>([]);
	const [draft, setDraft] = useState<Draft>(emptyDraft);
	const [formError, setFormError] = useState("");
	const questionRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setOrigin(window.location.origin);
		setKey(new URLSearchParams(window.location.hash.slice(1)).get("key") ?? "");
		fetch(`${apiUrl}/stats`)
			.then((response) => (response.ok ? response.json() : null))
			.then(setStats)
			.catch(() => {});
	}, []);

	// Hidden results only reach the panel through the admin endpoint, so it
	// refetches whenever the shared state or the vote count moves.
	const voters = state?.results?.voters;
	useEffect(() => {
		if (!key) return;
		let alive = true;
		fetch(`${apiUrl}/live/admin`, { headers: { Authorization: `Bearer ${key}` } })
			.then(async (response) => {
				if (!alive) return;
				if (response.status === 401) return setDenied(true);
				if (response.ok) {
					setAdmin(await response.json());
					setDenied(false);
				}
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [key, state?.v, voters, refresh]);

	const run: Run = async (body) => {
		if (!key) return null;
		setError("");
		try {
			return await sendCommand(key, body);
		} catch (caught) {
			const code = caught instanceof CommandError ? caught.code : "";
			if (code === "unauthorized") setDenied(true);
			setError(errorText[code] ?? "Algo ha fallado. Vuelve a intentarlo.");
			return null;
		}
	};

	if (key === null) return null;
	if (!key || denied) {
		return (
			<KeyForm
				denied={denied}
				onKey={(value) => {
					window.location.hash = new URLSearchParams({ key: value }).toString();
					setDenied(false);
					setKey(value);
				}}
			/>
		);
	}

	const order = stats ? ranked(stats.topics).map(([id]) => id) : [];
	const rankOf = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
	const orderedTopics = [...topics].sort((a, b) => rankOf(a.id) - rankOf(b.id));
	const livePoll = state?.poll ?? null;
	const resultsFor = (id: string) =>
		admin?.results[id] ?? (livePoll?.id === id ? (state?.results ?? undefined) : undefined);
	const toggleTopic = (id: string, open?: boolean) =>
		setExpanded((current) =>
			(open ?? !current.includes(id)) ? [...new Set([...current, id])] : current.filter((item) => item !== id),
		);

	function copyToForm(poll: Poll) {
		setDraft({
			question: poll.question,
			topic: poll.topic ?? "",
			multi: poll.multi,
			max: poll.max ? String(poll.max) : "",
			options: [...poll.options],
		});
		setFormError("");
		questionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
		questionRef.current?.focus({ preventScroll: true });
	}

	async function create(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const launch = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "launch";
		const options = draft.options.map((option) => option.trim()).filter(Boolean);
		if (options.length < minPollOptions) return setFormError("Añade al menos dos opciones.");
		if (new Set(options.map((option) => option.toLocaleLowerCase("es"))).size !== options.length) {
			return setFormError("Hay opciones repetidas.");
		}
		const max = Number(draft.max);
		const created = await run({
			action: "poll.create",
			poll: {
				question: draft.question.trim(),
				topic: draft.topic || null,
				multi: draft.multi,
				max: draft.multi && max >= 2 && max < options.length ? max : null,
				options,
			},
		});
		const poll = created?.poll as Poll | undefined;
		if (!poll) return;
		setDraft(emptyDraft);
		setFormError("");
		setRefresh((count) => count + 1);
		if (launch) await run({ action: "poll.launch", pollId: poll.id });
	}

	async function remove(poll: Poll) {
		if (!window.confirm(`¿Borrar «${poll.question}» y sus votos?`)) return;
		if (await run({ action: "poll.delete", pollId: poll.id })) setRefresh((count) => count + 1);
	}

	async function reset() {
		if (!window.confirm("Se borrarán todos los votos y la pantalla volverá a la bienvenida. ¿Seguro?")) return;
		if (await run({ action: "reset" })) setRefresh((count) => count + 1);
	}

	const pollRow = (poll: Poll, deletable = false) => (
		<PollRow
			key={poll.id}
			poll={poll}
			results={resultsFor(poll.id)}
			live={livePoll?.id === poll.id}
			run={run}
			onCopy={() => copyToForm(poll)}
			onDelete={deletable ? () => remove(poll) : undefined}
		/>
	);

	return (
		<>
			<header className="lc-header">
				<div className="lc-wrap lc-header-inner">
					<span className="brand">
						<Image src="/images/logo.webp" alt="" width={32} height={32} />
						<span>
							the mêlée<span className="brand-dot">.</span>
						</span>
					</span>
					<span className="lc-header-title">Sala de control</span>
					<span className={`lv-live ${connected ? "is-on" : ""}`} role="status">
						<span className="lv-dot" />
						{connected ? "Conectado" : "Sin conexión"}
					</span>
					<nav className="lc-links" aria-label="Abrir otras vistas">
						<a href="/live/screen" target="_blank" rel="noopener">
							Pantalla <Icon name="arrow" />
						</a>
						<a href="/live" target="_blank" rel="noopener">
							Móvil <Icon name="arrow" />
						</a>
					</nav>
				</div>
			</header>

			{error && (
				<div className="lc-wrap lc-error">
					<p className="ob-error" role="alert">
						{error}
					</p>
				</div>
			)}

			<main className="lc lc-wrap">
				<div className="lc-column">
					<section className="lc-card lc-preview-card" aria-label="Vista previa de la pantalla">
						<div className="lc-preview">
							<LiveScreen state={state} connected={connected} serverNow={serverNow} origin={origin} />
						</div>
						<p className="lc-muted">{phones(state?.online ?? 0)}</p>
					</section>

					<section className="lc-card" aria-labelledby="lc-screen-title">
						<h2 id="lc-screen-title" className="lc-card-title">
							Pantalla
						</h2>
						<div className="lc-scenes" role="group" aria-label="Qué se ve en la pantalla">
							{scenes.map((scene) => (
								<button
									key={scene.id}
									type="button"
									aria-pressed={state?.scene === scene.id}
									disabled={scene.id === "poll" && !livePoll}
									onClick={() => run({ action: "scene", scene: scene.id })}
								>
									{scene.label}
								</button>
							))}
						</div>
						<form
							className="lc-inline"
							onSubmit={(event) => {
								event.preventDefault();
								run({ action: "scene", scene: "message", message });
							}}
						>
							<label className="sr-only" htmlFor="lc-message">
								Mensaje para la pantalla
							</label>
							<input
								id="lc-message"
								value={message}
								maxLength={maxMessageLength}
								placeholder="Mensaje para la pantalla (vacío: logo)"
								onChange={(event) => setMessage(event.target.value)}
							/>
							<button type="submit" className="lc-button">
								Mostrar
							</button>
						</form>
					</section>

					<TimerCard timer={state?.timer ?? null} serverNow={serverNow} run={run} />

					{livePoll ? (
						<CurrentPoll
							poll={livePoll}
							results={resultsFor(livePoll.id)}
							online={state?.online ?? 0}
							run={run}
						/>
					) : (
						<section className="lc-card lc-empty">
							<h2 className="lc-card-title">Votación en pantalla</h2>
							<p className="lc-muted">Ninguna ahora mismo. Lanza una desde el guion.</p>
						</section>
					)}
				</div>

				<div className="lc-column">
					<section className="lc-card" aria-labelledby="lc-script-title">
						<h2 id="lc-script-title" className="lc-card-title">
							Guion
						</h2>
						<p className="lc-muted">
							{stats?.total
								? "Temas en el orden que ha votado el círculo."
								: "Temas en el orden original."}
						</p>
						<ol className="lc-topics">
							{orderedTopics.map((topic, index) => {
								const current = state?.topic === topic.id;
								const open = expanded.includes(topic.id);
								return (
									<li key={topic.id} className={current ? "is-current" : ""}>
										<div className="lc-topic">
											<span className="lc-topic-icon">
												<Icon name={topicIcons[topic.id] ?? "talk"} />
											</span>
											<span className="lc-topic-text">
												<strong>{topic.label}</strong>
												<small>
													{topic.tag}
													{stats?.total ? ` · nº ${index + 1} del círculo` : ""}
												</small>
											</span>
											<button
												type="button"
												className="lc-button"
												onClick={() => {
													toggleTopic(topic.id, true);
													run({ action: "topic", topic: current ? null : topic.id });
												}}
											>
												{current ? "Quitar" : "Mostrar"}
											</button>
											<button
												type="button"
												className="lc-expand"
												aria-expanded={open}
												aria-controls={`lc-polls-${topic.id}`}
												onClick={() => toggleTopic(topic.id)}
											>
												<Icon name="down" />
												<span className="sr-only">Votaciones de {topic.label}</span>
											</button>
										</div>
										{open && (
											<ul className="lc-polls" id={`lc-polls-${topic.id}`}>
												{preparedPolls.filter((poll) => poll.topic === topic.id).map((poll) => pollRow(poll))}
											</ul>
										)}
									</li>
								);
							})}
						</ol>
					</section>

					<section className="lc-card" aria-labelledby="lc-custom-title">
						<h2 id="lc-custom-title" className="lc-card-title">
							Tus votaciones
						</h2>
						{admin?.polls.length ? (
							<ul className="lc-polls">{admin.polls.map((poll) => pollRow(poll, true))}</ul>
						) : (
							<p className="lc-muted">Las que crees aquí abajo aparecerán en esta lista.</p>
						)}
					</section>

					<section className="lc-card" aria-labelledby="lc-form-title">
						<h2 id="lc-form-title" className="lc-card-title">
							Nueva votación
						</h2>
						<PollForm
							draft={draft}
							setDraft={setDraft}
							error={formError}
							questionRef={questionRef}
							onSubmit={create}
						/>
					</section>

					<section className="lc-danger">
						<p>
							<strong>Antes de empezar:</strong> borra los votos de las pruebas. Las votaciones que hayas creado
							se mantienen.
						</p>
						<button type="button" className="lc-button" onClick={reset}>
							Reiniciar sesión
						</button>
					</section>
				</div>
			</main>
		</>
	);
}

function KeyForm({ denied, onKey }: { denied: boolean; onKey: (key: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<main className="lc-key wrap">
			<form
				className="lc-card"
				onSubmit={(event) => {
					event.preventDefault();
					if (value.trim()) onKey(value.trim());
				}}
			>
				<p className="eyebrow">THE MÊLÉE · EN DIRECTO</p>
				<h1 className="ob-title">
					Sala de <span>control.</span>
				</h1>
				<label className="lc-field">
					<span>Clave de organización</span>
					<input
						type="password"
						autoComplete="current-password"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						required
					/>
				</label>
				{denied && (
					<p className="ob-error" role="alert">
						La clave no es válida.
					</p>
				)}
				<button type="submit" className="button">
					Entrar <Icon name="arrow" />
				</button>
			</form>
		</main>
	);
}

function TimerCard({ timer, serverNow, run }: { timer: Timer | null; serverNow: () => number; run: Run }) {
	useTick(timer?.endsAt != null, 500);
	const left = timer ? timeLeft(timer, serverNow()) : 0;
	return (
		<section className="lc-card" aria-labelledby="lc-timer-title">
			<div className="lc-card-head">
				<h2 id="lc-timer-title" className="lc-card-title">
					Temporizador
				</h2>
				<strong className={`lc-clock ${left < 0 ? "is-over" : ""}`} role="timer">
					{timer ? formatClock(left) : "—"}
					{timer?.endsAt === null && <small> en pausa</small>}
				</strong>
			</div>
			<div className="lc-actions">
				{timerPresets.map((minutes) => (
					<button
						key={minutes}
						type="button"
						className="lc-button"
						onClick={() => run({ action: "timer", op: "start", seconds: minutes * 60 })}
					>
						{minutes} min
					</button>
				))}
			</div>
			{timer && (
				<div className="lc-actions">
					<button type="button" className="lc-button lc-ghost" onClick={() => run({ action: "timer", op: "add", seconds: -60 })}>
						−1 min
					</button>
					<button type="button" className="lc-button lc-ghost" onClick={() => run({ action: "timer", op: "add", seconds: 60 })}>
						+1 min
					</button>
					<button
						type="button"
						className="lc-button"
						onClick={() => run({ action: "timer", op: timer.endsAt === null ? "resume" : "pause" })}
					>
						{timer.endsAt === null ? "Reanudar" : "Pausar"}
					</button>
					<button type="button" className="lc-button lc-ghost" onClick={() => run({ action: "timer", op: "clear" })}>
						Quitar
					</button>
				</div>
			)}
		</section>
	);
}

function CurrentPoll({
	poll,
	results,
	online,
	run,
}: {
	poll: LivePoll;
	results: Results | undefined;
	online: number;
	run: Run;
}) {
	const voters = results?.voters ?? 0;
	return (
		<section className="lc-card lc-current" aria-labelledby="lc-current-title">
			<div className="lc-card-head">
				<h2 id="lc-current-title" className="lc-card-title">
					Votación en pantalla
				</h2>
				<span className={`lc-chip ${poll.open ? "is-open" : ""}`}>{poll.open ? "Abierta" : "Cerrada"}</span>
				<span className="lc-chip">{poll.revealed ? "Resultados visibles" : "Resultados ocultos"}</span>
			</div>
			<p className="lc-current-question">{poll.question}</p>
			<p className="lc-muted">{pollHint(poll)}</p>
			<ol className="lc-results">
				{poll.options.map((label, i) => {
					const count = results?.counts?.[i] ?? 0;
					return (
						<li key={i}>
							<span className="lc-letter">{letters[i]}</span>
							<span className="lc-result-label">{label}</span>
							<strong>{count}</strong>
							<small>{pct(count, voters)}%</small>
							<span className="lv-bar">
								<span style={{ width: `${pct(count, voters)}%` }} />
							</span>
						</li>
					);
				})}
			</ol>
			<p className="lc-muted">
				<strong>{voters}</strong> {voters === 1 ? "voto" : "votos"} · {phones(online)}
			</p>
			<div className="lc-actions">
				{poll.open ? (
					<>
						<button
							type="button"
							className="lc-button lc-primary"
							onClick={() => run({ action: "poll.update", open: false, revealed: true })}
						>
							Cerrar y mostrar resultados
						</button>
						<button type="button" className="lc-button" onClick={() => run({ action: "poll.update", open: false })}>
							Cerrar
						</button>
					</>
				) : (
					<button type="button" className="lc-button" onClick={() => run({ action: "poll.update", open: true })}>
						Reabrir
					</button>
				)}
				<button
					type="button"
					className="lc-button"
					onClick={() => run({ action: "poll.update", revealed: !poll.revealed })}
				>
					{poll.revealed ? "Ocultar resultados" : "Mostrar resultados"}
				</button>
				<button type="button" className="lc-button lc-ghost" onClick={() => run({ action: "poll.clear" })}>
					Retirar
				</button>
			</div>
		</section>
	);
}

function PollRow({
	poll,
	results,
	live,
	run,
	onCopy,
	onDelete,
}: {
	poll: Poll;
	results: Results | undefined;
	live: boolean;
	run: Run;
	onCopy: () => void;
	onDelete?: () => void;
}) {
	const voters = results?.voters ?? 0;
	const tag = poll.custom ? topicTag(poll.topic) : undefined;
	return (
		<li className={`lc-poll ${live ? "is-live" : ""}`}>
			<div>
				<p className="lc-poll-question">{poll.question}</p>
				<p className="lc-poll-options">{poll.options.join(" · ")}</p>
				<p className="lc-poll-meta">
					{pollHint(poll)}
					{tag && ` · ${tag}`}
					{voters > 0 && ` · ${voters} ${voters === 1 ? "voto" : "votos"}`}
				</p>
			</div>
			<div className="lc-actions">
				<button
					type="button"
					className="lc-button lc-primary"
					disabled={live}
					onClick={() => run({ action: "poll.launch", pollId: poll.id })}
				>
					{live ? "En pantalla" : "Lanzar"}
				</button>
				{voters > 0 && !live && (
					<button
						type="button"
						className="lc-button"
						onClick={() => run({ action: "poll.launch", pollId: poll.id, open: false, revealed: true })}
					>
						Resultados
					</button>
				)}
				<button type="button" className="lc-button lc-ghost" onClick={onCopy}>
					Editar copia
				</button>
				{onDelete && !live && (
					<button type="button" className="lc-button lc-ghost" onClick={onDelete}>
						Borrar
					</button>
				)}
			</div>
		</li>
	);
}

function PollForm({
	draft,
	setDraft,
	error,
	questionRef,
	onSubmit,
}: {
	draft: Draft;
	setDraft: (draft: Draft) => void;
	error: string;
	questionRef: RefObject<HTMLInputElement | null>;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	const answers = draft.multi ? draft.max || "all" : "one";
	const setOption = (index: number, value: string) =>
		setDraft({ ...draft, options: draft.options.map((option, i) => (i === index ? value : option)) });
	const dirty = draft.question !== "" || draft.options.some(Boolean);
	return (
		<form className="lc-form" onSubmit={onSubmit}>
			<label className="lc-field">
				<span>Pregunta</span>
				<input
					ref={questionRef}
					value={draft.question}
					maxLength={maxPollQuestionLength}
					required
					onChange={(event) => setDraft({ ...draft, question: event.target.value })}
				/>
			</label>
			<div className="lc-form-row">
				<label className="lc-field">
					<span>Tema</span>
					<select value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })}>
						<option value="">Sin tema</option>
						{topics.map((topic) => (
							<option key={topic.id} value={topic.id}>
								{topic.label}
							</option>
						))}
					</select>
				</label>
				<label className="lc-field">
					<span>Respuestas</span>
					<select
						value={answers}
						onChange={(event) => {
							const value = event.target.value;
							setDraft({ ...draft, multi: value !== "one", max: value === "one" || value === "all" ? "" : value });
						}}
					>
						<option value="one">Una opción</option>
						<option value="all">Varias, sin límite</option>
						{[2, 3, 4]
							.filter((max) => max < draft.options.length || String(max) === draft.max)
							.map((max) => (
								<option key={max} value={max}>
									Varias, hasta {max}
								</option>
							))}
					</select>
				</label>
			</div>
			<fieldset className="lc-field">
				<legend>Opciones</legend>
				{draft.options.map((option, i) => (
					<div className="lc-option-input" key={i}>
						<span className="lc-letter">{letters[i]}</span>
						<input
							value={option}
							maxLength={maxPollOptionLength}
							required={i < minPollOptions}
							aria-label={`Opción ${letters[i]}`}
							onChange={(event) => setOption(i, event.target.value)}
						/>
						<button
							type="button"
							disabled={draft.options.length <= minPollOptions}
							onClick={() => setDraft({ ...draft, options: draft.options.filter((_, index) => index !== i) })}
						>
							×<span className="sr-only"> Quitar opción {letters[i]}</span>
						</button>
					</div>
				))}
				{draft.options.length < maxPollOptions && (
					<button
						type="button"
						className="lc-add"
						onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
					>
						<Icon name="plus" /> Añadir opción
					</button>
				)}
			</fieldset>
			{error && (
				<p className="ob-error" role="alert">
					{error}
				</p>
			)}
			<div className="lc-actions">
				{/* Enter submits with the first button, so plain saving comes first. */}
				<button type="submit" className="lc-button" value="save">
					Guardar
				</button>
				<button type="submit" className="lc-button lc-primary" value="launch">
					Guardar y lanzar
				</button>
				{dirty && (
					<button type="button" className="lc-button lc-ghost" onClick={() => setDraft(emptyDraft)}>
						Vaciar
					</button>
				)}
			</div>
		</form>
	);
}
