import type { LCSPacket, AgentResult, SynthesisOutput } from "../agents/types.js";
import type { LCSConfig } from "../config.js";
import { isProviderAvailable, getModelForProvider } from "../config.js";
import { callLLM } from "../llm/client.js";
import { SYNTHESIS_SYSTEM } from "../agents/prompts.js";

// ── Deterministic fallback (no LLM) ────────────────────────────

function heuristicSynthesis(pkt: LCSPacket, results: AgentResult[]): SynthesisOutput {
  const context = `[LCS] intent=${pkt.intent} domain=${pkt.domain} mode=${pkt.mode} risk=${pkt.risk}`;

  const highConfidence = results.filter((r) => r.confidence >= 0.6);
  const consensus: string[] = [];

  const allNotes = highConfidence.flatMap((r) => r.notes);
  const uniqueNotes = [...new Set(allNotes)];
  for (const note of uniqueNotes) {
    consensus.push(note);
  }

  const securityResult = results.find((r) => r.agent === "security");
  if (securityResult && securityResult.confidence < 0.6) {
    consensus.unshift("SECURITY WARNING: " + securityResult.notes.join("; "));
  }

  const nextSteps: string[] = [];

  const builderResult = results.find((r) => r.agent === "builder");
  if (builderResult) {
    const actionLines = builderResult.proposedAnswer
      .split("\n")
      .filter((l) => /^\d+\./.test(l.trim()) || /^-/.test(l.trim()));
    nextSteps.push(...actionLines.map((l) => l.trim()));
  }

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

  nextSteps.push("- Run `lcs trace` to inspect the full execution trace.");

  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const sources = results.map((r) => r.source);
  const modeLabel = sources.every((s) => s === "heuristic") ? "heuristic" : "hybrid";
  const providers = [...new Set(results.map((r) => r.notes[0] ?? "heuristic"))];

  // Build summary with executive summary + TL;DR structure
  const summaryParts: string[] = [
    "## Executive Summary",
    "",
    `Processed "${pkt.userText}" through ${results.length} agents (${providers.join(", ")}). ` +
    `Average confidence: ${(avgConfidence * 100).toFixed(0)}%. ` +
    (consensus.some((c) => c.startsWith("SECURITY"))
      ? "Security concerns were flagged — review recommended before proceeding."
      : `Routing: ${pkt.intent}/${pkt.domain}/${pkt.mode}. No security concerns.`),
    "",
    "---",
    "",
    "## Detailed Breakdown",
    "",
    context,
    "",
    `Mode: ${modeLabel} | Agents: ${results.length} | Avg confidence: ${(avgConfidence * 100).toFixed(0)}%`,
    "",
  ];

  if (consensus.length > 0) {
    summaryParts.push("**Consensus:**");
    for (const c of consensus) {
      summaryParts.push(`  * ${c}`);
    }
    summaryParts.push("");
  }

  summaryParts.push("**Next steps:**");
  for (const step of nextSteps) {
    summaryParts.push(`  ${step}`);
  }

  summaryParts.push("");
  summaryParts.push("---");
  summaryParts.push("");
  summaryParts.push("## TL;DR");
  summaryParts.push("");

  const tldr = consensus.length > 0
    ? consensus.filter((c) => !c.startsWith("SECURITY")).slice(0, 2).join(". ") + `. Run \`lcs trace\` for full details.`
    : `Query processed with ${(avgConfidence * 100).toFixed(0)}% confidence. Run \`lcs trace\` for details.`;
  summaryParts.push(tldr);

  return {
    context,
    consensus,
    nextSteps,
    summary: summaryParts.join("\n"),
    source: "heuristic",
  };
}

// ── LLM-powered synthesis ───────────────────────────────────────

function formatAgentResults(results: AgentResult[]): string {
  return results.map((r) => {
    return `<agent name="${r.agent}" confidence="${r.confidence}" source="${r.source}" provider="${r.notes[0] ?? "heuristic"}">
<notes>
${r.notes.join("\n")}
</notes>
<answer>
${r.proposedAnswer}
</answer>
</agent>`;
  }).join("\n\n");
}

async function llmSynthesis(pkt: LCSPacket, results: AgentResult[], config: LCSConfig): Promise<SynthesisOutput> {
  const context = `[LCS] intent=${pkt.intent} domain=${pkt.domain} mode=${pkt.mode} risk=${pkt.risk}`;
  const provider = config.synthesis.provider;
  const model = provider === "openai" ? config.openaiModel : config.synthesis.model;

  const userMsg = `<packet>
runId: ${pkt.runId}
intent: ${pkt.intent}
domain: ${pkt.domain}
mode: ${pkt.mode}
risk: ${pkt.risk}
constraints: ${pkt.constraints.join(", ") || "none"}
</packet>

<user_request>
${pkt.userText}
</user_request>

<agent_results>
${formatAgentResults(results)}
</agent_results>

Synthesize a single coherent response following the Executive Summary / Detailed Breakdown / TL;DR structure.
Include provenance (which agent and provider contributed what).`;

  const raw = await callLLM(config, {
    system: SYNTHESIS_SYSTEM,
    user: userMsg,
    model,
    temperature: config.synthesis.temperature,
    maxTokens: 2048,
  }, provider);

  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;

  return {
    context,
    consensus: [`Synthesized by ${provider}:${model} from ${results.length} agents (avg confidence: ${(avgConfidence * 100).toFixed(0)}%)`],
    nextSteps: ["- Run `lcs trace` for full agent details."],
    summary: `${context}\n\n${raw}`,
    source: "llm",
  };
}

// ── Public API ──────────────────────────────────────────────────

export async function synthesize(pkt: LCSPacket, results: AgentResult[], config: LCSConfig): Promise<SynthesisOutput> {
  const provider = config.synthesis.provider;

  if (!isProviderAvailable(config, provider)) return heuristicSynthesis(pkt, results);

  try {
    return await llmSynthesis(pkt, results, config);
  } catch (err) {
    const fallback = heuristicSynthesis(pkt, results);
    fallback.summary = `[LLM synthesis failed (${provider}): ${(err as Error).message} — falling back to heuristic]\n\n${fallback.summary}`;
    return fallback;
  }
}
