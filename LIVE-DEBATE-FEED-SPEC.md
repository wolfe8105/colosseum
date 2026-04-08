# THE MODERATOR — LIVE MODERATED DEBATE FEED SPEC
### Complete Design Specification — 77 Questions Answered
### Created: Session 175 (March 26, 2026)
### Updated: Session 246 (April 8, 2026) — Section 4.2 event type 3 rewritten for inline point-award format; Section 6 gains §6.6 Modifier Math; Section 9 power-ups fully replaced by pointer to F-57 Modifier & Power-Up System

> **What this is:** The buildable spec for the live moderated debate feed system.
> Every design decision in this document was explicitly answered by Pat across
> two questionnaire sessions (77 questions total). Nothing is assumed.
>
> **Reference screenshots:** MyFreeCams + Chaturbate chat interfaces.
> Layout pattern: scoreboard/names/timer at top, unified color-coded feed in center,
> role-specific action buttons in thumb zone at bottom.

---

# 1. MODE STRUCTURE

- This is a **replacement for Live Audio**. Live Audio no longer exists as a separate mode.
- Mode list is now: **Moderated Live Debate, Voice Memo, Text Battle, AI Sparring**
- Every Moderated Live Debate requires a moderator. No unmoderated live debates.
- AI Sparring is always unmoderated.
- Voice Memo and Text Battle remain unchanged.

---

# 2. DEBATE CREATION & MATCHING

## 2.1 Creating a Debate
- Debate creator picks: topic (140 character limit), category (required, "General" is an option), and Pro or Con side.
- Topic is locked once posted. Cannot be edited.
- The opponent gets whichever side is left.
- Creator is the anchor — if creator drops at any point, the debate is destroyed and everyone returns to their lobby. This applies to both public and private lobbies (F-46).

## 2.2 Browse List
- Default sort: **Elo proximity** (closest to your rating first).
- Sort toggles: "Best match" (Elo proximity) / "Newest" / "Most spectators waiting"
- Filters: Category dropdown (including "All" and "General"), Elo range slider or brackets ("Within 100 Elo" / "Within 200" / "Any"), Side filter ("Pro side open" / "Con side open" / "Either")
- Each listing shows: Topic (140 chars), Category, Creator's username, Pro or Con label showing which side is open, Creator's Elo/tier, Creator's win-loss record, Number of references loaded (not which ones), Spectator count if anyone is waiting.

## 2.3 Matching
- Three ways a debate starts (carried forward from existing system): debater creates + waits, debater requests specific people by username, moderator creates + waits for two debaters.
- Opponent sees topic and available side **before** accepting.
- Moderator matching: all-call broadcast, 30-second accept window, FOR UPDATE SKIP LOCKED, repeat every 2 minutes until claimed.

## 2.4 Pre-Debate Lobby
- 30-second countdown lobby once all three people are in (two debaters + moderator).
- Shows: both debater names, Elo, avatars, moderator name, topic, Pro/Con labels, countdown.
- No interaction (no emotes, no chat). Keep it simple.
- Any of the three people can back out during the lobby — this is the last chance.
- If the creator is still there and someone else drops, the debate sits in the same lobby waiting for a replacement. If the creator drops, debate is destroyed.
- Code should be written to accommodate avatar animation replacing the countdown in the future.

---

# 3. DEBATE STRUCTURE

## 3.1 Rounds
- **4 rounds.** Alternating who starts:
  - Round 1: A speaks (2 min) → 10s pause → B speaks (2 min)
  - Round 2: B speaks (2 min) → 10s pause → A speaks (2 min)
  - Round 3: A speaks (2 min) → 10s pause → B speaks (2 min)
  - Round 4: B speaks (2 min) → 10s pause → A speaks (2 min)
- Total duration: ~22-23 minutes (16 min speaking + 3×60s ad breaks + 10s pauses + final 30s ad).

## 3.2 Turn-Taking
- **One person speaks at a time. The other is totally frozen — cannot talk or type.**
- This is a core selling point: "the place where the other person has to shut up and listen."
- B2B value: clean, separated, attributable data per speaker with no crosstalk.
- When not your turn: input area is **grayed out**.
- When your turn is over: you can still scroll the feed and click on references to view details.
- Timer: **one shared timer** showing whose turn it is and how much time remains. Round number displayed below it.

## 3.3 Turn Mechanics
- Each debater gets **2 minutes per turn**.
- If timer hits zero mid-sentence: **hard cutoff**. Debater is totally frozen. Transcript stops at that moment.
- "Finish Round" button: visible the entire 2 minutes. Ends **your turn only** (not the entire round). Purely strategic — no penalty or stigma.
- 10-second pause between turns: shows "Debater B's turn in 8... 7... 6..."

## 3.4 Input Methods
- Debaters can **talk or type** during their turn. Can mix both within the same turn.
- If typing: "Debater A is typing..." indicator shows (if easy to implement, otherwise silence).
- Typed text and transcribed speech appear **identically** in the feed — no visual distinction.
- If debater types instead of talks, the other side hears silence.

---

# 4. THE FEED

## 4.1 Layout (Chaturbate/MyFreeCams Pattern)
- **Top:** Debater usernames with assigned colors, Pro/Con indicators, shared timer with round number, scoreboard with running point totals, topic displayed the entire time, spectator count ("13,122 people watching").
- **Center:** The unified feed. All event types in one scrolling stream, visually distinct by type.
- **Bottom:** Role-specific action buttons in thumb zone.
- Feed scrolls **manually** (not auto-scroll). Easier during a debate to roll back quickly.
- Sentiment gauge: wherever it fits. Fun, not primary.

## 4.2 Event Types in the Feed
Five types of events, all inline:

1. **Transcribed speech / typed messages** — color-coded by debater, username attached.
2. **Reference citations** — clickable inline links (140-char claim statement). When clicked, popup shows reference details (claim statement, source URL, who submitted it, verification status). Moderator ruling text about a reference appears as its own separate entry in the feed.
3. **Point awards** — rendered inline on the same line as the scored comment, in the format `[username]: comment text. +N pts` when no modifier is active, or `[username]: comment text. +N × M = T pts` when an in-debate modifier is active. The `×` and `=` are literal; the modifier is hidden entirely when it equals 1.0. Stacked modifiers present as a single combined multiplier. Negative results floor at zero. Running scoreboard totals reflect the modified number. End-of-debate modifiers do NOT render inline — they apply at the final score screen as an "after effects" breakdown. See F-57 for the full modifier system. Fireworks animation dropped in this format (reserve for winner celebration only).
4. **Moderator actions** — scoring, rulings on challenged references. Moderator comments in a **different color** from both debaters.
5. **Round dividers** — simple "--- Round 2 ---" markers.
6. **Power-up alerts** — "powerup: 2x Multiplier activated by Debater A" (text in the feed).

## 4.3 Three Role Overlays
Same feed, different controls available:

**Debater overlay:**
- Cite Reference button → dropdown of their 3-5 pre-loaded references. Tap one → clickable link appears in feed → that reference grays out permanently in dropdown.
- Challenge Reference button → dropdown of **opponent's** references only. Select one to challenge.
- Finish Round button (visible entire turn, only active during your turn).
- Concede button (appears after Round 1). Concede = loss for you, win for opponent. Always. Instant, no moderator confirmation needed.
- Power-up activation buttons.

**Moderator overlay:**
- Tap any comment in feed → inline 1-2-3-4-5 button row appears. Tap a number → score assigned, scoreboard updates, fireworks. Two taps total. No confirmation dialog.
- Pin button for comments (fallback for when moderator wasn't fast enough — score pinned comments during ad break).
- Reference ruling box (accept/reject buttons + 100-word text box). Only for reference challenges.
- Can comment in the feed at any time, in their own color.
- Can eject a debater (makes the match null).
- Can null the debate if both debaters aren't taking it seriously (clean null, no consequences for anyone).

**Spectator overlay:**
- Vote A / Vote B buttons (grayed out until ad break starts).
- That's it.

---

# 5. REFERENCE SYSTEM

## 5.1 Pre-Debate Loadout
- Debaters load references from their Arsenal before the match.
- **Maximum 5 references** per debate. Hard limit.
- Opponent does **not** see what references were loaded.
- Each reference has a **claim statement** (140 characters) that describes what the source proves. Format enforced: "What does this source prove? Write it as a single statement."

## 5.2 Citing During Debate
- Tap "Cite" button → dropdown shows 3-5 loaded references → tap one → clickable link appears in feed instantly → that reference grays out permanently. **One and done** — cannot reuse a reference.
- Clock keeps running during citation. No pause.
- Cool sound effect when a reference is dropped.

## 5.3 Reference Challenges
- Debater taps "Challenge Reference" → dropdown shows **opponent's references only** → selects one.
- Debate **auto-pauses** when challenge is filed.
- Avatar fighting animation plays (loops the same 30-second sequence).
- Audio stays live — debaters/spectators can still hear ambient sound during animation.
- Moderator has up to **60 seconds** to rule: accept or reject, with optional 100-word explanation.
- If moderator doesn't rule in 60 seconds: **auto-accepts**, no points awarded, debate continues.
- Challenges are low-stakes: no punishment for challenging, no punishment for getting challenged. Worst case the reference doesn't earn points and debate moves on.

## 5.4 Shield Power-Up Interaction
- If a debater has Shield equipped and their reference is challenged, Shield absorbs the challenge. No avatar animation, no moderator ruling needed. Clean block.

---

# 6. SCORING

## 6.1 Live Scoring (Primary Workflow)
- Moderator scores comments **live during the debate** — not just during ad breaks.
- Tap any comment → 1-2-3-4-5 button row appears inline → tap a number → done.
- Scoreboard updates instantly. Tiny fireworks animation.
- Two taps total: comment + score. No confirmation dialog, no text box for live scores.
- **No undo.** Once scored, it stays.
- Moderator can score comments from **both debaters**, can scroll back to earlier comments.

## 6.2 Pin-Then-Score (Fallback)
- During rounds: moderator can tap comments to **pin** them. One tap, unlimited pins.
- During 60-second ad breaks: moderator works through pinned comments, assigns scores.
- Pinning is **invisible** to everyone except the moderator. Prevents debaters from changing behavior.
- During ad breaks: moderator gets a **clean scoring interface** (debaters and spectators see the ad).

## 6.3 Scoring Budget
- Budget **exists** — limited number of scoring actions per round.
- **Exact number parked** until token economy is designed.
- Makes being a moderator strategic: "is this comment worth burning my 5 on?"
- Spectators do **not** see how many scoring actions the moderator has left.

## 6.4 Winner Determination
- **Purely moderator's point total.** Whoever has more points wins.
- Spectator sentiment does not factor into the winner. If spectators disagree, they disagree.
- If you want to know what sentiment was, you should have watched it live.

## 6.5 Moderator Gets Scored
- Post-debate, 100-point rating: 50 from debaters (25 each, thumbs up/down) + 50 from spectators (1-50 scale, averaged).
- Written to `moderator_scores` table via `score_moderator` RPC. **Already exists in code.**
- Feeds `mod_rating` and `mod_approval_pct` for the mod picker.

## 6.6 Modifier Math (added S246)

- The mod's raw 1-5 tap is the **base score**. Modifiers apply on top of base, automatically, server-side.
- **In-debate modifiers** (F-57 effects 31-59) apply per scored comment. Formula: `final_contribution = base × (1 + sum(in_debate_multipliers)) + sum(in_debate_flats)`. Negatives subtract. Result floors at zero per comment.
- **End-of-debate modifiers** (F-57 effects 1-30) apply once at the final score screen. Formula: `final_score = running_total × (1 + sum(end_of_debate_multipliers)) + sum(end_of_debate_flats)`. Applied per debater. Floors at zero.
- In-debate and end-of-debate modifiers compound naturally when both are active (a 25% inline bonus followed by a 25% end-of-debate bonus produces a compound 56.25% effect on that comment's contribution — intended).
- Mod never picks a modifier manually — modifiers are applied automatically from active power-ups and socketed reference modifiers on the awarded debater. Mod flow stays two taps: tap comment → tap 1-5.
- Inline display format (section 4.2 event type 3): `+N pts` when combined modifier = 1.0, `+N × M = T pts` otherwise. Server returns `base_score`, `modifier`, `final_contribution` per point-award event; client composes the line.
- Feed archive (section 14) stores three columns per point-award event: `base_score`, `in_debate_modifier`, `final_contribution`. End-of-debate modifier adjustments stored as separate columns on the debate row. Full B2B visibility into the scoring chain.

---

# 7. SPECTATOR SENTIMENT GAUGE

- DB meter visual: half one color, half another.
- **Live and cumulative** across the whole debate (like DB scales during an NFL game).
- Spectators vote during ad breaks (once per break) and at the end. Buttons grayed out until ad starts.
- Voting is more for fun than anything, but a small token bonus if sentiment lands on your side (requires 10+ spectators).
- **Updates when the next round starts** — not during the ad break. This keeps spectators watching through the ads.
- Animate from previous position to new position if easy. Not required.
- At the end: vote gate — "Cast your final vote to see the final score and final sentiment score." Must vote to see results live. Can see results in archive later without voting.

---

# 8. AD BREAKS

- **60-second ad break** between each round (3 total between 4 rounds).
- **30-second final ad break** after the last turn and before the vote gate. Highest-value slot — maximum anticipation.
- Ads via **Google AdSense**. Whatever Google wants to do regarding same/different ads per role.
- Feed is **hidden behind the ad** for debaters and spectators.
- Moderator gets a **clean scoring interface** during ads — no ad for them.

---

# 9. POWER-UPS IN MODERATED MODE

**Power-up system is fully specified in F-57 (see `THE-MODERATOR-FEATURE-SPECS-PENDING.md`).** F-57 replaces this section's prior 3-power-up list (2x Multiplier, Shield, Reveal). Summary of what F-51 needs to know:

- Debaters bring up to **3 power-ups per debate**, selected at pre-debate loadout. Consumed at debate start, never refunded.
- Power-ups are one-shot versions of the same 59 effects available as permanent modifiers socketed into references (F-55 rarity tier determines socket count: Common 1 → Mythic 5).
- Effects split into **end-of-debate** (30 effects, apply at final score screen as "after effects" breakdown) and **in-debate** (29 effects, apply inline during the debate on individual mod-awarded comment scores).
- In-debate effects show in the feed via the modified score line (section 4.2 event type 3). End-of-debate effects show only at the post-match results screen.
- The moderator sees all power-up activations in the feed as text alerts but **cannot score their strategic use** — power-ups are outside the scoring system itself.
- 2x Multiplier's legacy "doubles staking payout on win" behavior is preserved as a standalone F-09 staking rule, not as an in-debate effect. Shield's "blocks a reference challenge" behavior is preserved as F-57 effect #13 "Citation shield."

All modifier and power-up application happens server-side in `score_debate_comment` and an end-of-debate finalization RPC. Clients render what the server returns.

---

# 10. SPEECH-TO-TEXT (DEEPGRAM)

## 10.1 Provider
- **Deepgram.** Best quality, don't worry about price. Keystone feature — must work 100% of the time.

## 10.2 Three-Tier Fallback
1. **Auto-reconnect (invisible).** WebSocket drops are common. Buffer audio, reconnect, send buffered audio for delayed transcription. Users never know.
2. **If reconnect fails within 5 seconds:** "Live transcription paused" indicator in feed. Audio still works. Typed messages still appear. Scoring still works.
3. **If transcription down for entire turn (2 minutes):** Debate is still valid. Archive has a gap: "Transcription unavailable for this segment."

**The debate never pauses or stops because of transcription failure.** Audio is the primary product. Transcript is the enhancement.

---

# 11. TRANSLATION

- Language is determined by the **debate creator's profile setting**.
- Whatever the creator has listed as their language, that's what the feed transcribes to.
- If Debater B types in German, the system **translates their text** into the creator's language before it hits the feed.
- If Debater B speaks German: **everyone hears German audio.** The text on screen is in the creator's language. You hear someone speak German while reading the English translation.
- Language setting is also a **hidden data point for B2B customers**.
- No live audio translation. That's acceptable for now.

---

# 12. DISCONNECTS & PENALTIES

## 12.1 Debater Disconnect
- If you disconnect and you're **winning**: debate is nulled. No result recorded.
- If you disconnect and you're **losing**: counts as a loss for you, win for the opponent.
- Check score at moment of disconnect. One conditional check.

## 12.2 Debater Concede
- Concede button appears **after Round 1**.
- Concede = **always a loss** regardless of score. Instant, no moderator confirmation.
- After concede: still a final ad break + vote gate (make some money).

## 12.3 Moderator Dropout
- Debate is **nulled entirely**. Nobody gets a win or loss. Everyone returns to lobby and starts completely over.
- Moderator gets a penalty:

| Offense (same day) | Score | Cooldown |
|---|---|---|
| 1st dropout | 0/100 | 10 minutes |
| 2nd dropout | 0/100 | 1 hour |
| 3rd dropout | 0/100 | 24 hours |

- Resets daily. No permanent flag stripping.

## 12.4 Moderator Actions
- Moderator can **eject a debater** — makes the match null.
- Moderator can **null the debate** if both debaters aren't taking it seriously. Clean null, no consequences for anyone.
- No exploit safeguard for now. Accept the risk.

## 12.5 Escape Hatches (Every Human Action Point)
- Debater doesn't vote on moderator post-debate: auto-null their 25 points.
- Spectators don't vote at vote gate: 30-second timer, results show regardless.
- Moderator doesn't score any comments during ad break: round proceeds, no points that round.
- Moderator doesn't rule on reference challenge within 60 seconds: auto-accepts, no points.
- Debater doesn't do anything during their 2 minutes: clock runs out, turn switches.

---

# 13. POST-DEBATE FLOW

1. Debater B's final turn ends.
2. **30-second final ad break** (highest-value slot — maximum anticipation).
3. **Vote gate:** "Cast your final vote to see the final score and the final sentiment score." Spectators must vote to see results live.
4. **Winner announcement** with big celebration (sound, animation, fun).
5. Tokens awarded immediately to winner. Loser tokens: parked until token economy designed.
6. Moderator gets rated (existing system — thumbs up/down from debaters, 1-50 from spectators).
7. Feed becomes **read-only archive**.

---

# 14. ARCHIVE

- Feed saves as a **new table** — individual rows per event. This is the B2B bread and butter.
- Each row: debate ID, event type (speech, reference_cite, reference_challenge, point_award, mod_ruling, round_divider, sentiment_vote, power_up), timestamp, round number, which debater, content, associated score, associated reference ID.
- Archive is **text-only** (transcript + scores + references). No audio replay.
- Searchable/filterable by: debater names, category, keywords in debate title, references by keywords. Purely search — no "featured" or "trending."
- Preview card shows: topic (140 chars), category icon, both debater usernames with Pro/Con labels, final score, winner indicator, spectator count at time of debate, date.
- Reference popup: when clicking a reference in the archive, shows reference details (claim statement, source URL, who submitted it, verification status).
- **Raw archives: nobody gets the raw. Ever.** Pat's key only. B2B buyers get aggregated analysis, filtered views, trend reports.

---

# 15. SOUNDS

**Use sound for (7-8 distinct sounds, each under 1.5 seconds):**
1. Round start — short horn/bell.
2. Turn switch — distinct tone.
3. Points awarded — "cha-ching" or impact sound. Paired with micro-fireworks.
4. Reference dropped — "weapon equipped" type sound.
5. Reference challenge filed — warning/alert tone.
6. Timer warning — subtle ticking at 15 seconds remaining.
7. Debate end / winner announced — full celebration.

**Do NOT use sound for:** every chat line, spectator votes, scrolling, moderator pinning, ad transitions.

**Haptics:** vibration on points awarded and reference drops only. Master toggle in settings.

---

# 16. DEBATER BLOCKING

- A debater can request via email to have someone blocked from ever matching with them again.
- Goes to the support account (Pat checking a different email).
- Separate from the existing Hated Rivals system.

---

# 17. MODE GATING

- No minimum tier, Elo, or profile completion required. Open to everyone.
- One moderator per debate. Cannot run multiple debates simultaneously.

---

# 18. RULES DISPLAY

- A how-to guide will be created at the end of the project explaining turn structure, reference system, and scoring.
- Not an in-app feature right now.

---

# 19. EXISTING FOUNDATION PIECES

These already exist and feed into this system:

- `browse_mod_queue()`, `request_to_moderate()` RPCs (F-47 Steps 5-6)
- `score_moderator` RPC + `moderator_scores` table
- `bump_spectator_count` RPC
- Reference Arsenal: forge form, `arsenal_references` table, verification system
- Matchmaking: `join_debate_queue()`, category picker, accept/decline screen
- Pre-debate screen: `showPreDebate()` for staking/loadout
- WebRTC audio: `src/webrtc.ts`

## 19.1 Foundation Items That Need Rework
- **Moderator scoring** — existing `score_moderator` RPC was built for post-debate only. Live scoring (two-tap inline) is a different workflow.
- **Turn-taking** — existing WebRTC allows simultaneous audio. Needs enforcement of one-speaker-at-a-time.
- **Moderator dropout penalties** — new schema needed (escalation tracking).
- **Feed data table** — new table, individual rows per event type.

---

# 20. DEPENDENCIES (PARKED)

These items are explicitly parked until the token economy is designed:
- Scoring budget per round (exact number)
- Sentiment bonus token amount
- Winner/loser token awards
- Reference loadout size decisions beyond "max 5"
- Staking integration

---

# 21. WHAT THIS SPEC DOES NOT COVER

- Pixel-level screen layout and element placement (Pat will decide later based on reference screenshots)
- Sound file selection / creation
- Animation design for fireworks, reference challenge avatars, winner celebration
- Deepgram API integration details
- Google AdSense integration details
- Translation service selection
- The how-to guide content

---

*This document compiles 77 design questions answered across Sessions 174-175. Every decision was made by Pat. Nothing is assumed or inferred.*
*Next step: code.*
