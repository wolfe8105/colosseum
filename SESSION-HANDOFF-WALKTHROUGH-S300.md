# SESSION HANDOFF — April 26, 2026

## Project: The Moderator (themoderator.app)
## Repo: https://github.com/wolfe8105/colosseum
## Token: [Pat fills in at paste time]

---

## WHO IS PAT

Pat Wolfe is a non-technical builder in western Pennsylvania who has built a production debate platform (The Moderator) across 300+ sessions with Claude. He is not a software engineer but has sharp judgment. He drives. You follow. No fluff, no getting ahead of him, no over-formatting.

---

## WHAT HAPPENED THIS SESSION (S299 → S300)

### Layer 7 — Pass 1 started

Pass 1 (Unplugged baseline) is in progress. ~50 elements tested. Log is at lessons-learned/WALKTHROUGH-LOG.md. Commit: d43a4f3.

**Results so far:**

Gate Group A1 — all 8 nav elements: PASS
Gate Group A2 — ELO/WINS/STREAK tabs, explainer modal, close: PASS. Search input: FAIL S4 (see findings).
Gate Group A3 — SKIP (no live debates available)
Gate Group A4/A5 — SKIP (requires logged-out state)
Gate Group B1 — ENTER THE ARENA, PRIVATE DEBATE, JOIN CODE validation: all PASS
Gate Group B2 — CASUAL: PASS
Gate Group B3 — UNPLUGGED: PASS
Gate Group B4 — TEXT BATTLE, AI SPARRING: PASS
Gate Group B6 — all 4 round buttons: PASS
Gate Group B9 — ENTER BATTLE (READY): PASS. Share button: FAIL S4.
Gate Group B14 — send button empty/with-text/click, round advance: PASS

**5 findings logged:**

1. S4 — Expired open debates show CANCEL button that returns CANCEL FAILED. Timer not auto-removing expired debates from feed.
2. S5 — "BECOME A MODERATOR" CTA visible for account that IS already a moderator.
3. S4 — A2 leaderboard search input not functional in automation environment (keyboard input not reaching field, programmatic workaround also doesn't filter list). Needs manual verification.
4. S4 — B9 SHARE TO WATCH LIVE button shows no confirmation/toast after click.
5. NOTE — Keyboard input via automation `type` action does NOT reach most app inputs (textarea, lb-search, etc.). Workaround: JS `el.value = 'text'; el.dispatchEvent(new Event('input', {bubbles:true}))`. Use this for all remaining input tests.

**PostHog reconciliation (15:32–15:41):**
Events received — Pageview, Web vitals, Pageleave across index.html, screen=profile, screen=arena. Person ID: 019da6b1-0c13-7c51-9c5a-6bc7b63e6bef (anonymous — not linked to wolfe8105). No clamp events (none expected — no clamp conditions triggered). PostHog identity issue confirmed open.

---

## FIRST THING TO DO THIS SESSION

### Step 1 — Read the log
Read lessons-learned/WALKTHROUGH-LOG.md in full to see exact last element tested and all findings.

### Step 2 — Resume Pass 1 from where we left off

Next elements (in order):
- B14 — Finish turn button (scroll down in debate room — need to start an AI sparring match first)
- B14 — Concede button
- B10 — PRIVATE DEBATE picker: CHALLENGE BY USERNAME → user search overlay
- B10 — GROUP MEMBERS ONLY → group picker overlay
- B10 — SHAREABLE JOIN CODE → mode/round config
- B10 — Cancel button, Backdrop
- B11 — Private lobby user search: type 2+ chars, click result, cancel
- B12 — Private lobby group picker: click group row, cancel
- B18 — Home feed: category filters, composer, POST button, reactions
- B19 — Notifications panel
- B20 — Search
- B21 — Profile page (archive filters, depth progress)
- B22 — Settings page
- B23-B35 — Groups, GvG, auditions, member actions, reference arsenal, voice memo, DMs, cosmetics

### Step 3 — After B group, continue C → I

### Step 4 — Account state reminder
- Tokens: 603 (unchanged — no staking done)
- Profile depth: 25%
- is_moderator: true
- No open debates (cleaned via SQL)

### Step 5 — Keyboard input workaround
For ALL input/textarea tests, use JS: `el.focus(); el.value = 'text'; el.dispatchEvent(new Event('input', {bubbles:true}));`
Do NOT rely on browser_batch `type` action for app inputs — it doesn't reach them.

---

## BROWSER SETUP

Claude in Chrome is connected to chrome2 (Windows, local).
Navigate fresh to themoderator.app — do not carry history from prior session.
Tab 1: themoderator.app
Tab 2: us.posthog.com/project/388572/activity/explore (reload before starting)

---

## POSTHOG

Project: 388572
Known issue: test account session is anonymous in PostHog — identity not linked to wolfe8105+test1@gmail.com. Investigate before Pass 2. For now, timestamps in log are the reconciliation mechanism.

---

## REPO STATE

- GK tests: 32 files, ~600+ tests
- Retrofitter tests: 2750+ tests
- Integration tests: 242 files, 4076 tests
- Known permanent failures: int-plinko-step1-method.test.ts, f48-mod-debate.test.ts
- Layer 7 campaign: Pass 1 in progress (~20% done)
- Walkthrough log: lessons-learned/WALKTHROUGH-LOG.md
- Campaign doc: lessons-learned/WALKTHROUGH-CAMPAIGN-v1.md
- Latest commit: d43a4f3

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
- Do NOT skip the entry criteria check before starting a new pass
- Do NOT investigate S3/S4/S5 failures during the walkthrough — log and continue
- Do NOT continue a flow after 3+ S1 failures — suspend and log
- Do NOT navigate to PostHog mid-walkthrough — timestamps handle reconciliation
- Do NOT clear the browser history manually — just navigate fresh to themoderator.app
- Do NOT put the token in any committed file
- Do NOT use bare vi.useFakeTimers() — always pass the toFake array
- Do NOT use vi.runAllTimersAsync() on self-cancelling intervals
- Do NOT use browser_batch `type` for app inputs — use JS workaround instead

---

## KEY LESSONS FROM THIS SESSION

1. Keyboard input via automation does NOT reach most app inputs. JS workaround required for every input field test.

2. PostHog identity is still anonymous. The test account session is not being identified. Investigate `posthog.identify()` call — is it firing on login in this browser?

3. Nav hit targets: bottom nav icons require clicking at approximately y=617, not at the label text. Profile is at x=1411, Groups at x=1097, Ranks at x=784, Arena at x=471, Feed at x=157.

4. Cancel buttons in the arena picker flow may not reliably close sheets — navigate fresh to arena URL between tests.

5. AI Sparring is the fastest way to get into a live debate room for B14 testing. Takes ~5 seconds from clicking AI SPARRING to being in the debate room.
