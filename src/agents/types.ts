// ── LCS Core Types ──────────────────────────────────────────────

export type Intent = "build" | "design" | "research" | "general";
export type Domain = "ai_architecture" | "general";
export type Risk = "low" | "medium" | "high";
export type Mode = "low_entropy" | "high_entropy";
export type AgentName = "builder" | "researcher" | "critic" | "security";

export interface LCSPacket {
  runId: string;
  ts: string;
  userText: string;
  intent: Intent;
  domain: Domain;
  mode: Mode;
  risk: Risk;
  constraints: string[];
  tasks: string[];
}

export interface AgentResult {
  agent: AgentName;
  notes: string[];
  proposedAnswer: string;
  confidence: number; // 0–1
}

export interface SynthesisOutput {
  context: string;
  consensus: string[];
  nextSteps: string[];
  summary: string;
}

export interface TraceRecord {
  pkt: LCSPacket;
  results: AgentResult[];
  out: SynthesisOutput;
  ts: string;
}

export interface MemoryRecord {
  type: string;
  key: string;
  value: string;
  ts: string;
}
