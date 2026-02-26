---
name: clawculator
description: Run clawculator to analyze OpenClaw costs, detect billing issues, and get fix recommendations. Zero AI. 100% offline. Pure deterministic logic.
homepage: https://github.com/echoudhry/clawculator
user-invocable: true
metadata: {"openclaw":{"emoji":"🦞","requires":{"bins":["node"]},"install":[{"id":"node","kind":"node","package":"clawculator","bins":["clawculator"],"label":"Install clawculator (npm)"}]}}
---

## clawculator

AI cost forensics for OpenClaw. Analyzes your `openclaw.json`, sessions, and workspace to find cost bleed — heartbeat on paid models, polling skills, open WhatsApp groups, orphaned sessions, and more.

**Usage**

When the user types `clawculator`, `check my costs`, `analyze spend`, or `cost report`, run:

```bash
npx clawculator --md
```

Return the full markdown report to the user inline.

**Flags**
- `--md` — markdown output (default for agent use)
- `--json` — machine-readable JSON
- `--report` — open HTML dashboard in browser
- `npx clawculator --help` — full usage

**What it catches**
- 💓 Heartbeat running on paid model instead of Ollama
- 🔧 Skill polling loops on paid model
- 📱 WhatsApp groups auto-joined on primary model
- 🪝 Hooks (boot-md, command-logger, session-memory) on Sonnet
- 💬 Orphaned sessions still holding tokens
- 🤖 maxConcurrent too high — burst cost multiplier
- 📁 Workspace root bloat inflating context
- ⚙️ Primary model cost awareness

All findings include exact fix commands. No data leaves the machine.
