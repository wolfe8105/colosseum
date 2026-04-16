# THE MODERATOR — AUDIT FINISH PLAN

**Date:** April 16, 2026
**Status:** Reconciling the 5-Stage Attack Plan and the 10-Phase AI Audit Research Prompts into a single execution track for the remaining audit work.

---

## THE PROBLEM THIS DOCUMENT SOLVES

Two audit plans are live in the repo:

1. **`THE-MODERATOR-ATTACK-PLAN.md`** — a 5-stage plan (Stages 0–5) built from the Tactics Inventory. Stage 2 is the three-pass audit (wiring/adversarial/timing) and is already complete for this pass.
2. **`THE-COLISEUM-AI-AUDIT-RESEARCH.md`** — a 10-phase plan (Prompts 0–9) built from conceptual research into AI failure families. Maps each phase to a specific Claude failure mode (confabulation, sycophancy, regurgitation, escape, drift, architectural blindness).

They overlap heavily. Running both in full would be redundant and exhausting. Running only one leaves real gaps.

This document picks the surviving subset of each and orders them into one finish-line sequence.

---

## WHERE WE ARE RIGHT NOW

### Done
- Phase 1 Outside Tools — Dependency Cruiser
- Phase 1 Outside Tools — SonarQube (fixes merged; 89 false-positive Hotspots await bulk-Safe in UI)
- Stage 2.1 Wiring audit
- Stage 2.2 Adversarial security audit (SEC-01, 02, 03, 05 fixed and merged)
- Stage 2.3 Timing/failure audit (TIMING-01 through TIMING-05 fixed and merged)
- CC Prompt 1 (5 client-side timing fixes) — merged
- CC Prompt 2 (2 SQL fixes in Supabase) — done
- CC Prompt SONAR-SRI-01 (Supabase CDN pin + SRI) — merged

### Held for later
- **SONAR-REFCODE-TIGHTEN** — tighten regex in `src/share.ts:158` from `/^[a-zA-Z0-9_-]{4,20}$/` to `/^[a-z0-9]{5}$/` to match generator output
- **STAGE-3.1-CHECK-01** — verify `cast_auto_debate_vote` RPC has server-side dedup, not just client fingerprint trust

---

## COVERAGE RECONCILIATION

### What the 10 Prompts cover that Stage 3 also covered
| Stage 3 item | Replaced by |
|---|---|
| 3.1 RPC/RLS audit | Prompt 5 (Architectural Blindness) — covers identity propagation, RPC auth, RLS, scaling |
| 3.2 Regression spot-check | Prompt 0 (Scope & setup) + Prompt 2 (Escape — run the tests yourself) |
| 3.3 Contract verify on HIGH findings | Prompt 7 (Red Team) — explicit contract/scenario verification |

**Verdict:** The 10 Prompts replace Stage 3 entirely and with more rigor. Stage 3 is no longer needed as a separate track.

### What the 10 Prompts do NOT cover
The following items from the 5-Stage plan have no equivalent in the 10 Prompts:

| Item | Why the 10 Prompts can't replace it |
|---|---|
| **Stage 1.1 Schema drift** — `supabase db diff` vs deployed | Requires Supabase CLI + production access; no LLM can verify |
| **Stage 1.2 Bible drift** — sample 5 Moderator doc claims against code | Requires source-of-truth docs the prompts don't know about |
| **Stage 1.4 Phantom blocker sweep** — walk every "unknown/NOT WALKED/TBD" feature | Requires the Punch List the prompts don't consult |
| **Stage 4.1 Phone smoke test** — 10 flows, 15–25 min, real device | Requires a human and a phone |
| **Stage 4.2 Outside-in fresh Claude review** — no-context architectural review | Explicitly a fresh-session exercise, not an audit prompt |

**Stages with NO backup catcher (per the Attack Plan's own warning):** 1.4 phantom sweep, 4.1 smoke test, 4.2 outside-in.

---

## THE FINISH PLAN

### Step 1 — Park the skippable Stage 1 work

**What:** Stage 1.1 (schema drift), 1.2 (bible drift), 1.4 (phantom sweep).

**Action:** Skip for now. These can run any time — they are not blocking. Revisit after the 10 Prompts if still wanted.

**Reasoning:** Stage 2 has already run, which is the expensive audit pass these were meant to feed. Running them post-hoc yields diminishing returns.

---

### Step 2 — Run the 10 Prompts

**What:** Prompt 0 through Prompt 9, each in a **fresh Claude Code session**, in order, saving each phase's markdown output.

**Why fresh sessions:** The prompts are designed to fight Claude's own failure modes (sycophancy, context corruption, scope drift). A fresh session has no loyalty to prior claims and no accumulated context rot.

**Order dependency:** Later prompts consume earlier prompts' outputs. Do not parallelize. Do not skip.

**Time estimate:** 10 sessions × ~30–60 min each = 5–10 hours of CC work spread across however many days fits.

**Prompts:**

| # | Name | What it catches | Output file |
|---|---|---|---|
| 0 | Scope & Setup | Inventory, sycophancy-flagged commits, scope drift, missing artifacts | `phase-0-scope-inventory.md` |
| 1 | Confabulation | Invented packages, invalid APIs, ecosystem confusion | `phase-1-confabulation.md` |
| 2 | Escape Behavior | False test reports, incomplete work, removed safety checks | `phase-2-escape.md` |
| 3 | Sycophancy | Unchallenged premises, violated architectural boundaries, quick-fix antipatterns | `phase-3-sycophancy.md` |
| 4 | Regurgitation | Edge-case failures, unnecessary deps, over-abstraction, happy-path-only code | `phase-4-regurgitation.md` |
| 5 | Architectural Blindness | Security defaults, identity propagation, broken invariants, scaling risks | `phase-5-architectural.md` |
| 6 | Agentic Drift | Scope drift, thrashing, non-atomic commits, while-I'm-here decisions | `phase-6-drift.md` |
| 7 | Red Team | Input/output surface, authn/authz matrix, races, DoS, supply chain | `phase-7-redteam.md` |
| 8 | Claude Fingerprinting | Abbreviated names, narrating comments, mock-heavy tests, heatmap | `phase-8-fingerprints.md` |
| 9 | Calibration | Trust delta, findings-by-family rollup, dominant failure mode, recommendations | `phase-9-calibration.md` |

Full prompt text is in `THE-COLISEUM-AI-AUDIT-RESEARCH.md` in the repo root.

**Prerequisites before starting:**
- Commit all held items (SONAR-REFCODE-TIGHTEN) or note them as out-of-scope
- Clear SonarQube Hotspots in the UI (so the 89 false positives don't get re-flagged by the prompts)
- Tag main with a pre-audit marker: `git tag pre-10-prompts-audit` for diff reference

---

### Step 3 — Stage 4.1 — Phone smoke test

**What:** 10 core user flows on a real phone, DevTools remote-inspected if possible. 15–25 minutes.

**Why it's non-negotiable:** No LLM audit can catch real-network bugs, touch-event issues, viewport problems, WebRTC permission flows, or the "it works on desktop" class of defect. This is the ONLY phase that catches these.

**Candidate flow list** (finalize before running):
1. Cold load → Plinko signup → first debate
2. Cold load → OAuth signup → first debate
3. Login → join queue → matched debate → vote
4. Auto-debate share link → vote flow
5. Create challenge link → open on same device
6. Invite flow (`/i/:code`) → redirect → plinko
7. Spectate link → live debate viewer
8. Settings → change preferences → verify persist
9. Groups → join → challenge a member
10. Bounty → claim flow

**Deliverable:** One-page notes doc: `phase-smoke-test-notes.md` with pass/fail per flow + any console errors.

---

### Step 4 — Stage 4.2 — Outside-in fresh Claude review

**What:** Fresh Claude session, zero context from this chat, given only the repo URL and a neutral prompt. Asked to do an architectural read and surface "what's still wrong" from an outsider's perspective.

**Why it's non-negotiable:** By this point everyone involved — you, this chat's Claude, the CC sessions — is cognitively loaded with every finding filed. Fresh eyes catch the framing issues no loaded reviewer can see. This is the ONLY phase that catches post-audit narrative drift.

**Prompt template** (keep it short, don't lead the witness):
> I'm handing you a repo at [URL]. Clone it. Read the top-level docs and a few representative source files. Tell me what concerns you most about this codebase from an architectural, security, or maintainability standpoint. Do not defer to prior audits — they're a separate conversation. What would you flag?

**Deliverable:** Whatever that session produces, captured as `phase-outside-in.md`.

---

### Step 5 — Final triage

**What:** This chat. Merge all findings from:
- 10 Prompt outputs (Phase 0–9)
- Phone smoke test notes
- Outside-in review
- Held items (SONAR-REFCODE-TIGHTEN, STAGE-3.1-CHECK-01)

Into one ranked fix list by severity + blast radius. Add LM Map entries for anything that deserves permanent documentation. Assign each finding to a fix phase.

**Output:** Updated LM Map + fix-phase plan.

---

## IS THIS ACTUALLY "THE LAST OF IT"?

Yes, for this audit cycle. After these four steps are done:

- Every Claude failure family has been audited by a prompt designed specifically for it
- Every "no backup catcher" stage from the 5-Stage plan has been run
- Real-device and fresh-eyes passes have happened
- Findings have been triaged into fix phases

What comes **after** this cycle (per the original roadmap) is **Phase 3 — 5-agent batch audits, full codebase, fresh**. That's a separate cycle, not part of this audit.

---

## EXECUTION ORDER SUMMARY

```
NOW:  Clear SonarQube Hotspots (UI bulk-Safe)
      ↓
  →   Tag: git tag pre-10-prompts-audit
      ↓
  →   Run Prompt 0 (fresh CC session)
  →   Run Prompt 1 (fresh CC session)
  →   Run Prompt 2 (fresh CC session)
  →   ...
  →   Run Prompt 9 (fresh CC session)
      ↓
  →   Stage 4.1 — Phone smoke test (you, 15–25 min)
      ↓
  →   Stage 4.2 — Outside-in fresh Claude (fresh session, no context)
      ↓
  →   Final triage (this chat)
      ↓
DONE: Audit cycle complete. Move to Phase 3 (5-agent batch audits).
```

---

## NOTES

- Held items (SONAR-REFCODE-TIGHTEN, STAGE-3.1-CHECK-01) should be either fixed before Step 2 or explicitly noted as "deferred to fix phase" in the Phase 0 scope inventory, so they don't get re-discovered and double-counted by the prompts.
- If any prompt output has a trust delta (Phase 9) above ~0.4, strongly consider re-running the implicated prior phases — the audit itself may be failing in the same way the audited code did.
- Stage 4.2 should use a model/session that has never seen `THE-COLISEUM-AI-AUDIT-RESEARCH.md`. If the outside-in reviewer has that document in context, it isn't outside-in anymore.
