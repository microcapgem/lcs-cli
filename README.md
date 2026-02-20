# LCS-CLI

**Larger Consciousness System** — a governed, stateful, evidence-aware, multi-agent synthesis engine for LLM cognition.

LCS-CLI routes user input through specialized internal agents, synthesizes a consensus response via a kernel, and logs every decision for full auditability. Runs in **heuristic mode** (offline, no API key needed) or **LLM mode** (Claude API for real agent reasoning + synthesis).

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
│       Runtime (parallel)          │
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
│  Kernel Synthesis │  ← LLM-powered or deterministic consensus
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

All agents run in parallel. Each produces structured output with confidence scores and provenance tracking (`llm` or `heuristic` source).

### Dual Mode

| | Heuristic Mode | LLM Mode |
|---|---|---|
| **API key** | Not needed | `ANTHROPIC_API_KEY` required |
| **Agents** | Keyword-based templates | Claude API calls with system prompts |
| **Synthesis** | Deterministic consensus | LLM-powered with provenance |
| **Speed** | Instant | Depends on model |
| **Fallback** | N/A | Auto-falls back to heuristic on error |

## Quick Start

```bash
npm install

# Heuristic mode (no API key needed)
npm run dev -- run "design an AI agent pipeline"

# LLM mode
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev -- run "design an AI agent pipeline"
```

## Commands

### `lcs init`

Create a `.lcs/config.json` with default settings.

```bash
npm run dev -- init
```

### `lcs run "<text>" [--json]`

Route a message through all LCS agents and synthesize a response.

```bash
# Human-readable output (with progress spinners)
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

Store a memory record. Agents read recent memory as context on every run.

```bash
npm run dev -- memory add note architecture "multi-agent kernel with provenance"
```

### `lcs memory get <key>`

Retrieve all memory records matching a key.

```bash
npm run dev -- memory get architecture
```

## Configuration

Run `lcs init` to create `.lcs/config.json`:

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "apiKey": null,
  "agents": {
    "builder":    { "enabled": true, "temperature": 0.3 },
    "researcher": { "enabled": true, "temperature": 0.5 },
    "critic":     { "enabled": true, "temperature": 0.3 },
    "security":   { "enabled": true, "temperature": 0.1 }
  },
  "synthesis": {
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2
  }
}
```

- **API key**: Set via `ANTHROPIC_API_KEY` env var (recommended) or in config
- **Model**: Any Anthropic model ID
- **Agents**: Enable/disable individually, tune temperature per agent
- **Synthesis**: Separate model + temperature for the kernel

## Build & Install

```bash
# Build
npm run build

# Global install
npm link

# Then use directly
lcs run "research consciousness-as-fundamental models"
lcs trace
```

## Testing

```bash
npm test
```

25 tests covering router classification, security detection, memory round-trips, and synthesis logic.

## Project Structure

```
src/
├── cli.ts                 # Commander CLI with ora spinners
├── config.ts              # Config loader (.lcs/config.json)
├── agents/
│   ├── types.ts           # Core types with provenance tracking
│   ├── prompts.ts         # Agent system prompts (internal only)
│   ├── builder.ts         # Builder agent (LLM + heuristic)
│   ├── researcher.ts      # Researcher agent (LLM + heuristic)
│   ├── critic.ts          # Critic agent (LLM + heuristic)
│   └── security.ts        # Security agent (always heuristic + LLM)
├── llm/
│   └── client.ts          # Anthropic SDK wrapper
├── router/
│   └── router.ts          # Heuristic router
├── runtime/
│   └── runAgents.ts       # Parallel agent execution with progress
├── kernel/
│   └── synthesize.ts      # Kernel synthesis (LLM + heuristic)
└── memory/
    └── store.ts           # JSONL trace + memory with context formatting
tests/
├── router.test.ts         # Router classification tests
├── security.test.ts       # Injection detection tests
├── memory.test.ts         # Memory/trace round-trip tests
└── synthesis.test.ts      # Kernel synthesis tests
```

## Safety

LCS-CLI is **safe by default**:

- No shell execution from user input
- No `eval()` or dynamic code generation
- No network calls from user-supplied data (only Anthropic API via SDK)
- All tool invocations are stubbed and gated
- User input is scanned for prompt injection patterns (heuristic + LLM)
- Security agent always runs heuristic scan first, even in LLM mode
- Only two files are ever written: `.lcs/trace.jsonl` and `.lcs/memory.jsonl`
- Agent system prompts are internal and never exposed to the user

## License

MIT
