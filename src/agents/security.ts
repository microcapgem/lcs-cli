import type { LCSPacket, AgentResult } from "./types.js";
import type { LCSConfig } from "../config.js";
import { isProviderAvailable, getModelForProvider } from "../config.js";
import { callLLM } from "../llm/client.js";
import { SECURITY_SYSTEM } from "./prompts.js";

const INJECTION_PATTERNS = [
  "ignore previous",
  "ignore above",
  "disregard",
  "system prompt",
  "you are now",
  "pretend you",
  "act as",
  "<script",
  "javascript:",
  "onerror=",
  "${",
  "{{",
  "__proto__",
  "constructor[",
];

function heuristic(pkt: LCSPacket): AgentResult {
  const notes: string[] = [];
  const lines: string[] = [];
  const lower = pkt.userText.toLowerCase();

  const detected = INJECTION_PATTERNS.filter((p) => lower.includes(p));

  if (detected.length > 0) {
    notes.push(`Prompt injection patterns detected: ${detected.join(", ")}`);
    lines.push("SECURITY ALERT: Suspicious patterns found in input.");
    lines.push(`Detected: ${detected.join(", ")}`);
    lines.push("Recommendation: Sanitize input. Do not pass to downstream tools.");
    lines.push("Confidence in safe execution: LOW.");
  } else {
    notes.push("No injection patterns detected.");
    lines.push("Security scan: CLEAR.");
    lines.push("No known prompt injection or tool-abuse patterns found.");
  }

  lines.push("");
  lines.push("Standing safety defaults:");
  lines.push("- No shell execution from user input.");
  lines.push("- No eval() or dynamic code generation.");
  lines.push("- No network calls from user-supplied data.");
  lines.push("- All tool invocations require explicit gating.");

  const confidence = detected.length > 0 ? 0.4 : 0.9;

  return {
    agent: "security",
    notes,
    proposedAnswer: lines.join("\n"),
    confidence,
    source: "heuristic",
  };
}

export async function runSecurity(pkt: LCSPacket, config: LCSConfig, memoryContext: string): Promise<AgentResult> {
  // Security agent ALWAYS runs the heuristic scan first (fast, deterministic)
  const heuristicResult = heuristic(pkt);

  const agentConf = config.agents.security;
  const provider = agentConf.provider;

  if (!isProviderAvailable(config, provider)) return heuristicResult;

  try {
    const model = getModelForProvider(config, provider);
    const userMsg = `<packet>
intent: ${pkt.intent}
domain: ${pkt.domain}
mode: ${pkt.mode}
risk: ${pkt.risk}
constraints: ${pkt.constraints.join(", ") || "none"}
</packet>

<heuristic_scan>
${heuristicResult.proposedAnswer}
</heuristic_scan>
${memoryContext}
<user_request>
${pkt.userText}
</user_request>`;

    const raw = await callLLM(config, {
      system: SECURITY_SYSTEM,
      user: userMsg,
      model,
      temperature: agentConf.temperature,
    }, provider);

    const mergedNotes = [...heuristicResult.notes, `${provider}:${model}`];

    return {
      agent: "security",
      notes: mergedNotes,
      proposedAnswer: `${heuristicResult.proposedAnswer}\n\n--- LLM Analysis (${provider}) ---\n${raw}`,
      confidence: heuristicResult.confidence,
      source: "llm",
    };
  } catch (err) {
    heuristicResult.notes.unshift(`LLM call failed (${provider}), using heuristic only: ${(err as Error).message}`);
    return heuristicResult;
  }
}
