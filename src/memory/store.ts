import { mkdirSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { TraceRecord, MemoryRecord } from "../agents/types.js";

const LCS_DIR = join(process.cwd(), ".lcs");
const TRACE_FILE = join(LCS_DIR, "trace.jsonl");
const MEMORY_FILE = join(LCS_DIR, "memory.jsonl");

function ensureDir(): void {
  if (!existsSync(LCS_DIR)) {
    mkdirSync(LCS_DIR, { recursive: true });
  }
}

// ── Trace ───────────────────────────────────────────────────────

export function appendTrace(record: TraceRecord): void {
  ensureDir();
  appendFileSync(TRACE_FILE, JSON.stringify(record) + "\n", "utf-8");
}

export function readLastTrace(): TraceRecord | null {
  if (!existsSync(TRACE_FILE)) return null;
  const lines = readFileSync(TRACE_FILE, "utf-8").trim().split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  return JSON.parse(lines[lines.length - 1]) as TraceRecord;
}

// ── Memory ──────────────────────────────────────────────────────

export function appendMemory(record: MemoryRecord): void {
  ensureDir();
  appendFileSync(MEMORY_FILE, JSON.stringify(record) + "\n", "utf-8");
}

export function getMemory(key: string): MemoryRecord[] {
  if (!existsSync(MEMORY_FILE)) return [];
  const lines = readFileSync(MEMORY_FILE, "utf-8").trim().split("\n").filter(Boolean);
  const records: MemoryRecord[] = [];
  for (const line of lines) {
    const rec = JSON.parse(line) as MemoryRecord;
    if (rec.key === key) records.push(rec);
  }
  return records;
}

/** Returns the most recent N memory records across all keys. */
export function getRecentMemory(limit = 20): MemoryRecord[] {
  if (!existsSync(MEMORY_FILE)) return [];
  const lines = readFileSync(MEMORY_FILE, "utf-8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((l) => JSON.parse(l) as MemoryRecord);
}

/** Format memory records as context string for agent prompts. */
export function formatMemoryContext(records: MemoryRecord[]): string {
  if (records.length === 0) return "";
  const lines = records.map((r) => `[${r.type}] ${r.key}: ${r.value}`);
  return `\n<memory>\n${lines.join("\n")}\n</memory>`;
}
