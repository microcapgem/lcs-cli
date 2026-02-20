import type { LCSPacket, AgentResult } from "./types.js";

export function runResearcher(pkt: LCSPacket): AgentResult {
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
  };
}
