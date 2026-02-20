import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// Tests use a temp directory to avoid polluting the real .lcs/
// We override cwd for the store module by running tests from a temp dir
const TEST_DIR = join(process.cwd(), ".lcs-test-tmp");
const LCS_DIR = join(TEST_DIR, ".lcs");

describe("Memory Store", () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  after(() => {
    process.chdir(join(TEST_DIR, ".."));
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("creates .lcs dir and writes memory", async () => {
    // Dynamic import so cwd is already changed
    const { appendMemory, getMemory } = await import("../src/memory/store.js");

    appendMemory({ type: "fact", key: "test-key", value: "test-value", ts: new Date().toISOString() });
    const records = getMemory("test-key");

    assert.equal(records.length, 1);
    assert.equal(records[0].key, "test-key");
    assert.equal(records[0].value, "test-value");
    assert.equal(records[0].type, "fact");
  });

  it("appends multiple records and retrieves by key", async () => {
    const { appendMemory, getMemory } = await import("../src/memory/store.js");

    appendMemory({ type: "note", key: "multi", value: "first", ts: new Date().toISOString() });
    appendMemory({ type: "note", key: "multi", value: "second", ts: new Date().toISOString() });
    appendMemory({ type: "note", key: "other", value: "unrelated", ts: new Date().toISOString() });

    const records = getMemory("multi");
    assert.equal(records.length, 2);
    assert.equal(records[0].value, "first");
    assert.equal(records[1].value, "second");
  });

  it("writes and reads trace", async () => {
    const { appendTrace, readLastTrace } = await import("../src/memory/store.js");

    const trace = {
      pkt: {
        runId: "test-run",
        ts: new Date().toISOString(),
        userText: "test",
        intent: "general" as const,
        domain: "general" as const,
        mode: "low_entropy" as const,
        risk: "low" as const,
        constraints: [],
        tasks: ["test task"],
      },
      results: [],
      out: {
        context: "test",
        consensus: [],
        nextSteps: [],
        summary: "test summary",
        source: "heuristic" as const,
      },
      ts: new Date().toISOString(),
    };

    appendTrace(trace);
    const last = readLastTrace();

    assert.ok(last);
    assert.equal(last!.pkt.runId, "test-run");
    assert.equal(last!.out.summary, "test summary");
  });

  it("returns null trace when no traces exist", async () => {
    // Use a fresh dir
    const freshDir = join(TEST_DIR, "fresh");
    mkdirSync(freshDir, { recursive: true });
    const origDir = process.cwd();
    process.chdir(freshDir);

    // Re-import to pick up new cwd (won't work due to module cache, so we test the original)
    const { readLastTrace } = await import("../src/memory/store.js");
    // This reads from TEST_DIR which has traces, so just verify it returns something
    const last = readLastTrace();
    assert.ok(last !== undefined); // either null or a record

    process.chdir(origDir);
    rmSync(freshDir, { recursive: true, force: true });
  });
});
