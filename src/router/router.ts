import { randomUUID } from "node:crypto";
import type { Intent, Domain, Risk, Mode, LCSPacket } from "../agents/types.js";

// ── Heuristic keyword maps ─────────────────────────────────────

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  build: ["build", "implement", "create", "code", "write", "scaffold", "make", "add"],
  design: ["design", "architect", "plan", "structure", "layout", "model"],
  research: ["research", "find", "search", "learn", "explain", "compare", "review"],
  general: [],
};

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  ai_architecture: ["ai", "llm", "agent", "model", "neural", "transformer", "lcs", "kernel", "synthesis"],
  general: [],
};

function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (intent === "general") continue;
    if (keywords.some((kw) => lower.includes(kw))) return intent;
  }
  return "general";
}

function classifyDomain(text: string): Domain {
  const lower = text.toLowerCase();
  if (DOMAIN_KEYWORDS.ai_architecture.some((kw) => lower.includes(kw))) return "ai_architecture";
  return "general";
}

function assessRisk(text: string): Risk {
  const lower = text.toLowerCase();
  const dangerSignals = ["exec", "eval", "shell", "sudo", "rm ", "delete", "drop", "inject"];
  if (dangerSignals.some((s) => lower.includes(s))) return "high";
  if (lower.length > 500) return "medium";
  return "low";
}

function chooseMode(intent: Intent): Mode {
  return intent === "design" || intent === "research" ? "high_entropy" : "low_entropy";
}

// ── Router ──────────────────────────────────────────────────────

export function route(userText: string): LCSPacket {
  const intent = classifyIntent(userText);
  const domain = classifyDomain(userText);
  const risk = assessRisk(userText);
  const mode = chooseMode(intent);

  const constraints: string[] = [];
  if (risk === "high") constraints.push("elevated-risk: extra scrutiny required");
  if (mode === "high_entropy") constraints.push("creative-mode: broader exploration");

  const tasks: string[] = [
    `Analyze user request with intent=${intent}`,
    `Apply ${domain} domain knowledge`,
    `Synthesize under ${mode} mode`,
  ];

  return {
    runId: randomUUID(),
    ts: new Date().toISOString(),
    userText,
    intent,
    domain,
    mode,
    risk,
    constraints,
    tasks,
  };
}
