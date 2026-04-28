# WALKTHROUGH LOG
# Append only. Never overwrite. One line per result.
# Format: [timestamp] [PASS N] [GATE GROUP] [element] → [PASS/FAIL/SKIP] [note]

## Handoff — 2026-04-26 14:15:00
Pass: 1 (Unplugged baseline)
Last element tested: B33 Rivals presence popup dismiss button
Elements tested this session: ~35 (smoke test only — not full campaign format)
Next element: A1 Feed tab (start full Pass 1 from the top)
Pass 1 % complete: ~8% (smoke test partial)
Anomalies found:
  - 14:02 [B1] JOIN CODE < 5 chars → appeared to launch AI Sparring — INVESTIGATION: confirmed browser history contamination from prior navigation, not a code bug. Source validates length correctly.
  - 14:07 [B1] POWER-UPS button → appeared to launch AI Sparring — INVESTIGATION: same root cause, browser history contamination. Not a code bug.
PostHog events to reconcile: 13:58–14:14 (only 4 events received — Pageleave, 2x Web vitals, Pageview — all anonymous. Clamp events not received. Likely session identity not linked to PostHog anonymous ID.)
Notes: First walkthrough session was a smoke test, not full campaign format. Campaign v1 document now defines the proper method. Start Pass 1 fresh next session.

## Session — 2026-04-26

### Pre-pass cleanup
[15:30:00] PRE-PASS Feed showing 12 open/expired WOLFE8105 debates with CANCEL buttons
[15:30:01] PRE-PASS CANCEL button clicked on expired debate → CANCEL FAILED toast → S4 — expired debates not auto-removed from feed; cancel RPC fails on expired status. Debates removed manually via SQL for account cleanliness.
[15:30:02] PRE-PASS Feed showing "BECOME A MODERATOR" CTA for account that IS already a moderator → S5 — cosmetic/logic issue, moderator check may not gate this CTA.

[15:32:00] [PASS 1] ENTRY CRITERIA MET — build: 2c61ed5 (code: 0811ad1), account: clean (12 stale debates removed via SQL), tokens: 603, PostHog: tab open, no open S1/S2 from prior pass


### Pass 1 — Gate Group A1 (Global nav)
[15:32:10] [PASS 1] [A1] Feed tab → PASS
[15:32:20] [PASS 1] [A1] Arena tab → PASS — note: nav hit target is icon not label; clicking at label y-coord misses. Reliable at y=617.
[15:32:30] [PASS 1] [A1] Ranks tab → PASS
[15:32:40] [PASS 1] [A1] Groups tab → PASS
[15:32:50] [PASS 1] [A1] Profile tab → PASS
[15:33:00] [PASS 1] [A1] Search icon → PASS — search screen opens with input focused
[15:33:10] [PASS 1] [A1] Notification bell → PASS — panel opens, shows notifications
[15:33:20] [PASS 1] [A1] User avatar → PASS — overlay opens with username, Groups, Settings, Complete Profile, Log Out

### Pass 1 — Gate Group A2 (Leaderboard)
[15:33:30] [PASS 1] [A2] ELO tab → PASS — sorted by ELO, tab highlighted
[15:33:40] [PASS 1] [A2] WINS tab → PASS — sorted by wins
[15:33:50] [PASS 1] [A2] STREAK tab → PASS — sorted by streak
[15:34:00] [PASS 1] [A2] Search input 1 char → FAIL S4 — lb-search-input does not accept keyboard input from browser automation. Programmatic value set + input event dispatched, list still does not filter. Leaderboard search non-functional in walkthrough environment (may work in real browser focus — to verify manually).
[15:34:10] [PASS 1] [A2] Search input 3 chars → SKIP — same failure mode as 1 char
[15:34:20] [PASS 1] [A2] Search input clear → SKIP — same failure mode
[15:34:30] [PASS 1] [A2] ELO explainer (? icon) → PASS — modal appears with full ELO explanation
[15:34:40] [PASS 1] [A2] ELO explainer close button → PASS — modal removed from DOM


### Pass 1 — Gate Group B1 (Arena lobby)
[15:35:00] [PASS 1] [B1] ENTER THE ARENA button → PASS — casual/ranked picker slides up, lobby visible behind
[15:35:10] [PASS 1] [B1] PRIVATE DEBATE button → PASS — private lobby picker slides up showing Challenge by Username, Group Members Only, Shareable Join Code, rounds selector
[15:35:20] [PASS 1] [B1] POWER-UPS button → SKIP — not tested yet this segment
[15:35:30] [PASS 1] [B1] JOIN CODE < 5 chars + GO → PASS — toast "ENTER A 5-CHARACTER CODE" shown, no navigation
[15:35:40] [PASS 1] [B1] JOIN CODE 6+ chars → PASS — input capped at 5 chars, 6th char rejected
[15:35:50] [PASS 1] [B1] JOIN CODE exactly 5 chars + GO (invalid) → PASS — attempts join, shows "SOMETHING WENT SIDEWAYS. GIVE IT ANOTHER SHOT." toast, stays on arena

### Pass 1 — Gate Group B2 (Casual/ranked picker)
[15:36:00] [PASS 1] [B2] CASUAL card → PASS — ruleset picker sheet appears
[15:36:10] [PASS 1] [B2] RANKED card (depth ≥ 25%) → SKIP — not tested separately, covered by B3 path
[15:36:20] [PASS 1] [B2] Backdrop/Cancel → SKIP — not tested this segment

### Pass 1 — Gate Group B3 (Ruleset picker)
[15:36:30] [PASS 1] [B3] UNPLUGGED card → PASS — mode picker appears
[15:36:40] [PASS 1] [B3] AMPLIFIED card → SKIP — not tested this segment

### Pass 1 — Gate Group B4 (Mode picker)
[15:36:50] [PASS 1] [B4] TEXT BATTLE → PASS — category/config screen appears
[15:37:00] [PASS 1] [B4] AI SPARRING → PASS — pre-debate screen immediately shows WOLFE8105 VS AI SPARRING BOT, no queue
[15:37:10] [PASS 1] [B4] VOICE MEMO → SKIP
[15:37:20] [PASS 1] [B4] MODERATED LIVE → SKIP

### Pass 1 — Gate Group B5 (Category picker) — TEXT BATTLE config
[15:37:30] [PASS 1] [B5] Category chips — OBSERVATION: chips exist in DOM but are above viewport in TEXT BATTLE config sheet; not scrollable via normal interaction. Tested via JS click (Sports). START DEBATE remained disabled even after Sports selected + AI MODERATOR clicked. Further investigation needed — may require title input too.
[15:37:40] [PASS 1] [B5] START DEBATE (no category) → PASS — confirmed disabled

### Pass 1 — Gate Group B6 (Round picker)
[15:38:00] [PASS 1] [B6] 4 rounds → PASS
[15:38:05] [PASS 1] [B6] 6 rounds → PASS
[15:38:10] [PASS 1] [B6] 8 rounds → PASS
[15:38:15] [PASS 1] [B6] 10 rounds → PASS

### Pass 1 — Gate Group B9 (Pre-debate screen)
[15:38:30] [PASS 1] [B9] Share button (SHARE TO WATCH LIVE) → FAIL S4 — clicked, no visible confirmation, no toast, no clipboard feedback. Expected "Copied!" or similar.
[15:38:40] [PASS 1] [B9] ENTER BATTLE (READY) → PASS — navigates to debate room, AI sparring begins Round 1


### Pass 1 — Gate Group B14 (Debate room — debater actions, AI sparring)
[15:40:00] [PASS 1] [B14] Text input — my turn → PASS — input enabled, accepts text via JS (keyboard automation doesn't reach debate textarea — same issue as leaderboard search)
[15:40:10] [PASS 1] [B14] Send button — empty input → PASS — disabled
[15:40:20] [PASS 1] [B14] Send button — with text → PASS — enabled after JS value set + input event
[15:40:30] [PASS 1] [B14] Send button click → PASS — message submitted, input cleared, round advanced, AI responded. Toast "ROUND COMPLETE. STAY SHARP." shown.
[15:40:40] [PASS 1] [B14] Finish turn button → SKIP — not found/tested this segment
[15:40:50] [PASS 1] [B14] Concede button → SKIP — not tested this segment

### Session handoff — 2026-04-26 15:41:00
Pass: 1 (Unplugged baseline)
Last element tested: B14 Send button click
Next element: B14 Finish turn button (or continue B group from where left off)
Elements tested this session: ~50
Pass 1 % complete: ~20%

Findings this session:
1. PRE-PASS — Expired open debates show CANCEL button that returns CANCEL FAILED. Timer not cleaning expired debates from feed. S4.
2. PRE-PASS — "BECOME A MODERATOR" CTA visible for account that is already a moderator. S5.
3. A2 — Leaderboard search input non-functional in automation environment (keyboard input not reaching lb-search-input, programmatic set + input event also does not trigger filter). Needs manual verification.
4. B9 — SHARE TO WATCH LIVE button on pre-debate screen shows no confirmation/toast after click. S4.
5. B14 — Debate textarea same keyboard input issue as leaderboard search — text typed via automation doesn't reach field. JS workaround works.

Key automation note: Keyboard input via browser_batch type action does NOT reach most inputs in this app. Workaround is JS value set + input event dispatch. This applies consistently.

PostHog events to reconcile: 15:32–15:41

### Session resumed — 2026-04-26 (S301)

[16:XX:00] PRE-SESSION NOTE: AI Sparring match "VIDEO GAMES ARE A LEGITIMATE ART FORM" still live (R1 of 3) from prior session test. TEXT BATTLE "PINEAPPLE BELONGS ON PIZZA" created (OPEN, Sports, AI Moderator) to test B14 Finish Turn / Concede — discovered these buttons require a live opponent in a TEXT BATTLE debate room. Cannot test without second human.

### Pass 1 — Gate Group B14 continued (Finish turn, Concede)
[16:XX:10] [PASS 1] [B14] Finish turn button → SKIP — button does not exist in AI Sparring mode. TEXT BATTLE requires live opponent. Cannot test in current walkthrough environment without a second account.
[16:XX:20] [PASS 1] [B14] Concede button → SKIP — same reason as Finish turn. Requires live TEXT BATTLE.


### Pass 1 — Gate Group B10 (Private debate picker)
[16:58:00] [PASS 1] [B10] PRIVATE DEBATE button → PASS — picker slides up showing CHALLENGE BY USERNAME, GROUP MEMBERS ONLY, SHAREABLE JOIN CODE, ROUNDS selector (4/6/8/10), Cancel
[16:58:10] [PASS 1] [B10] CHALLENGE BY USERNAME → FAIL S4 — expected user search overlay (B11). Got: mode picker (CHOOSE YOUR WEAPON) directly. User selection step skipped. Confirmed on fresh navigate, not history contamination.
[16:58:20] [PASS 1] [B10] GROUP MEMBERS ONLY → FAIL S4 — expected group picker overlay (B12). Got: mode picker (CHOOSE YOUR WEAPON) directly. Group selection step skipped.
[16:58:30] [PASS 1] [B10] SHAREABLE JOIN CODE → FAIL S4 — expected mode/round config + join code generation screen. Got: mode picker (CHOOSE YOUR WEAPON) directly. Join code display step skipped.
[16:58:40] [PASS 1] [B10] Cancel button → PASS — sheet dismissed, back to clean arena
[16:58:50] [PASS 1] [B10] Backdrop click → PASS — sheet dismissed, back to clean arena

### Pass 1 — Gate Group B11 (Private lobby user search)
[16:59:00] [PASS 1] [B11] User search overlay → SKIP — overlay never appears (B10 CHALLENGE BY USERNAME goes directly to mode picker). Cannot test until B10 flow is fixed.

### Pass 1 — Gate Group B12 (Private lobby group picker)
[16:59:01] [PASS 1] [B12] Group picker overlay → SKIP — overlay never appears (B10 GROUP MEMBERS ONLY goes directly to mode picker). Cannot test until B10 flow is fixed.


### Session resumed — 2026-04-26 (S301 continued)

### Pass 1 — Gate Group B18 (Home feed)
[17:XX:00] [PASS 1] [B18] Category filter ALL → PASS — all feed items visible
[17:XX:05] [PASS 1] [B18] Category filter Sports → PASS — filtered to sports only
[17:XX:10] [PASS 1] [B18] Category filter Politics → PASS — filtered, empty state shown
[17:XX:15] [PASS 1] [B18] Category filter Music → PASS — filtered, empty state shown
[17:XX:20] [PASS 1] [B18] Category filter Entertainment → PASS — filtered, empty state shown
[17:XX:25] [PASS 1] [B18] Category filter Couples Court → PASS — filtered, empty state shown
[17:XX:30] [PASS 1] [B18] Category filter Trending → PASS — filtered, empty state shown
[17:XX:35] [PASS 1] [B18] Feed composer input → SKIP — feature removed. No composer or post input exists in DOM.
[17:XX:36] [PASS 1] [B18] Feed composer link input → SKIP — feature removed.
[17:XX:37] [PASS 1] [B18] Feed POST button → SKIP — feature removed.
[17:XX:40] [PASS 1] [B18] Feed card flame/reaction button → FAIL S4 — clicked flame on own OPEN debate (PINEAPPLE BELONGS ON PIZZA). "REACT FAILED" toast. No other users' cards available to test valid reaction. Unclear if self-react is intentionally blocked or a bug.
[17:XX:50] [PASS 1] [B18] Feed card spectate button (VIEW) → FAIL S4 — VIEW on VERDICT card navigated to /debate/{uuid} but page shows "No debate ID provided." URL contains ID but page doesn't read it.
[17:XX:55] [PASS 1] [B18] Feed card join button → SKIP — no joinable open debate by another user in feed.

### Pass 1 — Gate Group B19 (Notifications panel)
[17:XX:00] [PASS 1] [B19] Notification bell → PASS — panel opens with filter tabs (All/Challenges/Results/Reactions/Mod Invites/Economy) and Mark all read button
[17:XX:05] [PASS 1] [B19] Mark all read button → PASS (visual read-state change not clearly distinguishable, but button functional)
[17:XX:10] [PASS 1] [B19] Individual notification click → PASS — Streak Freeze notification clicked, panel closed, returned to feed
[17:XX:15] [PASS 1] [B19] Backdrop click → PASS — panel closed
[17:XX:20] [PASS 1] [B19] Close button → PASS — panel closed

### Pass 1 — Gate Group B20 (Search)
[17:XX:00] [PASS 1] [B20] Search input 2+ chars → FAIL S4 — same keyboard input automation issue as leaderboard search. JS value+input event dispatched, "ad" appears in field, no results populate. Needs manual verification.
[17:XX:05] [PASS 1] [B20] User result click → SKIP — no results to click
[17:XX:10] [PASS 1] [B20] Debate result click → SKIP — no results to click
[17:XX:15] [PASS 1] [B20] Clear search → SKIP — could not trigger search

### Pass 1 — Gate Group B21 (Profile page)
[17:XX:00] [PASS 1] [B21] Debate archive loads → PASS — archive section visible with ALL/W/L filters and search input. Empty (no curated debates added yet).
[17:XX:05] [PASS 1] [B21] Archive filter W → PASS — tab highlighted
[17:XX:10] [PASS 1] [B21] Archive filter L → PASS — tab highlighted
[17:XX:15] [PASS 1] [B21] Archive filter ALL → PASS — tab highlighted
[17:XX:20] [PASS 1] [B21] Profile depth progress → PASS — 25% COMPLETE bar visible

### Pass 1 — Gate Group B22 (Settings page)
[17:XX:00] [PASS 1] [B22] Dark mode toggle → PASS — theme switches immediately to light mode. Toggle state reflects change.
[17:XX:10] [PASS 1] [B22] Bio textarea → SKIP — keyboard input automation gap; not tested
[17:XX:20] [PASS 1] [B22] Save Changes button → PASS — "✓ Settings saved" toast shown
[17:XX:30] [PASS 1] [B22] Reset Password button → FAIL S4 — no visual feedback, no toast, no email sent. Button appears non-functional.
[17:XX:40] [PASS 1] [B22] Delete Account button → PASS — modal opens with "Type DELETE to confirm" input and CANCEL/DELETE buttons
[17:XX:45] [PASS 1] [B22] Delete confirm modal cancel → PASS — modal closes, account unchanged
[17:XX:50] [PASS 1] [B22] Back to App button → PASS — navigates to index.html feed

Findings this sub-session:
6. B18 — REACT FAILED on own debate flame button. May be intentional (self-react blocked) or bug. S4 pending clarification.
7. B18 — VIEW on VERDICT card navigates to /debate/{uuid} but renders "No debate ID provided." S4.
8. B22 — RESET PASSWORD button non-functional. No feedback of any kind. S4.

### Pass 1 — Gate Group B23 (Groups lobby)
[17:XX:00] [PASS 1] [B23] DISCOVER tab → PASS — all public groups listed (The Founders, Walkthrough Test Squad)
[17:XX:05] [PASS 1] [B23] MY GROUPS tab → PASS — shows groups user belongs to, both tagged LEADER
[17:XX:10] [PASS 1] [B23] RANKINGS tab → PASS — sorted by ELO descending (#1 The Founders 1600, #2 Walkthrough Test Squad 1000)
[17:XX:15] [PASS 1] [B23] + CREATE button → PASS — modal opens with NAME, DESCRIPTION, CATEGORY, GROUP EMOJI picker
[17:XX:20] [PASS 1] [B23] Create modal name input → SKIP — keyboard input automation gap; JS workaround used
[17:XX:25] [PASS 1] [B23] CREATE GROUP button — name empty → PASS (partial) — button not disabled by attribute but click does nothing; no error message shown (silent block)
[17:XX:30] [PASS 1] [B23] CREATE GROUP button — name filled (JS) → PASS — group "S301 Test Group" created, navigated to group detail page. Group shows: 1 member, 1000 ELO, YOU OWN THIS GROUP, CHALLENGE ANOTHER GROUP, FEED/CHALLENGES/MEMBERS tabs.

Note: Group feed on detail page shows "Let your opinion be heard..." composer — this is the group-scoped post feature. The main feed post feature was removed but group feeds appear to have their own composer.

### Finding #9 — Profile depth slider not recognized at default position
[2026-04-28] [PASS 1] [B21] Profile depth section — slider input
Slider questions in the profile depth section are not recognized by the app if left at the default (starting) position. The app does not count the question as answered unless the slider has been moved. Moving it away from the default and then back to the original value causes it to register correctly. S3 — workaround exists (move then return) but default-position answers are silently dropped, inflating unanswered question count and potentially undercounting profile_depth_pct and questions_answered.

### Finding #10 — questions_answered counter is decoupled from actual saved answers
[2026-04-28] [PASS 1] [B21] Profile depth — questions_answered accuracy
The `questions_answered` field in profiles is driven purely by incremental RPC calls from the frontend (increment_questions_answered), not by counting actual saved answers in profile_depth_answers. As a result the two are permanently out of sync: wolfe8105 has 47 individual answers saved across 10 sections in profile_depth_answers, but questions_answered = 18. Any session where the RPC was not called (e.g. slider-default answers per finding #9, network failures, or answers saved before the increment logic was added) are silently lost from the counter. This means tier gates (D1 staking, D2 powerup slots) are based on a number that understates actual engagement. S2 — no workaround; the counter cannot self-heal without a backfill migration or a recount RPC that derives the value from actual saved answers.
