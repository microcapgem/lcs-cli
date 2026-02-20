import Anthropic from "@anthropic-ai/sdk";
import type { LCSConfig } from "../config.js";

let _client: Anthropic | null = null;

export function getClient(config: LCSConfig): Anthropic {
  if (!_client) {
    if (!config.apiKey) {
      throw new Error("No API key configured. Set ANTHROPIC_API_KEY or run `lcs init`.");
    }
    _client = new Anthropic({ apiKey: config.apiKey });
  }
  return _client;
}

export interface LLMRequest {
  system: string;
  user: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export async function llmCall(config: LCSConfig, req: LLMRequest): Promise<string> {
  const client = getClient(config);
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
