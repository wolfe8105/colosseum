# WALKTHROUGH CAMPAIGN — v1
# The Moderator (themoderator.app)
# Status: ACTIVE
# Method: One variable changed at a time. Full element inventory run per pass. Repetition is the stress test.

---

## CAMPAIGN RULES

1. Every pass runs the FULL element inventory for the current gate configuration
2. Only ONE variable changes between passes
3. Each element is tested individually — click it, observe, log pass/fail
4. Repetition is intentional — it is the stress test
5. Every 50 items or every 60 minutes, write a handoff and start a fresh session
6. Log every result in WALKTHROUGH-LOG.md (append only, never overwrite)
7. PostHog clamp events are timestamped — match against log timestamps after each pass

---

## DEFECT SEVERITY CLASSIFICATION

Every failure logged in WALKTHROUGH-LOG.md must include a severity level. Use this scale:

| Level | Label | Definition | Example in this app |
|-------|-------|------------|---------------------|
| S1 | Blocker | Cannot proceed with testing. App crashes or core flow completely broken. | Cannot log in. App freezes on load. |
| S2 | Critical | A primary feature fails entirely. No workaround. | Queue button does nothing. Private lobby never creates. |
| S3 | Major | A feature is broken but a workaround exists, or it affects a secondary flow. | Join code toast doesn't appear but code still works. |
| S4 | Minor | Unexpected behavior that doesn't stop the user from completing their task. | Button re-enables too slowly. Wrong label shown briefly. |
| S5 | Trivial | Cosmetic only. No functional impact. | Text misaligned. Icon slightly off. |

**Severity drives what happens next:**
- S1 → Stop the current flow. Log it. Do not continue that flow until investigated.
- S2 → Log it. Continue the pass but flag before starting the next pass.
- S3/S4/S5 → Log it. Continue without interruption.

**Log format with severity:**
```
[timestamp] [PASS N] [GATE GROUP] [element] → FAIL S2 — [description]
[timestamp] [PASS N] [GATE GROUP] [element] → PASS
[timestamp] [PASS N] [GATE GROUP] [element] → SKIP — [reason]
```

---

## ENTRY CRITERIA (required before starting any pass)

Do not start a pass unless all of the following are true:

1. **Known build** — confirm the deployed version at themoderator.app matches the latest commit on main. Check Vercel dashboard before starting.
2. **Clean browser history** — navigate fresh to themoderator.app at the start of every pass. Do not carry history from a prior pass. This prevents history contamination causing false failures.
3. **Known account state** — test account (wolfe8105+test1@gmail.com) must be logged in. No open debates sitting in YOUR OPEN DEBATES. Cancel any before starting.
4. **PostHog activity tab open** — tab 2 set to us.posthog.com/project/388572/activity/explore, filtered to last hour, reloaded immediately before starting. Timestamp noted in log.
5. **No open S1 or S2 failures from prior pass** — if the previous pass ended with unresolved S1 or S2 items, those must be investigated before this pass begins.

Log entry when entry criteria are met:
```
[timestamp] [PASS N] ENTRY CRITERIA MET — build: [commit sha], account: clean, PostHog: ready
```

---



| Variable | Values |
|----------|--------|
| Ruleset | unplugged / amplified |
| Ranked | casual / ranked |
| questions_answered | 0 / 10 / 25 / 50 / 75 / 100 |
| token_balance | 0 / low (under cost) / sufficient |
| is_moderator | false / true |
| profile_depth_pct | 0% / 24% / 25% / 74% / 75%+ |
| subscription_tier | free / contender / champion / creator |
| powerup inventory | none / has multiplier_2x / has silence / has shield / has reveal / has all |
| powerup equipped | none / slot 1 filled / all slots filled |
| powerup activated | not yet / already activated this debate |

**Start configuration:** unplugged, casual, questions_answered=0, tokens=603, is_moderator=true, depth=25%, free tier, no powerups

---

## PASS ORDER

### Pass 1 — Unplugged baseline (current state)
### Pass 2 — Change ruleset to Amplified only
### Pass 3 — Change ranked to Ranked only (requires depth ≥ 25%)
### Pass 4 — Change questions_answered to 0 (no slots, no staking, no bounties)
### Pass 5 — Change questions_answered to 10 (tier 1 — staking unlocked at cap 5)
### Pass 6 — Change questions_answered to 25 (tier 2 — 1 slot, staking cap 25, bounty slot 1)
### Pass 7 — Change questions_answered to 50 (tier 3 — 2 slots, staking cap 50)
### Pass 8 — Change questions_answered to 75 (tier 4 — 3 slots, staking cap 100)
### Pass 9 — Change questions_answered to 100 (tier 5 — 4 slots, unlimited staking)
### Pass 10 — Change token_balance to 0
### Pass 11 — Add each powerup to inventory one at a time
### Pass 12 — Equip each powerup to slot, then unequip
### Pass 13 — Activate each powerup mid-debate
### Pass 14 — is_moderator = false
### Pass 15 — profile_depth_pct = 0% (below all gates)
### Pass 16 — subscription_tier = creator

---

## ELEMENT INVENTORY

Every element listed below must be tested on every pass. Results logged per element per pass.

---

### GATE GROUP A — No gate (always available to anyone, logged in or not)

#### A1. Global nav
- [ ] Feed tab — click. **Expected: home feed screen visible. Feed tab highlighted in nav.**
- [ ] Arena tab — click. **Expected: arena lobby screen visible. Arena tab highlighted.**
- [ ] Ranks tab — click. **Expected: leaderboard screen visible. Ranks tab highlighted.**
- [ ] Groups tab — click. **Expected: groups page visible. Groups tab highlighted.**
- [ ] Profile tab — click. **Expected: profile screen visible if logged in. Redirects to plinko if not.**
- [ ] Search icon (top bar) — click. **Expected: search screen opens with input focused.**
- [ ] Notification bell (top bar) — click. **Expected: notifications panel slides open.**
- [ ] User avatar (top bar) — click. **Expected: profile overlay opens.**

#### A2. Leaderboard
- [ ] ELO tab — click. **Expected: list sorted by ELO descending. ELO tab highlighted.**
- [ ] WINS tab — click. **Expected: list sorted by wins. WINS tab highlighted.**
- [ ] STREAK tab — click. **Expected: list sorted by streak. STREAK tab highlighted.**
- [ ] Search input — type 1 char. **Expected: list filters to matching usernames.**
- [ ] Search input — type 3 chars. **Expected: list narrows further to matching users.**
- [ ] Search input — clear. **Expected: full unfiltered list restored.**
- [ ] ELO explainer (? icon) — click. **Expected: ELO explainer modal appears.**
- [ ] ELO explainer close button — click. **Expected: modal removed from DOM. Not just hidden.**

#### A3. Spectate page (any live debate)
- [ ] Vote A button — click. **Expected: vote registers. Both vote-a and vote-b buttons disabled. voted class added.**
- [ ] Vote B button — click. **Expected: same as vote A.**
- [ ] Vote A then Vote B — attempt second click. **Expected: second click blocked. Already voted state maintained.**
- [ ] Share copy button — click. **Expected: URL copied to clipboard. Button confirms briefly.**
- [ ] Share X button — click. **Expected: X share intent opens in new tab.**
- [ ] Share WhatsApp button — click. **Expected: WhatsApp share intent opens.**
- [ ] Share native button — click. **Expected: native OS share sheet appears.**
- [ ] Back button — click. **Expected: navigates back to previous screen.**

#### A4. Login page (logged out)
- [ ] Google OAuth button — click. **Expected: browser redirects to accounts.google.com.**
- [ ] Apple OAuth button — click. **Expected: browser redirects to Apple OAuth URL.**
- [ ] Email toggle — click. **Expected: email login section slides into view.**
- [ ] Forgot password link — click. **Expected: reset modal opens. reset-modal gets .open class.**
- [ ] Reset email field — observe after typing login email. **Expected: field pre-filled with the email entered in login-email.**
- [ ] Reset send button — click. **Expected: reset email sent. Button disables briefly. Confirmation shown.**
- [ ] Reset close button — click. **Expected: reset-modal loses .open class. Modal not visible.**
- [ ] Signup tab toggle — click. **Expected: signup flow visible. Login flow hidden.**
- [ ] Google signup button — click. **Expected: redirects to Google OAuth.**
- [ ] Apple signup button — click. **Expected: redirects to Apple OAuth.**

#### A5. Onboarding / Plinko (logged out)
- [ ] Google OAuth button — click. **Expected: redirects to Google OAuth.**
- [ ] Apple OAuth button — click. **Expected: redirects to Apple OAuth.**
- [ ] Email toggle — click. **Expected: email-fields section appears.**
- [ ] Email input — type valid email. **Expected: input accepts text.**
- [ ] Password input — type password. **Expected: input accepts text, masked.**
- [ ] Continue button — with valid email+password — click. **Expected: disables, text changes to CHECKING..., HIBP check fires, then advances or re-enables.**
- [ ] Continue button — with blank fields. **Expected: button disabled or click shows validation error.**
- [ ] Age month select — select value. **Expected: value accepted.**
- [ ] Age day select — select value. **Expected: value accepted.**
- [ ] Age year select — select value. **Expected: value accepted.**
- [ ] ToS checkbox — unchecked — observe age next button. **Expected: btn-age-next disabled.**
- [ ] ToS checkbox — check it. **Expected: btn-age-next enabled.**
- [ ] Age next button — click with complete dob + tos checked. **Expected: advances to username step.**
- [ ] Username input — type username. **Expected: input accepts text.**
- [ ] Display name input — leave blank. **Expected: falls back to username value on submit.**
- [ ] Create account button — click. **Expected: disables, shows CREATING..., fires update_profile and set_profile_dob RPCs.**
- [ ] Resend email button (step 5) — click. **Expected: resend fires. Button confirms.**

---

### GATE GROUP B — Logged in required

#### B1. Arena lobby
- [ ] ENTER THE ARENA button — click. **Expected: casual/ranked picker sheet slides up. Lobby remains visible behind it.**
- [ ] PRIVATE DEBATE button — click. **Expected: private lobby picker sheet slides up showing Challenge by Username, Group Members Only, Shareable Join Code options.**
- [ ] POWER-UPS button — click. **Expected: power-up shop screen renders with BACK button and list of purchasable powerups.**
- [ ] JOIN CODE input — type 2 chars, click GO. **Expected: toast appears saying "Enter a 5-character code". No navigation occurs. No debate created.**
- [ ] JOIN CODE input — type exactly 5 chars, click GO. **Expected: attempts to join lobby. Either navigates to waiting screen or shows error if code invalid.**
- [ ] JOIN CODE input — type 5 chars, press Enter. **Expected: same as GO button click.**
- [ ] JOIN CODE input — type 6+ chars. **Expected: input capped at 5 characters. 6th character not accepted.**
- [ ] Challenge CTA link — click. **Expected: navigates to home feed screen. Arena not visible.**
- [ ] Open debate card (own) — RE-ENTER LOBBY button — click. **Expected: navigates into that debate's pre-debate or waiting screen.**
- [ ] Open debate card (own) — X cancel button — click. **Expected: spinner shows, then card disappears. Toast "DEBATE CANCELLED" visible.**
- [ ] Feed card (live) — click. **Expected: enters spectate view for that debate.**
- [ ] Feed card (complete) — click. **Expected: navigates to debate landing page.**


#### B2. Arena config — casual/ranked picker
- [ ] CASUAL card — click. **Expected: ruleset picker sheet appears. Ranked=false set.**
- [ ] RANKED card (depth ≥ 25%) — click. **Expected: ruleset picker sheet appears. Ranked=true set.**
- [ ] RANKED card (depth < 25%) — click. **Expected: redirects to moderator-profile-depth.html. No picker appears.**
- [ ] Backdrop — click. **Expected: picker closes. Arena lobby visible. No state change.**
- [ ] Cancel button — click. **Expected: same as backdrop.**

#### B3. Arena config — ruleset picker
- [ ] AMPLIFIED card — click. **Expected: mode picker sheet appears. Ruleset=amplified set.**
- [ ] UNPLUGGED card — click. **Expected: mode picker sheet appears. Ruleset=unplugged set.**
- [ ] Backdrop — click. **Expected: picker closes. Lobby visible.**
- [ ] Cancel button — click. **Expected: same as backdrop.**

#### B4. Arena config — mode picker
- [ ] MODERATED LIVE (moderators available) — click. **Expected: moderator picker appears showing available moderators.**
- [ ] MODERATED LIVE (no moderators) — click. **Expected: advances directly to category picker with no mod assigned.**
- [ ] VOICE MEMO — click. **Expected: category picker appears.**
- [ ] TEXT BATTLE — click. **Expected: category picker appears.**
- [ ] AI SPARRING — click. **Expected: AI match starts immediately. Pre-debate screen shows "AI SPARRING BOT" as opponent. No queue.**
- [ ] Backdrop — click. **Expected: mode picker closes. Lobby visible.**
- [ ] Cancel button — click. **Expected: same as backdrop.**

#### B5. Arena config — category picker
- [ ] Sports category chip — click. **Expected: chip highlighted. START DEBATE button enabled (if mod not required).**
- [ ] Politics category chip — click. **Expected: chip highlighted. Previous chip deselected.**
- [ ] Music category chip — click. **Expected: chip highlighted.**
- [ ] Entertainment category chip — click. **Expected: chip highlighted.**
- [ ] Couples Court category chip — click. **Expected: chip highlighted.**
- [ ] Trending category chip — click. **Expected: chip highlighted.**
- [ ] Topic title input — type custom topic. **Expected: input accepts text. Topic visible in field.**
- [ ] Reference link input — paste URL. **Expected: OG scrape fires, preview card appears below input.**
- [ ] Reference link input — blur with URL. **Expected: same as paste.**
- [ ] START DEBATE button (no category selected). **Expected: button disabled, greyed out. Click does nothing.**
- [ ] START DEBATE button (category selected, no mod required) — click. **Expected: joins queue. Queue waiting screen appears.**
- [ ] START DEBATE button (moderated, no mod assigned). **Expected: button disabled.**
- [ ] START DEBATE button (moderated, mod assigned) — click. **Expected: joins queue.**
- [ ] Mod search input — type. **Expected: results appear showing matching moderators.**
- [ ] Mod search result — click. **Expected: invited card appears showing mod name. Search results close.**
- [ ] Mod invite clear button — click. **Expected: invited card removed. START DEBATE disabled again.**
- [ ] Backdrop — click. **Expected: picker closes. Lobby visible.**

#### B6. Arena config — round picker
- [ ] 4 rounds button — click. **Expected: button highlighted. selectedRounds=4.**
- [ ] 6 rounds button — click. **Expected: button highlighted. Previous deselected.**
- [ ] 8 rounds button — click. **Expected: button highlighted.**
- [ ] 10 rounds button — click. **Expected: button highlighted.**

#### B7. Queue
- [ ] Cancel button — click. **Expected: leaves queue. Lobby renders. No debate created.**
- [ ] Queue status display — observe over 10s. **Expected: text updates showing search status.**
- [ ] AI sparring prompt (60s) — wait 60s. **Expected: prompt appears offering AI match.**
- [ ] TRY AI button (from timeout) — click. **Expected: AI match starts. Pre-debate screen with AI opponent.**
- [ ] TRY AGAIN button (from timeout) — click. **Expected: re-enters queue. Queue screen resets.**
- [ ] BACK TO LOBBY button (from timeout) — click. **Expected: lobby renders.**

#### B8. Match found (walled — webrtc)
- [ ] ACCEPT button — click. **Expected: navigates to pre-debate screen. SKIP if webrtc unavailable.**
- [ ] DECLINE button — click. **Expected: returns to lobby. SKIP if webrtc unavailable.**
- [ ] Countdown timer — observe. **Expected: counts down from 10. Auto-declines at zero. SKIP if webrtc unavailable.**

#### B9. Pre-debate screen
- [ ] Share button — click. **Expected: URL copied to clipboard. "Copied!" confirmation shown.**
- [ ] READY button — click. **Expected: button changes state. Waits for opponent ready.**

#### B10. Private lobby picker
- [ ] CHALLENGE BY USERNAME — click. **Expected: user search overlay appears with search input.**
- [ ] GROUP MEMBERS ONLY — click. **Expected: group picker overlay appears listing user's groups.**
- [ ] SHAREABLE JOIN CODE — click. **Expected: mode and round config appears for code-based lobby.**
- [ ] Backdrop — click. **Expected: picker closes. Lobby visible.**
- [ ] Cancel button — click. **Expected: same as backdrop.**

#### B11. Private lobby — user search
- [ ] Search input — type 2+ chars. **Expected: user results appear below input.**
- [ ] User result row — click. **Expected: user selected as opponent. Search closes. Mode picker or next step appears.**
- [ ] Cancel button — click. **Expected: search closes. Lobby picker visible.**
- [ ] Backdrop — click. **Expected: same as cancel.**

#### B12. Private lobby — group picker
- [ ] Group row — click. **Expected: group selected. Advances to topic/mode config.**
- [ ] Cancel button — click. **Expected: closes. Returns to lobby picker.**
- [ ] Backdrop — click. **Expected: same as cancel.**

#### B13. Private lobby — waiting screen
- [ ] CHALLENGE SENT title — observe. **Expected: visible and reads "CHALLENGE SENT" when visibility=private.**
- [ ] Join code display — observe (visibility=code). **Expected: 5-character code visible in #arena-private-code-display.**
- [ ] Copy challenge link button — click. **Expected: link copied. Button confirms. Only visible when join_code present.**
- [ ] Cancel button — click. **Expected: debate cancelled. Poll stops. Lobby renders.**
- [ ] Poll (every 3s) — wait 6s and observe. **Expected: no crash. UI stays on waiting screen. PostHog should show no unexpected events.**
- [ ] Poll stops — change view. **Expected: no further check_private_lobby calls after navigating away.**

#### B14. Debate room — debater actions (text battle)
- [ ] Text input — observe on opponent's turn. **Expected: input is disabled. Cannot type.**
- [ ] Text input — observe on my turn. **Expected: input is enabled. Can type.**
- [ ] Send button — observe with empty input. **Expected: disabled.**
- [ ] Send button — type text, observe. **Expected: enabled.**
- [ ] Send button — click with text. **Expected: message submitted. Input clears. Send button disables.**
- [ ] Send button — Enter key. **Expected: same as click.**
- [ ] Finish turn button — click. **Expected: turn ends early. Opponent's turn begins.**
- [ ] Concede button — click. **Expected: confirm prompt appears. Confirm → debate ends with loss.**
- [ ] Cite button (uncited references present) — click. **Expected: cite overlay opens showing available references.**
- [ ] Cite button (no uncited references). **Expected: disabled.**
- [ ] Challenge button (challenges remaining, challengeable refs). **Expected: enabled. Click → challenge overlay opens.**
- [ ] Challenge button (no challenges remaining). **Expected: disabled.**
- [ ] Score buttons (budget available) — click. **Expected: points allocated. Budget decrements.**
- [ ] Score buttons (budget exhausted). **Expected: disabled.**

#### B15. Debate room — moderator actions
- [ ] Mod comment input — type. **Expected: input accepts text.**
- [ ] Mod comment send button — observe empty. **Expected: disabled.**
- [ ] Mod comment send button — type text. **Expected: enabled. Click → comment submitted.**
- [ ] Score A button — click. **Expected: A scored for this round. Score recorded.**
- [ ] Score B button — click. **Expected: B scored for this round.**
- [ ] Score cancel button — click. **Expected: scoring cancelled. No score recorded.**
- [ ] Mod score slider — drag. **Expected: value updates in real time.**
- [ ] Submit score button — click. **Expected: score submitted. Button disables during RPC. Re-enables or confirms.**
- [ ] Eject A button — click. **Expected: debater A ejected from debate.**
- [ ] Eject B button — click. **Expected: debater B ejected.**
- [ ] Null debate button — click. **Expected: debate nulled. No winner recorded.**
- [ ] Reference allow button — click. **Expected: reference allowed. Ruling overlay closes.**
- [ ] Reference deny button — click. **Expected: reference denied. Ruling overlay closes.**
- [ ] Ruling backdrop — click. **Expected: overlay closes without ruling.**

#### B16. Debate room — spectator tip buttons
- [ ] Tip 5 tokens (sufficient balance) — click. **Expected: all tip buttons disable. RPC fires. Toast confirms tip. Buttons re-enable.**
- [ ] Tip 10 tokens (sufficient balance) — click. **Expected: same pattern.**
- [ ] Tip 25 tokens (sufficient balance) — click. **Expected: same pattern.**
- [ ] Tip buttons (insufficient balance). **Expected: all disabled.**
- [ ] Tip buttons during RPC. **Expected: all disabled until RPC resolves.**

#### B17. Post-debate screen
- [ ] REMATCH button — click. **Expected: new debate starts with same opponent and config.**
- [ ] SHARE button — click. **Expected: share modal opens with copy, X, WhatsApp, native options.**
- [ ] TRANSCRIPT button (messages exist) — click. **Expected: transcript view renders showing all messages.**
- [ ] TRANSCRIPT button (no messages). **Expected: button not rendered at all.**
- [ ] ADD RIVAL button — click. **Expected: rival added. Button disables.**
- [ ] ADD RIVAL button (already rival). **Expected: disabled.**
- [ ] BACK TO LOBBY button — click. **Expected: lobby renders.**
- [ ] Staking result display (amplified). **Expected: win/loss token amount shown.**
- [ ] Staking result display (unplugged). **Expected: staking result section not rendered.**

#### B18. Home feed
- [ ] Category filter ALL — click. **Expected: all feed items visible.**
- [ ] Category filter Sports — click. **Expected: list filtered to sports only. Other categories hidden.**
- [ ] Category filter Politics — click. **Expected: filtered to politics.**
- [ ] Category filter Music — click. **Expected: filtered to music.**
- [ ] Category filter Entertainment — click. **Expected: filtered to entertainment.**
- [ ] Category filter Couples Court — click. **Expected: filtered to couples court.**
- [ ] Category filter Trending — click. **Expected: filtered to trending.**
- [ ] Feed composer input — type. **Expected: text accepted. Character count updates.**
- [ ] Feed composer link input — paste URL. **Expected: OG preview appears.**
- [ ] Feed POST button — with text — click. **Expected: post submitted. Input clears. Post appears in feed.**
- [ ] Feed POST button — empty. **Expected: disabled.**
- [ ] Feed card flame/reaction button — click. **Expected: reaction registered. Count increments.**
- [ ] Feed card spectate button — click. **Expected: spectate view opens for that debate.**
- [ ] Feed card join button (open debate) — click. **Expected: joins debate.**

#### B19. Notifications panel
- [ ] Notification bell — click. **Expected: panel slides open from right. Notification list visible.**
- [ ] Mark all read button — click. **Expected: all items marked read. Notification dot disappears.**
- [ ] Individual notification — click. **Expected: deeplinks to relevant content. Panel closes.**
- [ ] Backdrop — click. **Expected: panel closes.**
- [ ] Close button — click. **Expected: panel closes.**

#### B20. Search
- [ ] Search input — type 2+ chars. **Expected: user and debate results appear below input.**
- [ ] User result — click. **Expected: navigates to that user's profile page.**
- [ ] Debate result — click. **Expected: navigates to debate landing page.**
- [ ] Clear search input. **Expected: results cleared. Empty state shown.**

#### B21. Profile page
- [ ] Debate archive — observe on profile open. **Expected: archive loads and debate rows visible.**
- [ ] Archive filter ALL — click. **Expected: all debates shown.**
- [ ] Archive filter WIN — click. **Expected: only wins shown.**
- [ ] Archive filter LOSS — click. **Expected: only losses shown.**
- [ ] Archive filter TEXT — click. **Expected: only text battles shown.**
- [ ] Archive filter VOICE — click. **Expected: only voice memo debates shown.**
- [ ] Archive filter AI — click. **Expected: only AI sparring debates shown.**
- [ ] Archive debate row — click. **Expected: archive picker overlay opens showing debate detail.**
- [ ] Archive picker overlay — select debate. **Expected: detail view shows debate info.**
- [ ] Archive picker backdrop — click. **Expected: overlay closes.**
- [ ] Archive edit button — click. **Expected: edit overlay opens with editable fields.**
- [ ] Archive edit save button — click. **Expected: changes saved. Overlay closes.**
- [ ] Archive edit cancel button — click. **Expected: overlay closes. No changes saved.**
- [ ] Profile depth progress bar — click. **Expected: navigates to moderator-profile-depth.html.**
- [ ] UNLOCK REWARDS link — click. **Expected: navigates to moderator-profile-depth.html.**
- [ ] Social links display — click each. **Expected: opens social URL in new tab.**
- [ ] Edit socials button — click. **Expected: edit panel opens with input fields for each social.**
- [ ] Socials save button — click. **Expected: social links saved. Panel closes. Links visible.**
- [ ] Socials cancel button — click. **Expected: panel closes. No changes saved.**
- [ ] Edit profile / settings link — click. **Expected: navigates to settings page.**
- [ ] Profile depth section — click collapsed. **Expected: section expands showing questions.**
- [ ] Profile depth section — click expanded. **Expected: section collapses.**
- [ ] Profile depth question (text) — type answer. **Expected: input accepts text.**
- [ ] Profile depth question (multiple choice chip) — click. **Expected: chip selected. Others deselected.**
- [ ] Profile depth question (slider) — drag. **Expected: value updates. Label shows current value.**
- [ ] Profile depth Save section button — click. **Expected: answers saved. Depth % updates. Tier progress updates.**

#### B22. Settings page
- [ ] Dark mode toggle — toggle. **Expected: theme switches immediately. Toggle reflects new state.**
- [ ] Bio textarea — edit. **Expected: input accepts text. Character count updates.**
- [ ] Save Changes button — click. **Expected: disables, shows "Saving...", fires update_profile, re-enables. Success toast shown.**
- [ ] Reset Password button — click. **Expected: disables, shows "Sending...", reset email sent, re-enables after 3s.**
- [ ] Logout button — click. **Expected: signs out. Redirects to login page.**
- [ ] Delete Account button — click. **Expected: delete confirm modal opens.**
- [ ] Delete confirm modal — confirm. **Expected: account deleted. Redirects to login.**
- [ ] Delete confirm modal — cancel. **Expected: modal closes. Account unchanged.**
- [ ] Back button — click. **Expected: navigates to home (index.html).**

#### B23. Groups — lobby
- [ ] DISCOVER tab — click. **Expected: all public groups listed.**
- [ ] MY GROUPS tab — click. **Expected: only groups user belongs to shown.**
- [ ] RANKINGS tab — click. **Expected: group leaderboard shown sorted by ELO.**
- [ ] + CREATE button — click. **Expected: create modal opens with name, description, category inputs.**
- [ ] Create modal — name input. **Expected: accepts text.**
- [ ] Create modal — description input. **Expected: accepts text.**
- [ ] Create modal — category select. **Expected: accepts selection.**
- [ ] CREATE GROUP button — with name filled — click. **Expected: group created. Navigates to group detail.**
- [ ] CREATE GROUP button — name empty. **Expected: disabled or shows validation error.**
- [ ] Create modal backdrop — click. **Expected: modal closes.**
- [ ] Group search input — type 1 char. **Expected: no RPC fires. Results unchanged.**
- [ ] Group search input — type 2+ chars. **Expected: search RPC fires. Results update.**
- [ ] Group row — click. **Expected: group detail view opens.**

#### B24. Groups — detail (member)
- [ ] FEED tab — click. **Expected: group feed visible. Post composer visible.**
- [ ] CHALLENGES tab — click. **Expected: challenges list visible.**
- [ ] MEMBERS tab — click. **Expected: member list visible.**
- [ ] AUDITIONS tab — click. **Expected: auditions list visible.**
- [ ] GROUP FEED post input — type. **Expected: input accepts text.**
- [ ] GROUP FEED POST button — click. **Expected: post submitted. Appears in feed.**
- [ ] Back arrow — click. **Expected: returns to groups lobby.**
- [ ] Settings gear (owner only) — click. **Expected: group settings view opens.**

#### B25. Groups — GvG challenge modal
- [ ] Format pill 1v1 — click. **Expected: 1v1 selected and highlighted. Default state.**
- [ ] Format pill 3v3 — click. **Expected: 3v3 selected. 1v1 deselected.**
- [ ] Format pill 5v5 — click. **Expected: 5v5 selected.**
- [ ] Opponent group search — type 1 char. **Expected: no RPC. No results appear.**
- [ ] Opponent group search — type 2+ chars. **Expected: search fires. Results appear below input.**
- [ ] Opponent group result — click. **Expected: group selected. Search input cleared. Selected group shown.**
- [ ] Debate topic input — type. **Expected: input accepts text.**
- [ ] SEND CHALLENGE button — opponent + topic filled. **Expected: enabled. Click sends challenge.**
- [ ] SEND CHALLENGE button — incomplete. **Expected: disabled.**
- [ ] Close X button — click. **Expected: modal closes. #gvg-modal loses .open class.**

#### B26. Groups — audition modal
- [ ] Topic input — type. **Expected: input accepts text.**
- [ ] Category select — select. **Expected: value accepted.**
- [ ] Ruleset select — select amplified or unplugged. **Expected: value accepted.**
- [ ] Rounds select — select 4/6/8/10. **Expected: value accepted.**
- [ ] REQUEST AUDITION button — click with topic filled. **Expected: disables, shows submitting, RPC fires.**
- [ ] Close/cancel button — click. **Expected: modal closes.**

#### B27. Groups — member actions modal (owner/admin only)
- [ ] Promote button — click. **Expected: promote section expands. Role select appears.**
- [ ] Promote role select — select new role. **Expected: value accepted.**
- [ ] Kick button — click. **Expected: member kicked. Removed from list. Modal closes.**
- [ ] Ban button — click. **Expected: ban executed. Member removed. Modal closes.**
- [ ] Ban reason textarea — type. **Expected: input accepts text.**
- [ ] Cancel button — click. **Expected: modal closes. No action taken.**
- [ ] Modal backdrop — click. **Expected: modal closes.**

#### B28. Reference Arsenal — armory sheet
- [ ] Armory trigger — click. **Expected: armory sheet slides up from bottom.**
- [ ] Armory backdrop — click. **Expected: sheet closes.**
- [ ] Sharpen filter button — click. **Expected: filter drawer opens.**
- [ ] Reference card — click. **Expected: reference detail view opens.**
- [ ] Forge CTA — click. **Expected: forge form opens.**
- [ ] Trending reference card — click. **Expected: reference detail opens.**

#### B29. Reference Arsenal — forge form
- [ ] Title input — type. **Expected: accepted.**
- [ ] Author input — type. **Expected: accepted.**
- [ ] Date input — type. **Expected: accepted.**
- [ ] Locator input — type. **Expected: accepted.**
- [ ] URL input — type. **Expected: accepted.**
- [ ] Claim textarea — type. **Expected: accepted.**
- [ ] Submit button — click. **Expected: reference submitted. Form closes or confirms.**

#### B30. Reference Arsenal — debate loadout
- [ ] Reference card (available) — click. **Expected: card selected. Visual selection state applied.**
- [ ] Reference card (disabled) — attempt click. **Expected: no selection. Cursor indicates disabled.**
- [ ] Reference card (selected) — click again. **Expected: card deselected.**

#### B31. Voice memo — recorder sheet
- [ ] Record button — click. **Expected: recording starts. Timer begins counting. Waveform animates.**
- [ ] Stop button — click. **Expected: recording stops. Preview audio player appears.**
- [ ] Play button (preview) — click. **Expected: preview plays.**
- [ ] Send button — click after recording. **Expected: voice memo sent. Sheet closes.**
- [ ] Discard button — click. **Expected: recording cleared. Sheet resets to initial state.**

#### B32. Direct messages
- [ ] DM thread row — click. **Expected: thread opens showing message history.**
- [ ] DM input — type. **Expected: input accepts text.**
- [ ] DM send button — click. **Expected: message sent. Appears in thread. Input clears.**
- [ ] DM send button — Enter key. **Expected: same as click.**
- [ ] DM back button — click. **Expected: returns to thread list.**

#### B33. Rivals presence popup
- [ ] Dismiss button — click. **Expected: popup closes and removed from DOM.**
- [ ] Challenge button — click. **Expected: private lobby picker opens pre-targeted at that rival.**

#### B34. Cosmetics page
- [ ] Cosmetic item (already unlocked) — click. **Expected: equip option shown.**
- [ ] Cosmetic item (token purchase) — click. **Expected: confirm modal opens showing cost and balance after.**
- [ ] Confirm modal — confirm (sufficient tokens) — click. **Expected: item purchased. Balance deducted. Modal closes.**
- [ ] Confirm modal — confirm (insufficient tokens). **Expected: button disabled. Shows "Need X more tokens".**
- [ ] Confirm modal — cancel — click. **Expected: modal closes. No purchase.**
- [ ] Info modal — close button — click. **Expected: info modal closes.**
- [ ] Equip button (owned item) — click. **Expected: item equipped. Visual reflects equipped state.**

#### B35. Payments / subscription
- [ ] Subscription upgrade button — click. **Expected: Stripe checkout opens in browser.**
- [ ] Token purchase button — click. **Expected: Stripe checkout opens.**
- [ ] Paywall modal CTA — click. **Expected: upgrade flow opens.**
- [ ] Paywall modal dismiss — click. **Expected: modal closes and removed from DOM.**

---

### GATE GROUP C — Logged in + profile_depth_pct ≥ 25%

- [ ] Spectate chat input — observe when logged in AND depth ≥ 25%. **Expected: chat-input and chat-send rendered and visible.**
- [ ] Spectate chat input — observe when depth < 25%. **Expected: chat input not rendered.**
- [ ] Spectate chat SEND button — type message, click. **Expected: message appears in chat list. Input clears.**
- [ ] RANKED arena option — observe when depth ≥ 25%. **Expected: RANKED card clickable and advances.**
- [ ] RANKED arena option — observe when depth < 25%. **Expected: RANKED card click redirects to profile depth page.**
- [ ] Bounty post panel — observe at depth = 25%. **Expected: panel renders with 1 slot available.**
- [ ] Bounty post panel — observe at depth < 25%. **Expected: panel not rendered or shows locked state.**
- [ ] Bounty amount input — type amount. **Expected: input accepts number. Preview updates with total cost.**
- [ ] Bounty duration input — type days. **Expected: input accepts number. Preview updates.**
- [ ] PLACE BOUNTY button (sufficient tokens) — click. **Expected: bounty placed. Token balance deducted. Confirmation shown.**
- [ ] PLACE BOUNTY button (insufficient tokens). **Expected: button disabled.**
- [ ] Bounty cancel button (existing bounty) — click. **Expected: bounty cancelled. Partial refund shown. Panel updates.**

---

### GATE GROUP D — Logged in + questions_answered threshold (tier gates)

#### D1. Staking (requires tier 1 — questions_answered ≥ 10)
- [ ] Staking panel — observe when amplified AND questions_answered ≥ 10. **Expected: full staking panel rendered with side A/B buttons and amount input.**
- [ ] Staking locked panel — observe when questions_answered < 10 OR ruleset=unplugged. **Expected: locked panel shown explaining requirement. No side buttons.**
- [ ] Side A stake button — click. **Expected: side A selected. Confirm button enables if amount valid.**
- [ ] Side B stake button — click. **Expected: side B selected. Side A deselected.**
- [ ] Stake amount input — type valid amount. **Expected: amount accepted. Confirm button state updates.**
- [ ] Quick stake 5 button — click. **Expected: amount field set to 5.**
- [ ] Quick stake 10 button — click. **Expected: amount field set to 10.**
- [ ] Quick stake 25 button — click (tier 2+). **Expected: amount field set to 25.**
- [ ] Confirm stake button (side selected + valid amount) — observe. **Expected: enabled.**
- [ ] Confirm stake button (no side selected). **Expected: disabled.**
- [ ] Confirm stake button (amount > tier cap). **Expected: disabled.**
- [ ] Confirm stake — click when enabled. **Expected: stake placed. Token balance deducted. Confirmation shown.**

#### D2. Power-up slots (requires tier 2 — questions_answered ≥ 25)
- [ ] Slot 1 (tier 2+) — click empty slot. **Expected: inventory picker opens showing owned powerups.**
- [ ] Inventory picker — select a powerup. **Expected: powerup equipped to slot. Slot shows powerup name and icon.**
- [ ] Slot 1 filled — observe. **Expected: filled slot shows equipped powerup. cursor:default not clickable to open picker.**
- [ ] Slot 2 — observe at tier 2 (questions_answered 25–49). **Expected: slot 2 not rendered.**
- [ ] Slot 2 — observe at tier 3 (questions_answered ≥ 50). **Expected: slot 2 rendered and clickable.**
- [ ] Slot 3 — observe at tier 3. **Expected: not rendered.**
- [ ] Slot 3 — observe at tier 4 (questions_answered ≥ 75). **Expected: rendered and clickable.**
- [ ] Slot 4 — observe at tier 4. **Expected: not rendered.**
- [ ] Slot 4 — observe at tier 5 (questions_answered ≥ 100). **Expected: rendered and clickable.**
- [ ] Equipped slot — click. **Expected: powerup unequipped. Slot returns to empty state.**

#### D3. Power-up activations (in-debate, amplified, equipped)
- [ ] Multiplier 2x — observe activation bar. **Expected: button shown but disabled with title "Active — doubles staking payout". No click action.**
- [ ] Silence button — click. **Expected: opponent muted for 10s. Silence button disabled after activation.**
- [ ] Shield button — click. **Expected: shield activated. Button disabled. Next reference challenge blocked.**
- [ ] Reveal button — click. **Expected: opponent's equipped powerups revealed. Button disabled after activation.**
- [ ] Any powerup (ruleset=unplugged) — observe activation bar. **Expected: activation bar not rendered.**
- [ ] Any powerup (nothing equipped) — observe. **Expected: activation bar not rendered.**

#### D4. Bounty slots (depth gates)
- [ ] depth < 25% — observe bounty panel. **Expected: 0 slots. Bounty post not available.**
- [ ] 25% ≤ depth < 35% — observe. **Expected: 1 slot shown.**
- [ ] 35% ≤ depth < 45% — observe. **Expected: 2 slots shown.**
- [ ] 45% ≤ depth < 55% — observe. **Expected: 3 slots shown.**
- [ ] 55% ≤ depth < 65% — observe. **Expected: 4 slots shown.**
- [ ] 65% ≤ depth < 75% — observe. **Expected: 5 slots shown.**
- [ ] depth ≥ 75% — observe. **Expected: 6 slots shown.**

---

### GATE GROUP E — Logged in + is_moderator = true

- [ ] MODERATOR QUEUE button — observe in arena lobby. **Expected: visible only when is_moderator=true.**
- [ ] MODERATOR QUEUE button — click. **Expected: mod queue browser opens showing available debates.**
- [ ] Mod queue list — observe. **Expected: debates listed with claim buttons. Empty state if none available.**
- [ ] Claim/pick debate button — click. **Expected: debate claimed. Moves to mod waiting screen.**
- [ ] Moderator settings panel — observe in settings. **Expected: visible when is_moderator=true. Not rendered otherwise.**
- [ ] Moderator enabled toggle — toggle off. **Expected: mod status disabled. Toggle reflects new state.**
- [ ] Moderator available toggle — toggle. **Expected: availability updated. Toggle reflects state.**
- [ ] Category chips (mod settings) — click each. **Expected: chip selected/deselected. State saved on save.**
- [ ] Mod comment input (in-debate) — observe when assigned mod. **Expected: rendered and enabled.**
- [ ] Mod score buttons — observe when assigned mod. **Expected: rendered.**
- [ ] Mod eject buttons — observe when assigned mod. **Expected: rendered.**
- [ ] Mod null button — observe when assigned mod. **Expected: rendered.**
- [ ] Refs form — observe when assigned mod. **Expected: rendered with URL and description inputs.**
- [ ] Reference submit button — fill URL + desc, click. **Expected: reference submitted. Form clears.**
- [ ] Reference cancel button — click. **Expected: refs form hidden.**
- [ ] Reference allow button (ruling overlay) — click. **Expected: reference allowed. Overlay closes.**
- [ ] Reference deny button (ruling overlay) — click. **Expected: reference denied. Overlay closes.**

---

### GATE GROUP F — State-dependent (requires prior action in same session)

- [ ] Join code GO button — observe with 4 chars. **Expected: disabled or fires toast. Never launches match.**
- [ ] Join code GO button — observe with exactly 5 chars. **Expected: enabled and attempts join.**
- [ ] START DEBATE button — observe before category selected. **Expected: disabled.**
- [ ] START DEBATE button — observe after category selected. **Expected: enabled.**
- [ ] Confirm stake button — observe before side selected. **Expected: disabled.**
- [ ] Confirm stake button — observe after side selected + valid amount. **Expected: enabled.**
- [ ] SEND CHALLENGE (GvG) — observe before opponent group selected. **Expected: disabled.**
- [ ] SEND CHALLENGE (GvG) — observe after opponent + topic filled. **Expected: enabled.**
- [ ] REQUEST AUDITION button — observe before topic filled. **Expected: disabled.**
- [ ] REQUEST AUDITION button — observe after topic filled. **Expected: enabled.**
- [ ] Vote A/B — observe after voting. **Expected: both disabled. Cannot vote again.**
- [ ] Tip buttons — observe during RPC. **Expected: all disabled.**
- [ ] Tip buttons — observe after RPC resolves. **Expected: re-enabled.**
- [ ] Powerup activate — observe after first activation. **Expected: button permanently disabled for that debate.**
- [ ] Bounty lock button — observe with no bounty selected. **Expected: disabled.**
- [ ] Bounty lock button — observe after bounty selected from dropdown. **Expected: enabled. Click locks in selection.**
- [ ] Mod score submit — observe during RPC. **Expected: disabled. Shows spinner or "...".**
- [ ] Add Rival button — observe after adding. **Expected: disabled.**
- [ ] Save button (settings) — observe during RPC. **Expected: disabled. Shows "Saving...".**
- [ ] Save button (settings) — observe after RPC resolves. **Expected: re-enabled.**

---

### GATE GROUP G — Ruleset-dependent (amplified vs unplugged)

- [ ] Staking panel — observe in amplified. **Expected: full staking panel rendered.**
- [ ] Staking panel — observe in unplugged. **Expected: not rendered. No staking UI visible.**
- [ ] Staking result (post-debate) — observe after amplified debate. **Expected: win/loss token amount shown.**
- [ ] Staking result (post-debate) — observe after unplugged debate. **Expected: staking result section absent.**
- [ ] ELO movement indicator — observe after amplified debate. **Expected: ELO change shown.**
- [ ] ELO movement indicator — observe after unplugged debate. **Expected: "UNPLUGGED" badge shown. No ELO change.**
- [ ] Power-up activation bar — observe in amplified with equipped powerups. **Expected: activation bar rendered.**
- [ ] Power-up activation bar — observe in unplugged. **Expected: activation bar not rendered even if powerups equipped.**
- [ ] Token earnings — observe after amplified debate. **Expected: tokens earned shown.**
- [ ] Token earnings — observe after unplugged debate. **Expected: token earnings not shown.**
- [ ] Ranked badge — observe pre-debate for amplified+ranked. **Expected: "RANKED" badge.**
- [ ] Ranked badge — observe pre-debate for amplified+casual. **Expected: "CASUAL" badge.**
- [ ] Ranked badge — observe pre-debate for unplugged. **Expected: "UNPLUGGED" badge regardless of ranked setting.**

---

### GATE GROUP H — Token balance dependent

- [ ] Buy multiplier_2x — sufficient tokens. **Expected: buy button enabled. Click purchases. Balance deducted.**
- [ ] Buy multiplier_2x — insufficient tokens. **Expected: buy button disabled.**
- [ ] Buy silence (cost: 20) — balance ≥ 20. **Expected: enabled.**
- [ ] Buy silence — balance < 20. **Expected: disabled.**
- [ ] Buy shield (cost: 25) — balance ≥ 25. **Expected: enabled.**
- [ ] Buy shield — balance < 25. **Expected: disabled.**
- [ ] Buy reveal (cost: 10) — balance ≥ 10. **Expected: enabled.**
- [ ] Buy reveal — balance < 10. **Expected: disabled.**
- [ ] Staking confirm button — amount > balance. **Expected: disabled.**
- [ ] Staking confirm button — amount ≤ balance AND ≤ tier cap. **Expected: enabled.**
- [ ] Tip 5 button — balance < 5. **Expected: disabled.**
- [ ] Tip 5 button — balance ≥ 5. **Expected: enabled.**
- [ ] Tip 10 button — balance < 10. **Expected: disabled.**
- [ ] Tip 25 button — balance < 25. **Expected: disabled.**
- [ ] Cosmetic purchase confirm — balance < cost. **Expected: disabled. Shows "Need X more tokens".**
- [ ] Cosmetic purchase confirm — balance ≥ cost. **Expected: enabled.**
- [ ] Bounty post button — insufficient tokens for amount + fee. **Expected: disabled.**
- [ ] Bounty post button — sufficient tokens. **Expected: enabled.**

---

### GATE GROUP I — Owner/member/role dependent

#### Groups
- [ ] CHALLENGE ANOTHER GROUP button — observe as member. **Expected: visible.**
- [ ] CHALLENGE ANOTHER GROUP button — observe as non-member. **Expected: not visible.**
- [ ] JOIN GROUP button — observe as non-member. **Expected: visible.**
- [ ] JOIN GROUP button — observe as member. **Expected: not visible. Replaced by YOU OWN THIS GROUP or member indicator.**
- [ ] YOU OWN THIS GROUP label — observe as owner. **Expected: visible.**
- [ ] YOU OWN THIS GROUP label — observe as member (not owner). **Expected: not visible.**
- [ ] Settings gear — observe as owner. **Expected: visible in top right of group detail.**
- [ ] Settings gear — observe as non-owner. **Expected: not visible.**
- [ ] Group settings save — fill fields, click. **Expected: settings saved. Success toast shown.**
- [ ] Min ELO input — type number. **Expected: accepted.**
- [ ] Min tier select — select tier. **Expected: accepted.**
- [ ] Profile required checkbox — toggle. **Expected: state toggles.**
- [ ] Audition rule select — select value. **Expected: accepted.**
- [ ] Member row — click (as owner/admin). **Expected: member actions modal opens.**
- [ ] Promote button — click. **Expected: member promoted. Role label updates.**
- [ ] Kick button — click. **Expected: member kicked. Removed from list.**
- [ ] Ban button — fill reason, click. **Expected: member banned. Removed from list.**
- [ ] Group banner upload button — observe as owner. **Expected: visible.**
- [ ] Group banner file input — select image. **Expected: image uploads. Banner updates.**

#### Pending challenges
- [ ] Challenge accept button — observe as recipient. **Expected: visible. Click joins private lobby.**
- [ ] Challenge cancel button — observe as sender. **Expected: visible. Click cancels challenge.**

---

## SESSION BREAK PROTOCOL

When any of the following is reached, stop testing, write a handoff entry to WALKTHROUGH-LOG.md, and start a fresh session:
- 50 elements tested in current session
- 60 minutes elapsed
- Context window showing pressure (responses getting slow)

Handoff entry format:
```
## Handoff — [timestamp]
Pass: [N]
Last element tested: [element name]
Next element: [element name]
Pass % complete: [X/total]
Anomalies found: [list or "none"]
PostHog events to reconcile: [timestamp range]
```

---

## LOG FILE

All results go to: `lessons-learned/WALKTHROUGH-LOG.md`

Format per result:
```
[timestamp] [PASS N] [GATE GROUP] [element] → [PASS/FAIL/SKIP] [note if any]
```

Example:
```
14:02:31 [PASS 1] [A1] Feed tab → PASS
14:02:45 [PASS 1] [A1] Arena tab → PASS
14:03:12 [PASS 1] [B1] JOIN CODE < 5 chars → FAIL — launched AI Sparring instead of toast
```

---

## EXIT CRITERIA (campaign is complete when all of these are true)

1. All 16 passes completed
2. Zero open S1 failures
3. Zero open S2 failures
4. All S3/S4/S5 failures logged with descriptions
5. WALKTHROUGH-LOG.md reviewed and summary written

If all 16 passes complete but open S1 or S2 failures exist — campaign is NOT done. Those must be resolved and the affected flows re-run.

---

## SUSPENSION CRITERIA (stop the current pass when any of these occur)

1. **3 or more S1 failures in a single flow** — something systemic is wrong. Stop, log, investigate before continuing.
2. **App becomes unresponsive** — navigate away, hard refresh, restart the pass from the last completed element.
3. **Test account state is corrupted** — unexpected data (open debates, changed ELO, missing tokens) that wasn't caused by the current pass. Stop, reset account state, restart pass from the top.
4. **PostHog stops receiving events** — if clamp events expected from a prior action are not showing after 2 minutes, something is wrong with the monitoring layer. Log it, continue the pass, but flag for investigation.

When suspended, log:
```
[timestamp] [PASS N] SUSPENDED — reason: [description] — last element: [element name]
```

When resuming:
```
[timestamp] [PASS N] RESUMED — issue resolved: [description] — resuming from: [element name]
```

---

## KNOWN ISSUES (do not investigate during walkthrough — log and continue)

- int-plinko-step1-method.test.ts — HIBP re-enable path (permanent ignore)
- f48-mod-debate.test.ts — 8 failures (permanent ignore)
- Browser history contamination during walkthrough — always navigate fresh to themoderator.app between passes to clear history state

---

## TOTAL ELEMENT COUNT (approximate)

| Gate Group | Elements |
|------------|----------|
| A — No gate | ~85 |
| B — Logged in | ~185 |
| C — Depth ≥ 25% | ~12 |
| D — Tier gates | ~35 |
| E — Moderator | ~18 |
| F — State-dependent | ~20 |
| G — Ruleset-dependent | ~8 |
| H — Token balance | ~16 |
| I — Owner/member | ~22 |
| **Total** | **~401** |

16 passes × 401 elements = **~6,416 individual test actions**

At 30 seconds per action: ~53 hours of browser execution time
At 10 seconds per action (simple pass/fail): ~18 hours
With parallelism across sessions: realistically 4–8 hours of active testing spread across multiple sessions
