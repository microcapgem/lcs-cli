import type { LCSPacket, AgentResult } from "./types.js";
import type { LCSConfig } from "../config.js";
import { isLLMAvailable } from "../config.js";
import { llmCall } from "../llm/client.js";
import { BUILDER_SYSTEM } from "./prompts.js";

function heuristic(pkt: LCSPacket): AgentResult {
  const notes: string[] = [];
  const lines: string[] = [];

  if (pkt.intent === "build" || pkt.intent === "design") {
    notes.push("User request maps to a constructive task.");
    lines.push(`Implementation plan for: "${pkt.userText}"`);
    lines.push("1. Define interfaces and data contracts.");
    lines.push("2. Scaffold module structure.");
    lines.push("3. Implement core logic with safety checks.");
    lines.push("4. Add tests and trace logging.");
  } else {
    notes.push("Non-build intent; providing structural guidance.");
    lines.push(`Structural analysis of: "${pkt.userText}"`);
    lines.push("- Identify key components.");
    lines.push("- Map dependencies.");
  }

  if (pkt.risk === "high") {
    notes.push("High risk detected — recommending gated execution.");
  }

  return {
    agent: "builder",
    notes,
    proposedAnswer: lines.join("\n"),
    confidence: pkt.intent === "build" ? 0.85 : 0.6,
    source: "heuristic",
  };
}

export async function runBuilder(pkt: LCSPacket, config: LCSConfig, memoryContext: string): Promise<AgentResult> {
  if (!isLLMAvailable(config)) return heuristic(pkt);

  try {
    const agentConf = config.agents.builder;
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
      system: BUILDER_SYSTEM,
      user: userMsg,
      model: config.model,
      temperature: agentConf.temperature,
    });

    return {
      agent: "builder",
      notes: [`LLM response (${config.model})`],
      proposedAnswer: raw,
      confidence: 0.85,
      source: "llm",
    };
  } catch (err) {
    const fallback = heuristic(pkt);
    fallback.notes.unshift(`LLM call failed, using heuristic: ${(err as Error).message}`);
    return fallback;
  }
}
