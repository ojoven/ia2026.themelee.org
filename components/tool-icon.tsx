import {
  siAnthropic,
  siClaude,
  siCursor,
  siDeepseek,
  siElevenlabs,
  siFigma,
  siGithubcopilot,
  siGooglegemini,
  siHuggingface,
  siJetbrains,
  siLangchain,
  siLmstudio,
  siMake,
  siMistralai,
  siN8n,
  siNotebooklm,
  siNotion,
  siOllama,
  siPerplexity,
  siReplit,
  siV0,
  siWindsurf,
  siZapier,
  type SimpleIcon,
} from "simple-icons";

const brandIcons: Record<string, SimpleIcon> = {
  claude: siClaude,
  gemini: siGooglegemini,
  perplexity: siPerplexity,
  mistral: siMistralai,
  deepseek: siDeepseek,
  cursor: siCursor,
  "github-copilot": siGithubcopilot,
  "claude-code": siAnthropic,
  windsurf: siWindsurf,
  "jetbrains-ai": siJetbrains,
  v0: siV0,
  replit: siReplit,
  figma: siFigma,
  elevenlabs: siElevenlabs,
  notion: siNotion,
  notebooklm: siNotebooklm,
  n8n: siN8n,
  zapier: siZapier,
  make: siMake,
  langchain: siLangchain,
  ollama: siOllama,
  huggingface: siHuggingface,
  lmstudio: siLmstudio,
};

// Brands missing from simple-icons get a monogram in their brand colour.
const monograms: Record<string, [string, string]> = {
  chatgpt: ["G", "10a37f"],
  "ms-copilot": ["C", "0f6cbd"],
  codex: ["Cx", "252821"],
  lovable: ["L", "e8467c"],
  bolt: ["B", "1389fd"],
  midjourney: ["M", "252821"],
  canva: ["C", "00a3b4"],
};

const isLight = (hex: string) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return r * 0.299 + g * 0.587 + b * 0.114 > 170;
};

export function ToolIcon({ id, label }: { id: string; label: string }) {
  const brand = brandIcons[id];
  const [letters, color] = monograms[id] ?? [label.slice(0, 1), "626558"];
  const background = brand?.hex ?? color;
  const ink = isLight(background) ? "#252821" : "#fff";
  const tile = background === "000000" ? "252821" : background;

  return (
    <span className="tool-icon" style={{ background: `#${tile}`, color: ink }} aria-hidden="true">
      {brand ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d={brand.path} />
        </svg>
      ) : (
        <span className="tool-monogram">{letters}</span>
      )}
    </span>
  );
}
