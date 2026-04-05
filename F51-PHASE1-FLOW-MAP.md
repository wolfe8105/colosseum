# F-51 PHASE 1 FLOW MAP — Text-Only Moderated Live Debate

## CONTEXT
F-51 is "Live Moderated Debate Feed" — THE core product feature. It replaces the existing Live Audio mode with a fully moderated, turn-based debate with a unified feed. Full spec is in `LIVE-DEBATE-FEED-SPEC.md` in the repo.

Phase 1 is text-only (no audio, no Deepgram, no ads, no live scoring, no references). Just the turn-taking state machine, the feed UI, and basic debater/moderator controls.

## EXISTING FOUNDATION (already in Supabase, already works)
- `debate_feed_events` table with broadcast trigger (8 event types)
- `insert_feed_event` RPC — writes events to the feed
- `get_feed_events` RPC — backfill on reconnect / replay
- `score_debate_comment` RPC — moderator scoring (Phase 2, not this phase)
- `pin_feed_event` RPC — moderator pin (Phase 2, not this phase)
- Matchmaking, mod queue, WebRTC (exists but not used in Phase 1)
- All CSS uses `var(--mod-*)` design tokens defined in `lcars-shell.css`

## FILES TO MODIFY

### 1. `src/arena/arena-types.ts`
- Change MODES.live display: icon → `⚔️`, name → `'MODERATED LIVE'`, desc → `'Turn-based moderated debate. 4 rounds.'`
- Add to DebateMode if needed (keeping 'live' as the internal value is fine)
- Add feed room types/interfaces as needed

### 2. `src/arena/arena-feed-room.ts` — NEW FILE
The core of Phase 1. Contains:

**State machine:**
```
enterFeedRoom(debate)
  → Round 1
    → Speaker A turn (2 min timer, B frozen)
      → [A types / hits Finish Round / timer expires]
    → 10s pause ("Speaker B in 8... 7...")
    → Speaker B turn (2 min timer, A frozen)
      → [B types / hits Finish Round / timer expires]
  → Round 2 (B starts this time)
    → Speaker B turn → pause → Speaker A turn
  → Round 3 (A starts) → Round 4 (B starts)
  → endCurrentDebate()
```

**Turn structure:**
- 4 rounds total
- Each round: Speaker → 10s pause → Other Speaker
- Alternating who starts: R1=A, R2=B, R3=A, R4=B
- 2 minutes per turn, hard cutoff
- "Finish Round" button ends YOUR turn only (not the round)

**Feed UI:**
- Scrolling div, manual scroll (NOT auto-scroll)
- Event types rendered (Phase 1 only): `speech` (color-coded by side), `round_divider`
- Debater messages: color-coded (A = one color, B = another, mod = third)
- Round dividers: "--- Round 2 ---" style markers

**Debater controls (bottom of screen, thumb zone):**
- Text input: active when it's your turn, grayed/disabled when frozen
- "FINISH ROUND" button: visible entire turn, only works during your turn
- Character display showing whose turn it is

**Moderator controls:**
- Text input: always active, moderator can comment anytime
- No scoring UI yet (Phase 2)

**Timer display:**
- One shared timer showing whose turn and time remaining
- Round number displayed
- 10s countdown during pause between turns

**Data flow:**
- Debater types → `insert_feed_event(p_debate_id, p_event_type='speech', p_round=N, p_side='a'|'b', p_content=text)`
- Moderator types → `insert_feed_event(p_debate_id, p_event_type='speech', p_round=N, p_side='mod', p_content=text)`
- Round boundary → `insert_feed_event(p_debate_id, p_event_type='round_divider', p_round=N)`

**Realtime subscription:**
- On room entry: subscribe to Supabase Realtime channel for `debate_feed_events` INSERT
- New events append to feed for all roles
- On disconnect: reconnect + `get_feed_events` backfill

### 3. `src/arena/arena-room-setup.ts`
- In `enterRoom()`: when `debate.mode === 'live'`, call `enterFeedRoom(debate)` instead of existing room setup
- Remove/skip `startLiveRoundTimer()` and `initLiveAudio()` calls for mode='live' (those are the old behavior)
- Keep all the pre-debate, power-up, reference, mod assignment code as-is

### 4. `src/arena/arena-room-end.ts`
- Feed room cleanup: unsubscribe from Realtime channel, clear turn timer
- Rest of endCurrentDebate() stays the same

### 5. CSS
- Add feed room styles to `src/arena/arena-css.ts` (that's where all arena CSS lives)
- Classes needed: `.feed-room`, `.feed-stream`, `.feed-event`, `.feed-event-speech`, `.feed-event-divider`, `.feed-input-area`, `.feed-input-frozen`, `.feed-timer`, `.feed-turn-indicator`, `.feed-finish-btn`
- Use existing `var(--mod-*)` tokens for all colors
- Side A color, Side B color, Mod color — pick from existing token palette

## WHAT PHASE 1 DOES NOT INCLUDE
- No audio (Phase 4)
- No live scoring by moderator (Phase 2)
- No reference citations (Phase 3)
- No ad breaks (Phase 5)
- No spectator voting/sentiment (Phase 5)
- No sounds/haptics (Phase 5)
- No concede button (Phase 5)
- No disconnect handling (Phase 5)
- Winner: draw by default (no scoring mechanism yet)

## BRANCH POINTS / FAILURE MODES
- `insert_feed_event` fails → show toast, let user retry. Non-fatal.
- Realtime subscription drops → reconnect + `get_feed_events` backfill
- Timer is client-side only. Each client runs its own. Acceptable for Phase 1.
- Moderator not present → gate at mode selection (existing mod queue system handles this)
- Debater disconnects → timer runs out, turns continue. No special handling in Phase 1.

## BUILD RULES
- All repo JS/TS files and bot-config.js are in repo ROOT or src/, not subfolders beyond what exists
- VPS path is /opt/colosseum/bot-army/colosseum-bot-army/ — not relevant for this work
- Zero new TypeScript errors allowed (run `npx tsc --noEmit` — ignore pre-existing bot-engine.ts errors)
- Vite build must pass (`npx vite build`)
- All existing tests must still pass (`npx vitest run` — 69/69)
- Use `safeRpc` from `../auth.ts` for all RPC calls
- Use `escapeHTML` from `../config.ts` for all user content
- Use `var(--mod-*)` CSS tokens, never hardcoded colors
- Import patterns: follow existing arena module patterns (see arena-room-live.ts, arena-room-setup.ts)
