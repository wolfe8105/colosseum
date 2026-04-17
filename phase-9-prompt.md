# The Moderator — 10-Phase Audit, Prompt 9

**Calibration Check**

Clone repo:
`git clone https://TOKEN@github.com/wolfe8105/colosseum.git`

You have permission to use all browser and bash tools without asking for confirmation. Proceed autonomously.

Read `THE-COLISEUM-AI-AUDIT-RESEARCH.md` in the repo root — find the section titled **"PROMPT 9 — Calibration Check"** and execute it exactly as written.

This is the consolidation phase. Read ALL of the following before writing anything:
- `phase-0-scope-inventory.md` through `phase-8-fingerprints.md` (all 9 prior outputs)
- `AUDIT-FINDINGS.md` (the older 57-file batch audit — findings here are input to the family rollup)
- `AUDIT-SESSION-HANDOFF.md` (the pre-Phase-5 handoff — contains the HIGH/MEDIUM/SYSTEMIC finding tables with current fix status)

Key priors to carry in:
- SYC-SYS-01 (PURE-COMPLIANCE) is the dominant systemic finding — the calibration report must address this directly in the dominant failure mode section
- Known REFUTED claims to seed the trust delta: CONF-H-01 (tsconfig excludes src/ — typecheck claimed to work, doesn't), CONF-H-02 (model string `claude-sonnet-4-20250514` deprecated April 14 — CLAUDE.md doesn't reflect this), CONF-M-01 (CLAUDE.md says Supabase pinned to `@2.98.0`, actual is `2.101.1`)
- Historical baseline: the prior 57-file batch audit (Batches 1–16R) found 0 HIGH open, 25+ MEDIUM open, 29+ LOW open — use this as the historical trend anchor
- The trust delta must not be softened — if it's bad, report it as bad. The audit is worthless if it replicates the sycophancy it's auditing.
- After the calibration report, append a **Stage 5 Triage** section: merge all open findings from `AUDIT-FINDINGS.md` and the 10-phase outputs into a single prioritized fix list, grouped by phase (immediate / next sprint / backlog)

When complete, save output as `phase-9-calibration.md` in the repo root, commit it, and push to main.

After pushing, also update `AUDIT-SESSION-HANDOFF.md` to mark Phases 5–9 complete with one-line summaries and the final trust delta number.
