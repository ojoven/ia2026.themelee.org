"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { ToolIcon } from "@/components/tool-icon";
import { event } from "@/lib/event.mjs";
import { levels, roles, toolLabel, topics } from "@/lib/onboarding.mjs";
import { levelIcons, roleIcons, topicIcons } from "../icons";
import { apiUrl, loadSaved, type Saved, useCountUp } from "../progress";

type Counts = Record<string, number>;
export type Stats = {
	total: number;
	roles: Counts;
	levels: Counts;
	topics: Counts;
	tools: Counts;
	toolsByRole: Record<string, Counts>;
	toolSelections: number;
};
type RawResponse = {
	id: string;
	name: string | null;
	role: string;
	tools: string[];
	level: string;
	topics: string[];
	question: string | null;
	created_at: string;
};

export const roleColors: Record<string, string> = {
	dev: "#cb512b",
	lead: "#303b2e",
	product: "#f3a274",
	design: "#8c5a7a",
	data: "#4f6b8a",
	consulting: "#6f8a6a",
	business: "#b79a5b",
	student: "#9aa08d",
	other: "#d8c3a5",
};
const levelColors = ["#e2dccb", "#f3c4a4", "#f3a274", "#cb512b", "#303b2e"];
const seatCount = 24;

const labelOf = (list: { id: string; label: string }[], id: string) =>
	list.find((item) => item.id === id)?.label ?? id;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
export const ranked = (counts: Counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);
const decimal = (value: number) =>
	value.toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

// Largest-remainder split so the seats add up to exactly `seatCount`.
export function allocateSeats(counts: Counts, total: number) {
	const shares = roles.map((role) => {
		const exact = ((counts[role.id] ?? 0) / Math.max(total, 1)) * seatCount;
		return { id: role.id, seats: Math.floor(exact), rest: exact % 1 };
	});
	let left = seatCount - shares.reduce((sum, share) => sum + share.seats, 0);
	for (const share of [...shares].sort((a, b) => b.rest - a.rest)) {
		if (left-- <= 0) break;
		share.seats++;
	}
	return shares.flatMap((share) => Array<string>(share.seats).fill(share.id));
}

function icebreakers(stats: Stats) {
	const found: { role: string; tool: string; share: number; lift: number }[] = [];
	for (const role of roles) {
		const people = stats.roles[role.id] ?? 0;
		if (people < 3) continue;
		let best: (typeof found)[number] | null = null;
		for (const [tool, count] of Object.entries(stats.toolsByRole[role.id] ?? {})) {
			const share = count / people;
			const lift = share / ((stats.tools[tool] ?? 0) / stats.total);
			if (share >= 0.3 && lift >= 1.3 && (!best || lift > best.lift)) {
				best = { role: role.id, tool, share, lift };
			}
		}
		if (best) found.push(best);
	}
	return found.sort((a, b) => b.lift - a.lift).slice(0, 4);
}

function BigNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
	const shown = useCountUp(value);
	return (
		<strong className="db-big">
			{shown}
			{suffix && <small>{suffix}</small>}
		</strong>
	);
}

function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
	return (
		<span className="db-bar" aria-hidden="true">
			<span
				style={{ "--fill": `${pct(value, max)}%`, background: color } as CSSProperties}
			/>
		</span>
	);
}

function Header() {
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
				<Link href="/app" className="button button-small">
					Mis respuestas <Icon name="pen" />
				</Link>
			</header>
		</>
	);
}

function BeforeForm() {
	return (
		<main id="contenido" className="db-before-form wrap">
			<div className="db-before-form-preview" aria-hidden="true">
				{[72, 48, 88, 35, 61, 54].map((width, i) => (
					<span key={i} style={{ width: `${width}%` }} />
				))}
			</div>
			<div className="db-before-form-card">
				<span className="db-before-form-icon"><Icon name="chart" /></span>
				<p className="eyebrow">EL MAPA DEL CÍRCULO</p>
				<h1 className="ob-title">
					Conoce al <span>círculo.</span>
				</h1>
				<p className="ob-lead">
					Completa cuatro pasos (dos minutos, con nombre opcional) y descubre quién viene, qué herramientas
					usa y de qué quiere hablar el círculo.
				</p>
				<Link className="button" href="/app">
					Ir al formulario <Icon name="arrow" />
				</Link>
			</div>
		</main>
	);
}

export function Dashboard() {
	const [saved, setSaved] = useState<Saved | null | undefined>(undefined);
	const [adminKey, setAdminKey] = useState("");
	const [stats, setStats] = useState<Stats | null>(null);
	const [failed, setFailed] = useState(false);
	const [raw, setRaw] = useState<RawResponse[] | "denied" | null>(null);
	const [toolRole, setToolRole] = useState("all");

	useEffect(() => {
		setSaved(loadSaved());
		setAdminKey(new URLSearchParams(window.location.hash.slice(1)).get("key") ?? "");
	}, []);

	const unlocked = !!saved?.completed || adminKey !== "";

	useEffect(() => {
		if (!unlocked) return;
		fetch(`${apiUrl}/stats`)
			.then((response) => (response.ok ? response.json() : Promise.reject()))
			.then(setStats)
			.catch(() => setFailed(true));
		if (!adminKey) return;
		fetch(`${apiUrl}/responses`, { headers: { Authorization: `Bearer ${adminKey}` } })
			.then((response) => (response.ok ? response.json() : Promise.reject()))
			.then((data: { responses: RawResponse[] }) => setRaw(data.responses))
			.catch(() => setRaw("denied"));
	}, [unlocked, adminKey]);

	if (saved === undefined) return <Header />;
	if (!unlocked) {
		return (
			<>
				<Header />
					<BeforeForm />
			</>
		);
	}

	if (!stats) {
		return (
			<>
				<Header />
				<main id="contenido" className="db wrap">
					<p className="db-status" role="status">
						{failed
							? "No hemos podido cargar el mapa del círculo. Inténtalo de nuevo en un rato."
							: "Dibujando el mapa del círculo…"}
					</p>
				</main>
			</>
		);
	}

	if (stats.total === 0) {
		return (
			<>
				<Header />
				<main id="contenido" className="db wrap">
					<section className="db-empty" aria-labelledby="db-empty-title">
						<p className="eyebrow">EL MAPA DEL CÍRCULO</p>
						<h1 id="db-empty-title" className="ob-title">
							Todavía no hay <span>respuestas.</span>
						</h1>
						<p className="ob-lead">
							Cuando llegue la primera, aquí aparecerán los perfiles, las herramientas y las
							prioridades de conversación del círculo.
						</p>
						<Link className="button" href="/app">
							Compartir mis respuestas <Icon name="arrow" />
						</Link>
					</section>
				</main>
			</>
		);
	}

	const total = stats.total;
	const me = saved?.completed ? saved : null;
	const seats = allocateSeats(stats.roles, total);
	const heavyUsers = ["daily", "core", "agents"].reduce((sum, id) => sum + (stats.levels[id] ?? 0), 0);
	const [topToolId, topToolCount] = ranked(stats.tools)[0] ?? ["", 0];
	const topToolName = topToolId ? toolLabel(topToolId) : "";
	const toolBase = toolRole === "all" ? total : (stats.roles[toolRole] ?? 0);
	const toolCounts = toolRole === "all" ? stats.tools : (stats.toolsByRole[toolRole] ?? {});
	const toolRanking = ranked(toolCounts).slice(0, 12);
	const topicRanking = ranked(stats.topics);
	const topicMax = topicRanking[0]?.[1] ?? 0;
	const breakers = icebreakers(stats);
	const myRole = me?.answers.role ?? "";
	const peers = stats.roles[myRole] ?? 0;
	const peerTools = ranked(stats.toolsByRole[myRole] ?? {})
		.filter(([tool]) => !me?.answers.tools.includes(tool))
		.slice(0, 3);
	const myLevelIndex = levels.findIndex((level) => level.id === me?.answers.level);
	const questions = Array.isArray(raw) ? raw.filter((row) => row.question) : [];

	return (
		<>
			<Header />
			<main id="contenido" className="db wrap">
				<section className="db-hero" aria-labelledby="db-title">
					<div>
						<p className="eyebrow">
							<span className="section-number">EL MAPA DEL CÍRCULO /</span> {event.date.toUpperCase()}
						</p>
						<h1 id="db-title" className="ob-title">
							Así usa la IA <span>el círculo.</span>
						</h1>
						<p className="ob-lead">
							<strong>{total} personas</strong> han respondido. Esto es lo que traemos a la
							conversación del {event.date.toLowerCase()}.
						</p>
						{me?.answers.name?.trim() && (
							<p className="db-greeting">Gracias por participar, {me.answers.name.trim()}.</p>
						)}
					</div>
				</section>

				<section className="db-facts" aria-label="Datos destacados">
					<article>
						<BigNumber value={pct(heavyUsers, total)} suffix="%" />
						<p>la tiene integrada en su flujo de trabajo o trabaja con agentes</p>
					</article>
					<article>
						<BigNumber value={pct(topToolCount, total)} suffix="%" />
						<p className="db-fact-tool">
							{topToolId && <ToolIcon id={topToolId} label={topToolName} />}
							usa {topToolName || "—"}
						</p>
					</article>
					<article>
						<strong className="db-big">
							{decimal(total ? stats.toolSelections / total : 0)}
						</strong>
						<p>herramientas de media por persona</p>
					</article>
					<article>
						<BigNumber value={pct(stats.levels.agents ?? 0, total)} suffix="%" />
						<p>tiene un enjambre de agentes casi siempre activo</p>
					</article>
				</section>

				<section className="db-section db-who" aria-labelledby="db-who-title">
					<div className="db-section-head">
						<p className="eyebrow">
							<span className="section-number">01 /</span> QUIÉN VIENE
						</p>
						<h2 id="db-who-title">Un círculo muy mezclado.</h2>
						<p>Cada silla es un {Math.round(100 / seatCount)}% del círculo, más o menos.</p>
					</div>
					<div className="db-who-layout">
						<div className="db-ring" role="img" aria-label="Reparto de perfiles del círculo">
							{seats.map((role, i) => (
								<span
									key={i}
									className={`db-seat ${role === myRole ? "is-mine" : ""}`}
									style={{
										background: roleColors[role],
										transform: `rotate(${(i * 360) / seatCount}deg) translateY(calc(-1 * var(--ring-radius)))`,
									}}
								/>
							))}
							<div className="db-ring-center">
								<strong>{total}</strong>
								<span>personas</span>
							</div>
						</div>
						<ul className="db-legend">
							{ranked(stats.roles).map(([role, count]) => (
								<li key={role} className={role === myRole ? "is-mine" : ""}>
									<span className="db-dot" style={{ background: roleColors[role] }} />
									<Icon name={roleIcons[role] ?? "more"} />
									<span className="db-legend-label">
										{labelOf(roles, role)}
										{role === myRole && <em>tú</em>}
									</span>
									<strong>{pct(count, total)}%</strong>
									<small>{count}</small>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="db-section" aria-labelledby="db-tools-title">
					<div className="db-section-head">
						<p className="eyebrow">
							<span className="section-number">02 /</span> LA CAJA DE HERRAMIENTAS
						</p>
						<h2 id="db-tools-title">Lo que tenemos abierto en otra pestaña.</h2>
					</div>
					<div className="db-filters" role="group" aria-label="Filtrar por perfil">
						<button type="button" aria-pressed={toolRole === "all"} onClick={() => setToolRole("all")}>
							Todo el círculo
						</button>
						{roles
							.filter((role) => stats.roles[role.id])
							.map((role) => (
								<button
									key={role.id}
									type="button"
									aria-pressed={toolRole === role.id}
									onClick={() => setToolRole(role.id)}
								>
									{role.label}
								</button>
							))}
					</div>
					<div className="db-tools-layout">
						<ol className="db-ranking">
							{toolRanking.map(([tool, count], i) => (
								<li key={tool}>
									<span className="db-rank">{String(i + 1).padStart(2, "0")}</span>
									<ToolIcon id={tool} label={toolLabel(tool)} />
									<span className="db-ranking-label">
										{toolLabel(tool)}
										{me?.answers.tools.includes(tool) && <em>tú</em>}
									</span>
									<Bar value={count} max={toolBase} />
									<strong>{pct(count, toolBase)}%</strong>
								</li>
							))}
						</ol>
						{me && (
							<aside className="db-foryou">
								<p className="db-me-label">Para ti</p>
								<h3>
									Lo que usan otras personas de {labelOf(roles, myRole)} y tú todavía no.
								</h3>
								{peerTools.length > 0 ? (
									<ul>
										{peerTools.map(([tool, count]) => (
											<li key={tool}>
											<ToolIcon id={tool} label={toolLabel(tool)} />
											<span>{toolLabel(tool)}</span>
												<strong>{pct(count, peers)}%</strong>
											</li>
										))}
									</ul>
								) : (
									<p>Ya usas todas las herramientas que aparecen entre personas de tu perfil.</p>
								)}
								<p className="db-foryou-note">Buen tema para el Tercer Tiempo™.</p>
							</aside>
						)}
					</div>
				</section>

				<section className="db-section db-split">
					<div aria-labelledby="db-levels-title">
						<div className="db-section-head">
							<p className="eyebrow">
								<span className="section-number">03 /</span> INTENSIDAD
							</p>
							<h2 id="db-levels-title">¿Qué papel tiene la IA en nuestro trabajo?</h2>
						</div>
						<div className="db-stack" role="img" aria-label="Reparto por intensidad de trabajo con IA">
							{levels.map((level, i) => (
								<span
									key={level.id}
									style={{
										flexGrow: stats.levels[level.id] ?? 0,
										background: levelColors[i],
									}}
								/>
							))}
						</div>
						<ul className="db-levels">
							{levels.map((level, i) => (
								<li key={level.id} className={i === myLevelIndex ? "is-mine" : ""}>
									<span className="db-dot" style={{ background: levelColors[i] }} />
									<Icon name={levelIcons[level.id]} />
									<span className="db-legend-label">
										{level.label}
										{i === myLevelIndex && <em>tú</em>}
									</span>
									<strong>{pct(stats.levels[level.id] ?? 0, total)}%</strong>
								</li>
							))}
						</ul>
					</div>

					<div aria-labelledby="db-topics-title">
						<div className="db-section-head">
							<p className="eyebrow">
								<span className="section-number">04 /</span> EL ORDEN DEL DÍA
							</p>
							<h2 id="db-topics-title">Los temas que van primero.</h2>
							<p>Cada persona ordena los temas: el primero recibe 6 puntos y el último, 1.</p>
						</div>
						<ol className="db-topics">
							{topicRanking.map(([topic, count], i) => (
								<li key={topic}>
									<span className="db-rank">{String(i + 1).padStart(2, "0")}</span>
									<Icon name={topicIcons[topic] ?? "talk"} />
									<span className="db-topic-text">
										<span className="db-legend-label">
											{labelOf(topics, topic)}
											{me?.answers.topics.includes(topic) && <em>tu nº {me.answers.topics.indexOf(topic) + 1}</em>}
										</span>
										<Bar value={count} max={topicMax} color="var(--forest)" />
									</span>
								<strong>{count} pts</strong>
								</li>
							))}
						</ol>
					</div>
				</section>

				{breakers.length > 0 && (
					<section className="db-section db-breakers" aria-labelledby="db-breakers-title">
						<div className="db-section-head">
							<p className="eyebrow">
								<span className="section-number">05 /</span> ROMPEHIELOS
							</p>
							<h2 id="db-breakers-title">Para el Tercer Tiempo™.</h2>
							<p>Lo que un perfil usa mucho más que la media. Buena excusa para preguntar.</p>
						</div>
						<div className="db-breakers-grid">
							{breakers.map((item) => (
								<article key={item.role}>
									<ToolIcon id={item.tool} label={toolLabel(item.tool)} />
									<p>
										En <strong>{labelOf(roles, item.role)}</strong>, el {Math.round(item.share * 100)}%
										usa <strong>{toolLabel(item.tool)}</strong>:{" "}
										<span className="db-lift">{decimal(item.lift)}×</span> más que la media.
									</p>
									<p className="db-breaker-ask">Pregúntales qué le piden.</p>
								</article>
							))}
						</div>
					</section>
				)}

				{raw && (
					<section className="db-section db-admin" aria-labelledby="db-admin-title">
						<div className="db-section-head">
							<p className="eyebrow">
								<span className="section-number">SOLO ORGANIZACIÓN /</span> RESPUESTAS
							</p>
							<h2 id="db-admin-title">Otras ideas para la conversación.</h2>
						</div>
						{raw === "denied" ? (
							<p className="ob-error" role="alert">
								La clave de organización no es válida.
							</p>
						) : (
							<>
								<ul className="db-questions">
									{questions.map((row) => (
										<li key={row.id}>
											<p>{row.question}</p>
											<small>
												{row.name ? `${row.name} · ` : ""}
												{labelOf(roles, row.role)} · {labelOf(levels, row.level)}
											</small>
										</li>
									))}
								</ul>
								<div className="db-table-wrap">
									<table className="db-table">
										<caption>{raw.length} respuestas</caption>
										<thead>
											<tr>
												<th scope="col">Fecha</th>
												<th scope="col">Nombre</th>
												<th scope="col">Perfil</th>
												<th scope="col">Nivel</th>
												<th scope="col">Herramientas</th>
												<th scope="col">Temas</th>
												<th scope="col">Algo más para hablar</th>
											</tr>
										</thead>
										<tbody>
											{raw.map((row) => (
												<tr key={row.id}>
													<td>
														{new Date(row.created_at).toLocaleString("es-ES", {
															dateStyle: "short",
															timeStyle: "short",
														})}
													</td>
													<td>{row.name || "—"}</td>
													<td>{labelOf(roles, row.role)}</td>
													<td>{levels.find((level) => level.id === row.level)?.short}</td>
													<td>{row.tools.map(toolLabel).join(", ")}</td>
													<td>{row.topics.map((topic) => labelOf(topics, topic)).join(" · ")}</td>
													<td>{row.question}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</section>
				)}
			</main>
		</>
	);
}
