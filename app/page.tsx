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
			Reserva tu plaza <Icon name="arrow" />
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
							<h1 id="hero-title" className="hero-title">
								IA, desarrollo
								<br />
								<span>y producto.</span>
							</h1>
							<p className="hero-lead">
								<strong>¿Cómo la estamos utilizando?<br className="desktop-break" />¿Cómo podemos sacarle el máximo partido?</strong>
							</p>
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
							<div className="cta-group">
								<RegisterLink />
								<span className="free-note">
									<Icon name="check" /> Es gratis. ¡Vente!
								</span>
							</div>
							<p className="hero-after">
								Conversación en formato <strong>fishbowl</strong> y, después,
								<strong>Tercer Tiempo™</strong> en el Vía Fora.
							</p>
						</div>
						<div className="hero-scribble" aria-hidden="true">
							Había ganas de,
							<br />
							<span>The Mêlée.</span>
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
						<span>IA EN EL DÍA A DÍA</span>
						<Icon name="star" />
						<span>DESARROLLO × PRODUCTO</span>
						<Icon name="star" />
						<span>CASOS REALES</span>
						<Icon name="star" />
						<span>CONVERSACIÓN ABIERTA</span>
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
							Mucho que compartir,
							<br />
							<span className="muted-heading">y que aprender.</span>
						</h2>
						<p>
							La IA está cambiando cómo trabajamos.<br className="desktop-break" />
							¿Qué mejor que juntarnos, compartir lo que sabemos<br className="desktop-break" />
							y aprender de los demás?
						</p>
						<p className="hand-note">
							Te la vas a gozar,
							<br />
							ya verás.
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
									flujos de trabajo, context switching, sistemas agénticos, qué nos está funcionando,
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
					id="para-quien"
					className="audience-section section-space"
					aria-labelledby="audience-title"
				>
					<div className="wrap">
						<div className="audience-intro">
							<div>
								<p className="eyebrow">
									<span className="section-number">02 /</span> ¿ES PARA TI?
								</p>
								<h2 id="audience-title">
									Te puede interesar
									<br />
									si eres…
								</h2>
							</div>
						</div>

						<div className="audience-grid">
							<article className="audience-card">
								<span className="audience-number">01</span>
								<h3>Desarrollador/a o software engineer</h3>
								<p>
									Si ya programas con IA y buscas flujos,
									prácticas y aprendizajes que puedas llevarte al trabajo.
								</p>
							</article>
							<article className="audience-card">
								<span className="audience-number">02</span>
								<h3>Consultor/a de IA</h3>
								<p>
									Si acompañas a equipos o empresas y quieres contrastar cómo pasar
									de la demo a una adopción útil, responsable y sostenible.
								</p>
							</article>
							<article className="audience-card">
								<span className="audience-number">03</span>
								<h3>Estudiante o perfil junior</h3>
								<p>
									Si estás entrando en el sector y quieres entender qué está
									cambiando, qué habilidades importan y cómo se trabaja hoy.
								</p>
							</article>
							<article className="audience-card">
								<span className="audience-number">04</span>
								<h3>Profesional de producto</h3>
								<p>
									Si trabajas en producto, diseño, negocio, marketing o educación y
									quieres descubrir cómo la IA transforma equipos y disciplinas.
								</p>
							</article>
						</div>
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
								<span className="section-number">03 /</span> EL FORMATO
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
								Nos sentamos en círculos para debatir de
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
							<span className="section-number">04 /</span> QUIÉNES SOMOS
						</p>
						<h2 id="about-title">
							¿Qué es
							<br />
							The Mêlée?
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
						<p className="about-kicker">Una comunidad local y abierta.</p>
						<p>
							The Mêlée reúne en Gipuzkoa a personas con ganas de crear,
							aprender y compartir. Aquí coinciden profesionales del desarrollo,
							la ingeniería, el diseño, el producto o el marketing, gente que
							emprende, estudiantes… y cualquiera que tenga curiosidad.
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
							¿Tu primera Mêlée? Este también es tu sitio.
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
								UNA TARDE PARA HABLAR DE IA DE VERDAD.
							</p>
							<h2 id="closing-title">
								Trae tus <span>preguntas.</span>
							</h2>
							<p>
								Si la IA está cambiando tu trabajo
								—o quieres entender cómo lo hará—, este encuentro es para ti.
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
									Conversación incluida.
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
				<div className="footer-left">
					<a href="#" className="brand" aria-label="Volver al inicio">
						<Image src="/images/logo.webp" alt="" width={32} height={32} />
						<span>
							the mêlée<span className="brand-dot">.</span>
						</span>
					</a>
					<div className="footer-support">
						<span>con la ayuda de</span>
						<Image
							className="footer-support-logo"
							src="/images/deusto.png"
							alt="Deusto"
							width={263}
							height={63}
						/>
					</div>
				</div>
				<a href={event.communityUrl} target="_blank" rel="noopener noreferrer">
					themelee.org <Icon name="arrow" />
					<span className="sr-only"> (abre en otra pestaña)</span>
				</a>
			</footer>
		</>
	);
}
