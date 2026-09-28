// Onboarding catalogue shared by /app, /app/dashboard and the API validation.
// Changing an `id` invalidates stored answers that use it.
export const roles = [
  { id: "dev", label: "Desarrollo", hint: "Software engineer, full-stack, mobile…" },
  { id: "lead", label: "Liderazgo técnico", hint: "CTO, tech lead, engineering manager" },
  { id: "product", label: "Producto", hint: "Product manager, product owner" },
  { id: "design", label: "Diseño", hint: "UX, UI, producto digital" },
  { id: "data", label: "Datos e IA", hint: "Data science, ML, analítica" },
  { id: "consulting", label: "Consultoría de IA", hint: "Acompañas a equipos y empresas" },
  { id: "business", label: "Negocio y marketing", hint: "Ventas, marketing, operaciones" },
  { id: "student", label: "Estudiante o junior", hint: "Entrando en el sector" },
  { id: "other", label: "Otro perfil", hint: "Educación, investigación, curiosidad…" },
];

export const toolCategories = [
  { id: "chat", label: "Asistentes" },
  { id: "code", label: "Código" },
  { id: "build", label: "Prototipado" },
  { id: "create", label: "Diseño y contenido" },
  { id: "work", label: "Productividad" },
  { id: "automate", label: "Automatización y agentes" },
  { id: "local", label: "Modelos abiertos" },
];

export const tools = [
  { id: "chatgpt", label: "ChatGPT", category: "chat" },
  { id: "claude", label: "Claude", category: "chat" },
  { id: "gemini", label: "Gemini", category: "chat" },
  { id: "ms-copilot", label: "Microsoft Copilot", category: "chat" },
  { id: "perplexity", label: "Perplexity", category: "chat" },
  { id: "mistral", label: "Le Chat (Mistral)", category: "chat" },
  { id: "deepseek", label: "DeepSeek", category: "chat" },
  { id: "cursor", label: "Cursor", category: "code" },
  { id: "github-copilot", label: "GitHub Copilot", category: "code" },
  { id: "claude-code", label: "Claude Code", category: "code" },
  { id: "codex", label: "Codex", category: "code" },
  { id: "windsurf", label: "Windsurf", category: "code" },
  { id: "jetbrains-ai", label: "JetBrains AI", category: "code" },
  { id: "v0", label: "v0", category: "build" },
  { id: "lovable", label: "Lovable", category: "build" },
  { id: "bolt", label: "Bolt", category: "build" },
  { id: "replit", label: "Replit", category: "build" },
  { id: "figma", label: "Figma AI", category: "create" },
  { id: "midjourney", label: "Midjourney", category: "create" },
  { id: "canva", label: "Canva", category: "create" },
  { id: "elevenlabs", label: "ElevenLabs", category: "create" },
  { id: "notion", label: "Notion AI", category: "work" },
  { id: "notebooklm", label: "NotebookLM", category: "work" },
  { id: "n8n", label: "n8n", category: "automate" },
  { id: "zapier", label: "Zapier", category: "automate" },
  { id: "make", label: "Make", category: "automate" },
  { id: "langchain", label: "LangChain", category: "automate" },
  { id: "ollama", label: "Ollama", category: "local" },
  { id: "huggingface", label: "Hugging Face", category: "local" },
  { id: "lmstudio", label: "LM Studio", category: "local" },
];

export const customToolPrefix = "custom:";
export const maxCustomTools = 5;
export const maxCustomToolLength = 50;
export const customToolId = (name) => `${customToolPrefix}${name.trim()}`;
export const toolLabel = (id) =>
  id.startsWith(customToolPrefix)
    ? id.slice(customToolPrefix.length)
    : (tools.find((tool) => tool.id === id)?.label ?? id);

export const suggestedTools = {
  dev: ["cursor", "claude-code", "github-copilot", "codex", "chatgpt", "claude", "windsurf", "ollama"],
  lead: ["claude-code", "cursor", "github-copilot", "chatgpt", "claude", "gemini", "notion", "n8n"],
  product: ["chatgpt", "claude", "v0", "lovable", "notion", "figma", "perplexity", "notebooklm"],
  design: ["figma", "midjourney", "v0", "lovable", "chatgpt", "claude", "canva", "bolt"],
  data: ["chatgpt", "claude", "cursor", "github-copilot", "huggingface", "ollama", "langchain", "notebooklm"],
  consulting: ["chatgpt", "claude", "ms-copilot", "gemini", "n8n", "make", "zapier", "perplexity"],
  business: ["chatgpt", "ms-copilot", "gemini", "perplexity", "canva", "notion", "zapier", "claude"],
  student: ["chatgpt", "claude", "gemini", "github-copilot", "cursor", "notebooklm", "perplexity", "lovable"],
  other: ["chatgpt", "claude", "gemini", "perplexity", "ms-copilot", "notion", "notebooklm", "canva"],
};

export const levels = [
  { id: "curious", label: "La uso para tareas puntuales", short: "Tareas puntuales" },
  { id: "weekly", label: "La integro en varias tareas", short: "Varias tareas" },
  { id: "daily", label: "Forma parte de mi flujo de trabajo", short: "Integrada" },
  { id: "core", label: "A veces trabajo con varios agentes en paralelo", short: "Agentes en paralelo" },
  { id: "agents", label: "Tengo un enjambre de agentes trabajando para mí casi 24/7", short: "Enjambre 24/7" },
];

export const topics = [
  { id: "daily", label: "La IA en nuestro día a día", tag: "Del prompt al commit" },
  { id: "roles", label: "Cuando los roles se mezclan", tag: "Nuevos paradigmas" },
  { id: "adoption", label: "Cómo integrar la IA en las empresas", tag: "De la prueba al cambio" },
  { id: "future", label: "El presente. Y lo que viene.", tag: "¿Y ahora qué?" },
  { id: "agents", label: "Agentes y automatización", tag: "Sistemas agénticos" },
  { id: "trust", label: "Calidad, seguridad y privacidad", tag: "IA con criterio" },
];

export const maxTopics = topics.length;
export const maxNameLength = 60;
export const maxQuestionLength = 280;
