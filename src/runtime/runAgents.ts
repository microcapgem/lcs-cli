import type { LCSPacket, AgentResult } from "../agents/types.js";
import { runBuilder } from "../agents/builder.js";
import { runResearcher } from "../agents/researcher.js";
import { runCritic } from "../agents/critic.js";
import { runSecurity } from "../agents/security.js";

export async function runAgents(pkt: LCSPacket): Promise<AgentResult[]> {
  // Run all agents in parallel. In v0 these are synchronous heuristics
  // wrapped in promises; in future versions they'll be async LLM calls.
  const results = await Promise.all([
    Promise.resolve(runBuilder(pkt)),
    Promise.resolve(runResearcher(pkt)),
    Promise.resolve(runCritic(pkt)),
    Promise.resolve(runSecurity(pkt)),
  ]);

  return results;
}
