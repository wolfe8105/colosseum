# THE MODERATOR — PRODUCT WALK-THROUGH
### Screen-by-Screen Change Log
### Started: Session 173

> **How to use this doc:** We walk through the live app screen by screen. Each screen gets its own section. Unfinished features that could affect that screen are listed. Decisions and notes are captured in real time. This becomes the build queue.

---

## SCREEN 1: Mode Select
*"Choose Your Weapon" — appears after selecting Casual or Ranked*

**Unfinished features that could affect this screen:**
- F-08 Tournament → adds a new mode button ("Tournament")
- F-33 Verified Gladiator badge → indicator on Live Audio row for Ranked
- F-03 Entrance sequence / battle animations → changes what happens after you tap, not the screen itself
- Reference card abilities (unlisted) → pre-match loadout step branches off this screen before queue entry

**Decisions / Notes:**
- ~~F-44 Stripe subscription tiers~~ → dropped. Platform is free. No locking or badging modes.

---

## SCREEN 2: Category Picker
*"Choose Your Arena" — appears after selecting a mode*

**Unfinished features that could affect this screen:**
- None identified beyond the merge below

**Decisions / Notes:**
- Merge `Film & TV` + `Music` → single tile
- New label: `Film · TV · Music` (middle dots, not ampersands)
- Icon TBD (🎬 or combined)
- Result: 5 tiles + "Any Category — Fastest Match" (down from 6 + Any)
- Research confirms 4–5 options is optimal for mobile category pickers (Hick's Law / NN Group)

---

## SCREEN 3: Queue / Waiting Room
*Appears after selecting a category. Shows timer, status, spectator feed.*

**Unfinished features that could affect this screen:**
- F-07 Spectator features → spectator feed at bottom already exists but is basic; full feature adds pulse, chat, live share while waiting
- F-35 Push notifications → if user closes app while queued, push notification fires when match found
- F-47 Moderator Marketplace → Orange Dot mod alert fires on this screen if mod gets a call while waiting
- F-08 Tournament → tournament queue needs bracket context (who you might face, round number)
- F-03 Entrance sequence / battle animations → triggers moment match is found, right before Match Found screen

**Decisions / Notes:**
- AI fallback prompt at 60s ✅ working
- 3-minute timeout ✅ working
- **BUG: Spectator feed not filtered by category.** User queued in Couples Court sees an AI/Politics debate card. Feed should only show live debates in the same category. If none exist in that category, fall back to general feed.

---

## OPEN QUESTIONS

| # | Question | Context |
|---|----------|---------|
| Q1 | How does "Any Category — Fastest Match" work server-side? Does `p_category: null` match against the full queue regardless of category, or just the largest pool? | `join_debate_queue` RPC body not in repo — lives in Supabase directly. Verify before any queue logic changes. |
| Q2 | Moderator alert mechanic — DECIDED. System sends all-call to all available mods simultaneously via Realtime/polling. Each alert has a 30-second accept window with countdown. First mod to tap "Accept" wins — `FOR UPDATE SKIP LOCKED` handles simultaneous taps. If nobody claims in 30 seconds, system waits 2 minutes and sends another all-call. Repeats until claimed or debate times out. Alert delivered via The Orange Dot on nav — visible on all screens including spectate. | F-47 — implement with `FOR UPDATE SKIP LOCKED`. Already noted in F-47 spec. |
