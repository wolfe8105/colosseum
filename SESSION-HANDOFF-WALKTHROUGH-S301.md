# SESSION HANDOFF — April 26, 2026

## Project: The Moderator (themoderator.app)
## Repo: https://github.com/wolfe8105/colosseum
## Token: [Pat fills in at paste time]

---

## WHO IS PAT

Pat Wolfe is a non-technical builder in western Pennsylvania who has built a production debate platform (The Moderator) across 300+ sessions with Claude. He is not a software engineer but has sharp judgment. He drives. You follow. No fluff, no getting ahead of him, no over-formatting.

---

## WHAT HAPPENED THIS SESSION (S300 → S301)

### Layer 7 — Pass 1 continued

Resumed from B14 (last session). Covered B18–B23. Log is at lessons-learned/WALKTHROUGH-LOG.md. Latest commit: fed6583.

**Results this session:**

Gate Group B18 — Feed category filters (ALL/Sports/Politics/Music/Entertainment/Couples Court/Trending): all PASS. Composer/POST/hot takes: SKIP (feature removed — confirmed by Pat). Flame reaction on own debate: FAIL S4. VIEW on verdict card: FAIL S4 ("No debate ID provided").
Gate Group B19 — Notifications panel (bell, mark all read, individual click, backdrop, close): all PASS.
Gate Group B20 — Search input: FAIL S4 (same keyboard input automation gap). Results/clear: SKIP.
Gate Group B21 — Profile (archive loads, W/L/ALL filters, depth bar): all PASS.
Gate Group B22 — Settings (dark mode toggle, save changes, delete modal, cancel, back to app): all PASS. Reset Password: FAIL S4 (silent — no feedback).
Gate Group B23 — Groups lobby (DISCOVER/MY GROUPS/RANKINGS, create modal, create group with name): all PASS. Group "S301 Test Group" was created during testing — exists in DB, may want to delete.

**New findings this session (cumulative total: 8):**

1. PRE-PASS — Expired open debates: CANCEL button returns CANCEL FAILED. S4.
2. PRE-PASS — BECOME A MODERATOR CTA shown to existing moderator. S5.
3. A2 — Leaderboard search non-functional in automation (keyboard input gap). Needs manual verify.
4. B9 — SHARE TO WATCH LIVE button shows no confirmation/toast. S4.
5. NOTE — Keyboard input via automation does NOT reach most app inputs. JS workaround: `el.focus(); el.value='text'; el.dispatchEvent(new Event('input', {bubbles:true}))`.
6. B18 — REACT FAILED on own debate flame button. Intentional or bug? S4 pending clarification.
7. B18 — VIEW on VERDICT card → /debate/{uuid} renders "No debate ID provided." S4.
8. B22 — RESET PASSWORD button: no feedback, no email, silent failure. S4.

---

## FIRST THING TO DO THIS SESSION

### Step 1 — Read the log
Read lessons-learned/WALKTHROUGH-LOG.md in full to confirm last element and all findings.

### Step 2 — Resume Pass 1 from B24

Next elements (in order):

**B24 — Groups detail (member view)**
- Navigate to an existing group (The Founders or Walkthrough Test Squad) — NOT S301 Test Group (owned, not member view)
- Feed tab, Challenges tab, Members tab
- Group feed composer — type (use JS workaround), POST button
- JOIN GROUP button (if not already member)

**B25 — Groups GvG challenge modal**
- CHALLENGE ANOTHER GROUP button → modal opens
- Format picker (1v1 / 3v3 / 5v5)
- Search groups for challenge
- SEND CHALLENGE button — with/without group selected

**B26 — Groups audition modal**
- REQUEST AUDITION button (on a group you don't own)
- Audition submit

**B27 — Groups member actions modal (owner/admin only)**
- Gear icon → settings panel
- SET ROLE, KICK MEMBER, BAN MEMBER buttons

**B28–B35 — Remaining:**
- B28: Reference Arsenal — armory sheet
- B29: Reference Arsenal — forge form
- B30: Reference Arsenal — debate loadout
- B31: Voice memo — recorder sheet
- B32: Direct messages
- B33: Rivals presence popup
- B34: Cosmetics page
- B35: Payments / subscription

### Step 3 — After B group complete, continue C → I groups

### Step 4 — Account state
- Tokens: 603 (unchanged)
- Profile depth: 25%
- is_moderator: true
- S301 Test Group created this session (General, 1 member, owned by WOLFE8105) — delete if cleanup needed
- No open debates (PINEAPPLE BELONGS ON PIZZA expired/open — CANCEL fails, clean via SQL if needed)

---

## BROWSER SETUP

Claude in Chrome is connected to chrome2 (Windows, local).
Navigate fresh to themoderator.app — do not carry history from prior session.
Tab 1: themoderator.app
Tab 2: us.posthog.com/project/388572/activity/explore (reload before starting)

---

## POSTHOG

Project: 388572
Known issue: test account session is anonymous in PostHog — identity not linked to wolfe8105+test1@gmail.com. Investigate before Pass 2.

---

## REPO STATE

- GK tests: 32 files, ~600+ tests
- Retrofitter tests: 2750+ tests
- Integration tests: 242 files, 4076 tests
- Known permanent failures: int-plinko-step1-method.test.ts, f48-mod-debate.test.ts
- Layer 7 campaign: Pass 1 in progress (~35% done — B18-B23 complete)
- Walkthrough log: lessons-learned/WALKTHROUGH-LOG.md
- Campaign doc: lessons-learned/WALKTHROUGH-CAMPAIGN-v1.md
- Latest commit: fed6583

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
- Do NOT assume feed composer/post/hot takes exist — feature was removed

---

## KEY LESSONS (cumulative)

1. Keyboard input via automation does NOT reach most app inputs. JS workaround required: `el.focus(); el.value='text'; el.dispatchEvent(new Event('input', {bubbles:true}))`.

2. PostHog identity is still anonymous. Test account not identified. Investigate before Pass 2.

3. Nav hit targets: bottom nav icons require clicking at approximately y=617, not at the label text. Profile x=1411, Groups x=1097, Ranks x=784, Arena x=471, Feed x=157.

4. Cancel buttons in the arena picker flow may not reliably close sheets — navigate fresh to arena URL between tests.

5. AI Sparring is the fastest way into a live debate room for B14 testing (~5 seconds).

6. Browser history contamination is a real failure mode. Navigate fresh between passes.

7. Feed composer/post feature is removed from the main feed. Group-scoped feeds DO have their own composer ("Let your opinion be heard...").

8. CREATE GROUP button is not disabled when name is empty — it silently blocks with no error message.

9. The push token changes each session — Pat provides it at paste time. Do not store it in any file.
