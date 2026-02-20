import type { LCSPacket, AgentResult } from "./types.js";

export function runBuilder(pkt: LCSPacket): AgentResult {
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
  };
}
