# Audit Session Handoff
**Date:** April 17, 2026
**Handing off to:** Fresh chat session for Phases 5–9

---

## Repo
`https://github.com/wolfe8105/colosseum`
Current main: `f68b4e0` (Merge PR #23 — Upstash rate limit)
Reference tag: `pre-10-prompts-audit` → commit `5a23e9d`

---

## What's done

### Fixes merged to main (today)
| Commit | Fix |
|---|---|
| `d902079` | TIMING-01 through TIMING-05 (5 client-side timing fixes) |
| `1d0c013` | SONAR-SRI-01 — Supabase CDN pinned + SRI hash |
| `e517a1f` | SYC-H-02 — `/api/go-respond` rate limiting (Phase 1: in-memory) |
| `f68b4e0` | HP-01 — `/api/go-respond` rate limiting (Phase 2: Upstash Redis, cross-instance) |
| Various | SEC-01, SEC-02, SEC-03, SEC-05 — security fixes |
| Various | SonarQube reliability + a11y fixes (33 files) |
| Various | SQL fixes in Supabase |

### 10-Phase audit — completed phases
| Phase | File | Status |
|---|---|---|
| Phase 0 — Scope Inventory | `phase-0-scope-inventory.md` | ✅ Done, reviewed |
| Phase 1 — Confabulation | `phase-1-confabulation.md` | ✅ Done, reviewed |
| Phase 2 — Escape Behavior | `phase-2-escape.md` | ✅ Done, reviewed |
| Phase 3 — Sycophancy | `phase-3-sycophancy.md` | ✅ Done, reviewed |
| Phase 4 — Regurgitation | `phase-4-regurgitation.md` | ✅ Done, reviewed (on branch b239af5 — NOT yet on main) |

**Note:** Phase 4 output (`phase-4-regurgitation.md`) was committed to the wrong branch (`fix/syc-h-02-go-respond-rate-limit`). It exists at commit `b239af5` but is not on main. Cherry-pick or re-push to main before or after Phase 5.

### 10-Phase audit — ALL PHASES COMPLETE

| Phase | File | Status | Summary |
|---|---|---|---|
| Phase 5 — Architectural Blindness | `phase-5-architectural.md` | ✅ Done | Stored XSS (SD-1), phantom votes (BI-1), dead lobby query (BI-2), prod creds in dev fallback (EP-1) — 4 HIGH, 14 MEDIUM/LOW |
| Phase 6 — Agentic Drift | `phase-6-agentic.md` | ✅ Done | Severity downgrade buried in unrelated commit (DRIFT-NC-01), rate limiter discarded 11.5h later (THRASH-01), 970 lines autonomous planning artifacts — 4 HIGH process findings |
| Phase 7 — Red Team | `phase-7-red-team.md` | ✅ Done | 10 HIGH (6 fixed same-day): IP spoofing bypass, prompt injection, stored XSS ×2, CSP gap, phantom votes — 15 MEDIUM, 10 LOW |
| Phase 8 — Fingerprints | `phase-8-fingerprints.md` | ✅ Done | 8 HIGH files; top signals: `as any` cluster (20 casts/12 files), CLAUDE.md safeRpc drift, `feedRealtimeChannel: unknown` |
| Phase 8 Remediation | commit `37b92d5` | ✅ Fixed | CLAUDE.md safeRpc corrected; `arena-realtime-client.ts` typed accessor; heartbeat casts removed; go-respond.js header stripped |
| Phase 9 — Calibration | `phase-9-calibration.md` | ✅ Done | Trust delta 0.21 raw / 0.38 adjusted; Architectural Blindness dominant; Stage 5 triage complete |

**Final trust delta: 0.21 (raw) / 0.38 (adjusted)**
**Dominant failure mode: Architectural Blindness (12 findings)**
**Next action: Fix `tsconfig.json` to cover `src/` — makes every verification gate real**

---

## Key findings so far (for Phase 9 calibration)

### HIGH findings
| ID | Finding | Status |
|---|---|---|
| CONF-H-01 | `tsconfig.json` excludes `src/` — Gate 1 typecheck is a no-op | ❌ Not fixed — intentional (fixing mid-audit invalidates audit premise) |
| CONF-H-02 | `claude-sonnet-4-20250514` deprecated April 14, 2026 — retirement June 15, 2026 | ❌ Not fixed — ~60 days remaining |
| ESC-H-01 | `f48-mod-debate.test.ts` fails to collect — zero F-48 test coverage | ❌ Not fixed |
| SYC-H-01 | tsconfig exclusion never challenged across 200 commits | ❌ Systemic |
| SYC-H-02 | `/api/go-respond` billing exposure (no rate limit) | ✅ Fixed — Upstash Redis |
| HP-01 | In-memory rate limiter per-instance (serverless anti-pattern) | ✅ Fixed — Upstash Redis |

### MEDIUM findings
| ID | Finding | Status |
|---|---|---|
| CONF-M-01 | CLAUDE.md says Supabase pinned to `@2.98.0` — actual is `2.101.1` | ❌ Not fixed |
| CONF-M-02 | 4 files call `supabase.auth.getSession()` in violation of auth invariant | ❌ Not fixed |
| ESC-M-01 | Token balances hardcoded to `0` in `async.fetch.ts:67` | ❌ Not fixed |
| ESC-M-02 | AdSense placeholder IDs (`PUBLISHER_ID`, `AD_UNIT_ID`) in production source | ❌ Not fixed |
| ESC-M-03 | `(client as any).auth.getSession()` in `arena-feed-realtime.ts:42` | ❌ Not fixed |
| SYC-M-01 | `(client as any)` used to suppress auth invariant violation | ❌ Not fixed |
| SYC-M-02 | `Number()` cast rule violated in 4 locations across 3 files | ❌ Not fixed |
| EC-1 | `ipTimestamps` Map memory leak (never deletes keys) | ✅ Fixed (replaced entirely with Upstash) |
| EC-3 | No content length caps on inputs | ✅ Fixed — `safeTopic` 500, `safeArg` 2000, content 2000 |
| DB-2 | No `AbortController` timeout on Anthropic fetch | ❌ Not fixed |

### SYSTEMIC findings
| ID | Finding |
|---|---|
| SYC-SYS-01 | PURE-COMPLIANCE — zero instances of Claude saying "no" across 200 commits and 18 handoffs |

### LOW findings (held for Stage 5 triage)
- `app-config.ts` ghost reference in `vite.config.ts`
- `round === totalRounds` type mismatch → ✅ Fixed in HP-01
- `vitest.config.ts` `environment: 'node'` new-test trap
- 105 CSS var TODO items in arena CSS files
- Major-version drift on typescript (5→6), vite (6→8), vitest (3→4)
- `'unknown'` IP shared rate-limit bucket

---

## Items held in working memory (from prior chat)

**SONAR-REFCODE-TIGHTEN** — `src/share.ts:158`
Tighten regex from `/^[a-zA-Z0-9_-]{4,20}$/` to `/^[a-z0-9]{5}$/` to match generator output in `api/invite.js` and SQL. Safe change, no valid codes will be rejected.

**STAGE-3.1-CHECK-01** — `cast_auto_debate_vote` server-side dedup
Phase 5 (Architectural Blindness) should verify whether the `cast_auto_debate_vote` RPC has server-side duplicate-vote prevention, or whether it trusts the client-supplied `p_fingerprint` alone. Client fingerprints are generated with `Math.random()` in `src/pages/auto-debate.ts:59` and `src/pages/debate-landing.data.ts:98` — trivially bypassed.

---

## How to run Phase 5

Open a fresh CC session and paste:

> **The Moderator — 10-Phase Audit, Prompt 5**
>
> Clone repo and set remote with token from memory.
> Repo: `https://github.com/wolfe8105/colosseum`
>
> Read `THE-COLISEUM-AI-AUDIT-RESEARCH.md` in the repo root. Find the section titled "PROMPT 5 — Architectural-Blindness Audit." Execute that prompt exactly as written.
>
> Also read `phase-0-scope-inventory.md` through `phase-3-sycophancy.md` for context. Note: `tsconfig.json` excludes `src/` (type checker is a no-op for application code). Key check for this phase: verify whether `cast_auto_debate_vote` RPC has server-side dedup beyond client fingerprint trust.
>
> When complete, save output as `phase-5-architectural.md` in the repo root, commit it, and push to main. Do not start Prompt 6 — the reviewer will check first.

After Phase 5 output comes back, the reviewer (you, in the new chat) reads it before proceeding to Phase 6.

---

## After all 9 phases

Remaining steps per `THE-MODERATOR-AUDIT-FINISH-PLAN.md`:
1. **Stage 4.1** — Phone smoke test (10 flows, 15–25 min, real device)
2. **Stage 4.2** — Outside-in fresh Claude review (fresh session, no context, neutral prompt)
3. **Stage 5** — Final triage: merge all findings, update LM Map, assign fix phases

---

## Blind spots to carry forward
- Only 2 test files for 372 modules (near-zero coverage)
- No CI pipeline — Vercel deploys direct from push
- No staging environment — production is the only target
- Live Supabase schema is source of truth, not repo SQL files
- Session transcripts absent — Phase 6 (Agentic Drift) will be git-log only
- `colosseum-refactor/` stale copy deleted from local machine (was untracked)
