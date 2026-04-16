# THE MODERATOR — Target List
### Created: April 16, 2026

Three-phase quality pass in execution order.

---

## Phase 1 — Outside Tools

Run across the entire codebase automatically. Surfaces systemic patterns without manual effort. Do this first so human and AI review isn't hunting things a script catches in seconds.

- **Dependency Cruiser** — circular dependency detection, import graph analysis. Free.
- **SonarQube** (paid Team plan, ~$32–$100/mo) — taint analysis, branch scanning, PR decoration, coverage gaps, common vulnerability classes.

Goal: macro picture fast and cheap. Clear the mechanical issues before anything else.

---

## Phase 2 — Attack Plan

`THE-MODERATOR-ATTACK-PLAN.md` — 10-phase methodology researched and built, never executed.

The majority of this codebase was written by Claude Code. The attack plan was built specifically to audit AI-generated code for Claude's failure modes: confabulation, escape behavior, sycophancy, reward hacking, agentic drift. It finds what static analysis cannot — did CC actually test what it claimed to test, did it sandbag, did it solve the wrong problem plausibly.

Run after tools have cleared mechanical issues. Looks for behavioral and architectural failures at the session level.

---

## Phase 3 — 5-Agent Batch Audits

`THE-MODERATOR-AUDIT-METHOD-V3.md` — 5-agent, 4-stage, Claude Sonnet, 4 files per batch.

First pass already completed: 63 files audited, 0 High / 47 Medium / 86 Low found, 3 fixed in-session. All findings fixed via CC bug sweeps.

Remaining files get batched through after Phases 1 and 2 have filtered out systemic and behavioral issues. Precision work on what's left. `FIRST-RUN-FILES.md` has the remaining file queue. `AUDIT-SESSION-PLAYBOOK.md` is the execution guide.

---

## Order Rationale

Outside tools find what is **measurable**.
Attack plan finds what is **behavioral**.
Batch audits find what is **specific**.

That is the right funnel order.
