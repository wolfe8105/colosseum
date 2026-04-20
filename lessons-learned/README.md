# Lessons Learned

The five strategy pillars used to audit and harden this codebase. Kept together so the methodology survives separately from any single audit run.

## The Five Pillars

1. **SonarQube** — paid SaaS static analysis. Taint analysis, branch scanning, vulnerability classes. Covered in `TARGET-LIST.md` as Phase 1 Outside Tools.
2. **Dependency Cruiser** — free CLI tool. Run via `npx depcruise` from a Claude Code session (no install required on the local machine). Finds circular dependencies, validates import rules, generates dependency graphs. First run on this repo surfaced 55 cycles across arena/, bounties/, leaderboard/, and notifications/. Covered in `TARGET-LIST.md` as Phase 1 Outside Tools.
3. **10-Prompt System** — `THE-COLISEUM-AI-AUDIT-RESEARCH.md`. Targets Claude failure families.
4. **Master Attack Plan** — `THE-MODERATOR-ATTACK-PLAN.md`. 5-stage audit built for AI-generated code.
5. **5/11-Agent Process** — `THE-MODERATOR-AUDIT-METHOD-V3.md` + `THE-MODERATOR-11-AGENT-AUDIT-PROMPTS.md`. Parallel-agent audit with arbiter voting.

## Files in this folder

| File | What it is |
|---|---|
| `TARGET-LIST.md` | The umbrella plan. Names the three phases (Outside Tools → Attack Plan → 5-Agent Batch Audits). Home of both **SonarQube** (paid, SaaS) and **Dependency Cruiser** (free, run through Claude Code — no local install needed) as Phase 1 Outside Tools. |
| `THE-COLISEUM-AI-AUDIT-RESEARCH.md` | The **10-prompt system**. Phase 0–9 prompts, each targeting a specific Claude failure family (confabulation, escape, sycophancy, regurgitation, architectural blindness, agentic drift, red team, fingerprinting, calibration). |
| `THE-MODERATOR-ATTACK-PLAN.md` | The **master attack plan**. 5-stage methodology built from common AI error modes, designed for AI-generated code that static analysis can't catch. |
| `THE-MODERATOR-AUDIT-METHOD-V3.md` | The **5/11-agent process**. Four-stage parallel-agent audit (inventory → arbiter → runtime walk → source verify). Originally 11 agents, downgraded to 5 on 2026-04-13 for token cost with no loss of robustness. |
| `THE-MODERATOR-11-AGENT-AUDIT-PROMPTS.md` | The full prompt text for the agent method above. |

## How they fit together

- **Phase 1 (Outside Tools)** — SonarQube + Dependency Cruiser. Mechanical issues, fast and cheap.
- **Phase 2 (Attack Plan + 10 Prompts)** — Behavioral and architectural failures at the session level. The Finish Plan (`_archive/THE-MODERATOR-AUDIT-FINISH-PLAN.md`) reconciles these two into one execution sequence — the 10 prompts replace Stage 3 of the attack plan; Stages 1.4, 4.1, 4.2 of the attack plan have no LLM substitute.
- **Phase 3 (5-Agent Batch Audits)** — Full-codebase, fresh-session parallel audit. Runs after Phase 2 closes.

## Why these live here and not in `_archive/`

`_archive/` is where session-specific outputs, handoffs, and one-off batch files go. These five documents are the reusable methodology — the lessons that outlast any particular audit cycle.
