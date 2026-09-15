import Image from "next/image";
import { preload } from "react-dom";
import { Icon } from "@/components/icon";
import { event } from "@/lib/event.mjs";

const heroWidths = [
	320,
	384,
	480,
	640,
	750,
	828,
	900,
	1080,
	1448,
] as const;
const heroSizes =
	"(max-width: 760px) min(100vw, 620px), min(72vw, 850px)";
const heroSource = (width: (typeof heroWidths)[number], format: "avif" | "webp") =>
	format === "webp" && width === 1448
		? "/images/hero.webp"
		: `/images/hero-${width}.${format}`;
const heroSrcSet = (format: "avif" | "webp") =>
	heroWidths.map((width) => `${heroSource(width, format)} ${width}w`).join(", ");

function HeroImage() {
	const avifSrcSet = heroSrcSet("avif");
	const webpSrcSet = heroSrcSet("webp");
	preload(heroSource(1448, "avif"), {
		as: "image",
		type: "image/avif",
		imageSrcSet: avifSrcSet,
		imageSizes: heroSizes,
		fetchPriority: "high",
	});

	return (
		<picture>
			<source type="image/avif" srcSet={avifSrcSet} sizes={heroSizes} />
			<source type="image/webp" srcSet={webpSrcSet} sizes={heroSizes} />
			<img
				src="/images/hero.webp"
				srcSet={webpSrcSet}
				sizes={heroSizes}
				alt=""
				width={1448}
				height={1086}
				fetchPriority="high"
				decoding="async"
			/>
		</picture>
	);
}

function RegisterLink({ small = false }: { small?: boolean }) {
	return (
		<a
			className={`button ${small ? "button-small" : ""}`}
			href={event.registrationUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			Apúntate aquí <Icon name="arrow" />
			<span className="sr-only"> (abre en otra pestaña)</span>
		</a>
	);
}

export default function Home() {
	return (
		<>
			<a className="skip-link" href="#contenido">
				Saltar al contenido
			</a>
			<header className="site-header wrap">
				<a href="#" className="brand" aria-label="The Mêlée, inicio">
					<Image src="/images/logo.webp" alt="" width={42} height={42} />
					<span>
						the mêlée<span className="brand-dot">.</span>
					</span>
				</a>
				<RegisterLink small />
			</header>

			<main id="contenido">
				<section className="hero" aria-labelledby="hero-title">
					<div className="hero-art">
						<HeroImage />
					</div>
					<div className="hero-content wrap">
						<div className="hero-copy">
							<h1 id="hero-title">
								The Mêlée
								<br />
								<span>¡vuelve!</span>
							</h1>
							<div className="hero-date">
								<span className="hero-detail">
									<Icon name="calendar" />
									<span>{event.date}</span>
								</span>
								<span className="hero-detail hero-time">
									<Icon name="clock" />
									<span>de 17.00 a 19.00</span>
								</span>
								<a
									className="hero-detail hero-location"
									href={event.mapUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Icon name="pin" />
									<span>
										En el Garate Innogunea,
										<br />
										Universidad de Deusto (Donostia)
									</span>
									<span className="sr-only">
										(abre Google Maps en otra pestaña)
									</span>
								</a>
							</div>
							<p className="hero-lead">
								Sí, lo has adivinado:
								<br />
								<strong>hablaremos de IA.</strong>
							</p>
							<div className="cta-group">
								<RegisterLink />
								<span className="free-note">
									<Icon name="check" /> Es gratis. ¡Vente!
								</span>
							</div>
							<p className="hero-after">
								Y luego, nuestro habitual <strong>Tercer Tiempo™</strong>
								<br className="desktop-break" /> en el Vía Fora: algo de picoteo
								y unas cervezas.
							</p>
						</div>
						<div className="hero-scribble" aria-hidden="true">
							Ya tocaba,
							<br />
							<span>¿no?</span>
							<svg viewBox="0 0 70 55" fill="none">
								<path
									d="M13 3c-8 21 8 37 42 29m-12-9 14 8-9 13"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<a
							className="hero-scroll"
							href="#conversacion"
							aria-label="Descubre de qué vamos a hablar"
						>
							<Icon name="down" />
						</a>
					</div>
				</section>

				<div className="community-strip" aria-hidden="true">
					<div className="wrap strip-inner">
						<span>GENTE CON INQUIETUDES</span>
						<Icon name="star" />
						<span>COMPARTIR IDEAS</span>
						<Icon name="star" />
						<span>GANAS DE VERNOS</span>
						<Icon name="star" />
						<span>THE MÊLÉE IS BACK</span>
					</div>
				</div>

				<section
					id="conversacion"
					className="conversation wrap section-space"
					aria-labelledby="conversation-title"
				>
					<div className="section-intro">
						<p className="eyebrow">
							<span className="section-number">01 /</span> LA CONVERSACIÓN
						</p>
						<h2 id="conversation-title">
							Mucho que
							<br />
							compartir.
							<br />
							<span className="muted-heading">Y que aprender.</span>
						</h2>
						<p>
							La IA está cambiando cómo trabajamos.
							<br />
							¿Qué mejor que juntarnos, compartir lo que sabemos
							<br className="desktop-break" /> y aprender de los demás?
						</p>
						<p className="hand-note">
							Experiencias reales.
							<br />
							Dudas muy humanas.
						</p>
					</div>
					<div className="topics">
						<article className="topic">
							<span className="topic-number">01</span>
							<div>
								<span className="topic-label">DEL PROMPT AL COMMIT</span>
								<h3>La IA en nuestro día a día</h3>
								<p>
									¿Cómo estamos trabajando con ella? Desarrollo asistido por IA,
									flujos de trabajo, sistemas agénticos, qué nos está funcionando,
									y qué no.
								</p>
								<span className="topic-tag">AI-assisted engineering</span>
							</div>
						</article>
						<article className="topic">
							<span className="topic-number">02</span>
							<div>
								<span className="topic-label">NUEVOS PARADIGMAS</span>
								<h3>Cuando los roles se mezclan</h3>
								<p>
									Desarrolladores haciendo de PM, diseñadores abriendo pull
									requests y equipos cruzando las fronteras de sus roles. Los
									nuevos paradigmas que trae la IA y cómo están cambiando nuestra
									forma de crear producto.
								</p>
								<span className="topic-tag">Dev × Product × Design</span>
							</div>
						</article>
						<article className="topic">
							<span className="topic-number">03</span>
							<div>
								<span className="topic-label">DE LA PRUEBA AL CAMBIO</span>
								<h3>Cómo integrar la IA en las empresas</h3>
								<p>
									Por dónde empezar, cómo detectar oportunidades reales y qué
									necesitan los equipos para adoptar la IA con criterio. Casos,
									aprendizajes y retos para pasar de los experimentos al impacto.
								</p>
								<span className="topic-tag">Adopción de IA</span>
							</div>
						</article>
						<article className="topic">
							<span className="topic-number">04</span>
							<div>
								<span className="topic-label">¿Y AHORA QUÉ?</span>
								<h3>El presente. Y lo que viene.</h3>
								<p>
									Cómo está cambiando la ingeniería de software, qué habilidades
									queremos cuidar y cómo nos imaginamos el futuro de nuestra
									profesión.
								</p>
								<span className="topic-tag">El futuro del desarrollo</span>
							</div>
						</article>
						<p className="open-agenda">
							<Icon name="plus" /> Y lo que tú traigas. La conversación está
							abierta.
						</p>
					</div>
				</section>

				<section
					id="formato"
					className="fishbowl-section"
					aria-labelledby="fishbowl-title"
				>
					<div className="wrap fishbowl-layout">
						<div className="fishbowl-visual">
							<p className="eyebrow">
								<span className="section-number">02 /</span> EL FORMATO
							</p>
							<div
								className="fishbowl-diagram"
								role="img"
								aria-label="Formato fishbowl: todas las personas pueden participar, tanto desde el círculo interior como desde el exterior. Las personas y la palabra van rotando."
							>
								<div className="orbit orbit-outer" />
								<div className="orbit orbit-inner" />
								{Array.from({ length: 12 }, (_, i) => (
									<span
										className="seat seat-outer"
										key={`outer-${i}`}
										style={{
											transform: `rotate(${i * 30}deg) translateY(calc(-1 * var(--outer-radius)))`,
										}}
									/>
								))}
								{Array.from({ length: 5 }, (_, i) => (
									<span
										className={`seat seat-inner ${i === 4 ? "seat-empty" : ""}`}
										key={`inner-${i}`}
										style={{
											transform: `rotate(${i * 72 + 18}deg) translateY(-79px)`,
										}}
									/>
								))}
								<div className="diagram-center">
									<Icon name="talk" />
									<span>
										Tu voz
										<br />
										también cuenta.
									</span>
								</div>
								<span className="diagram-note">Hay sitio para ti.</span>
							</div>
						</div>
						<div className="fishbowl-copy">
							<span className="outline-tag">FISHBOWL</span>
							<h2 id="fishbowl-title">
								La buena charla
								<br />
								se hace en círculo.
							</h2>
							<p>
								Esta vez nos sentamos en círculos para debatir de
								forma fluida, participativa y con una persona moderando para que
								la conversación ruede.
							</p>
							<ol className="format-steps">
								<li>
									<span>01</span>
									<p>
										<strong>Todas las voces tienen sitio.</strong> Estés en el
										círculo interior o alrededor, podrás participar en la
										conversación.
									</p>
								</li>
								<li>
									<span>02</span>
									<p>
										<strong>En el centro se abre el hilo.</strong> Un grupo pequeño
										empieza compartiendo experiencias para poner la charla en
										marcha.
									</p>
								</li>
								<li>
									<span>03</span>
									<p>
										<strong>La palabra y las sillas circulan.</strong> Puedes
										sumarte, aportar desde donde estés y dejar espacio a otra
										persona.
									</p>
								</li>
							</ol>
							<p className="fishbowl-footnote">
								Trae tus ideas, tus dudas y tus ganas. El resto sale solo.
							</p>
						</div>
					</div>
				</section>

				<section
					id="comunidad"
					className="about wrap section-space"
					aria-labelledby="about-title"
				>
					<div className="about-heading">
						<p className="eyebrow">
							<span className="section-number">03 /</span> LA COMUNIDAD
						</p>
						<h2 id="about-title">
							Mucho más
							<br />
							que avatares.
						</h2>
						<div className="about-motto">
							<Icon name="star" />
							<span>
								Hacer. Crear.
								<br />
								<em>Compartir.</em>
							</span>
						</div>
					</div>
					<div className="about-copy">
						<p className="about-kicker">Por si no sabes qué es The Mêlée…</p>
						<p>
							Somos una comunidad de personas de Gipuzkoa con inquietudes y ganas
							de hacer cosas. Nos juntamos profesionales del desarrollo, ingeniería, diseño,
							UX, marketing, gente que emprende, estudiantes… y quien tenga
							curiosidad.
						</p>
						<p>
							Nos gusta mezclar perfiles, aprender de la experiencia de otras
							personas y ponerle cara a quien está al otro lado de la pantalla.
							A veces con charlas, otras creando en compañía. Siempre
							compartiendo.
						</p>
						<p>
							Y después está el <strong>Tercer Tiempo™</strong>: ese rato de
							cañas, tostas y conversaciones muy interesantes.
						</p>
						<p className="welcome-line">
							¿Tu primera Mêlée? Serás bienvenid@.
						</p>
						<a
							className="text-link"
							href={event.communityUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							Un poco de nuestra historia <Icon name="arrow" />
							<span className="sr-only"> (abre en otra pestaña)</span>
						</a>
					</div>
				</section>

				<section
					id="apuntate"
					className="closing-section wrap"
					aria-labelledby="closing-title"
				>
					<div className="closing-card">
						<div className="closing-main">
							<p className="eyebrow">
								CIERRA UN RATO EL EDITOR Y VENTE.
							</p>
							<h2 id="closing-title">
								Venga, <span>anímate.</span>
							</h2>
							<p>
								Meleeras, meleeros y gente por conocer:
								<br />
								tenemos IA para rato y muchas ganas de vernos.
							</p>
							<div className="closing-details">
								<span>{event.date}</span>
								<span>{event.time}</span>
								<span>{event.city}</span>
							</div>
							<div className="cta-group">
								<RegisterLink />
								<span className="free-note">
									Entrada gratis.
									<br />
									Buen rollo incluido.
								</span>
							</div>
							<a
								className="closing-venue"
								href={event.mapUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon name="pin" /> {event.locationLabel}
								<span className="sr-only"> (abre Google Maps en otra pestaña)</span>
							</a>
						</div>
						<div className="closing-side">
							<div className="date-stamp">
								<span>{event.month}</span>
								<strong>{event.day}</strong>
								<span>NOS VEMOS.</span>
							</div>
							<span className="closing-handnote">
								Y luego, al Vía Fora <Icon name="beer" />
							</span>
						</div>
					</div>
				</section>
			</main>

			<footer className="site-footer wrap">
				<a href="#" className="brand" aria-label="Volver al inicio">
					<Image src="/images/logo.webp" alt="" width={32} height={32} />
					<span>
						the mêlée<span className="brand-dot">.</span>
					</span>
				</a>
				<a href={event.communityUrl} target="_blank" rel="noopener noreferrer">
					themelee.org <Icon name="arrow" />
					<span className="sr-only"> (abre en otra pestaña)</span>
				</a>
			</footer>
		</>
	);
}
