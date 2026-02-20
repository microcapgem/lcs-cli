import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type Provider = "anthropic" | "openai";

export interface AgentConfig {
  enabled: boolean;
  temperature: number;
  provider: Provider;
}

export interface LCSConfig {
  model: string;
  openaiModel: string;
  apiKey: string | null;
  openaiApiKey: string | null;
  agents: Record<string, AgentConfig>;
  synthesis: {
    model: string;
    temperature: number;
    provider: Provider;
  };
}

const LCS_DIR = join(process.cwd(), ".lcs");
const CONFIG_FILE = join(LCS_DIR, "config.json");

const DEFAULT_CONFIG: LCSConfig = {
  model: "claude-sonnet-4-5-20250929",
  openaiModel: "gpt-4o",
  apiKey: null,
  openaiApiKey: null,
  agents: {
    builder:    { enabled: true, temperature: 0.3, provider: "anthropic" },
    researcher: { enabled: true, temperature: 0.5, provider: "anthropic" },
    critic:     { enabled: true, temperature: 0.3, provider: "anthropic" },
    security:   { enabled: true, temperature: 0.1, provider: "anthropic" },
  },
  synthesis: {
    model: "claude-sonnet-4-5-20250929",
    temperature: 0.2,
    provider: "anthropic",
  },
};

export function loadConfig(): LCSConfig {
  let config = structuredClone(DEFAULT_CONFIG);

  if (existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Partial<LCSConfig>;
    config = { ...config, ...raw, agents: { ...config.agents, ...raw.agents }, synthesis: { ...config.synthesis, ...raw.synthesis } };
  }

  // API keys: config file → env var → null
  if (!config.apiKey) {
    config.apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  }
  if (!config.openaiApiKey) {
    config.openaiApiKey = process.env.OPENAI_API_KEY ?? null;
  }

  return config;
}

export function initConfig(): string {
  if (!existsSync(LCS_DIR)) {
    mkdirSync(LCS_DIR, { recursive: true });
  }
  if (existsSync(CONFIG_FILE)) {
    return `Config already exists at ${CONFIG_FILE}`;
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf-8");
  return `Config created at ${CONFIG_FILE}\nSet API keys via env vars: ANTHROPIC_API_KEY and/or OPENAI_API_KEY`;
}

/** Check if a specific provider's API key is available. */
export function isProviderAvailable(config: LCSConfig, provider: Provider): boolean {
  if (provider === "anthropic") return config.apiKey !== null && config.apiKey.length > 0;
  if (provider === "openai") return config.openaiApiKey !== null && config.openaiApiKey.length > 0;
  return false;
}

/** Check if ANY LLM provider is available. */
export function isLLMAvailable(config: LCSConfig): boolean {
  return isProviderAvailable(config, "anthropic") || isProviderAvailable(config, "openai");
}

/** Get the model string for a given provider. */
export function getModelForProvider(config: LCSConfig, provider: Provider): string {
  return provider === "openai" ? config.openaiModel : config.model;
}
