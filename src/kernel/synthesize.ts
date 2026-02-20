import type { LCSPacket, AgentResult, SynthesisOutput } from "../agents/types.js";

export function synthesize(pkt: LCSPacket, results: AgentResult[]): SynthesisOutput {
  // ── Context line ──────────────────────────────────────────────
  const context = `[LCS] intent=${pkt.intent} domain=${pkt.domain} mode=${pkt.mode} risk=${pkt.risk}`;

  // ── Find consensus ────────────────────────────────────────────
  // Collect all notes from agents with confidence >= 0.6
  const highConfidence = results.filter((r) => r.confidence >= 0.6);
  const consensus: string[] = [];

  // Extract shared themes
  const allNotes = highConfidence.flatMap((r) => r.notes);
  const uniqueNotes = [...new Set(allNotes)];
  for (const note of uniqueNotes) {
    consensus.push(note);
  }

  // If security flagged something, always surface it
  const securityResult = results.find((r) => r.agent === "security");
  if (securityResult && securityResult.confidence < 0.6) {
    consensus.unshift("SECURITY WARNING: " + securityResult.notes.join("; "));
  }

  // ── Next steps ────────────────────────────────────────────────
  const nextSteps: string[] = [];

  // Builder's concrete steps
  const builderResult = results.find((r) => r.agent === "builder");
  if (builderResult) {
    const actionLines = builderResult.proposedAnswer
      .split("\n")
      .filter((l) => /^\d+\./.test(l.trim()) || /^-/.test(l.trim()));
    nextSteps.push(...actionLines.map((l) => l.trim()));
  }

  // Critic's recommendations
  const criticResult = results.find((r) => r.agent === "critic");
  if (criticResult) {
    const recs = criticResult.proposedAnswer
      .split("\n")
      .filter((l) => l.trim().startsWith("- Recommend") || l.trim().startsWith("- Add") || l.trim().startsWith("- Validate"));
    nextSteps.push(...recs.map((l) => l.trim()));
  }

  if (nextSteps.length === 0) {
    nextSteps.push("- Review the trace output for detailed agent reasoning.");
  }

  nextSteps.push('- Run `lcs trace` to inspect the full execution trace.');

  // ── Summary ───────────────────────────────────────────────────
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const summaryParts: string[] = [
    context,
    "",
    `Processed by ${results.length} agents (avg confidence: ${(avgConfidence * 100).toFixed(0)}%).`,
    "",
  ];

  if (consensus.length > 0) {
    summaryParts.push("Consensus:");
    for (const c of consensus) {
      summaryParts.push(`  * ${c}`);
    }
    summaryParts.push("");
  }

  summaryParts.push("Next steps:");
  for (const step of nextSteps) {
    summaryParts.push(`  ${step}`);
  }

  return {
    context,
    consensus,
    nextSteps,
    summary: summaryParts.join("\n"),
  };
}
