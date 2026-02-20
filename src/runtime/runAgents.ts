import type { LCSPacket, AgentResult } from "../agents/types.js";
import type { LCSConfig } from "../config.js";
import { runBuilder } from "../agents/builder.js";
import { runResearcher } from "../agents/researcher.js";
import { runCritic } from "../agents/critic.js";
import { runSecurity } from "../agents/security.js";
import { getRecentMemory, formatMemoryContext } from "../memory/store.js";

export interface AgentProgress {
  agent: string;
  status: "running" | "done" | "error";
}

export type ProgressCallback = (progress: AgentProgress) => void;

export async function runAgents(
  pkt: LCSPacket,
  config: LCSConfig,
  onProgress?: ProgressCallback,
): Promise<AgentResult[]> {
  const memoryContext = formatMemoryContext(getRecentMemory());

  const agents = [
    { name: "builder",    fn: () => runBuilder(pkt, config, memoryContext) },
    { name: "researcher", fn: () => runResearcher(pkt, config, memoryContext) },
    { name: "critic",     fn: () => runCritic(pkt, config, memoryContext) },
    { name: "security",   fn: () => runSecurity(pkt, config, memoryContext) },
  ];

  // Filter by config
  const enabled = agents.filter((a) => {
    const conf = config.agents[a.name];
    return !conf || conf.enabled;
  });

  // Run in parallel with progress tracking
  const promises = enabled.map(async (a) => {
    onProgress?.({ agent: a.name, status: "running" });
    try {
      const result = await a.fn();
      onProgress?.({ agent: a.name, status: "done" });
      return result;
    } catch (err) {
      onProgress?.({ agent: a.name, status: "error" });
      throw err;
    }
  });

  return Promise.all(promises);
}
