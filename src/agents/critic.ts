import type { LCSPacket, AgentResult } from "./types.js";
import type { LCSConfig } from "../config.js";
import { isLLMAvailable } from "../config.js";
import { llmCall } from "../llm/client.js";
import { CRITIC_SYSTEM } from "./prompts.js";

function heuristic(pkt: LCSPacket): AgentResult {
  const notes: string[] = [];
  const lines: string[] = [];

  lines.push("Failure mode analysis:");

  if (pkt.risk === "high") {
    notes.push("HIGH RISK — flagging for mandatory review.");
    lines.push("- CRITICAL: Input contains potentially dangerous patterns.");
    lines.push("- Recommend: sandbox execution, input sanitization, manual review.");
  } else if (pkt.risk === "medium") {
    notes.push("Medium risk — additional checks advised.");
    lines.push("- Input is lengthy or complex; verify scope before proceeding.");
  } else {
    notes.push("Low risk — standard review.");
    lines.push("- No obvious failure vectors in input.");
  }

  lines.push("General tightening recommendations:");
  lines.push("- Validate all outputs before surfacing to user.");
  lines.push("- Ensure deterministic behavior in synthesis.");
  lines.push("- Add fallback paths for unexpected agent failures.");

  if (pkt.mode === "high_entropy") {
    notes.push("High entropy mode — creative outputs need extra validation.");
    lines.push("- Creative mode active: verify coherence of synthesized output.");
  }

  return {
    agent: "critic",
    notes,
    proposedAnswer: lines.join("\n"),
    confidence: 0.75,
    source: "heuristic",
  };
}

export async function runCritic(pkt: LCSPacket, config: LCSConfig, memoryContext: string): Promise<AgentResult> {
  if (!isLLMAvailable(config)) return heuristic(pkt);

  try {
    const agentConf = config.agents.critic;
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

    const raw = await llmCall(config, {
      system: CRITIC_SYSTEM,
      user: userMsg,
      model: config.model,
      temperature: agentConf.temperature,
    });

    return {
      agent: "critic",
      notes: [`LLM response (${config.model})`],
      proposedAnswer: raw,
      confidence: 0.75,
      source: "llm",
    };
  } catch (err) {
    const fallback = heuristic(pkt);
    fallback.notes.unshift(`LLM call failed, using heuristic: ${(err as Error).message}`);
    return fallback;
  }
}
