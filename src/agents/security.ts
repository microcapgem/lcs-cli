import type { LCSPacket, AgentResult } from "./types.js";

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

export function runSecurity(pkt: LCSPacket): AgentResult {
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
  };
}
