# LCS-CLI

**Larger Consciousness System** — a governed, stateful, evidence-aware, multi-agent synthesis engine for LLM cognition.

LCS-CLI is the command-line scaffold for the LCS architecture. It routes user input through specialized internal agents, synthesizes a consensus response, and logs every decision for full auditability.

## Architecture

```
User Input
    │
    ▼
┌─────────┐
│  Router  │  ← heuristic intent / domain / risk / mode classification
└────┬────┘
     │ LCSPacket
     ▼
┌──────────────────────────────────┐
│          Runtime (parallel)       │
│  ┌─────────┐  ┌────────────┐    │
│  │ Builder  │  │ Researcher │    │
│  └─────────┘  └────────────┘    │
│  ┌─────────┐  ┌────────────┐    │
│  │  Critic  │  │  Security  │    │
│  └─────────┘  └────────────┘    │
└────────────┬─────────────────────┘
             │ AgentResult[]
             ▼
┌──────────────────┐
│  Kernel Synthesis │  ← deterministic consensus + next steps
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
 stdout    .lcs/
          trace.jsonl
          memory.jsonl
```

### Agents

| Agent | Role |
|-------|------|
| **Builder** | Implementation plans, interfaces, scaffolding |
| **Researcher** | Best practices, domain knowledge, breadth |
| **Critic** | Failure modes, tightening recommendations |
| **Security** | Prompt injection detection, tool safety defaults |

## Quick Start

```bash
npm install
npm run dev -- run "design an AI agent pipeline"
```

## Commands

### `lcs run "<text>" [--json]`

Route a message through all LCS agents and synthesize a response.

```bash
# Human-readable output
npm run dev -- run "build a safety-first LLM router"

# Full trace JSON
npm run dev -- run "build a safety-first LLM router" --json
```

### `lcs trace`

Print the last run's full execution trace.

```bash
npm run dev -- trace
```

### `lcs memory add <type> <key> <value...>`

Store a memory record.

```bash
npm run dev -- memory add note architecture "multi-agent kernel with provenance"
```

### `lcs memory get <key>`

Retrieve all memory records matching a key.

```bash
npm run dev -- memory get architecture
```

## Build & Install

```bash
# Build
npm run build

# Global install (makes `lcs` available everywhere)
npm link

# Then use directly
lcs run "research consciousness-as-fundamental models"
lcs trace
```

## Project Structure

```
src/
├── cli.ts                 # Commander CLI entry point
├── agents/
│   ├── types.ts           # Core types: LCSPacket, AgentResult, SynthesisOutput
│   ├── builder.ts         # Builder agent
│   ├── researcher.ts      # Researcher agent
│   ├── critic.ts          # Critic agent
│   └── security.ts        # Security agent
├── router/
│   └── router.ts          # Heuristic router
├── runtime/
│   └── runAgents.ts       # Parallel agent execution
├── kernel/
│   └── synthesize.ts      # Deterministic kernel synthesis
└── memory/
    └── store.ts           # JSONL trace + memory persistence
```

## Safety

LCS-CLI is **safe by default**:

- No shell execution from user input
- No `eval()` or dynamic code generation
- No network calls from user-supplied data
- All tool invocations are stubbed and gated
- User input is scanned for prompt injection patterns
- Only two files are ever written: `.lcs/trace.jsonl` and `.lcs/memory.jsonl`

## v0 Limitations

This is the offline scaffold (v0). Agent responses are heuristic, not LLM-powered. The architecture is designed so that real LLM calls can be plugged in at each agent without changing the routing, synthesis, or trace infrastructure.

## License

MIT
