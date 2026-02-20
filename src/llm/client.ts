import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { LCSConfig, Provider } from "../config.js";
import { isProviderAvailable } from "../config.js";

// ── Singletons ──────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function getAnthropicClient(config: LCSConfig): Anthropic {
  if (!_anthropic) {
    if (!config.apiKey) throw new Error("No Anthropic API key configured.");
    _anthropic = new Anthropic({ apiKey: config.apiKey });
  }
  return _anthropic;
}

function getOpenAIClient(config: LCSConfig): OpenAI {
  if (!_openai) {
    if (!config.openaiApiKey) throw new Error("No OpenAI API key configured.");
    _openai = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return _openai;
}

// ── Shared request interface ────────────────────────────────────

export interface LLMRequest {
  system: string;
  user: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

// ── Provider-specific calls ─────────────────────────────────────

async function anthropicCall(config: LCSConfig, req: LLMRequest): Promise<string> {
  const client = getAnthropicClient(config);
  const response = await client.messages.create({
    model: req.model,
    max_tokens: req.maxTokens ?? 1024,
    temperature: req.temperature,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

async function openaiCall(config: LCSConfig, req: LLMRequest): Promise<string> {
  const client = getOpenAIClient(config);
  const response = await client.chat.completions.create({
    model: req.model,
    max_tokens: req.maxTokens ?? 1024,
    temperature: req.temperature,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Unified dispatcher ──────────────────────────────────────────

export async function callLLM(config: LCSConfig, req: LLMRequest, provider: Provider): Promise<string> {
  if (!isProviderAvailable(config, provider)) {
    throw new Error(`${provider} API key not configured.`);
  }

  if (provider === "openai") return openaiCall(config, req);
  return anthropicCall(config, req);
}

/** @deprecated Use callLLM with explicit provider instead. */
export async function llmCall(config: LCSConfig, req: LLMRequest): Promise<string> {
  return callLLM(config, req, "anthropic");
}
