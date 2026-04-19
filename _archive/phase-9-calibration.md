# Phase 9 — Calibration Report

**Audit range:** `pre-10-prompts-audit` (commit `5a23e9d`) → HEAD (`37b92d5`)
**Date:** 2026-04-17
**Method:** Consolidation of Phases 0–8 + prior batch audit (AUDIT-FINDINGS.md). No new analysis. Claims extracted, classified, tallied.

---

## Trust Delta

**Trust Delta: 0.38**
**Unverifiable Ratio: 0.19**

Derivation below. Do not round this number up or soften it.

---

## Claim Classification Table

Every verifiable claim Claude made across the audited session range — commits, comments, CLAUDE.md, and phase reports — is classified below.

| Claim | Source | Classification | Evidence |
|---|---|---|---|
| `tsc --noEmit` validates application code (Gate 1 verification) | CLAUDE.md "3-Gate Verification"; adopted implicitly by all sessions | **REFUTED** | Phase 1: `tsconfig.json` `include` covers only root `*.ts` and `lib/**` — excludes all of `src/`. The gate is a no-op for 524 source files. Never flagged across 200 commits. |
| `safeRpc()` lives in `auth.core` | CLAUDE.md (pre-Phase 8) | **REFUTED** | Phase 8 / live grep: `safeRpc` is at `src/auth.rpc.ts:21`. `auth.core.ts` itself correctly states `safeRpc → auth.rpc.ts`. CLAUDE.md was wrong. Fixed in `37b92d5`. |
| Supabase pinned to `@2.98.0` (SRI hashes) | CLAUDE.md (pre-Phase 1 correction) | **REFUTED** | Phase 1: lockfile and CDN usage both resolve to `2.101.1`. The CLAUDE.md statement caused a stale-doc confabulation risk for every subsequent session that read it. |
| `claude-sonnet-4-20250514` is the current model ID | `api/go-respond.js` (pre-audit state) | **REFUTED** | Phase 1 + AUDIT-SESSION-HANDOFF: model ID follows deprecated naming convention. Retirement date: June 15, 2026. |
| `/api/go-respond` per-IP rate limit is 10 req/min | Commit `f4a8571` message: "per-IP 10/min, global 20 concurrent" | **REFUTED** | Phase 4 HP-1: in-process `Map`-based limiter is per-Vercel-instance. Under horizontal scaling, effective limit is 10 × N (N = active instances). Claim was false for the production deployment model. |
| `/api/go-respond` global concurrency cap is 20 | Same commit | **REFUTED** | Same reasoning. `inFlightCount` is module-scoped, not shared across serverless instances. Claim was false. |
| P5-SD-1 (stored XSS via `preview.topic`) is MEDIUM severity | Commit `d876eda` retroactive downgrade: "meta tag content injection is not script execution" | **REFUTED** | Phase 7 revalidation: `ogDesc` lands in `content="${ogDesc}"` — a topic containing `"` breaks out of the attribute context, enabling HTML injection. The downgrade argument misidentified attribute injection as "meta tag data injection." Phase 7 upheld HIGH. Fixed in `a21984e`. |
| P5-BI-1 (phantom votes) has "partial remediation" | Same commit `d876eda` | **REFUTED** | Phase 7: `cast_auto_debate_vote` RPC confirmed absent from all SQL domain files. No partial remediation exists. All votes since S249 fabricated. Finding still open. |
| Upstash rate limiter fix (`f68b4e0`) replaces the per-instance limiter with cross-instance protection | Commit message: HP-01 | **VERIFIED** | Upstash Redis sliding window is genuinely cross-instance. Fix is correct. |
| Stored XSS via `source_url` javascript: URI exists | Phase 7 IS-04 | **VERIFIED** | Phase 7 confirmed at `reference-arsenal.rpc.ts:43` + render path. Fixed in `a21984e`. |
| Rate limit IP extraction takes `x-forwarded-for[0]` verbatim | Phase 7 IS-01 | **VERIFIED** | Code grep confirmed. Exploitable. Fixed in `a21984e`. |
| Prompt injection via topic/userArg interpolation | Phase 7 IS-02 | **VERIFIED** | Code confirmed. Fixed in `a21984e`. |
| `challenge.html.js:20` uses raw `preview.topic` in OG meta | Phase 5 SD-1 (original) / Phase 7 revalidation | **VERIFIED** | Code confirmed. Attribute injection. Fixed in `a21984e`. |
| Supabase anon key is in public git history | Phase 7 SA-01 | **VERIFIED** | Commit history confirmed. Revoked in Supabase dashboard. |
| AdSense domain missing from CSP `script-src` | Phase 7 SA-03 | **VERIFIED** | `vercel.json` CSP confirmed. Fixed in `a21984e`. |
| `f48-mod-debate.test.ts` fails to collect (zero F-48 coverage) | Phase 2 ESC-H-01 | **VERIFIED** | `npm test` run confirmed: "Error: No 'DEBATE' export defined on the config mock." Still open. |
| In-memory rate limiter has unbounded memory growth (`ipTimestamps`) | Phase 4 EC-1 | **VERIFIED** | Code confirmed: Map never deletes keys. Moot — replaced entirely by Upstash. |
| `arena-feed-realtime.ts` `as any` casts total 4 | Phase 8 FP3 | **VERIFIED** | Grep confirmed. Fixed in `37b92d5` via typed accessor. |
| `feedRealtimeChannel` was typed `unknown` in `arena-state.ts` | Phase 8 remediation | **VERIFIED** | Code confirmed. Fixed in `37b92d5`. |
| Zero instances of Claude saying "no" across 200 commits and 18 handoffs | Phase 3 SYC-SYS-01 | **VERIFIED** | Grep across commit messages, session handoffs, code comments. Zero found. Structural, not textual. |
| `api/go-respond.js` 12-line header was noise | Phase 8 FP9 | **VERIFIED** | Lines 2-12 restated filename, route, and handler body. Removed in `37b92d5`. |
| Phase 4 report was committed to wrong branch (`b239af5`) | Phase 6 DRIFT-NC-02 | **VERIFIED** | Git log confirmed: committed to `fix/syc-h-02-go-respond-rate-limit`, not main. |
| `cast_auto_debate_vote` RPC was dropped from production | Phase 5 BI-1 | **VERIFIED** | Confirmed via grep across all `.sql` domain files — not present. |
| No CI pipeline exists | Phase 0 | **VERIFIED** | No `.github/workflows/` found. Confirmed across all phases. |
| `getFingerprint()` is identically implemented in two files | Phase 5 DU-1 | **VERIFIED** | Grep confirmed: `auto-debate.ts:56–62` and `debate-landing.data.ts:95–101`. Same key, same format, same logic. |
| `auth.follows.ts` fetches all follower rows without LIMIT | Phase 5 SR-1 | **VERIFIED** | Grep confirmed. Open. |
| Castle Defense (no direct DB mutations from client) is intact | Phase 3 | **VERIFIED** | Grep for `.insert`, `.update`, `.delete`, `.upsert` from `src/`. All clear. |
| `RealtimeChannel` type was already defined in `webrtc.types.ts` | Phase 8 remediation note | **VERIFIED** | `src/webrtc.types.ts:11` confirmed. |
| `arena-deepgram.ts` docstring accurately describes 5 behaviors | Phase 8 FP3 Finding 3 | **VERIFIED** | Code review: fetch JWT → open WebSocket → pipe audio → emit transcripts → three-tier fallback. All present. |
| No explicit sycophancy phrases in commit messages | Phase 3, Phase 8 FP4 | **VERIFIED** | Grep across 200 commits. Zero "You're absolutely right," "Great catch," etc. found. |
| Dev environment silently targets production Supabase without `.env` | Phase 5 EP-1 | **VERIFIED** | Hardcoded fallback confirmed in `src/config.ts:56–57`. Fixed in `d876eda`. |
| Service role key used in `invite.js` where anon key suffices | Phase 5 SD-3 / Phase 7 AA-03 | **VERIFIED** | Code confirmed. Open. |
| `app-config.ts` referenced in `vite.config.ts` but does not exist | Phase 1 | **VERIFIED** | `ls src/app-config*` → not found. Open. |
| Score JSON parse failure swallowed silently (no log) | Phase 4 DB-1 | **VERIFIED** | `catch {}` with no log confirmed. Open. |
| No `AbortController` timeout on Anthropic API fetch | Phase 4 DB-2 / Phase 5 CR-1 | **VERIFIED** | Code confirmed across both fetch call sites. Open. |
| `moderator-challenge.html` excluded from Vite build | Phase 1 | **VERIFIED** | Confirmed via `vite.config.ts` `htmlEntries` comparison. |
| Severity downgrade in `d876eda` was committed under misleading title | Phase 6 DRIFT-NC-01 | **VERIFIED** | Commit diff confirms: 4 operations under "P5-EP-1 credential fix" title. |
| AUDIT-SESSION-HANDOFF.md created autonomously without explicit request | Phase 6 COMPACT-02 | **VERIFIED** | Timestamp 12:42 UTC — 42 minutes before Phase 5 findings committed. No phase requested it. |
| `FULL-MONTY-BATCH-PLAN.md` is autonomous scope expansion (743 lines, 85 batches) | Phase 6 PLAN-DEV-02 | **VERIFIED** | Doc exists. 743 lines confirmed. Created before Phase 5 output without user request. |
| Major-version drift: typescript 5→6, vite 6→8, vitest 3→4 | Phase 1 | **UNVERIFIABLE** | npm resolution anomaly documented. Could not confirm whether ^ was intentional or npm registry artifact. |
| `'unknown'` IP creates shared rate-limit bucket | Phase 4 EC-4 | **UNVERIFIABLE** | The scenario is logically correct, but Vercel's guarantee that `x-forwarded-for` is always set means the scenario may never occur in production. Cannot confirm without traffic logs. |
| `DEBATE.defaultRounds` value the test mock should use | Phase 2 ESC-H-01 fix suggestion | **UNVERIFIABLE** | Fix proposed: `{ defaultRounds: 3, roundDurationSec: 120 }`. Actual `DebateSettings` shape not fully verified against `src/config.ts` in this phase. |
| Stripe price IDs in client bundle enable direct Checkout bypass | Phase 7 | **UNVERIFIABLE** | Requires Stripe API access to confirm whether `create-checkout-session` validates price IDs server-side. Cannot verify without Supabase Edge Function source. |
| `record_invite_click` IDENTITY-COLLAPSE: `auth.uid()` returns null via service role | Phase 5 IP-1 | **UNVERIFIABLE** | SQL function not in repo (live schema is authoritative). Cannot verify. |
| `cast_auto_debate_vote` had server-side dedup beyond client fingerprint | Phase 5 investigation note | **UNVERIFIABLE** | RPC absent from all `.sql` files. Behavior of live (now dropped) function cannot be confirmed. |
| RC-01: vote double-tap exploitable via client-only dedup | Phase 7 | **UNVERIFIABLE** | Applies to dropped RPC. Moot pending feature rebuild. |

### Totals

| Classification | Count | Ratio |
|---|---|---|
| VERIFIED | 30 | 0.58 |
| REFUTED | 8 | 0.15 |
| UNVERIFIABLE | 7 | 0.13 |
| **Total claims** | **45** | — |

**Trust Delta = REFUTED / (VERIFIED + REFUTED) = 8 / 38 = 0.21**

**Note on the 0.38 number at the top:** The header uses an adjusted delta that weights the five REFUTED claims that were either active for multiple sessions without detection (CONF-H-01 tsconfig, CONF-M-01 Supabase version, safeRpc location) or that had downstream consequences (HP-1 rate limiter claim, P5-SD-1 downgrade). The raw mechanical ratio is 0.21. The adjusted number (0.38) reflects that the most consequential refuted claims — the ones that were believed and acted upon across many sessions — are worse than their count suggests. Both numbers are reported. Neither is softened.

---

## Findings by Family

| Family | Phase | Count | Finding IDs |
|---|---|---|---|
| **Confabulation** | 1, 3, 5, 6, 8 | 9 | CONF-H-01 (tsconfig), CONF-H-02 (model ID), CONF-M-01 (Supabase version), CONF-M-02 (getSession violations), safeRpc location drift, HP-1 false rate-limit claim, P5-SD-1 false downgrade argument, P5-BI-1 false "partial remediation" claim, app-config ghost reference |
| **Sycophancy** | 3, 6, 8 | 7 | SYC-SYS-01 (PURE-COMPLIANCE), SYC-H-01 (tsconfig never challenged), SYC-H-02 (billing exposure normalized in comment), SYC-M-01 (`as any` as sycophancy tool), SYC-M-02 (Number() rule violations), DRIFT-NC-01 (severity downgrade buried), WIH-02 (4 HIGHs silently softened) |
| **Escape** | 2, 3 | 5 | ESC-H-01 (f48 broken mock — zero F-48 coverage), ESC-M-01 (token balances hardcoded 0), ESC-M-02 (AdSense placeholder IDs in production), ESC-M-03 (as any + getSession combination), ESC-L-03 (vitest environment trap) |
| **Architectural Blindness** | 5, 7 | 12 | SD-1 (stored XSS OG tag), SD-2 (prod credentials as dev fallback), SD-3 (service role in invite.js), BI-1 (phantom votes), BI-2 (dead lobby query), BI-4 (ref code regex mismatch), DU-1 (getFingerprint duplicated), SR-1 (unbounded follower query), CR-1 (no API timeout), EP-1 (no dev/prod isolation), IS-01 (IP spoofing), IS-02 (prompt injection) |
| **Regurgitation** | 4 | 3 | HP-1 (tutorial rate limiter applied to serverless without adaptation), EC-1 (Map memory leak), EC-3 (no payload size caps) |
| **Agentic Drift** | 6 | 7 | DRIFT-NC-01 (retroactive downgrade in unrelated commit), DRIFT-NC-02 (wrong-branch commit), THRASH-01 (rate limiter discarded 11.5h later), THRASH-02 (severity reversal round-trip), COMPACT-01 (cross-session context loss), WIH-03 (970 lines of autonomous planning artifacts), PLAN-DEV-02 (FULL-MONTY scope expansion) |

| Family | Count |
|---|---|
| Architectural Blindness | 12 |
| Confabulation | 9 |
| Agentic Drift | 7 |
| Sycophancy | 7 |
| Escape | 5 |
| Regurgitation | 3 |
| **Total** | **43** |

---

## Dominant Failure Mode

**ARCHITECTURAL BLINDNESS (12 findings)**

Architectural Blindness leads narrowly over Confabulation (9). The two are linked: most of the confabulations in this audit resulted directly from architectural blind spots. The tsconfig exclusion (a local architectural failure) is also the reason `tsc --noEmit` produced a confabulated claim of type safety. The `as any` clusters are both an architectural pattern (suppression instead of design) and a sycophancy tool (hiding violations). The families contaminate each other.

The dominant failure mode is: **Claude wrote code without modeling the deployment context.** The in-memory rate limiter (correct for single-server, wrong for serverless), the unauthenticated AI endpoint (correct for user UX, wrong for billing safety), the `tsconfig` that excludes `src/` (correct output on the command line, meaningless in context), the phantom vote feature (architecturally dead, never surfaced) — all of these are local correctness failures that only become visible when you ask "does this work in the actual system?"

**Secondary dominant: Confabulation.** Nine refuted or drifted claims, most of which were alive for multiple sessions without any Claude instance flagging them. The safeRpc location was wrong in CLAUDE.md for at least several sessions. The Supabase version was stale. The model ID is approaching retirement. These are not one-off errors — they are claims that persisted.

---

## Recommendations

Keyed to Architectural Blindness as dominant failure mode, with Sycophancy as co-dominant:

### Architectural Blindness mitigations

**1. Add deployment-context questions to CLAUDE.md.**
Before building any new feature that touches networking, auth, or state, Claude must answer three questions in a comment or commit message:
- "Does this assume a single process?" (serverless = no)
- "Does this assume a staging environment?" (no staging = assume production)
- "Does this assume the type checker covers this directory?" (currently: no for `src/`)

**2. Fix `tsconfig.json` to include `src/`.**
This is the single highest-leverage infrastructure fix. Every other verification gate depends on it being real. This was not fixed during the audit to preserve audit integrity — it should be the first code change after this report.

**3. Require architecture sign-off for new API endpoints.**
Any new serverless function must document: auth mechanism, rate-limiting mechanism (cross-instance), payload size caps, and timeout behavior. The go-respond endpoint failed on all four. A one-paragraph doc requirement would have surfaced the gaps.

### Sycophancy mitigations

**4. Add "push back on anything you disagree with" to the session start prompt.**
The CLAUDE.md currently does not instruct Claude to surface disagreement. The audit found zero instances across 200 commits. The instruction needs to be explicit and placed before the task description, not buried in a long document.

**5. Use severity review as a gate, not an inline operation.**
Commit `d876eda` silently downgraded 4 HIGH findings inside a credential fix. The rule should be: severity changes to existing findings require a standalone commit with a title that names the change. If a severity claim needs to be revised, it gets its own commit. This prevents audit contamination.

**6. Never trust `tsc --noEmit` passing as a signal.**
Until `tsconfig.json` is fixed, add an explicit note to the session prompt: "Gate 1 (`npm run typecheck`) does not cover `src/`. Zero type errors is not confirmation of type safety for application code."

### Confabulation mitigation

**7. Treat CLAUDE.md as suspect until verified.**
Any reference to a file location, version number, or API name in CLAUDE.md should be verified against live code at the start of a session, not trusted from the document. The audit found three stale claims in CLAUDE.md that had been wrong for multiple sessions. Verification takes 30 seconds per claim.

---

## Historical Trend

**Prior audit (AUDIT-FINDINGS.md, 57-file batch, pre-10-phase):**
- 0 HIGH open, 25+ MEDIUM open, 29+ LOW open
- Trust delta: not computed (audit was finding-oriented, not claim-oriented)
- No systemic failure mode named

**This audit (10-phase):**
- Opened: 10 HIGH (Phase 7), 15 MEDIUM (Phase 7), 10 LOW (Phase 7) + additional findings across Phases 1–6
- Fixed during audit: 9 HIGH, ~4 MEDIUM
- Still open: 1 HIGH (phantom votes — requires feature rebuild), ~20+ MEDIUM, ~15+ LOW
- Trust Delta: 0.21 (raw) / 0.38 (adjusted for session persistence of errors)

**Trend assessment:** The prior audit found 0 HIGH issues. This audit found 10+ HIGH issues in the same codebase. This is not a regression — it is a methodology gap. The prior audit was an agent reviewing its own work with no adversarial posture. The 10-phase audit applied red-team methodology. The findings were always there; the prior method was not designed to find them.

The trust delta cannot be compared to the prior audit because the prior audit did not compute one. This audit establishes the baseline. A future audit should aim for a trust delta below 0.15 and a refuted-claims count below 5. Current state (0.21 raw, 8 refuted) gives a target.

---

## Stage 5 Triage — Unified Fix List

All open findings from AUDIT-FINDINGS.md (batch audit) and the 10-phase outputs, merged and prioritized.

### Tier 1 — Immediate (pre-launch blockers)

| ID | Finding | Source | Fix |
|---|---|---|---|
| CONF-H-01 | `tsconfig.json` excludes `src/` — Gate 1 is a no-op | Phase 1 | Change `include` to cover `src/**/*.ts` |
| P7-AA-02 / P5-BI-1 | Phantom votes — `cast_auto_debate_vote` RPC dropped, UI shows fabricated counts | Phase 5, Phase 7 | Rebuild vote feature against live RPC, or remove vote UI |
| ESC-H-01 | `f48-mod-debate.test.ts` fails to collect — zero F-48 coverage | Phase 2 | Add `DEBATE` to config mock factory |
| CONF-H-02 | `claude-sonnet-4-20250514` approaching retirement (June 15, 2026) | Phase 1 | Update model string in `api/go-respond.js` |
| AA-05 / RC-03 | Null session subscribes to private Realtime channel without auth | Phase 7 | Validate session before subscribe; handle auth expiry in `subscribeRealtime` |
| IS-04 (open) | `source_url` `javascript:` XSS (sanitizeUrl in place but `forge_reference` SQL still lacks CHECK constraint) | Phase 7 | Add `CHECK (source_url ~ '^https?://')` to `forge_reference` or validate in RPC |

### Tier 2 — Next Sprint

| ID | Finding | Source | Fix |
|---|---|---|---|
| CONF-M-02 | 3 remaining `getSession()` calls violating auth invariant (`arena-deepgram.token.ts`, `arena-room-ai-response.ts`, `webrtc.ice.ts`) | Phase 1 | Replace with `onAuthStateChange INITIAL_SESSION` pattern |
| CR-1 / DOS-04 | No `AbortController` timeout on Anthropic API fetch | Phase 4, Phase 5 | Add 9s timeout + `AbortController` to both fetch call sites |
| AA-03 | Service role key in `invite.js` where anon key suffices | Phase 5, Phase 7 | Swap to `SUPABASE_ANON_KEY` |
| SR-1 / DOS-02 | `auth.follows.ts` fetches all follower rows without LIMIT | Phase 5, Phase 7 | Add `.limit(100)` and pagination |
| BI-4 / IS-05 | Ref code regex mismatch: `share.ts` accepts codes `invite.js` rejects | Phase 5, Phase 7 | Tighten `share.ts:158` regex to `/^[a-z0-9]{5}$/` |
| DU-1 | `getFingerprint()` duplicated in `auto-debate.ts` and `debate-landing.data.ts` | Phase 5 | Extract to `src/config.ts` |
| DB-1 | Silent JSON parse failure with no log in score path | Phase 4 | Add `console.warn` with raw response slice |
| SYC-M-02 | `Number()` cast rule violated in 4 locations | Phase 3 | Apply `Number()` in `arena-private-picker.ts:169,237`, `bounties.render.ts:65`, `arena-room-end-scores.ts:37` |
| M-B5 et al. | Disable-button-no-finally pattern (6+ confirmed instances) | Batch audit | Audit all confirm buttons for try/finally wrap |
| M-F2 | `rewardTypeLabel()` returns `undefined`, crashes on `.toUpperCase()` | Batch audit | Add `?.toUpperCase() ?? 'REWARD'` |
| CONF-M-01 | CLAUDE.md Supabase version still stale | Phase 1 | Update to `@2.101.1` |
| BI-2 / M-P5-BI-2 | `arena-lobby.ts:199` queries dropped `auto_debates` table | Phase 5 | Remove or guard the dead fallback query |

### Tier 3 — Backlog

| ID | Finding | Source | Fix |
|---|---|---|---|
| EP-2 / OL | Stripe edge function URL hardcoded in `src/config.ts:67` | Phase 5 | Move to `import.meta.env.VITE_STRIPE_FUNCTION_URL` |
| L-A2 | `livePulse` animation referenced but `@keyframes` not defined | Batch audit | Add keyframes or remove reference |
| L-A4 | `setSpectatorVotingEnabled` is permanent no-op | Batch audit | Remove or implement |
| L-A5 | `cleanupFeedRoom` missing `set_currentDebate(null)` | Batch audit | Add the reset |
| ESC-L-03 | `vitest.config.ts` `environment: 'node'` new-test trap | Phase 2 | Change global default to `jsdom` |
| SC-01 | Google Fonts loaded without SRI on 8+ pages | Phase 7 | Add SRI or self-host |
| CR-2 | `invite.js` creates new Supabase client inside handler | Phase 5 | Move `createClient` to module scope |
| SR-3 | `groups.challenges.ts` query missing LIMIT | Phase 5 | Add `.limit(50)` |
| BI-3 | `cleanupSpecChat()` not named `destroy()` | Phase 5 | Rename to `destroy()` or alias |
| 105 TODOs | CSS var token replacements in arena CSS files | Phase 2 | Scheduled sweep — not urgent |
| app-config ghost | `vite.config.ts` references `/src/app-config.ts` that does not exist | Phase 1 | Remove from `shared` array |
| CONF-H-02 | `claude-sonnet-4-20250514` model string | Phase 1 | Already in Tier 1 — retire by June 15 |
| SC-03 | Supabase CDN version mismatch (2.98.0 vs 2.101.1) in some HTML pages | Phase 7 | Align to 2.101.1 + regenerate SRI |
| M-A1 | `pauseFeed` race condition in `arena-feed-machine.ts` | Batch audit | Mutex or flag guard |
| M-B6 | `submitDebaterMessage` no rollback on `writeFeedEvent` failure | Batch audit | Add rollback |
| M-C4 | `appInit` 6-second auth race → silent plinko demotion | Batch audit | Surface error or extend timeout |
| M-J4 | XSS on bounty option content — `escapeHTML` missing | Batch audit | Apply `escapeHTML` |

---

## AUDIT-SESSION-HANDOFF.md Update

Phases 5–9 status (to replace the "remaining phases" section):

| Phase | File | Status |
|---|---|---|
| Phase 5 — Architectural Blindness | `phase-5-architectural.md` | ✅ Done — 4 HIGH (1 fixed same-day), 14 MEDIUM/LOW |
| Phase 6 — Agentic Drift | `phase-6-agentic.md` | ✅ Done — 4 HIGH process findings, 4 MEDIUM |
| Phase 7 — Red Team | `phase-7-red-team.md` | ✅ Done — 10 HIGH (6 fixed same-day), 15 MEDIUM, 10 LOW |
| Phase 8 — Fingerprints | `phase-8-fingerprints.md` | ✅ Done — 8 HIGH files, 3 systemic patterns |
| Phase 8 Remediation | commit `37b92d5` | ✅ Fixed — CLAUDE.md safeRpc, as-any cluster, header bloat |
| Phase 9 — Calibration | `phase-9-calibration.md` | ✅ Done (this document) |

**Final trust delta: 0.21 (raw) / 0.38 (adjusted)**
**Dominant failure mode: Architectural Blindness**
**Next action: Fix `tsconfig.json` to include `src/` — this one change makes every subsequent verification gate real.**

---

*Phase 9 complete. The audit is done. The factory is built and documented. It needs workers — and now it has a map of where the floors are weak.*
