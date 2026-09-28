// Live session catalogue shared by /live, /live/screen, /live/control and the API.
// Topics come from lib/onboarding.mjs. Votes store option positions: reordering
// or removing options of a poll that already has votes changes their meaning.

export const scenes = [
  { id: "welcome", label: "Bienvenida" },
  { id: "circle", label: "El círculo" },
  { id: "topic", label: "Tema" },
  { id: "poll", label: "Votación" },
  { id: "message", label: "Mensaje" },
];

export const topicDetails = {
  daily:
    "Cómo estamos trabajando con ella: desarrollo asistido por IA, flujos de trabajo, context switching y qué nos está funcionando, y qué no.",
  roles:
    "Desarrolladores haciendo de PM, diseñadores abriendo pull requests y equipos cruzando las fronteras de sus roles.",
  adoption:
    "Por dónde empezar, cómo detectar oportunidades reales y qué necesitan los equipos para pasar de los experimentos al impacto.",
  future:
    "Cómo está cambiando la ingeniería de software, qué habilidades queremos cuidar y cómo imaginamos el futuro de la profesión.",
  agents:
    "Agentes que programan, investigan y automatizan. Cuánta autonomía les damos, cómo los orquestamos y qué hemos aprendido.",
  trust:
    "Revisar lo que genera la IA, proteger los datos y decidir quién responde cuando algo falla.",
};

// `multi: true` lets people pick several options; `max` caps how many.
export const polls = [
  {
    id: "daily-1",
    topic: "daily",
    question: "Del código que llega a producción, ¿cuánto ha escrito la IA?",
    options: ["Casi nada", "Menos de la mitad", "Más o menos la mitad", "Casi todo", "No escribo código"],
  },
  {
    id: "daily-2",
    topic: "daily",
    question: "¿Dónde te ahorra más tiempo?",
    multi: true,
    max: 3,
    options: [
      "Escribir código nuevo",
      "Entender código ajeno o legacy",
      "Tests",
      "Depurar errores",
      "Documentación y specs",
      "Investigar y aprender",
      "Emails, actas y reuniones",
    ],
  },
  {
    id: "daily-3",
    topic: "daily",
    question: "¿Revisas lo que genera la IA línea a línea?",
    options: ["Siempre, todo", "Lo importante; el resto, por encima", "Confío en los tests", "Depende de las prisas"],
  },
  {
    id: "daily-4",
    topic: "daily",
    question: "¿Qué te frena más al trabajar con IA?",
    multi: true,
    max: 2,
    options: [
      "Errores sutiles y alucinaciones",
      "Perder el contexto entre sesiones",
      "El tiempo que se va en revisar",
      "Coste de licencias y tokens",
      "Las políticas de la empresa",
      "No me da tiempo a seguir el ritmo",
    ],
  },
  {
    id: "daily-5",
    topic: "daily",
    question: "Desde que trabajas con IA, tus días son…",
    options: [
      "Más productivos y más tranquilos",
      "Más productivos, pero más intensos",
      "Parecidos, pero hago otras cosas",
      "Más dispersos: salto de tarea en tarea",
    ],
  },

  {
    id: "roles-1",
    topic: "roles",
    question: "En el último año, ¿qué has hecho que antes era cosa de otro rol?",
    multi: true,
    options: [
      "Prototipar una interfaz",
      "Llevar código a producción",
      "Escribir specs o historias de usuario",
      "Analizar datos por mi cuenta",
      "Diseñar un flujo o una pantalla",
      "Nada, sigo en mi carril",
    ],
  },
  {
    id: "roles-2",
    topic: "roles",
    question: "¿Quién debería poder abrir una pull request?",
    options: [
      "Solo quien desarrolla",
      "Cualquiera, con revisión técnica",
      "Cualquiera: los tests y la CI deciden",
      "En mi equipo no aplica",
    ],
  },
  {
    id: "roles-3",
    topic: "roles",
    question: "¿Qué rol está cambiando más con la IA?",
    options: ["Desarrollo", "Producto", "Diseño", "QA y testing", "Datos", "Todos por igual"],
  },
  {
    id: "roles-4",
    topic: "roles",
    question: "Si cualquiera puede prototipar en una tarde, ¿qué vale más?",
    multi: true,
    max: 2,
    options: [
      "Saber qué problema resolver",
      "Criterio y gusto de producto",
      "Conocer a fondo a quien lo usa",
      "Arquitectura y calidad técnica",
      "Comunicar y alinear al equipo",
      "Distribución y negocio",
    ],
  },
  {
    id: "roles-5",
    topic: "roles",
    question: "Tu equipo ideal dentro de dos años es…",
    options: [
      "Como ahora, pero con IA",
      "Más pequeño y más generalista",
      "Personas + agentes especializados",
      "Una sola persona con muchos agentes",
    ],
  },

  {
    id: "adoption-1",
    topic: "adoption",
    question: "¿En qué punto está tu empresa con la IA?",
    options: [
      "No se usa (oficialmente)",
      "Cada persona por su cuenta",
      "Pilotos y pruebas",
      "Integrada en algunos procesos",
      "Es parte de la estrategia",
    ],
  },
  {
    id: "adoption-2",
    topic: "adoption",
    question: "¿Tenéis una política de uso de IA?",
    options: [
      "Sí, y se cumple",
      "Sí, pero nadie la ha leído",
      "No, cada uno hace lo que puede",
      "Está prohibida (y se usa igual)",
    ],
  },
  {
    id: "adoption-3",
    topic: "adoption",
    question: "¿Qué frena más la adopción?",
    multi: true,
    max: 3,
    options: [
      "Miedo a exponer datos",
      "Falta de formación",
      "No saber medir el retorno",
      "Resistencia al cambio",
      "Coste",
      "Falta de tiempo para experimentar",
      "Legal y compliance",
    ],
  },
  {
    id: "adoption-4",
    topic: "adoption",
    question: "Si mañana empezaras de cero, ¿por dónde irías?",
    options: [
      "Un caso pequeño con impacto medible",
      "Formación para todo el equipo",
      "Un piloto con un equipo con ganas",
      "Licencias para todos y a ver qué pasa",
      "Traer a alguien que ya sepa",
    ],
  },
  {
    id: "adoption-5",
    topic: "adoption",
    question: "¿Cómo medís lo que aporta la IA?",
    multi: true,
    options: [
      "Tiempo ahorrado",
      "Velocidad de entrega",
      "Calidad y errores",
      "Satisfacción del equipo",
      "Ingresos o costes",
      "No lo medimos (todavía)",
    ],
  },

  {
    id: "future-1",
    topic: "future",
    question: "En cinco años, programar será sobre todo…",
    options: [
      "Escribir código, como ahora",
      "Dirigir y revisar a agentes",
      "Especificar bien qué queremos",
      "Algo que aún no imaginamos",
    ],
  },
  {
    id: "future-2",
    topic: "future",
    question: "¿Qué habilidad quieres cuidar para que no se oxide?",
    multi: true,
    max: 3,
    options: [
      "Programar sin ayuda",
      "Diseño de sistemas y arquitectura",
      "Depurar a fondo",
      "Escribir y comunicar",
      "Entender el negocio",
      "Pensamiento crítico",
      "Aprender a aprender",
    ],
  },
  {
    id: "future-3",
    topic: "future",
    question: "¿Recomendarías hoy empezar una carrera en desarrollo?",
    options: ["Sí, sin dudarlo", "Sí, pero con otro enfoque", "Depende de la persona", "No lo tengo claro", "No"],
  },
  {
    id: "future-4",
    topic: "future",
    question: "Cuando piensas en la IA y tu trabajo, sientes sobre todo…",
    options: ["Ilusión", "Curiosidad", "Vértigo", "Preocupación", "Todo a la vez"],
  },
  {
    id: "future-5",
    topic: "future",
    question: "¿Qué llegará antes?",
    options: [
      "Agentes que entregan features sin supervisión",
      "Equipos de producto de una o dos personas",
      "Una regulación que cambie cómo trabajamos",
      "Que la burbuja se desinfle",
      "Nada de esto, a corto plazo",
    ],
  },

  {
    id: "agents-1",
    topic: "agents",
    question: "¿Cuánta autonomía le das a un agente?",
    options: [
      "Ninguna: sugiere y yo decido",
      "Actúa, pero apruebo cada paso",
      "Trabaja solo y reviso al final",
      "Vía libre en un entorno acotado",
      "Acceso a producción (y duermo tranquilo)",
    ],
  },
  {
    id: "agents-2",
    topic: "agents",
    question: "¿Qué tienes automatizado con IA?",
    multi: true,
    options: [
      "Revisión de código",
      "Tests y QA",
      "Atención al cliente",
      "Informes y análisis",
      "Contenido y marketing",
      "Email, agenda y documentos",
      "Nada todavía",
    ],
  },
  {
    id: "agents-3",
    topic: "agents",
    question: "¿Qué es imprescindible antes de soltar a un agente?",
    multi: true,
    options: [
      "Tests automatizados",
      "Un entorno aislado",
      "Permisos mínimos",
      "Registro de todo lo que hace",
      "Aprobación humana en pasos críticos",
      "Límite de gasto",
    ],
  },
  {
    id: "agents-4",
    topic: "agents",
    question: "¿Con qué orquestas agentes o automatizaciones?",
    multi: true,
    options: [
      "Claude Code",
      "Codex",
      "Cursor",
      "n8n",
      "Make o Zapier",
      "Código propio (SDKs, LangChain…)",
      "Con nada todavía",
    ],
  },
  {
    id: "agents-5",
    topic: "agents",
    question: "¿Tu mayor susto con un agente?",
    options: [
      "Borró o rompió algo",
      "Se inventó algo con total seguridad",
      "Entró en un bucle infinito",
      "Una factura de tokens inesperada",
      "Hizo lo que pedí, no lo que quería",
      "Ninguno… todavía",
    ],
  },

  {
    id: "trust-1",
    topic: "trust",
    question: "¿Qué has compartido con una IA sin pensarlo dos veces?",
    multi: true,
    options: [
      "Código de la empresa",
      "Datos de clientes",
      "Documentos internos",
      "Credenciales o claves (ups)",
      "Datos personales míos",
      "Nada sensible",
    ],
  },
  {
    id: "trust-2",
    topic: "trust",
    question: "¿Cómo aseguras la calidad del código generado?",
    multi: true,
    options: [
      "Revisión humana de cada cambio",
      "Tests automatizados",
      "Otra IA lo revisa primero",
      "Análisis estático y linters",
      "No hay un proceso claro",
    ],
  },
  {
    id: "trust-3",
    topic: "trust",
    question: "Con datos sensibles, ¿dónde deberían correr los modelos?",
    options: [
      "En la nube, con contrato de empresa",
      "Modelos abiertos en infraestructura propia",
      "Depende del dato",
      "Donde sea más rápido y barato",
    ],
  },
  {
    id: "trust-4",
    topic: "trust",
    question: "¿Qué te preocupa más?",
    options: [
      "Fugas de datos",
      "Vulnerabilidades en código generado",
      "Deuda técnica que nadie entiende",
      "Sesgos en decisiones automáticas",
      "Depender de pocos proveedores",
      "Perder habilidades",
    ],
  },
  {
    id: "trust-5",
    topic: "trust",
    question: "Si el código generado por IA falla en producción, ¿quién responde?",
    options: [
      "Quien lo aprobó en la revisión",
      "Quien lo pidió y lo subió",
      "El equipo, como siempre",
      "El proveedor de la herramienta",
      "Nadie lo tiene claro",
    ],
  },
];

export const pollHint = (poll) =>
  !poll.multi
    ? "Elige una opción"
    : poll.max
      ? `Elige hasta ${poll.max}`
      : "Elige todas las que quieras";

export const minPollOptions = 2;
export const maxPollOptions = 7;
export const maxPollQuestionLength = 140;
export const maxPollOptionLength = 70;
export const maxMessageLength = 160;
export const timerPresets = [2, 3, 5, 10, 15];
