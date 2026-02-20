import type { LCSPacket, AgentResult } from "./types.js";

export function runCritic(pkt: LCSPacket): AgentResult {
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
  };
}
