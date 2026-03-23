# THE MODERATOR — NAVIGATION ARCHITECTURE
## Full Tap-Target Map
### Last Updated: March 23, 2026

---

## HOW TO READ THIS DOCUMENT

- **Bold items** = exists in the codebase right now
- Non-bold items = planned (from Session Research: Waiting Room & Groups)
- Each numbered section is a **hub** (a screen/page with buttons on it)
- Bullets under each hub are **spokes** (tap targets on that screen)
- Spokes that lead to another hub say "→ leads to [HUB NAME]"
- Indented sub-bullets are buttons within a component on that screen
- Linear wizards (Plinko, Forge) use Step 1 → Step 2 → Step 3 notation

Visual version: `full_navigation_architecture.drawio` (draw.io file, same data)

---

## HOME

HOME is the center. Every major destination branches from here.

9 spokes from HOME:

1. **Arena** → leads to ARENA branch
2. **Profile** → leads to PROFILE hub
3. **Groups** → leads to GROUPS branch
4. **Leaderboard** → leads to LEADERBOARD hub
5. **Shop (The Vault)** → leads to SHOP hub
6. **Settings** → leads to SETTINGS hub
7. **Arsenal** → leads to ARSENAL hub
8. **Notifications** → leads to NOTIFICATIONS panel
9. **Login** → leads to LOGIN / PLINKO branch

---

## 1. ARENA BRANCH

The Arena branch contains: Arena Lobby, Category Overlay, Spectate, Auto-Debate, Ranked Picker, Mode Select, Queue, Waiting Room (planned), Match Found (planned), Pre-Debate, Debate Room, and Post-Debate.

### 1A. ARENA LOBBY
File: `moderator-arena.html` → `src/arena.ts`

- **Enter the arena** → leads to RANKED PICKER
- **Power-ups shop**
- **Live feed cards** → leads to SPECTATE PAGE
- **Verdict cards** → leads to AUTO-DEBATE PAGE

### 1B. CATEGORY OVERLAY
File: `index.html` → `src/pages/home.ts` (overlay opened from ring segments)

Opened by tapping any of these ring segments:
- **Politics**
- **Sports**
- **Film & TV**
- **Couples**
- **Music**

Tabs inside overlay:
- **Hot takes tab**
  - Per card: **React (🔥)**, **Bet (⚔️)**, **Share**
- **Predictions tab**
  - **Create prediction**, **Pick A / B**
- **Trending tab**

### 1C. SPECTATE PAGE
File: `moderator-spectate.html` → `src/pages/spectate.ts`

- **Vote A / B**
- **Chat**
- **Share** (Copy, X, WhatsApp, Native)
- **Back**

### 1D. AUTO-DEBATE PAGE
File: `moderator-auto-debate.html` → `src/pages/auto-debate.ts`

- **Vote A / B**
- **More debates**

### 1E. RANKED PICKER
File: `src/arena.ts` (overlay within arena)

- **Casual** → leads to MODE SELECT
- **Ranked** → leads to MODE SELECT

### 1F. MODE SELECT
File: `src/arena.ts` (overlay within arena)

- **Live audio** → leads to QUEUE
- **Voice memo** → leads to QUEUE
- **Text battle** → leads to QUEUE
- **AI sparring** → leads to QUEUE

### 1G. QUEUE
File: `src/arena.ts` (polling state)

- **No match screen**
  - **Spar AI instead**
  - **Try again**
  - **Back to lobby**

Existing path: Queue → PRE-DEBATE (direct, when match found)

### 1H. WAITING ROOM (PLANNED)
Planned in: SESSION-RESEARCH-WAITING-ROOM-AND-GROUPS.md §1-2

- Timer
- Cancel
- Spectate in queue
- AI sparring prompt (cold start fallback, after 60s)
- LCARS audio/haptic feedback

→ leads to MATCH FOUND

### 1I. MATCH FOUND (PLANNED)
Planned in: SESSION-RESEARCH-WAITING-ROOM-AND-GROUPS.md §1.6

- Accept
- Decline

→ Accept leads to PRE-DEBATE

### 1J. PRE-DEBATE
File: `src/arena.ts` → `showPreDebate()`

- **Place stake** (staking panel)
- **Equip power-ups** (loadout)
- **Enter battle** → leads to DEBATE ROOM

→ Entrance sequence (PLANNED, between Enter Battle and Debate Room)

### 1K. DEBATE ROOM
File: `src/arena.ts` → `enterRoom()`

- **Message input**
- **Activate power-up**

→ When rounds complete → leads to POST-DEBATE

### 1L. POST-DEBATE
File: `src/arena.ts` → `endCurrentDebate()`

- **Rematch**
- **Share**
- **Transcript**
- **Add rival**
- **Back to lobby** → leads back to ARENA LOBBY

---

## 2. PROFILE
File: `index.html` → `screen-profile`

- **Avatar** (emoji picker, 20 options)
- **Bio** (inline edit, 500 char)
- **Followers** (list modal)
- **Following** (list modal)
- **Profile depth** → leads to PROFILE DEPTH PAGE
- **Settings** → leads to SETTINGS hub
- **Power-up shop** → opens power-up shop
- **Arsenal** → leads to ARSENAL hub
- **Cosmetics shop** → leads to SHOP hub
- **Share profile**
- **Invite friend**
- **Rivals feed**

### 2A. PROFILE DEPTH PAGE
File: `moderator-profile-depth.html` → `src/pages/profile-depth.ts`

- **12 sections, 147 questions**
- **Save section** (per section)
- **Tier banner display**

---

## 3. GROUPS BRANCH

### 3A. GROUPS LOBBY
File: `moderator-groups.html` → `src/pages/groups.ts`

- **Discover** → tap card leads to GROUP DETAIL
- **My groups** → tap card leads to GROUP DETAIL
- **Rankings**
- **Create group**

### 3B. GROUP DETAIL
File: `moderator-groups.html` → `src/pages/groups.ts` → `openGroup()`

Existing:
- **Hot takes tab**
- **Challenges tab**
- **Members tab**
- **Join / Leave**
- **GvG challenge** → leads to GVG MODAL

Planned (SESSION-RESEARCH-WAITING-ROOM-AND-GROUPS.md §3-7):
- Role hierarchy (Leader, Co-Leader, Elder, Member)
- Kick / ban / promote
- Group settings (edit name, description, type, requirements)
- Entry requirements (minimum Elo, tier, profile completion)
- Auditions (debate-based entry with group vote) → connects to DEBATE ROOM
- Group identity (3-tier banner progression: presets → custom static → custom animated)
- Shared fate (group performance moves individual token balance)
- Battle animations (4 tracks, 3 tiers each) → connects to Entrance Sequence
- Battle cries (personal + group, 3 tiers each)

### 3C. GVG MODAL
File: `src/pages/groups.ts` → `openGvGModal()`

- **Search** (opponent group, 350ms debounce)
- **Format pills** (1v1 / 3v3 / 5v5)
- **Topic input**
- **Category select**
- **Submit**

---

## 4. LEADERBOARD
File: `index.html` → `screen-leaderboard` → `src/leaderboard.ts`

- **Elo tab**
- **Wins tab**
- **Streak tab**
- **All time filter**
- **This week filter**
- **This month filter**
- **My rank display**
- **Elo explainer** (? icon → modal)
- **Tap row** → opens user profile modal

---

## 5. SHOP (THE VAULT)
File: `index.html` → `screen-shop`

- **Contender tier** ($9.99/mo) — Upgrade button
- **Champion tier** ($19.99/mo) — Upgrade button
- **Creator tier** ($29.99/mo) — Upgrade button
- **Token earn info** (display only — list of earn rates)

---

## 6. SETTINGS
File: `moderator-settings.html` → `src/pages/settings.ts`

Notification toggles:
- **Challenge notifications**
- **Debate notifications**
- **Follow notifications**
- **Reaction notifications**

Audio toggles:
- **Sound effects**
- **Mute all**

Moderator toggles:
- **Moderator mode**
- **Available for moderation**

Privacy toggles:
- **Public profile**
- **Show online status**
- **Accept challenges**

Actions:
- **Save settings**
- **Reset password**
- **Logout**
- **Delete account** (type "DELETE" to confirm)

---

## 7. ARSENAL
File: `index.html` → `screen-arsenal` → `src/reference-arsenal.ts`

- **My Arsenal tab**
- **Library tab**
- **Back**

Per reference:
- **Verify**
- **Cite**
- **Challenge**

Forge form (linear wizard):
- **Step 1: Name Your Weapon** (claim text)
- **Step 2: Load the Chamber** (URL)
- **Step 3: Tag the Source** (source type, author, year)
- **Step 4: Choose Your Arena** (category)
- **Step 5: Review & Forge** (confirm and submit)

---

## 8. NOTIFICATIONS
File: `src/notifications.ts` (panel overlay, global)

- **Mark all read**
- **Close**
- **All filter**
- **Challenges filter**
- **Results filter**
- **Reactions filter**
- **Economy filter**
- **Tap notification** → navigates to relevant screen

---

## 9. LOGIN / PLINKO

### 9A. LOGIN PAGE
File: `moderator-login.html` → `src/pages/login.ts`

- **Log in tab**
- **Sign up tab**
- **Google OAuth**
- **Apple OAuth**
- **Email toggle** (collapsed behind toggle)
- **Password reset**

→ leads to PLINKO GATE

### 9B. PLINKO GATE (linear wizard)
File: `moderator-plinko.html` → `src/pages/plinko.ts`

- **Step 1: Auth** (Google / Apple / Email)
- **Step 2: Age gate** (must be 13+)
- **Step 3: Username**
- **Step 4: Done** → redirects to HOME

---

## CROSS-SYSTEM CONNECTIONS

These are planned features that bridge two separate branches:

| From | To | Type |
|------|----|------|
| Auditions (Group Detail) | Debate Room (Arena) | Planned — audition IS a debate |
| Battle Animations (Group Detail) | Entrance Sequence (Arena) | Planned — group animation plays on debate entry |
| Shared Fate (Group Detail) | Token balance (Profile) | Planned — group wins/losses move your tokens |
| Bet button (Hot Takes) | Arena queue | Existing — challenge creates debate |
| Back to Lobby (Post-Debate) | Arena Lobby | Existing — loop back |
| Plinko Step 4 | HOME | Existing — signup complete → home |

---

## EXTERNAL / INFRA PAGES (not in hub-spoke model)

These pages are entry points, not navigated to from within the app:

- **Landing page** (`moderator-debate-landing.html`) — ungated, vote A/B, CTA → Plinko
- **Mirror** (Cloudflare Pages) — static HTML, CTA → Plinko
- **Bot army** (VPS) — generates auto-debates and hot takes, feeds into Category Overlay and Auto-Debate page

---

## CHANGE LOG

| Date | What |
|------|------|
| 2026-03-23 | Initial creation. 167 nodes, 173 edges. All screens verified against source code in repo `wolfe8105/colosseum`. Planned features from SESSION-RESEARCH-WAITING-ROOM-AND-GROUPS.md. |
