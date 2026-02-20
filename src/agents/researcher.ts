import type { LCSPacket, AgentResult } from "./types.js";
import type { LCSConfig } from "../config.js";
import { isProviderAvailable, getModelForProvider } from "../config.js";
import { callLLM } from "../llm/client.js";
import { RESEARCHER_SYSTEM } from "./prompts.js";

function heuristic(pkt: LCSPacket): AgentResult {
  const notes: string[] = [];
  const lines: string[] = [];

  if (pkt.domain === "ai_architecture") {
    notes.push("AI/architecture domain detected — applying specialized knowledge.");
    lines.push("Best practices for AI system design:");
    lines.push("- Separate routing, execution, and synthesis layers.");
    lines.push("- Keep agent outputs structured and typed.");
    lines.push("- Log all decisions for auditability.");
    lines.push("- Treat all user input as untrusted.");
  } else {
    notes.push("General domain — applying broad heuristics.");
    lines.push("General best practices:");
    lines.push("- Break the problem into sub-tasks.");
    lines.push("- Validate assumptions before executing.");
    lines.push("- Document decisions and trade-offs.");
  }

  if (pkt.intent === "research") {
    notes.push("Research intent — emphasizing breadth.");
    lines.push("- Consider multiple approaches before committing.");
    lines.push("- Gather evidence from diverse sources.");
  }

  return {
    agent: "researcher",
    notes,
    proposedAnswer: lines.join("\n"),
    confidence: pkt.intent === "research" ? 0.8 : 0.65,
    source: "heuristic",
  };
}

export async function runResearcher(pkt: LCSPacket, config: LCSConfig, memoryContext: string): Promise<AgentResult> {
  const agentConf = config.agents.researcher;
  const provider = agentConf.provider;

  if (!isProviderAvailable(config, provider)) return heuristic(pkt);

  try {
    const model = getModelForProvider(config, provider);
    const userMsg = `<packet>
intent: ${pkt.intent}
domain: ${pkt.domain}
mode: ${pkt.mode}
risk: ${pkt.risk}
constraints: ${pkt.constraints.join(", ") || "none"}
</packet>
${memoryContext}
<user_request>
${pkt.userText}
</user_request>`;

    const raw = await callLLM(config, {
      system: RESEARCHER_SYSTEM,
      user: userMsg,
      model,
      temperature: agentConf.temperature,
    }, provider);

    return {
      agent: "researcher",
      notes: [`${provider}:${model}`],
      proposedAnswer: raw,
      confidence: 0.8,
      source: "llm",
    };
  } catch (err) {
    const fallback = heuristic(pkt);
    fallback.notes.unshift(`LLM call failed (${provider}), using heuristic: ${(err as Error).message}`);
    return fallback;
  }
}
