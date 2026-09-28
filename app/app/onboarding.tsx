"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { ToolIcon } from "@/components/tool-icon";
import { event } from "@/lib/event.mjs";
import {
	levels,
	customToolId,
	customToolPrefix,
	maxCustomToolLength,
	maxCustomTools,
	maxNameLength,
	maxQuestionLength,
	roles,
	suggestedTools,
	toolCategories,
	tools,
	toolLabel,
	topics,
} from "@/lib/onboarding.mjs";
import { levelIcons, roleIcons } from "./icons";
import { TopicSort } from "./topic-sort";
import {
	type Answers,
	apiUrl,
	emptyAnswers,
	loadSaved,
	save,
} from "./progress";

const screens = ["welcome", "role", "tools", "frequency", "topics"];
const questionSteps = 4;
const toolById = new Map(tools.map((tool) => [tool.id, tool]));

const newClientId = () =>
	globalThis.crypto?.randomUUID?.() ??
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function Art({ name }: { name: string }) {
	return (
		<picture key={name} className="ob-art">
			<source type="image/avif" srcSet={`/images/onboarding/${name}.avif`} />
			<img src={`/images/onboarding/${name}.webp`} alt="" width={1040} height={780} decoding="async" />
		</picture>
	);
}

export function Onboarding() {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [answers, setAnswers] = useState<Answers>(emptyAnswers);
	const [clientId, setClientId] = useState("");
	const [exploredMore, setExploredMore] = useState(false);
	const [noTools, setNoTools] = useState(false);
	const [customTool, setCustomTool] = useState("");
	const [customToolError, setCustomToolError] = useState("");
	const [completed, setCompleted] = useState(false);
	const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
	const headingRef = useRef<HTMLHeadingElement>(null);
	const navigated = useRef(false);

	useEffect(() => {
		const saved = loadSaved();
		setClientId(saved?.clientId ?? newClientId());
		if (!saved) return;
		setAnswers(saved.answers);
		setExploredMore(!!saved.exploredMore);
		setNoTools(saved.completed && saved.answers.tools.length === 0);
		setCompleted(saved.completed);
	}, []);

	useEffect(() => {
		if (!navigated.current) return;
		headingRef.current?.focus({ preventScroll: true });
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [step]);

	function update(next: Answers, nextExplored = exploredMore) {
		setAnswers(next);
		setExploredMore(nextExplored);
		save({
			clientId,
			answers: next,
			exploredMore: nextExplored,
			completed,
		});
	}

	function goTo(next: number) {
		navigated.current = true;
		setStatus("idle");
		setStep(next);
	}

	function pickRole(id: string) {
		update({ ...answers, role: id });
	}

	function toggleTool(id: string) {
		const selected = answers.tools.includes(id);
		const next = selected
			? answers.tools.filter((tool) => tool !== id)
			: [...answers.tools, id];
		setNoTools(false);
		update({ ...answers, tools: next });
	}

	function pickNoTools() {
		setNoTools(true);
		update({ ...answers, tools: [] });
	}

	function addCustomTool() {
		const name = customTool.trim().replace(/\s+/g, " ");
		if (!name) return;
		const known = tools.find(
			(tool) => tool.label.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
		);
		const id = known?.id ?? customToolId(name);
		const duplicate = answers.tools.some(
			(tool) => toolLabel(tool).toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
		);
		if (duplicate) {
			setCustomToolError("Ya tienes esa herramienta en tu selección.");
			return;
		}
		if (
			!known &&
			answers.tools.filter((tool) => tool.startsWith(customToolPrefix)).length >= maxCustomTools
		) {
			setCustomToolError(`Puedes añadir hasta ${maxCustomTools} herramientas por texto.`);
			return;
		}
		setCustomToolError("");
		setCustomTool("");
		setNoTools(false);
		update(
			{ ...answers, tools: [...answers.tools, id] },
			known && !suggestions.includes(id) ? true : exploredMore,
		);
	}

	function pickLevel(id: string) {
		update({ ...answers, level: id });
	}

	function moveTopic(index: number, direction: -1 | 1) {
		const next = [...topicOrder];
		[next[index], next[index + direction]] = [next[index + direction], next[index]];
		update({ ...answers, topics: next });
	}

	async function submit() {
		setStatus("sending");
		try {
			const response = await fetch(`${apiUrl}/responses`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientId, ...answers }),
			});
			if (!response.ok) throw new Error(String(response.status));
			setCompleted(true);
			save({ clientId, answers, exploredMore, completed: true });
			router.push("/app/dashboard");
		} catch {
			setStatus("error");
		}
	}

	const role = roles.find((item) => item.id === answers.role);
	const suggestions = suggestedTools[(answers.role ?? "other") as keyof typeof suggestedTools];
	const moreTools = tools.filter((tool) => !suggestions.includes(tool.id));
	const customTools = answers.tools.filter((tool) => tool.startsWith(customToolPrefix));
	const topicOrder = [
		...answers.topics.filter((id) => topics.some((topic) => topic.id === id)),
		...topics.map((topic) => topic.id).filter((id) => !answers.topics.includes(id)),
	];

	const toolButton = (id: string) => {
		const tool = toolById.get(id);
		if (!tool) return null;
		return (
			<button
				key={id}
				type="button"
				className="ob-tool"
				aria-pressed={answers.tools.includes(id)}
				onClick={() => toggleTool(id)}
			>
				<ToolIcon id={id} label={tool.label} />
				<span>{tool.label}</span>
				<span className="ob-check">
					<Icon name="check" />
				</span>
			</button>
		);
	};

	const nav = (next: number, canContinue: boolean, label = "Siguiente") => (
		<div className="ob-nav">
			<button type="button" className="ob-back" onClick={() => goTo(step - 1)}>
				<Icon name="left" /> Atrás
			</button>
			<button
				type="button"
				className="button"
				disabled={!canContinue}
				onClick={() => goTo(next)}
			>
				{label} <Icon name="right" />
			</button>
		</div>
	);

	return (
		<>
			<a className="skip-link" href="#contenido">
				Saltar al contenido
			</a>
			<header className="app-header wrap">
				<Link href="/" className="brand" aria-label="The Mêlée, volver a la landing">
					<Image src="/images/logo.webp" alt="" width={36} height={36} />
					<span>
						the mêlée<span className="brand-dot">.</span>
					</span>
				</Link>
				{step > 0 && (
					<ol className="ob-seats" aria-label={`Paso ${step} de ${questionSteps}`}>
						{Array.from({ length: questionSteps }, (_, i) => (
							<li
								key={i}
								className={i + 1 < step ? "is-done" : i + 1 === step ? "is-current" : ""}
							/>
						))}
					</ol>
				)}
				{completed && <Link href="/app/dashboard" className="ob-results-link">Ver resultados</Link>}
			</header>
			<div className="ob-progress" aria-hidden="true">
				<span style={{ width: `${(Math.min(step, questionSteps) / questionSteps) * 100}%` }} />
			</div>

			<main id="contenido" className="ob wrap">
				<div className="ob-visual">
					<Art name={screens[step]} />
				</div>

				<section className="ob-panel" key={step} aria-labelledby="ob-heading">
					{step === 0 && (
						<>
							<p className="eyebrow">
								<span className="section-number">00 /</span> ANTES DEL {event.day} DE {event.month}
							</p>
							<h1 id="ob-heading" ref={headingRef} tabIndex={-1} className="ob-title">
								Calentamos <span>motores.</span>
							</h1>
							<p className="ob-lead">
								Cuatro pasos rápidos sobre cómo trabajas con la IA. Con las respuestas de todo el
								círculo prepararemos la conversación del {event.date.toLowerCase()}.
							</p>
							<ul className="ob-perks">
								<li>
									<Icon name="clock" /> 2 minutos
								</li>
								<li><Icon name="pen" /> Nombre opcional</li>
								<li><Icon name="chart" /> Resultados del círculo</li>
							</ul>
							<div className="ob-name">
								<label htmlFor="ob-name">¿Cómo te llamas? <span>(opcional)</span></label>
								<input
									id="ob-name"
									type="text"
									autoComplete="name"
									maxLength={maxNameLength}
									value={answers.name}
									placeholder="Tu nombre"
									onChange={(event) => update({ ...answers, name: event.target.value })}
								/>
								<small>Solo tú y la organización lo veréis. Las estadísticas son agregadas.</small>
							</div>
							<p className="ob-teaser">
								<Icon name="chart" />
								<span>
									Después de enviar verás <strong>el mapa del círculo</strong>: quién viene, qué
									herramientas usa y de qué quiere hablar.
								</span>
							</p>
							<div className="ob-nav">
								<button type="button" className="button" onClick={() => goTo(1)}>
									Empezamos <Icon name="arrow" />
								</button>
							</div>
						</>
					)}

					{step === 1 && (
						<>
							<p className="eyebrow">
								<span className="section-number">01 /</span> TU PERFIL
							</p>
							<h1 id="ob-heading" ref={headingRef} tabIndex={-1} className="ob-title">
								¿Desde dónde miras <span>la IA?</span>
							</h1>
							<p className="ob-hint">
								Elige el rol que mejor te describe hoy{answers.name?.trim() ? `, ${answers.name.trim()}` : ""}.
							</p>
							<div className="ob-grid ob-grid-roles">
								{roles.map((item) => (
									<button
										key={item.id}
										type="button"
										className="ob-option"
										aria-pressed={answers.role === item.id}
										onClick={() => pickRole(item.id)}
									>
										<span className="ob-option-icon">
											<Icon name={roleIcons[item.id]} />
										</span>
										<span className="ob-option-text">
											<strong>{item.label}</strong>
											<small>{item.hint}</small>
										</span>
										<span className="ob-check">
											<Icon name="check" />
										</span>
									</button>
								))}
							</div>
							{nav(2, !!answers.role)}
						</>
					)}

					{step === 2 && (
						<>
							<p className="eyebrow">
								<span className="section-number">02 /</span> TU CAJA DE HERRAMIENTAS
							</p>
							<h1 id="ob-heading" ref={headingRef} tabIndex={-1} className="ob-title">
								¿Con qué <span>trabajas?</span>
							</h1>
							<p className="ob-hint">
								Las más habituales en perfiles de <strong>{role?.label ?? "tu perfil"}</strong>. Marca
								todas las que uses.
							</p>
							<div className="ob-grid ob-grid-tools">{suggestions.map(toolButton)}</div>
							{exploredMore ? (
								<div className="ob-more">
									{toolCategories.map((category) => {
										const list = moreTools.filter((tool) => tool.category === category.id);
										if (list.length === 0) return null;
										return (
											<fieldset key={category.id} className="ob-category">
												<legend>{category.label}</legend>
												<div className="ob-grid ob-grid-tools">
													{list.map((tool) => toolButton(tool.id))}
												</div>
											</fieldset>
										);
									})}
								</div>
							) : (
								<button
									type="button"
									className="ob-show-more"
									onClick={() => update(answers, true)}
								>
									<Icon name="plus" /> Ver más herramientas
									<span>+{moreTools.length}</span>
								</button>
							)}
							<form
								className="ob-custom-tool"
								onSubmit={(event) => {
									event.preventDefault();
									addCustomTool();
								}}
							>
								<label htmlFor="ob-custom-tool">¿Usas otra herramienta? Añádela aquí.</label>
								<div className="ob-custom-tool-entry">
									<input
										id="ob-custom-tool"
										type="text"
										maxLength={maxCustomToolLength}
										value={customTool}
										placeholder="Nombre de la herramienta"
										onChange={(event) => {
											setCustomTool(event.target.value);
											setCustomToolError("");
										}}
									/>
									<button type="submit" disabled={!customTool.trim()}>
										<Icon name="plus" /> Añadir
									</button>
								</div>
								{customToolError && (
									<p className="ob-error" role="alert">{customToolError}</p>
								)}
								{customTools.length > 0 && (
									<ul className="ob-custom-tool-list" aria-label="Herramientas añadidas por ti">
										{customTools.map((id) => (
											<li key={id}>
												<span>{toolLabel(id)}</span>
												<button
													type="button"
													aria-label={`Quitar ${toolLabel(id)}`}
													onClick={() => toggleTool(id)}
												>
													×
												</button>
											</li>
										))}
									</ul>
								)}
							</form>
							<div className="ob-tools-summary">
								<span className="ob-counter">
									<strong>{answers.tools.length}</strong>{" "}
									{answers.tools.length === 1 ? "seleccionada" : "seleccionadas"}
								</span>
								<button
									type="button"
									className="ob-none"
									aria-pressed={noTools}
									onClick={pickNoTools}
								>
									Ninguna de estas
								</button>
							</div>
							{nav(3, answers.tools.length > 0 || noTools)}
						</>
					)}

					{step === 3 && (
						<>
							<p className="eyebrow">
								<span className="section-number">03 /</span> TU INTENSIDAD
							</p>
							<h1 id="ob-heading" ref={headingRef} tabIndex={-1} className="ob-title">
								¿Cómo de intenso es tu trabajo <span>con la IA?</span>
							</h1>
							<p className="ob-hint">Piensa en cuánto influye en lo que haces y cuánto dependes de ella.</p>
							<div className="ob-levels">
								{levels.map((level, index) => (
									<button
										key={level.id}
										type="button"
										className="ob-level"
										aria-pressed={answers.level === level.id}
										onClick={() => pickLevel(level.id)}
									>
										<span className="ob-meter" aria-hidden="true">
											{levels.map((_, bar) => (
												<i key={bar} className={bar <= index ? "is-on" : ""} />
											))}
										</span>
										<span className="ob-level-text">
											<small>Nivel {index + 1}</small>
											<strong>{level.label}</strong>
										</span>
										<Icon name={levelIcons[level.id]} className="ob-level-icon" />
									</button>
								))}
							</div>
							{nav(4, !!answers.level)}
						</>
					)}

					{step === 4 && (
						<>
							<p className="eyebrow">
								<span className="section-number">04 /</span> LA CONVERSACIÓN
							</p>
							<h1 id="ob-heading" ref={headingRef} tabIndex={-1} className="ob-title">
								Ordena los temas <span>del encuentro.</span>
							</h1>
							<p className="ob-hint">
								Arrastra el icono de puntos para ordenar los temas de más a menos interés. También puedes usar las flechas.
							</p>
							<TopicSort
								order={topicOrder}
								onChange={(order) => update({ ...answers, topics: order })}
								onMove={moveTopic}
							/>
							{answers.topics.length !== topics.length && (
								<button
									type="button"
									className="ob-confirm-order"
									onClick={() => update({ ...answers, topics: topicOrder })}
								>
									Este orden me va bien
								</button>
							)}
							<div className="ob-question">
								<label htmlFor="ob-question">
									¿Hay algo más de lo que te gustaría hablar? <em>(opcional)</em>
								</label>
								<textarea
									id="ob-question"
									rows={3}
									maxLength={maxQuestionLength}
									value={answers.question}
									placeholder="Un tema, una experiencia o una idea que quieras compartir…"
									onChange={(e) => update({ ...answers, question: e.target.value })}
								/>
								<small>
									{answers.question.length}/{maxQuestionLength}
								</small>
							</div>
							{status === "error" && (
								<p className="ob-error" role="alert">
									No hemos podido guardar tus respuestas. Revisa la conexión y vuelve a intentarlo.
								</p>
							)}
							<div className="ob-nav">
								<button type="button" className="ob-back" onClick={() => goTo(3)}>
									<Icon name="left" /> Atrás
								</button>
								<button
									type="button"
									className="button"
									disabled={answers.topics.length !== topics.length || status === "sending"}
									onClick={submit}
								>
									{status === "sending" ? "Enviando…" : "Enviar"} <Icon name="right" />
								</button>
							</div>
						</>
					)}
				</section>
			</main>
		</>
	);
}
