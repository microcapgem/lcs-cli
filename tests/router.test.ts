import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { route } from "../src/router/router.js";

describe("Router", () => {
  it("classifies build intent", () => {
    const pkt = route("build a web server");
    assert.equal(pkt.intent, "build");
  });

  it("classifies design intent", () => {
    const pkt = route("design the database schema");
    assert.equal(pkt.intent, "design");
    assert.equal(pkt.mode, "high_entropy");
  });

  it("classifies research intent", () => {
    const pkt = route("research best practices for caching");
    assert.equal(pkt.intent, "research");
    assert.equal(pkt.mode, "high_entropy");
  });

  it("falls back to general intent", () => {
    const pkt = route("hello world");
    assert.equal(pkt.intent, "general");
    assert.equal(pkt.mode, "low_entropy");
  });

  it("detects AI domain", () => {
    const pkt = route("build an LLM agent pipeline");
    assert.equal(pkt.domain, "ai_architecture");
  });

  it("defaults to general domain", () => {
    const pkt = route("make me a sandwich");
    assert.equal(pkt.domain, "general");
  });

  it("flags high risk for dangerous keywords", () => {
    const pkt = route("exec rm -rf everything");
    assert.equal(pkt.risk, "high");
    assert.ok(pkt.constraints.length > 0);
  });

  it("flags medium risk for long input", () => {
    const longText = "a ".repeat(300);
    const pkt = route(longText);
    assert.equal(pkt.risk, "medium");
  });

  it("assigns low risk for simple input", () => {
    const pkt = route("hello");
    assert.equal(pkt.risk, "low");
  });

  it("produces a valid LCSPacket", () => {
    const pkt = route("test input");
    assert.ok(pkt.runId);
    assert.ok(pkt.ts);
    assert.equal(pkt.userText, "test input");
    assert.ok(Array.isArray(pkt.constraints));
    assert.ok(Array.isArray(pkt.tasks));
    assert.ok(pkt.tasks.length > 0);
  });
});
