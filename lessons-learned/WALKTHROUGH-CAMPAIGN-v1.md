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

## VARIABLE MATRIX (what changes between passes)

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
- [ ] Feed tab — click → home feed loads
- [ ] Arena tab — click → arena lobby loads
- [ ] Ranks tab — click → leaderboard loads
- [ ] Groups tab — click → groups page loads
- [ ] Profile tab — click → profile loads (redirects to plinko if not logged in)
- [ ] Search icon (top bar) — click → search screen opens
- [ ] Notification bell (top bar) — click → notifications panel opens
- [ ] User avatar (top bar) — click → profile overlay opens

#### A2. Leaderboard
- [ ] ELO tab — click → sorts by ELO
- [ ] WINS tab — click → sorts by wins
- [ ] STREAK tab — click → sorts by streak
- [ ] Search input — type 1 char → filters list
- [ ] Search input — type 3 chars → filters list to matching users
- [ ] Search input — clear → full list restored
- [ ] ELO explainer (? icon) — click → modal opens
- [ ] ELO explainer close button — click → modal removed from DOM

#### A3. Spectate page (any live debate)
- [ ] Vote A button — click → vote registers, both buttons disabled
- [ ] Vote B button — click → vote registers, both buttons disabled
- [ ] Vote A then Vote B — second click blocked (already voted)
- [ ] Share copy button — click → URL copied
- [ ] Share X button — click → X share opens
- [ ] Share WhatsApp button — click → WA share opens
- [ ] Share native button — click → native share sheet (mobile)
- [ ] Back button — click → navigates back

#### A4. Login page (logged out)
- [ ] Google OAuth button — click → redirects to accounts.google.com
- [ ] Apple OAuth button — click → redirects to Apple OAuth
- [ ] Email toggle — click → email login section appears
- [ ] Forgot password link — click → reset modal opens
- [ ] Reset email field — pre-filled from login email
- [ ] Reset send button — click → sends reset email
- [ ] Reset close button — click → modal closes
- [ ] Signup tab toggle — click → switches to signup flow
- [ ] Google signup button — click → OAuth
- [ ] Apple signup button — click → OAuth

#### A5. Onboarding / Plinko (logged out)
- [ ] Google OAuth button — click → OAuth
- [ ] Apple OAuth button — click → OAuth
- [ ] Email toggle — click → email fields appear
- [ ] Email input — type valid email → accepted
- [ ] Password input — type password → accepted
- [ ] Continue button — with email+password → disables, shows CHECKING, fires HIBP
- [ ] Continue button — with blank fields → stays disabled / shows error
- [ ] Age month select — select value → accepted
- [ ] Age day select — select value → accepted
- [ ] Age year select — select value → accepted
- [ ] ToS checkbox — unchecked → age next button blocked
- [ ] ToS checkbox — checked → age next button enabled
- [ ] Age next button — click with complete dob + tos → advances
- [ ] Username input — type username → accepted
- [ ] Display name input — type name → accepted (falls back to username if blank)
- [ ] Create account button — click → disables, shows CREATING, fires account creation
- [ ] Resend email button (step 5) — click → resends confirmation

---

### GATE GROUP B — Logged in required

#### B1. Arena lobby
- [ ] ENTER THE ARENA button — click → casual/ranked picker opens
- [ ] PRIVATE DEBATE button — click → private lobby picker opens
- [ ] POWER-UPS button — click → power-up shop opens
- [ ] JOIN CODE input — type < 5 chars, click GO → toast "Enter a 5-character code"
- [ ] JOIN CODE input — type exactly 5 chars, click GO → attempts join
- [ ] JOIN CODE input — type 5 chars, press Enter → attempts join
- [ ] JOIN CODE input — type > 5 chars → capped at 5 (maxlength)
- [ ] Challenge CTA link — click → navigates to home feed
- [ ] Open debate card (own) — RE-ENTER LOBBY button → re-enters that debate
- [ ] Open debate card (own) — X cancel button → cancels debate, removes card
- [ ] Feed card (live) — click → enters as spectator
- [ ] Feed card (complete) — click → navigates to debate landing

#### B2. Arena config — casual/ranked picker
- [ ] CASUAL card — click → advances to ruleset picker
- [ ] RANKED card (depth ≥ 25%) — click → advances to ruleset picker
- [ ] RANKED card (depth < 25%) — click → redirects to profile depth page
- [ ] Backdrop — click → closes picker, returns to lobby
- [ ] Cancel button — click → closes picker, returns to lobby

#### B3. Arena config — ruleset picker
- [ ] AMPLIFIED card — click → sets ruleset=amplified, advances to mode picker
- [ ] UNPLUGGED card — click → sets ruleset=unplugged, advances to mode picker
- [ ] Backdrop — click → closes, returns to lobby
- [ ] Cancel button — click → closes, returns to lobby

#### B4. Arena config — mode picker
- [ ] MODERATED LIVE (moderators available) — click → opens mod picker, then category
- [ ] MODERATED LIVE (no moderators) — button shown but no mods available → proceeds without mod
- [ ] VOICE MEMO — click → advances to category picker
- [ ] TEXT BATTLE — click → advances to category picker
- [ ] AI SPARRING — click → instant start, skips queue, creates AI match
- [ ] Backdrop — click → closes, returns to lobby
- [ ] Cancel button — click → closes, returns to lobby

#### B5. Arena config — category picker
- [ ] Sports category chip — click → selects, enables START DEBATE (if mod assigned)
- [ ] Politics category chip — click → selects
- [ ] Music category chip — click → selects
- [ ] Entertainment category chip — click → selects
- [ ] Couples Court category chip — click → selects
- [ ] Trending category chip — click → selects
- [ ] Topic title input — type custom topic → accepted, replaces default
- [ ] Reference link input — paste URL → scrapes OG data, shows preview
- [ ] Reference link input — blur with URL → scrapes OG data
- [ ] START DEBATE button (no category) — disabled
- [ ] START DEBATE button (category selected, no mod required) — enabled, click → joins queue
- [ ] START DEBATE button (moderated, no mod assigned) — disabled
- [ ] START DEBATE button (moderated, mod assigned) — enabled, click → joins queue
- [ ] Mod search input — type → searches available moderators
- [ ] Mod search result — click → assigns moderator, shows invited card
- [ ] Mod invite clear button — click → clears assigned moderator
- [ ] Backdrop — click → closes, returns to lobby

#### B6. Arena config — round picker
- [ ] 4 rounds button — click → selects 4 rounds
- [ ] 6 rounds button — click → selects 6 rounds
- [ ] 8 rounds button — click → selects 8 rounds
- [ ] 10 rounds button — click → selects 10 rounds

#### B7. Queue
- [ ] Cancel button — click → leaves queue, returns to lobby
- [ ] Queue status display — updates over time
- [ ] AI sparring prompt (60s) — appears after 60s in queue
- [ ] TRY AI button (from timeout) — click → starts AI match
- [ ] TRY AGAIN button (from timeout) — click → re-enters queue
- [ ] BACK TO LOBBY button (from timeout) — click → returns to lobby

#### B8. Match found (walled — webrtc)
- [ ] ACCEPT button — click → accepts match
- [ ] DECLINE button — click → declines match
- [ ] Countdown timer — auto-declines at zero

#### B9. Pre-debate screen
- [ ] Share button — click → copies debate link
- [ ] READY button — click → marks ready, waits for opponent

#### B10. Private lobby picker
- [ ] CHALLENGE BY USERNAME — click → opens user search
- [ ] GROUP MEMBERS ONLY — click → opens group picker
- [ ] SHAREABLE JOIN CODE — click → opens mode/round config for code lobby
- [ ] Backdrop — click → closes picker
- [ ] Cancel button — click → closes picker

#### B11. Private lobby — user search
- [ ] Search input — type → searches users
- [ ] User result row — click → selects user as opponent
- [ ] Cancel button — click → closes search
- [ ] Backdrop — click → closes search

#### B12. Private lobby — group picker
- [ ] Group row — click → selects group as lobby type
- [ ] Cancel button — click → closes
- [ ] Backdrop — click → closes

#### B13. Private lobby — waiting screen
- [ ] CHALLENGE SENT title — visible for private visibility
- [ ] Join code display — visible for code visibility, shows 5-char code
- [ ] Copy challenge link button — visible when join_code present, click → copies
- [ ] Cancel button — click → calls cancel_private_lobby, clears timer, returns to lobby
- [ ] Poll (every 3s) — fires check_private_lobby while view=privateLobbyWaiting
- [ ] Poll stops — when view changes away from privateLobbyWaiting

#### B14. Debate room — debater actions (text battle)
- [ ] Text input — enabled on my turn, disabled on opponent's turn
- [ ] Send button — disabled when input empty, enabled when text present
- [ ] Send button — click with text → submits message, clears input
- [ ] Send button — Enter key → submits message
- [ ] Finish turn button — click → ends turn early
- [ ] Concede button — click → opens confirm, concedes debate
- [ ] Cite button (references present, uncited) — enabled; click → opens cite overlay
- [ ] Cite button (no uncited references) — disabled
- [ ] Challenge button (challengeable refs, challenges remaining) — enabled; click → opens challenge overlay
- [ ] Challenge button (no challenges remaining) — disabled
- [ ] Score buttons (budget available) — enabled; click → allocates score points
- [ ] Score buttons (budget exhausted) — disabled

#### B15. Debate room — moderator actions
- [ ] Mod comment input — type → enabled
- [ ] Mod comment send button — disabled when empty, enabled with text
- [ ] Score A button — click → scores debater A for this round
- [ ] Score B button — click → scores debater B for this round
- [ ] Score cancel button — click → cancels scoring
- [ ] Mod score slider — drag → sets overall score
- [ ] Submit score button — click → submits final score
- [ ] Eject A button — click → ejects debater A
- [ ] Eject B button — click → ejects debater B
- [ ] Null debate button — click → nulls the debate
- [ ] Reference allow button (ruling overlay) — click → allows challenged reference
- [ ] Reference deny button (ruling overlay) — click → denies challenged reference
- [ ] Ruling backdrop — click → closes ruling overlay

#### B16. Debate room — spectator tip buttons
- [ ] Tip 5 tokens button — click (sufficient tokens) → tips 5 to debater
- [ ] Tip 10 tokens button — click (sufficient tokens) → tips 10
- [ ] Tip 25 tokens button — click (sufficient tokens) → tips 25
- [ ] Tip buttons (insufficient tokens) — disabled
- [ ] After tip — all tip buttons disabled until RPC resolves

#### B17. Post-debate screen
- [ ] REMATCH button — click → starts new debate with same opponent/config
- [ ] SHARE button — click → opens share modal
- [ ] TRANSCRIPT button (messages exist) — click → shows transcript
- [ ] TRANSCRIPT button (no messages) — not rendered
- [ ] ADD RIVAL button — click → adds opponent as rival
- [ ] ADD RIVAL button (already rival) — disabled
- [ ] BACK TO LOBBY button — click → returns to lobby
- [ ] Staking result display (amplified only) — shows win/loss tokens
- [ ] Staking result display (unplugged) — not shown

#### B18. Home feed
- [ ] Category filter ALL — click → shows all feed items
- [ ] Category filter Sports — click → filters to sports
- [ ] Category filter Politics — click → filters to politics
- [ ] Category filter Music — click → filters to music
- [ ] Category filter Entertainment — click → filters to entertainment
- [ ] Category filter Couples Court — click → filters to couples court
- [ ] Category filter Trending — click → filters to trending
- [ ] Feed composer input — type → accepted
- [ ] Feed composer link input — paste URL → scrapes OG data
- [ ] Feed POST button — with text → posts, clears input
- [ ] Feed POST button — empty → disabled
- [ ] Feed card flame/reaction button — click → reacts
- [ ] Feed card spectate button — click → enters spectate
- [ ] Feed card join button (open debate) — click → joins debate

#### B19. Notifications panel
- [ ] Notification bell — click → panel slides open
- [ ] Mark all read button — click → marks all read, dot disappears
- [ ] Individual notification — click → deeplinks to relevant content
- [ ] Backdrop — click → closes panel
- [ ] Close button — click → closes panel

#### B20. Search
- [ ] Search input — type → searches users and debates
- [ ] User result — click → navigates to profile
- [ ] Debate result — click → navigates to debate landing
- [ ] Clear search — clears results

#### B21. Profile page
- [ ] Debate archive — loads on profile open
- [ ] Archive filter ALL — click → shows all debates
- [ ] Archive filter WIN — click → filters to wins
- [ ] Archive filter LOSS — click → filters to losses
- [ ] Archive filter TEXT — click → filters to text battles
- [ ] Archive filter VOICE — click → filters to voice memos
- [ ] Archive filter AI — click → filters to AI sparring
- [ ] Archive debate row — click → opens archive picker overlay
- [ ] Archive picker overlay — select debate → shows detail
- [ ] Archive picker backdrop — click → closes
- [ ] Archive edit button — click → opens edit overlay
- [ ] Archive edit save button — click → saves changes
- [ ] Archive edit cancel button — click → closes without saving
- [ ] Profile depth progress bar — click → navigates to profile depth page
- [ ] UNLOCK REWARDS link — click → navigates to profile depth page
- [ ] Social links display — click each → opens social URL
- [ ] Edit socials button — click → opens edit panel
- [ ] Socials save button — click → saves social links
- [ ] Socials cancel button — click → closes without saving
- [ ] Edit profile / settings link — click → navigates to settings
- [ ] Profile depth section (each section) — click → expands
- [ ] Profile depth section (expanded) — click again → collapses
- [ ] Profile depth question (text) — type answer → accepted
- [ ] Profile depth question (multiple choice chip) — click → selects
- [ ] Profile depth question (slider) — drag → sets value
- [ ] Profile depth Save section button — click → saves answers, updates depth %

#### B22. Settings page
- [ ] Dark mode toggle — toggle → switches theme
- [ ] Bio textarea — edit → accepted
- [ ] Save Changes button — click → fires update_profile
- [ ] Reset Password button — click → sends reset email, disables button briefly
- [ ] Logout button — click → signs out, redirects to login
- [ ] Delete Account button — click → opens confirm modal
- [ ] Delete confirm modal — confirm → deletes account
- [ ] Delete confirm modal — cancel → closes
- [ ] Back button — click → returns to home

#### B23. Groups — lobby
- [ ] DISCOVER tab — click → shows all groups
- [ ] MY GROUPS tab — click → shows joined groups
- [ ] RANKINGS tab — click → shows group leaderboard
- [ ] + CREATE button — click → opens create modal
- [ ] Create modal — name input → accepted
- [ ] Create modal — description input → accepted
- [ ] Create modal — category select → accepted
- [ ] CREATE GROUP button — with name → creates group, navigates to detail
- [ ] CREATE GROUP button — without name → disabled / error
- [ ] Create modal backdrop — click → closes
- [ ] Group search input — type 1 char → no RPC
- [ ] Group search input — type 2+ chars → fires search RPC
- [ ] Group row — click → opens group detail

#### B24. Groups — detail (member)
- [ ] FEED tab — click → shows group feed
- [ ] CHALLENGES tab — click → shows challenges
- [ ] MEMBERS tab — click → shows member list
- [ ] AUDITIONS tab — click → shows auditions list
- [ ] GROUP FEED post input — type → accepted
- [ ] GROUP FEED POST button — click → posts to group feed
- [ ] Back arrow — click → returns to group list
- [ ] Settings gear (owner only) — click → opens group settings

#### B25. Groups — GvG challenge modal
- [ ] Format pill 1v1 — click → selects 1v1 (default)
- [ ] Format pill 3v3 — click → selects 3v3
- [ ] Format pill 5v5 — click → selects 5v5
- [ ] Opponent group search — type 1 char → no RPC
- [ ] Opponent group search — type 2+ chars → fires search, shows results
- [ ] Opponent group result — click → selects opponent group
- [ ] Debate topic input — type → accepted
- [ ] SEND CHALLENGE button (opponent + topic filled) — enabled; click → sends challenge
- [ ] SEND CHALLENGE button (incomplete) — disabled
- [ ] Close X button — click → closes modal, removes .open from #gvg-modal

#### B26. Groups — audition modal
- [ ] Topic input — type → accepted
- [ ] Category select — select → accepted
- [ ] Ruleset select (amplified/unplugged) — select → accepted
- [ ] Rounds select (4/6/8/10) — select → accepted
- [ ] REQUEST AUDITION button — click → submits, disables button
- [ ] Close/cancel button — click → closes modal

#### B27. Groups — member actions modal (owner/admin only)
- [ ] Promote button — click → promotes member
- [ ] Promote role select — select new role → accepted
- [ ] Kick button — click → kicks member
- [ ] Ban button — click → bans member
- [ ] Ban reason textarea — type → accepted
- [ ] Cancel button — click → closes modal
- [ ] Modal backdrop — click → closes modal

#### B28. Reference Arsenal — armory sheet
- [ ] Armory sheet open — click trigger → sheet slides up
- [ ] Armory backdrop — click → closes sheet
- [ ] Sharpen filter button — click → opens filter drawer
- [ ] Reference card — click → opens reference detail
- [ ] Forge CTA (no references) — click → opens forge form
- [ ] Trending reference card — click → opens reference detail

#### B29. Reference Arsenal — forge form
- [ ] Title input — type → accepted
- [ ] Author input — type → accepted
- [ ] Date input — type → accepted
- [ ] Locator input — type → accepted
- [ ] URL input — type → accepted
- [ ] Claim textarea — type → accepted
- [ ] Submit button — click → submits reference

#### B30. Reference Arsenal — debate loadout
- [ ] Reference card (available) — click → selects for debate
- [ ] Reference card (disabled) — not clickable
- [ ] Reference card (selected) — click again → deselects

#### B31. Voice memo — recorder sheet
- [ ] Record button — click → starts recording
- [ ] Stop button — click → stops recording, shows preview
- [ ] Play button (preview) — click → plays recording
- [ ] Send button (recording complete) — click → sends voice memo
- [ ] Discard button — click → clears recording

#### B32. Direct messages
- [ ] DM thread row — click → opens thread
- [ ] DM input — type → accepted
- [ ] DM send button — click → sends message
- [ ] DM send button — Enter key → sends message
- [ ] DM back button — click → returns to thread list

#### B33. Rivals presence popup
- [ ] Dismiss button — click → closes popup
- [ ] Challenge button — click → opens private lobby picker for that rival

#### B34. Cosmetics page
- [ ] Cosmetic item (unlocked) — click → shows equip option
- [ ] Cosmetic item (token purchase) — click → opens confirm modal
- [ ] Confirm modal — confirm button (sufficient tokens) — click → purchases
- [ ] Confirm modal — confirm button (insufficient tokens) — disabled
- [ ] Confirm modal — cancel button — click → closes
- [ ] Info modal — close button — click → closes
- [ ] Equip button (owned item) — click → equips cosmetic

#### B35. Payments / subscription
- [ ] Subscription upgrade button — click → opens Stripe checkout
- [ ] Token purchase button — click → opens Stripe checkout
- [ ] Paywall modal CTA — click → opens upgrade flow
- [ ] Paywall modal dismiss — click → closes modal

---

### GATE GROUP C — Logged in + profile_depth_pct ≥ 25%

- [ ] Spectate chat input — renders only when logged in AND depth ≥ 25%
- [ ] Spectate chat SEND button — click → sends chat message
- [ ] RANKED arena option — available only when depth ≥ 25%
- [ ] Bounty post panel — renders (0 slots below 25%, 1 slot at 25%)
- [ ] Bounty amount input — type → accepted
- [ ] Bounty duration input — type → accepted
- [ ] PLACE BOUNTY button (sufficient tokens) — click → places bounty
- [ ] PLACE BOUNTY button (insufficient tokens) — disabled
- [ ] Bounty cancel button (existing bounty) — click → cancels bounty, refunds tokens

---

### GATE GROUP D — Logged in + questions_answered threshold (tier gates)

#### D1. Staking (requires tier 1 — questions_answered ≥ 10)
- [ ] Staking panel — renders only when amplified AND tier ≥ 1
- [ ] Staking locked panel — renders when tier < 1 OR unplugged
- [ ] Side A stake button — click → selects side A
- [ ] Side B stake button — click → selects side B
- [ ] Stake amount input — type → accepted
- [ ] Quick stake 5 button — click → sets amount to 5
- [ ] Quick stake 10 button — click → sets amount to 10
- [ ] Quick stake 25 button — click → sets amount to 25 (only if tier allows)
- [ ] Confirm stake button (side selected + amount ≤ balance + amount ≤ tier cap) — enabled
- [ ] Confirm stake button (no side / over cap / over balance) — disabled
- [ ] Confirm stake — click → places stake

#### D2. Power-up slots (requires tier 2 — questions_answered ≥ 25)
- [ ] Slot 1 (tier 2+) — click empty slot → opens inventory picker
- [ ] Inventory picker — select powerup → equips to slot
- [ ] Slot 1 filled — shows equipped powerup name/icon
- [ ] Slot 2 (tier 3+ only) — click → opens picker (tier 2 cannot see slot 2)
- [ ] Slot 3 (tier 4+ only) — click → opens picker
- [ ] Slot 4 (tier 5 only) — click → opens picker
- [ ] Equipped slot — click → unequips powerup

#### D3. Power-up activations (in-debate, amplified, equipped)
- [ ] Multiplier 2x — passive, shown as disabled button, no click action
- [ ] Silence button — click → activates, mutes opponent 10s, button disabled after
- [ ] Shield button — click → activates, blocks next reference challenge, button disabled after
- [ ] Reveal button — click → activates, shows opponent's equipped powerups, button disabled after
- [ ] Any powerup (unplugged) — activation buttons not rendered
- [ ] Any powerup (not equipped) — activation bar not rendered

#### D4. Bounty slots (depth gates)
- [ ] 0 slots (depth < 25%) — bounty post not available
- [ ] 1 slot (25% ≤ depth < 35%) — can post 1 bounty
- [ ] 2 slots (35% ≤ depth < 45%) — can post 2 bounties
- [ ] 3 slots (45% ≤ depth < 55%) — can post 3 bounties
- [ ] 4 slots (55% ≤ depth < 65%) — can post 4 bounties
- [ ] 5 slots (65% ≤ depth < 75%) — can post 5 bounties
- [ ] 6 slots (depth ≥ 75%) — can post 6 bounties

---

### GATE GROUP E — Logged in + is_moderator = true

- [ ] MODERATOR QUEUE button — visible in arena lobby; click → opens mod queue
- [ ] Mod queue list — loads available debates
- [ ] Claim/pick debate button — click → claims debate
- [ ] Moderator settings panel in settings — visible
- [ ] Moderator enabled toggle — toggle → enables/disables mod status
- [ ] Moderator available toggle — toggle → sets availability
- [ ] Category chips (mod settings) — click → selects/deselects mod categories
- [ ] Mod comment input (in-debate) — rendered only for assigned mod
- [ ] Mod score buttons — rendered only for assigned mod
- [ ] Mod eject buttons — rendered only for assigned mod
- [ ] Mod null button — rendered only for assigned mod
- [ ] Refs form (in-debate) — rendered only for assigned mod
- [ ] Reference submit button — click → submits reference
- [ ] Reference cancel button — click → hides form
- [ ] Reference allow button (ruling) — click → allows
- [ ] Reference deny button (ruling) — click → denies

---

### GATE GROUP F — State-dependent (requires prior action in same session)

- [ ] Join code GO button (5 chars entered) — enabled only after typing exactly 5 chars
- [ ] START DEBATE button — enabled only after category selected
- [ ] Confirm stake button — enabled only after side selected AND amount valid
- [ ] SEND CHALLENGE (GvG) — enabled only after opponent group + topic filled
- [ ] REQUEST AUDITION button — enabled after topic filled
- [ ] Arena match found ACCEPT — enabled only when match is found
- [ ] Vote A/B (spectate) — disabled after vote cast
- [ ] Tip buttons — disabled during RPC, re-enabled after resolve
- [ ] Powerup activate — disabled after activation (one per debate)
- [ ] Bounty lock button — disabled until bounty selected from dropdown
- [ ] Bounty lock button (selected) — click → locks in bounty claim
- [ ] Mod score submit — disabled during RPC
- [ ] Add Rival button — disabled after adding
- [ ] Save/Reset Password button — disabled during RPC, re-enables

---

### GATE GROUP G — Ruleset-dependent (amplified vs unplugged)

- [ ] Staking panel — shows in amplified, hidden in unplugged
- [ ] Staking result (post-debate) — shows in amplified, hidden in unplugged
- [ ] ELO movement indicator (post-debate) — shows in amplified, hidden in unplugged
- [ ] Power-up activation bar (in-debate) — shows in amplified IF equipped, hidden in unplugged
- [ ] Token earnings (post-debate) — shows in amplified, hidden in unplugged
- [ ] Ranked badge (pre-debate/post-debate) — shows correct badge for ruleset/ranked combo

---

### GATE GROUP H — Token balance dependent

- [ ] Power-up buy button — enabled when token_balance ≥ powerup cost
- [ ] Power-up buy button (4 powerups): multiplier_2x (cost varies), silence (20), shield (25), reveal (10)
  - [ ] Buy multiplier_2x — sufficient tokens → enabled
  - [ ] Buy multiplier_2x — insufficient tokens → disabled
  - [ ] Buy silence — sufficient tokens → enabled
  - [ ] Buy silence — insufficient tokens → disabled
  - [ ] Buy shield — sufficient tokens → enabled
  - [ ] Buy shield — insufficient tokens → disabled
  - [ ] Buy reveal — sufficient tokens → enabled
  - [ ] Buy reveal — insufficient tokens → disabled
- [ ] Staking confirm button — disabled when amount > token_balance
- [ ] Tip buttons in spectate — disabled when token_balance < tip amount
- [ ] Cosmetic purchase confirm — disabled when token_balance < cost
- [ ] Bounty post button — disabled when tokens insufficient for amount + fee

---

### GATE GROUP I — Owner/member/role dependent

#### Groups
- [ ] CHALLENGE ANOTHER GROUP button — visible to members only, hidden to non-members
- [ ] JOIN GROUP button — visible to non-members only
- [ ] YOU OWN THIS GROUP label — visible to owner only
- [ ] Settings gear — visible to owner only
- [ ] Group settings save — click → saves (owner only)
- [ ] Min ELO input (group settings) — type → accepted
- [ ] Min tier select — select → accepted
- [ ] Profile required checkbox — toggle → accepted
- [ ] Audition rule select — select → accepted
- [ ] Member actions modal (owner/admin) — click member → modal opens
- [ ] Promote button — visible if member can be promoted
- [ ] Kick button — always in modal
- [ ] Ban button — always in modal
- [ ] Group banner upload button — visible to owner only
- [ ] Group banner file input — select image → uploads banner

#### Pending challenges
- [ ] Challenge accept button — click → accepts (recipient only)
- [ ] Challenge cancel button — click → cancels (sender only)

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
