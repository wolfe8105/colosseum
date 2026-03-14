# THE COLOSSEUM — FEATURE ROOM MAP

## Session 106 — March 14, 2026

### How to read this document

The existing app has **6 charts** (rooms) with **174 traced edges** (wiring). This document takes every feature from the Ideas Master Map (~90 items) and does three things:

1. **Places furniture in existing rooms** — features that extend current screens
2. **Defines new rooms** — entirely new pages/sections that don't exist yet
3. **Draws doors** — logical connections between new rooms and existing rooms

Each existing room lists its current screens/nodes, then the new furniture going in. Each new room lists what it contains and which existing rooms it connects to.

---

## EXISTING ROOMS (Charts 1-6)

### ROOM 1: ARENA / HOME / CAROUSEL (Chart 1)
*The front door of the app. Everything starts here.*

**Current screens/nodes:** Home carousel, category pills, debate cards, arena lobby, debate room (live audio + text), post-debate score, auto-debate landing, debate-landing (mirror entry)

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| Sentiment gauge (swinging meter) | New visual element in debate room — real-time crowd meter | Spectator votes feed it |
| Animated reactions | Flying emojis across debate screen | Spectator input during debate |
| Spectator live chat | Scrolling text sidebar/overlay in debate room | New during-debate panel |
| Moderator effects (fireworks, fog horn) | Mod toolbar buttons → visual/audio FX | Debate room mod controls |
| Live transcription | Real-time speech-to-text panel in debate room | Mirror pages (SEO), replays |
| Screen layout for text debates | New portrait-mode interleaved stream layout | Debate room alternate view |
| Round timer enhancements | 120s timer + 15s warning pulse + haptic | Debate room existing timer |
| Instant rematch button | Post-debate one-tap → new debate | Post-debate score screen |
| Expanded debate modes (10+) | Mode select screen expansion | Arena lobby mode picker |
| In-debate reference UX (thumb-pull drawer) | New drawer panel during debate | Reference Library (NEW ROOM) |
| Moderator reference workflow | Mod review popup for cited sources | Reference Library data |
| Reference streaks (flame effect) | Visual effect on 5-win cited source | Debate room text stream |
| Pre-debate loadout screen ads | Ad slot in lobby/loadout | Ad system |
| 30-second round break ads | Ad slot between rounds | Ad system |
| 10-second tollbooth ads | Gates before score reveal, replays, etc. | Post-debate, replay entry |
| Sponsored surfaces (gauge, fireworks, categories) | Brand overlays on existing visuals | Ad system |
| Social proof counters on carousel tiles | Live viewer counts on home cards | Home carousel, mirror |
| Activity indicator expansion | Live debate counts, hot take velocity | Home carousel |
| Pattern interrupt clips | Exportable gauge/fireworks clips | Mirror / External |
| Haptic feedback | Vibration on gauge swings, countdowns | Settings toggle (Room 6) |
| Decibel-level gauge | Visual crowd noise meter | Debate room spectator view |

**Doors OUT from this room:**
- → Reference Library (NEW) via in-debate drawer
- → Token Staking (NEW) via pre-debate staking screen
- → Marketplace (NEW) via reference card links in debate
- → DM Inbox (NEW) via post-debate "message opponent"
- → Tournament (NEW) via tournament debate entries
- → Profile (Room 5/6) via debater/spectator avatars

---

### ROOM 2: LEADERBOARD (Chart 2)
*Rankings hub. Currently has Elo/Wins/Streak tabs.*

**Current screens/nodes:** Leaderboard tabs, player rows, sort controls

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| Source Hunter leaderboard tab | New tab: Researcher Rating rankings | Reference Library (NEW) |
| Prediction accuracy tab | New tab: best predictors ranked | Predictions (Room 3) |
| Voter leaderboard tab | New tab: most active/accurate voters | Voting system |
| Reference bounty board | Open bounties list ("I need source proving X") | Reference Library (NEW) |

**Doors OUT from this room:**
- → Profile (Room 5/6) via player row taps (currently dead-ended per Session 105)
- → Reference Library (NEW) via Source Hunter tab → source detail
- → Predictions (Room 3) via prediction accuracy tab

---

### ROOM 3: CATEGORY OVERLAY — HOT TAKES + PREDICTIONS (Chart 3)
*The opinion layer. Hot takes and prediction cards.*

**Current screens/nodes:** Hot take feed, prediction cards, category filter, challenge button, share button

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| Create Prediction (E90) | Submit UI + RPC — completely missing today | Token Staking (NEW) |
| Prediction accuracy scores | Track per-user prediction performance | Leaderboard (Room 2) |
| Token prediction staking | Stake tokens on prediction outcomes | Token Staking UI (NEW) |
| Polite nudge copy (contextual) | Micro-copy at vote moments, prediction cards | Onboarding system |

**Doors OUT from this room:**
- → Token Staking (NEW) via "stake tokens" on prediction cards
- → Arena (Room 1) via challenge flow (E83 — partially wired)
- → Profile (Room 5/6) via author avatars (E84/E163 — partially wired)

---

### ROOM 4: GROUPS (Chart 4)
*Social containers. Discover, My Groups, Rankings, Group Detail.*

**Current screens/nodes:** Discover tab, My Groups tab, Rankings tab, Create Group modal, Group Detail (header, hot takes, members, about)

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| GvG battles (E212, E215) | Challenge button + opponent picker + format select | Arena (Room 1) |
| Clan Armories | Shared reference pool per group | Reference Library (NEW) |
| Team Loadouts | Pre-game reference coordination | Arena (Room 1) lobby |
| Teams / Squads / School-vs-School | Admin roles, team cosmetics, team leaderboard | Leaderboard (Room 2) |
| Member avatar → profile (E213, E217) | Click handler on member rows | Profile (Room 5/6) |

**Doors OUT from this room:**
- → Arena (Room 1) via GvG challenge → debate
- → Reference Library (NEW) via Clan Armory browse
- → Profile (Room 5/6) via member avatar taps
- → Leaderboard (Room 2) via team leaderboard

---

### ROOM 5: PROFILE DEPTH (Chart 5)
*The questionnaire flow. Profile completion percentage.*

**Current screens/nodes:** Question sections, progress bar, depth percentage, reward milestones

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| Profile questionnaire drip reframing | Contextual drip instead of 157 at once | Post-debate (Room 1), onboarding |
| Quarterly check-in token rewards | 90-day confirm/update for 15 tokens | Token system, B2B data |
| Category tribe badges | 5 category icons next to name | All screens showing usernames |
| Source reputation score (Researcher Rating) | New stat axis alongside Elo | Leaderboard (Room 2), Profile (Room 6) |

**Doors OUT from this room:**
- → Profile/Public Profile (Room 6) via "view my profile"
- → Home (Room 1) via completion reward redirects

---

### ROOM 6: SETTINGS + PUBLIC PROFILE (Chart 6)
*Account management and the /u/username public view.*

**Current screens/nodes:** Settings (username, email, bio, avatar, logout), Public Profile (stats, debate history, follow)

**New furniture for this room:**

| Feature | What it adds | Connects to |
|---------|-------------|-------------|
| Arsenal / Loadout screen (Diablo inventory) | Major expansion OR new primary screen | Reference Library (NEW), Arena (Room 1) |
| Debater's Toolbox | Personal reference collection + loadouts | Reference Library (NEW) |
| Haptic feedback toggle | On/off for vibration effects | Settings existing controls |
| Notification preferences expansion | Granular controls for DMs, tournaments, bounties, etc. | DM Inbox (NEW), Tournaments (NEW) |
| Ad frequency cap settings | User control over ad density | Ad system |
| Push notifications config | Followed users, categories, debate alerts | Notification system |
| The Orange Dot | Persistent indicator for token-earning opportunities | All screens (token system) |

**Doors OUT from this room:**
- → Arsenal/Loadout (could be NEW room or major expansion here)
- → Reference Library (NEW) via Toolbox/Arsenal
- → DM Inbox (NEW) via message links on public profile
- → Marketplace (NEW) via "browse my references for sale"

---

## NEW ROOMS (Need new charts)

### NEW ROOM A: REFERENCE LIBRARY
*The source database. Searchable, browsable, submittable. The backbone of the reference economy.*

**Contains:**
- Validated Reference Library (browse/search all sources)
- The Forge (Unverified → Forged progression display)
- Citation count + win rate tracking per reference
- Rarity tiers visual system (Common → Mythic)
- Reference card detail view (source, author, date, citations, win rate, submitter, counters)
- Counter-reference pairing ("Top Counters" tab per reference)
- Reference decay indicators (aging flags)
- Legacy References / Hall of Fame wall
- The Black Market (sub-40% win rate sources, high reward)
- Reference submission form (30-word claim + URL)
- Reference bounties board (post/fulfill bounties)
- Source Hunter passive earnings tracker
- Reference rate limits display

**Doors IN from existing rooms:**
- ← Arena (Room 1) via in-debate drawer, post-debate reference discovery
- ← Leaderboard (Room 2) via Source Hunter tab, bounty board
- ← Groups (Room 4) via Clan Armory
- ← Profile (Room 5/6) via Arsenal/Toolbox
- ← Marketplace (NEW) via reference detail links

**Doors OUT to other rooms:**
- → Marketplace (NEW) via "buy/sell this reference"
- → Profile (Room 5/6) via submitter username taps
- → Arena (Room 1) via "equip to loadout" → debate

---

### NEW ROOM B: TOKEN PREDICTION STAKING
*Where users bet earned tokens on debate outcomes. The single biggest missing feature.*

**Contains:**
- Active debates list with odds
- Stake tokens interface (amount picker, side picker)
- My active stakes tracker
- Results/payout history
- Prediction creation flow (E90 — currently completely missing)

**Doors IN from existing rooms:**
- ← Predictions (Room 3) via "stake tokens" on prediction cards
- ← Arena (Room 1) via pre-debate staking screen
- ← Home (Room 1) via featured stakes on carousel

**Doors OUT to other rooms:**
- → Arena (Room 1) via "watch this debate" from active stake
- → Leaderboard (Room 2) via prediction accuracy rankings
- → Profile (Room 5/6) via staking history on public profile

---

### NEW ROOM C: MARKETPLACE
*Buy/sell references with tokens. Player-driven economy.*

**Contains:**
- Browse references for sale (category, rarity, price filters)
- Reference card with owner, price, transaction history (provenance)
- Buy/sell flow
- DM negotiation link (→ DM Inbox)
- Challenge for reference link (→ Arena)
- Reference crafting (combine two → Reinforced Reference)
- Modifier crafting & socket system
- Power-up shop (consumables)
- Loadout slot purchases

**Doors IN from existing rooms:**
- ← Arena (Room 1) via reference card links during debate
- ← Reference Library (NEW A) via "buy/sell this reference"
- ← Profile (Room 5/6) via Arsenal "shop" button
- ← Groups (Room 4) via Clan Armory trade

**Doors OUT to other rooms:**
- → Reference Library (NEW A) via reference detail
- → DM Inbox (NEW D) via "message seller"
- → Profile (Room 5/6) via owner username taps
- → Arena (Room 1) via "challenge for this reference" (wagered debates)

---

### NEW ROOM D: DM INBOX
*Simple messaging. Not a social feed — just conversations.*

**Contains:**
- Conversations list
- Message thread view
- Block/report
- Rate limiting

**Doors IN from existing rooms:**
- ← Arena (Room 1) via post-debate "message opponent"
- ← Profile (Room 6) via "message" button on public profile
- ← Marketplace (NEW C) via "message seller"
- ← Groups (Room 4) via member row "message"

**Doors OUT to other rooms:**
- → Profile (Room 5/6) via avatar taps in thread
- → Arena (Room 1) via "challenge to debate" inline
- → Marketplace (NEW C) via negotiation links

---

### NEW ROOM E: TOURNAMENT SYSTEM
*Brackets, seasonal events, elimination formats.*

**Contains:**
- Tournament brackets view
- Seasonal events (March Madness politics, Super Bowl sports, etc.)
- Qualification rounds
- Tournament-only power-ups (3x multiplier, Double Silence, Golden Ref Slot)
- User-created tournaments with token entry fees
- Celebrity debate events (qualification → bracket → live slot)
- Spectator betting on tournament outcomes

**Doors IN from existing rooms:**
- ← Home (Room 1) via featured tournament cards on carousel
- ← Arena (Room 1) via tournament debate entries
- ← Groups (Room 4) via GvG tournament brackets

**Doors OUT to other rooms:**
- → Arena (Room 1) via tournament match → debate room
- → Token Staking (NEW B) via spectator betting
- → Leaderboard (Room 2) via tournament standings
- → Profile (Room 5/6) via tournament badges/history

---

### NEW ROOM F: NOTIFICATIONS HUB
*Push notifications, daily digests, The Orange Dot system.*

**Contains:**
- Push notification routing
- Daily digest emails (via Resend)
- The Orange Dot indicator system
- 7-day onboarding drip sequence
- Polite nudge copy map (10+ contextual touchpoints)
- Debate streaks tracking + notifications

**Doors IN from existing rooms:**
- ← All rooms (The Orange Dot appears everywhere)
- ← Settings (Room 6) via notification preferences

**Doors OUT to other rooms:**
- → Whatever the notification links to (debate, prediction, DM, tournament, etc.)

---

### NEW ROOM G: B2B DASHBOARD / API
*The money room. Data product for enterprise buyers.*

**Contains:**
- Reference database as data product
- Source Meta Report (weekly/monthly public stats)
- Topic-level access controls
- Real-time vs delayed feeds
- Custom dashboards per client
- API gating by tier
- Pre-selling data futures

**Doors IN from existing rooms:**
- ← Reference Library (NEW A) data feeds
- ← Profile Depth (Room 5) quarterly check-in data

**Doors OUT to other rooms:**
- → External only (API consumers, not user-facing)

---

### HOMELESS FEATURES (no obvious room — need placement)

These features don't fit cleanly into one room. They're cross-cutting utilities or external-only:

| Feature | Why it's homeless | Best guess placement |
|---------|------------------|---------------------|
| Reference betting / wagered debates (4 modes) | Hybrid: Arena + Marketplace + Staking | Marketplace (NEW C) as launch point → Arena (Room 1) for execution |
| Seasonal category boosts | Backend config, no dedicated UI | Admin-only, surfaces in Reference Library + Marketplace via badges |
| Opponent scouting report | Pre-debate utility, token-gated | Arena (Room 1) lobby expansion — "scout opponent" button |
| Reference trading / gifting | Social + economy hybrid | Marketplace (NEW C) with DM (NEW D) negotiation |
| Reference achievements (13+ types) | Cross-cutting progression | Notifications (NEW F) for alerts + Profile (Room 5/6) for display |
| Daily digest emails | Backend job, no in-app page | Notifications (NEW F) config + Settings (Room 6) toggle |
| Fantasy leagues | Needs community first, parked | Tournament (NEW E) extension when ready |
| Battle Pass / Season Pass | Needs community first, parked | Shop/Marketplace (NEW C) extension when ready |
| Written debate format | New content type, parked | Arena (Room 1) as new debate mode |
| Browser extension | External, needs 50+ users | Mirror / External (no chart) |
| Embeddable challenge links | External, needs organic users | Mirror / External (no chart) |
| Source Meta Report as marketing | External publication | B2B (NEW G) + Mirror / External |
| Mirror pages with live counts | VPS mirror generator update | Mirror / External (no chart) |
| More Debates section on mirror | Mirror page template update | Mirror / External (no chart) |

---

## THE FLOOR PLAN — DOOR MAP

```
                    ┌─────────────┐
                    │  HOME /     │
                    │  CAROUSEL   │◄────────────────────────────┐
                    │  (Room 1)   │                             │
                    └──┬──┬──┬──┬┘                             │
                       │  │  │  │                              │
          ┌────────────┘  │  │  └──────────────┐               │
          ▼               │  │                 ▼               │
   ┌──────────────┐       │  │          ┌──────────────┐       │
   │   ARENA /    │       │  │          │  PREDICTIONS │       │
   │ DEBATE ROOM  │◄──────┼──┼──────────│   (Room 3)   │       │
   │   (Room 1)   │       │  │          └──────┬───────┘       │
   └──┬──┬──┬──┬──┘       │  │                 │               │
      │  │  │  │          │  │                 ▼               │
      │  │  │  │          │  │     ┌───────────────────┐       │
      │  │  │  │          │  │     │  TOKEN STAKING    │       │
      │  │  │  └──────────┼──┼────►│     (NEW B)       │       │
      │  │  │             │  │     └───────────────────┘       │
      │  │  │             │  │                                 │
      │  │  └─────────────┼──┼─────────────┐                   │
      │  │                │  │             ▼                   │
      │  │                │  │   ┌──────────────────┐          │
      │  │                │  │   │   MARKETPLACE    │          │
      │  │                │  └──►│     (NEW C)      │◄────┐    │
      │  │                │      └────────┬─────────┘     │    │
      │  │                │               │               │    │
      │  │                │               ▼               │    │
      │  │                │     ┌──────────────────┐      │    │
      │  │                │     │   DM INBOX       │      │    │
      │  │                └────►│     (NEW D)      │      │    │
      │  │                      └──────────────────┘      │    │
      │  │                                                │    │
      │  ▼                                                │    │
   ┌──────────────────┐                                   │    │
   │ REFERENCE LIBRARY│◄──────────────────────────────────┘    │
   │     (NEW A)      │                                        │
   └──────┬───────────┘                                        │
          │                                                    │
          ▼                                                    │
   ┌──────────────┐      ┌──────────────┐     ┌────────────┐  │
   │ LEADERBOARD  │◄─────│   GROUPS     │────►│ TOURNAMENT │──┘
   │  (Room 2)    │      │  (Room 4)    │     │  (NEW E)   │
   └──────┬───────┘      └──────┬───────┘     └────────────┘
          │                     │
          ▼                     ▼
   ┌──────────────────────────────────────┐
   │     PROFILE / SETTINGS / ARSENAL     │
   │         (Rooms 5 + 6)                │
   └──────────────────┬───────────────────┘
                      │
                      ▼
              ┌───────────────┐     ┌─────────────┐
              │ NOTIFICATIONS │     │ B2B / API   │
              │    (NEW F)    │     │   (NEW G)   │
              └───────────────┘     └─────────────┘
```

---

## SUMMARY

| Category | Count |
|----------|-------|
| Existing rooms getting new furniture | 6 |
| New rooms to build | 7 (A through G) |
| Features placed in existing rooms | ~45 |
| Features placed in new rooms | ~35 |
| Homeless features (placed with best guess) | ~14 |
| Total doors between rooms | ~40+ bidirectional connections |

The Reference Library (NEW A) is the most connected new room — it has doors to/from Arena, Leaderboard, Groups, Profile, and Marketplace. It's the spine of the reference economy. If you build one new room first, that's the one that unlocks the most other rooms.

The Token Staking (NEW B) is the highest-impact missing feature per the Ideas Master Map — "the single biggest missing feature in the app."

The DM Inbox (NEW D) is the social glue — post-debate energy, marketplace negotiation, and challenge setups all route through it.

The B2B Dashboard (NEW G) and Notifications Hub (NEW F) are backend-heavy rooms that don't need charts the same way — they're infrastructure, not user-facing navigation flows.

---

*This document maps the Ideas Master Map onto the existing edge map architecture. Nothing here is prioritized or scheduled. It's the blueprint showing where every room goes and which hallways connect them.*
