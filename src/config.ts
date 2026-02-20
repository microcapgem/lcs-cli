import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface AgentConfig {
  enabled: boolean;
  temperature: number;
}

export interface LCSConfig {
  model: string;
  apiKey: string | null;
  agents: Record<string, AgentConfig>;
  synthesis: {
    model: string;
    temperature: number;
  };
}

const LCS_DIR = join(process.cwd(), ".lcs");
const CONFIG_FILE = join(LCS_DIR, "config.json");

const DEFAULT_CONFIG: LCSConfig = {
  model: "claude-sonnet-4-5-20250929",
  apiKey: null,
  agents: {
    builder:    { enabled: true, temperature: 0.3 },
    researcher: { enabled: true, temperature: 0.5 },
    critic:     { enabled: true, temperature: 0.3 },
    security:   { enabled: true, temperature: 0.1 },
  },
  synthesis: {
    model: "claude-sonnet-4-5-20250929",
    temperature: 0.2,
  },
};

export function loadConfig(): LCSConfig {
  let config = structuredClone(DEFAULT_CONFIG);

  if (existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Partial<LCSConfig>;
    config = { ...config, ...raw, agents: { ...config.agents, ...raw.agents }, synthesis: { ...config.synthesis, ...raw.synthesis } };
  }

  // API key: config file → env var → null
  if (!config.apiKey) {
    config.apiKey = process.env.ANTHROPIC_API_KEY ?? null;
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
  return `Config created at ${CONFIG_FILE}\nSet your API key: ANTHROPIC_API_KEY env var or edit config.json`;
}

export function isLLMAvailable(config: LCSConfig): boolean {
  return config.apiKey !== null && config.apiKey.length > 0;
}
