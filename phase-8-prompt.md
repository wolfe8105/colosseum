# The Moderator — 10-Phase Audit, Prompt 8

**Claude Fingerprinting**

Clone repo:
`git clone https://TOKEN@github.com/wolfe8105/colosseum.git`

You have permission to use all browser and bash tools without asking for confirmation. Proceed autonomously.

Read `THE-COLISEUM-AI-AUDIT-RESEARCH.md` in the repo root — find the section titled **"PROMPT 8 — Claude-Specific Fingerprinting"** and execute it exactly as written.

Read `phase-0-scope-inventory.md` through `phase-7-red-team.md` for context.

Key priors to carry in:
- Audit range: commits from `5a23e9d` (tag `pre-10-prompts-audit`) through current HEAD on main; scope is `src/`, `api/`, `supabase/`
- SYC-SYS-01 already documented: zero pushback across 200 commits and 18 handoffs — the fingerprinting phase should surface the commit-level and comment-level artifacts that correlate with this (sycophancy phrases in commit messages, agreement reversals, explanation bloat in added markdown)
- CLAUDE.md contains explicit invariants (Number() cast rule, safeRpc rule, auth invariant) — use these as the style guide baseline when scoring abbreviated variables and narrating comments
- The `(client as any)` pattern appears at least twice — this is a Claude tell for suppressing a type error rather than fixing it; grep for all instances
- Edit frequency: `arena-feed-realtime.ts` and `go-respond` route are known high-churn files; the fingerprint map should call these out explicitly
- Only 2 test files exist for 372 modules — the mock-heavy and missing-negative-test fingerprints will be near-universal; note that in the heatmap rather than flagging every file individually

When complete, save output as `phase-8-fingerprints.md` in the repo root, commit it, and push to main. Do not start Prompt 9 — the reviewer will check first.
