# SESSION HANDOFF — April 26, 2026

## Project: The Moderator (themoderator.app)
## Repo: https://github.com/wolfe8105/colosseum
## Token: [Pat fills in at paste time]

---

## WHO IS PAT

Pat Wolfe is a non-technical builder in western Pennsylvania who has built a production debate platform (The Moderator) across 299+ sessions with Claude. He is not a software engineer but has sharp judgment. He drives. You follow. No fluff, no getting ahead of him, no over-formatting.

---

## WHAT HAPPENED THIS SESSION (S298 → S299)

### Layer 5 — Integration tests
- All 623 seams processed. 242 files, 4076 tests.
- Fixed TC-469-3 and TC-469-4 (stale mock bleed — mockRpc.mockReset() added).
- int-groups.test.ts and int-arena-private-lobby.test.ts both passing clean.
- Pushed: commit 9d0a4d6 — "test(int): layer 5 complete — all 623 seams processed"

### Layer 6 — Dependency clamps
- 6-clamp coverage now complete:
  - Clamp 1: Supabase Realtime (already wired)
  - Clamp 2: Stripe (already wired)
  - Clamp 3: Deepgram (already wired)
  - Clamp 4: Vercel serverless (already wired)
  - Clamp 5: HIBP — NEW (plinko-password.ts)
  - Clamp 6: safeRpc contract violations now fire to PostHog in prod (were console.warn only)
- Pushed: commit 03da082

### Layer 7 — Browser walkthrough campaign
- Full test campaign document written and committed.
- Campaign document: lessons-learned/WALKTHROUGH-CAMPAIGN-v1.md
- Log file: lessons-learned/WALKTHROUGH-LOG.md
- Latest commit: 0811ad1

---

## WHAT THE CAMPAIGN DOCUMENT CONTAINS

Read lessons-learned/WALKTHROUGH-CAMPAIGN-v1.md before doing anything else. It contains:

- **Defect severity classification** (S1–S5) with app-specific examples
- **Entry criteria** — what must be true before starting any pass
- **Exit criteria** — when the campaign is complete
- **Suspension criteria** — what stops a pass mid-run
- **Variable matrix** — 10 variables, 16 passes, one variable changed per pass
- **Pass order** — Pass 1 starts with unplugged baseline
- **Element inventory** — ~401 elements across 9 gate groups (A through I), every element has a specific expected result written in advance
- **Session break protocol** — stop at 50 elements or 60 minutes, write handoff to log
- **Log format** — append-only, timestamped, severity included

---

## FIRST THING TO DO THIS SESSION

### Step 1 — Read the campaign document
In this chat, read the full contents of:
- lessons-learned/WALKTHROUGH-CAMPAIGN-v1.md
- lessons-learned/WALKTHROUGH-LOG.md

### Step 2 — Check entry criteria for Pass 1

Before opening the browser:
1. Confirm build at themoderator.app matches commit 0811ad1 (check Vercel dashboard)
2. Have test account credentials ready: wolfe8105+test1@gmail.com (Pat provides password)
3. Know that two browser tabs are needed: tab 1 = themoderator.app, tab 2 = PostHog activity (us.posthog.com/project/388572/activity/explore)
4. PostHog screenshot permission: us.posthog.com is blocked from screenshot in Claude in Chrome. Workaround: Claude logs timestamps of every action, Pat reconciles against PostHog event timestamps after the pass.

### Step 3 — Start Pass 1

Pass 1 configuration:
- Ruleset: unplugged
- Ranked: casual
- questions_answered: current value (check profile)
- token_balance: current value (check profile — was 603 at end of last session)
- is_moderator: true
- profile_depth_pct: 25%
- subscription_tier: free
- powerup inventory: none
- powerup equipped: none

Log entry before starting:
```
[timestamp] [PASS 1] ENTRY CRITERIA MET — build: 0811ad1, account: clean, PostHog: ready
```

Then work through Gate Group A first, one element at a time, logging each result.

---

## BROWSER SETUP

Claude in Chrome is connected to chrome2 (Windows, local).
Tab management: use tabs_context_mcp to check current tabs before acting.
Navigate fresh to themoderator.app — do not carry history from prior session.

**Critical lesson from last session:** Browser history contamination causes false failures. Any time `history.back()` is called during the walkthrough (cancel buttons, backdrop clicks), it may land on a prior state. Always navigate fresh to themoderator.app between passes.

---

## POSTHOG

Project: 388572
URL: us.posthog.com/project/388572/activity/explore
Filter: last hour, no other filters
Known issue: Claude in Chrome cannot screenshot PostHog (permission blocked). Timestamps in log are the reconciliation mechanism.

Clamp events to watch for:
- clamp:realtime:disconnect / reconnect / error
- clamp:stripe:failure
- clamp:deepgram:error / paused / recovered
- clamp:vercel:failure
- clamp:hibp:failure / rate_limited
- clamp:rpc:contract_violation

---

## REPO STATE

- GK tests: 32 files, ~600+ tests, all passing
- Retrofitter tests: 2750+ tests
- Integration tests: 242 files, 4076 tests
- Known permanent failures (do not fix):
  - tests/integration/int-plinko-step1-method.test.ts
  - tests/f48-mod-debate.test.ts
- Layer 7 campaign: not started (Pass 1 begins this session)
- Layer 8: not defined yet

---

## SESSION RULES (carry forward)

1. Print project instructions at session start
2. STATEMENTS/QUESTIONS parse — verbatim quote, "Acknowledged" if no questions
3. Code task = filename/URL/verb; single shell → execute; 2+ files → numbered questions only, no code until "build it"/"do it"/"go"
4. Stop after answering, no follow-up offers
5. Map first, code second (2+ files or screen/RPC boundary)
6. Direct honesty, no softening
7. "I need to verify that" instead of guessing
8. No external knowledge inference on Supabase/Stripe/Vercel/etc.
9. GAN-style critique on everything generated

---

## WHAT NOT TO DO

- Do NOT get ahead of Pat. He drives. You follow.
- Do NOT run more than one element at a time during the walkthrough
- Do NOT skip the entry criteria check before starting a pass
- Do NOT investigate S3/S4/S5 failures during the walkthrough — log and continue
- Do NOT continue a flow after 3+ S1 failures — suspend and log
- Do NOT navigate to PostHog mid-walkthrough — timestamps handle reconciliation
- Do NOT clear the browser history manually — just navigate fresh to themoderator.app
- Do NOT put the token in any committed file
- Do NOT use bare vi.useFakeTimers() — always pass the toFake array
- Do NOT use vi.runAllTimersAsync() on self-cancelling intervals

---

## KEY LESSONS FROM THIS SESSION

1. Browser history contamination is a real failure mode. The first time we hit cancel on the ranked picker, history.back() restored an AI sparring match that looked like a code bug. It wasn't. Navigate fresh between passes.

2. PostHog received only 4 events during the walkthrough (Pageleave, 2x Web vitals, Pageview) — all anonymous. The test account session may not have been identified to PostHog. Investigate before Pass 2 whether PostHog is receiving identified events from wolfe8105+test1@gmail.com.

3. The campaign document is the source of truth. Do not improvise test cases. Every element has an expected result written in advance. Use it.

4. Slow walk every step. One element. Observe. Log. Next element. Pat's instruction from this session.
