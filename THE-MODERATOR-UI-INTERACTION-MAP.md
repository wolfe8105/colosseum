# THE MODERATOR — UI INTERACTION MAP
### Every screen. Every tappable element. Session 230.

---

## A. /go — Setup (Guest AI Sparring)
1. Logo link → navigates to themoderator.app
2. Topic text input (200 char max)
3. 👍 For button (side picker)
4. 👎 Against button (side picker)
5. Start Debating button (disabled until topic ≥ 3 chars + side selected)

## B. /go — Debate Room
1. Chat area (scrollable, non-interactive)
2. Text input textarea (type your argument)
3. 🎙️ Mic button (toggle speech recognition on/off)
4. ➤ Send button (disabled until text entered)
5. ⚡ Sign Up Free — Debate Real People link (appears after round 1)

## C. /go — Verdict
1. Score grid (display only — Logic/Evidence/Delivery/Rebuttal)
2. ⚡ Sign Up — Debate Real People link
3. ↻ Debate Another Topic button (resets to screen A)
4. The Moderator footer link

## D. /verdict — Auto-Debate (AI vs AI)
1. Logo link → home
2. JOIN FREE link → Plinko
3. Category pill link → home filtered by category
4. Side A label link → home filtered by category
5. Side B label link → home filtered by category
6. Vote button Side A (cast ungated vote)
7. Vote button Side B (cast ungated vote)
8. ENTER THE ARENA link → Plinko
9. 📋 Copy Link share button
10. 𝕏 Share button
11. ↗ Share button (native share)
12. More Debates cards (link to other auto-debates)
13. Privacy Policy footer link
14. Terms of Service footer link

## E. /debate — Debate Landing
1. Logo link → home
2. JOIN FREE link → Plinko
3. Category pill link
4. Vote button Side A (cast vote, localStorage dedup)
5. Vote button Side B (cast vote)
6. 📋 Copy Link share button
7. 𝕏 Share button
8. ↗ Share button (native share)
9. Settle YOUR debate link → home
10. Privacy Policy footer link
11. Terms of Service footer link

## F. /login — Login Page
1. LOG IN tab
2. SIGN UP tab
3. Google OAuth button (login)
4. Apple OAuth button (login)
5. "Use email instead" toggle (login)
6. Email input (login)
7. Password input (login)
8. Forgot password? link
9. ENTER THE ARENA submit button (login)
10. Google OAuth button (signup)
11. Apple OAuth button (signup)
12. "Use email instead" toggle (signup)
13. Username input (signup)
14. Email input (signup)
15. Password input (signup)
16. DOB month select
17. DOB day select
18. DOB year select
19. Terms of Service checkbox + link
20. CREATE ACCOUNT submit button
21. Terms footer link
22. Privacy footer link
23. Reset password email input (modal)
24. Reset password cancel button (modal)
25. New password input (modal)
26. Confirm password input (modal)
27. Privacy Policy footer link
28. Terms of Service footer link

## G. Plinko — Step 1: OAuth/Email
1. Google OAuth button
2. Apple OAuth button
3. "Use email instead" toggle
4. Email input
5. Password input
6. (Progress bar — display only)

## H. Plinko — Step 2: Age Gate
1. DOB month select
2. DOB day select
3. DOB year select
4. Terms of Service checkbox + link
5. CONTINUE button

## I. Plinko — Step 3: Username
1. Username input (3-20 chars)
2. Display name input (max 40 chars)
3. CREATE ACCOUNT button

## J. Plinko — Step 4: Moderator Opt-In
1. ENABLE MODERATOR MODE button
2. SKIP FOR NOW button

## K. Plinko — Step 5: Done
1. ENTER THE MODERATOR button → index.html

## L. /terms — Terms of Service
(Static page — no interactive elements beyond browser navigation)

## M. /privacy — Privacy Policy
(Static page — no interactive elements beyond browser navigation)

---

## N. Home Feed (index.html — screen-home)

### Global Header (persistent across N, O, P, Q, R, S)
1. 🪙 Token display (tappable — shows token count + orange dot)
2. 🔔 Notification bell button → opens Notification Panel
3. Avatar button → opens User Dropdown

### Bottom Nav (persistent across N, O, P, Q, R, S)
4. ☰ Feed tab
5. ⚔ Arena tab
6. ★ Ranks tab
7. ◉ Groups tab (link to moderator-groups.html)
8. ● Profile tab

### Feed Content
9. Hot take cards — tap text to expand full content
10. 🔥 React button (per hot take — toggle reaction)
11. ⚔️ BET. button (per hot take — opens Challenge Modal)
12. ↗ Share button (per hot take)
13. 🧑‍⚖️ Become a Moderator / Already a Moderator button (per hot take)
14. Author name/avatar (tap to view profile)
15. Live debate cards — Watch Live button (navigates to spectate)
16. Pull-to-refresh (swipe gesture)

### Predictions Section
17. Prediction cards — Side A pick button
18. Prediction cards — Side B pick button
19. ➕ CREATE PREDICTION button → opens Prediction Creation Modal
20. Wager amount input (inside wager picker)
21. Quick amount buttons (inside wager picker)
22. CONFIRM WAGER button
23. ✕ Cancel wager button

### Overlay (Hot Takes Composer)
24. Overlay tabs (HOT TAKES / PREDICTIONS)
25. Hot take text input
26. POST button
27. Close/swipe-down to dismiss

## O. Arena Lobby (index.html — screen-arena)
1. ENTER THE ARENA button → Ranked Picker
2. ⚔️ PRIVATE DEBATE button → Private Lobby Picker
3. ⚡ POWER-UPS button → Power-Up Shop
4. 🧑‍⚖️ MOD QUEUE button (visible if is_moderator=true)
5. 🧑‍⚖️ BECOME A MODERATOR button (visible if is_moderator=false)
6. Join code text input (6 chars, uppercase)
7. GO button (join by code)
8. Spectator feed cards — VIEW / WATCH LIVE button
9. Challenge CTA (if rival online)

## P. Profile (index.html — screen-profile)
1. Avatar (tap to change — opens Avatar Selection Sheet)
2. Bio display (tap to edit — opens bio editor)
3. Bio textarea (500 char max)
4. Bio character count (display)
5. CANCEL bio button
6. SAVE bio button
7. Followers count (tap to open Follow List)
8. Following count (tap to open Follow List)
9. Profile depth bar (tap → profile-depth page)
10. 📊 Complete Your Profile link → profile-depth
11. ⚙️ Settings link → settings
12. ⚡ Power-Up Shop link → arena power-up shop
13. ⚔️ Reference Arsenal link → arsenal screen
14. 🛡️ Armory link → cosmetics page
15. 🔗 Share Profile action
16. 📨 Invite a Friend action
17. Rivals feed section (tap rival to view profile)

## Q. Shop / The Vault (index.html — screen-shop)
1. CONTENDER tier — COMING SOON button (disabled)
2. CHAMPION tier — COMING SOON button (disabled)
3. CREATOR tier — COMING SOON button (disabled)
(Token earn rates are display only)

## R. Leaderboard (index.html — screen-leaderboard)
1. ELO tab
2. WINS tab
3. 🔥 STREAK tab
4. Leaderboard rows (tap to view player profile)
5. LOAD MORE button
6. ELO explainer close button (✕)

## S. Arsenal / Reference Library (index.html — screen-arsenal)
1. ← Back button
2. My Arsenal tab
3. Library tab
4. Forge new reference button (inside My Arsenal)
5. Reference URL input (inside forge form)
6. Reference title input
7. Reference description textarea
8. Reference category select
9. SAVE / SUBMIT button
10. Individual reference cards (tap to expand/edit)
11. Library search/browse (inside Library tab)

---

## T. /profile-depth — Profile Questionnaire
1. ← Back link → index.html
2. Section tiles (20 sections — tap to open)
3. Text inputs (per question, 500 char max)
4. Slider inputs (per question, range with labels)
5. Select dropdowns (per question)
6. Chip/pill multi-select buttons (per question)
7. SAVE & UNLOCK REWARD button (per section)
8. Privacy Policy footer link
9. Terms of Service footer link

## U. /settings — Settings Page
1. ← Back link → index.html
2. Display name input (max 30 chars)
3. Challenge notifications toggle
4. Debate notifications toggle
5. Follow notifications toggle
6. Reaction notifications toggle
7. Sound effects toggle
8. Mute all audio toggle
9. Dark mode toggle (immediate effect)
10. Moderator enabled toggle (instant save via RPC)
11. Moderator available toggle (instant save via RPC)
12. Moderator category chips — Politics
13. Moderator category chips — Sports
14. Moderator category chips — Entertainment
15. Moderator category chips — Couples
16. Moderator category chips — Trending
17. Moderator category chips — Music
18. Public profile toggle
19. Show online status toggle
20. Allow challenges toggle
21. 💾 SAVE CHANGES button
22. ← BACK TO APP button
23. 🚪 LOG OUT button
24. 🔑 RESET PASSWORD button
25. 🗑️ DELETE ACCOUNT button → opens Delete Modal
26. Privacy Policy footer link
27. Terms of Service footer link

## V. /groups — Lobby View
1. + CREATE button → opens Create Group Modal
2. Discover tab
3. My Groups tab
4. Rankings tab
5. Category filter pills (tap to filter)
6. Group cards (tap to open group detail)
7. Bottom tab bar — Feed link
8. Bottom tab bar — Arena link
9. Bottom tab bar — Ranks link
10. Bottom tab bar — Groups (active)
11. Bottom tab bar — Profile link

## W. /groups — Group Detail View
1. Group banner/header (display)
2. JOIN GROUP / LEAVE GROUP button
3. ⚔️ CHALLENGE ANOTHER GROUP button (visible if member)
4. Hot Takes tab
5. Challenges tab
6. Members tab
7. Group hot take text input
8. POST button (group hot take)
9. Challenge cards — ACCEPT button (per challenge)
10. Challenge cards — DECLINE button (per challenge)
11. Member rows — role actions (Promote/Demote/Kick — visible based on caller role)

## X. /spectate — Spectator View
1. ← Back button
2. Logo link → home
3. JOIN link → Plinko (hidden if logged in)
4. Debate content (scrollable feed)
5. Spectator chat header toggle (expand/collapse)
6. Chat input text field (280 char max)
7. SEND chat button
8. Vote button Side A (debater name)
9. Vote button Side B (debater name)
10. 📋 Copy Link share button
11. 𝕏 Share button
12. 💬 WhatsApp share button
13. ↗ Share button (native share)

## Y. /cosmetics — Armory
1. ← Back link → home
2. Cosmetic item tiles (tap to select)
3. Purchase button (per unpurchased item)
4. Equip button (per owned item)
5. Unequip button (per equipped item)
6. Purchase confirm modal — Cancel button
7. Purchase confirm modal — Purchase button
8. Info modal — Got it button

---

## Z. Arena — Mode Select (overlay)
1. 🎙️ Live Audio mode card
2. 🎤 Voice Memo mode card
3. ⌨️ Text Battle mode card
4. 🤖 AI Sparring mode card
5. Cancel button
6. Backdrop tap to close

## AA. Arena — Ranked Picker (overlay)
1. Ranked card
2. Casual card
3. Cancel button
4. Backdrop tap to close

## AB. Arena — Ruleset Picker (overlay)
1. ⚡ Amplified card
2. 🎸 Unplugged card
3. Round count buttons (select round count)
4. Cancel button
5. Backdrop tap to close

## AC. Arena — Category Picker
1. Category buttons (Politics, Sports, Entertainment, Couples, Trending, Music, etc.)
2. "Any Category" button
3. Topic text input (if custom topic flow)

## AD. Arena — Queue
1. ✕ CANCEL button (leave queue)
2. Queue status animation (display only)
3. Queue population count (display only)
4. Spectator feed (scrollable, cards tappable)

## AE. Arena — AI Fallback Prompt (after 60s)
1. SPAR WITH AI button
2. (Continues searching in background)

## AF. Arena — Timeout / No Match (after 180s)
1. 🤖 SPAR WITH AI INSTEAD button
2. 🔄 TRY AGAIN button
3. ← BACK TO LOBBY button

## AG. Arena — Match Found
1. ACCEPT button
2. DECLINE button
3. 12-second countdown (display only)
4. Opponent info (display only)

## AH. Arena — Pre-Debate Setup (Staking)
1. Side A stake button (with multiplier)
2. Side B stake button (with multiplier)
3. Stake amount number input
4. Quick amount buttons (preset values)
5. CONFIRM stake button (disabled until side + amount selected)
6. ENTER DEBATE button

## AI. Arena — Debate Room (Text mode)
1. Text argument textarea (max chars)
2. → Send button (disabled until text entered)
3. 📎 Reference button (opens Reference Form)
4. Chat/message feed (scrollable)
5. Power-up activation buttons (if available)
6. Moderator scoring interface (if mod view — see screen BF)

## AJ. Arena — Debate Room (Live Audio mode)
1. 🎙️ Mic button (toggle mute/unmute)
2. Audio waveform visualization (display)
3. 📎 Reference button (opens Reference Form)
4. Chat/message feed (scrollable)
5. Power-up activation buttons (if available)

## AK. Arena — Debate Room (Voice Memo mode)
1. ⏺ Record button (tap to start recording)
2. ⏹ Stop button (appears while recording)
3. RETAKE button (cancel current recording)
4. SEND voice memo button (appears after recording)
5. Recording status indicator (display)
6. 📎 Reference button (opens Reference Form)

## AL. Arena — Debate Room (AI Sparring)
1. Text argument textarea
2. → Send button
3. Chat feed with AI responses (scrollable)
4. Round indicator (display)
(Same as Text mode but opponent is AI — no reference button, no power-ups)

## AM. Arena — Post-Debate End Screen
1. ⚔️ ADD RIVAL button
2. ⚔️ REMATCH button
3. 🔗 SHARE button
4. 📝 TRANSCRIPT button (if text/voice memo debate)
5. ← LOBBY button
6. Opponent name (tappable — view profile)
7. Score display (display only)
8. Token claim summary (display only)

## AN. Arena — Power-Up Shop (overlay)
1. ← BACK button
2. Power-up cards — BUY button (per power-up, shows cost)
3. Token balance display

## AO. Arena — Private Lobby Picker (overlay)
1. Username Challenge option
2. Group Members Only option
3. Join Code option
4. Cancel button
5. Backdrop tap to close

## AP. Arena — User Search
1. Search username text input
2. User result rows (tap to challenge)
3. Cancel button
4. Backdrop tap to close

## AQ. Arena — Group Lobby Picker
1. Group list (tap group to select)
2. Cancel button
3. Backdrop tap to close

## AR. Arena — Mod Queue
1. ← BACK button
2. ⚔️ CREATE DEBATE button (if is_moderator)
3. Debate request cards — REQUEST TO MOD button (per debate)

## AS. Arena — Mod-Initiated Debate Picker
1. ← BACK button
2. Mode cards (Live Audio / Voice Memo / Text)
3. Category cards
4. Topic text input (optional, 200 char max)
5. Ranked checkbox
6. Ruleset picker (Amplified/Unplugged)
7. ⚔️ CREATE & GET CODE button

## AT. Arena — Mod Waiting Room (Mod side)
1. Join code display (copyable)
2. Debater slot status (display)
3. CANCEL button

## AU. Arena — Mod Waiting Room (Debater side)
1. Waiting status display
2. LEAVE button

---

## AV. Notification Panel (overlay on main app)
1. Mark all read button
2. ✕ Close button
3. All filter pill
4. ⚔️ Challenges filter pill
5. 🏆 Results filter pill
6. 🔥 Reactions filter pill
7. 🪙 Economy filter pill
8. Individual notification rows (tap to navigate to related content)
9. Backdrop tap to close

## AW. User Avatar Dropdown (overlay on main app)
1. 👥 Groups link → groups page
2. ⚙️ Settings link → settings page
3. 📊 Complete Profile link → profile-depth
4. 🚪 Log Out button

## AX. Avatar Selection Sheet (overlay on Profile)
1. Avatar grid (tap avatar to select)
2. Tap backdrop to close

## AY. Follow/Following List (overlay on Profile)
1. User rows (tap to view profile)
2. Follow/Unfollow button (per user)
3. Tap backdrop to close

## AZ. Challenge Modal (from hot takes feed)
1. Challenge response textarea
2. CANCEL button
3. ⚔️ BET. submit button
4. Tap backdrop to close

## BA. Prediction Creation Modal
1. Topic textarea (200 char max)
2. Side A text input (50 char max)
3. Side B text input (50 char max)
4. CANCEL button
5. POST button

## BB. Mod Request Modal (debater requests a moderator)
1. ACCEPT button
2. DECLINE button
3. 30-second countdown (display)

## BC. Mod Scoring Panel (within debate room)
1. 👍 FAIR button (per debater — debater view)
2. 👎 UNFAIR button (per debater — debater view)
3. Score slider 1-50 (spectator view)
4. SUBMIT SCORE button

## BD. Reference Form (within debate room)
1. Reference URL input
2. Reference description textarea (500 char max)
3. Supports Side A button
4. Supports Side B button
5. SUBMIT EVIDENCE button
6. ✕ Cancel button

## BE. Ruling Panel (moderator rules on a reference)
(Moderator-only overlay within debate room — details in arena-mod-refs.ts)

## BF. Transcript Overlay (post-debate)
1. Full transcript display (scrollable)
2. Tap backdrop to close

## BG. Delete Account Modal (from Settings)
1. Type DELETE text input
2. CANCEL button
3. DELETE confirm button (disabled until "DELETE" typed)
4. Tap backdrop to close

## BH. Create Group Modal (from Groups lobby)
1. Group name input (50 char max)
2. Group description textarea
3. Group category select dropdown
4. CREATE GROUP button

## BI. GvG Challenge Modal (from Group detail)
1. Opponent search input (100 char max)
2. Opponent search results (tap to select)
3. Clear selected opponent button (✕)
4. Selected opponent display
5. Topic text input (200 char max)
6. Category select dropdown
7. Format pills — 1v1 / 3v3 / 5v5
8. SEND CHALLENGE ⚔️ button
9. ✕ Close button
10. Backdrop tap to close

---

**Total: 37 screens + 24 overlays/modals = 61 distinct UI states**
**Total interactive elements: ~340**
