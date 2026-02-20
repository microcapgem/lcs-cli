#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { route } from "./router/router.js";
import { runAgents } from "./runtime/runAgents.js";
import { synthesize } from "./kernel/synthesize.js";
import { appendTrace, readLastTrace, appendMemory, getMemory } from "./memory/store.js";

const program = new Command();

program
  .name("lcs")
  .description("LCS-CLI v0 — Larger Consciousness System")
  .version("0.1.0");

// ── lcs run ─────────────────────────────────────────────────────

program
  .command("run")
  .description("Route a message through LCS agents and synthesize a response")
  .argument("<text>", "User message to process")
  .option("--json", "Output full trace JSON instead of human-readable summary")
  .action(async (text: string, opts: { json?: boolean }) => {
    // 1. Route
    const pkt = route(text);

    // 2. Run agents
    const results = await runAgents(pkt);

    // 3. Synthesize
    const out = synthesize(pkt, results);

    // 4. Build trace and persist
    const trace = { pkt, results, out, ts: new Date().toISOString() };
    appendTrace(trace);

    // 5. Output
    if (opts.json) {
      process.stdout.write(JSON.stringify(trace, null, 2) + "\n");
    } else {
      process.stdout.write(out.summary + "\n");
    }
  });

// ── lcs trace ───────────────────────────────────────────────────

program
  .command("trace")
  .description("Print the last run trace as JSON")
  .action(() => {
    const last = readLastTrace();
    if (!last) {
      process.stderr.write("No traces found. Run `lcs run` first.\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(JSON.stringify(last, null, 2) + "\n");
  });

// ── lcs memory ──────────────────────────────────────────────────

const memory = program
  .command("memory")
  .description("Read and write LCS memory records");

memory
  .command("add")
  .description("Add a memory record")
  .argument("<type>", "Record type (e.g. fact, preference, note)")
  .argument("<key>", "Lookup key")
  .argument("<value...>", "Value (remaining args joined by space)")
  .action((type: string, key: string, value: string[]) => {
    const record = {
      type,
      key,
      value: value.join(" "),
      ts: new Date().toISOString(),
    };
    appendMemory(record);
    process.stdout.write(`Stored: [${type}] ${key} = ${record.value}\n`);
  });

memory
  .command("get")
  .description("Retrieve memory records by key")
  .argument("<key>", "Lookup key")
  .action((key: string) => {
    const records = getMemory(key);
    if (records.length === 0) {
      process.stdout.write(`No records found for key "${key}".\n`);
      return;
    }
    for (const r of records) {
      process.stdout.write(`[${r.ts}] (${r.type}) ${r.key} = ${r.value}\n`);
    }
  });

// ── Parse and run ───────────────────────────────────────────────

program.parse();
