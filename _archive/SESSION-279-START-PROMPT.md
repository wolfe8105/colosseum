# The Moderator — Session 279
## Start Prompt: F-03 Entrance Sequences

Clone the repo, set the remote with the token from memory, read `SESSION-278-HANDOFF.md`. Then read `THE-MODERATOR-PUNCH-LIST.md` and `THE-MODERATOR-FEATURE-SPECS-PENDING.md` (F-03 section) to get current state.

Note: NT and Punch List in project knowledge may be stale. Load from repo files directly.

---

## Pat action before build starts

Run `supabase/session-278-f08-tournament-system.sql` in Supabase SQL Editor if not already done. Confirm "no rows returned" before any other work.

---

## Context on F-03

`src/arena/arena-entrance.ts` already exists — shipped S274 as part of the F-21 intro music session. It has:

- 3-tier animated entrance (Tier 1: fade, Tier 2: slide-in clash, Tier 3: full arena reveal with scanline + glow + W-L record)
- Wired into `enterRoom()` in `arena-room-setup.ts` via dynamic import
- `playEntranceSequence(debate)` is the public API
- Tier determined by win rate: 0-25% (or <5 debates) = T1, 26-50% = T2, 51%+ = T3

**What may be incomplete or needs review:**
- Read `arena-entrance.ts` in full before touching anything — understand what's actually there
- Check if opponent data (win rate, ELO) is being passed correctly into the sequence
- Check if group identity (banner, avatar, group name) surfaces anywhere — F-22 collapses into F-03
- Check if the entrance fires correctly for all debate modes (ranked, casual, private lobby, mod-initiated) — should NOT fire for F-51 live feed (already bypassed in arena-room-setup.ts)
- Check if F-08 tournament debates should have a special entrance treatment (gold/trophy theme)

**Build priorities in order:**
1. Audit what's actually working in the current entrance code
2. Fix any gaps in opponent data or tier calculation
3. Tournament entrance variant — when `debate.tournament_match_id` is set, add tournament-themed overlay (gold banner, prize pool, round name) to the existing tier animation
4. GvG entrance — when both debaters are in groups, surface group name + banner tier in the entrance (F-22 collapses here)
5. Any polish needed on existing tiers

**Do not re-architect** — `arena-entrance.ts` is the right home, `playEntranceSequence` is the right API. Build on top of what's there.
