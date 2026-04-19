# The Moderator — Session Handoff
## Session 275 | April 12, 2026

---

## What happened this session

2 features shipped.

---

## Commits this session

| Commit | What |
|---|---|
| `6cfa460` | F-28: Bounty Board |
| `946d97b` | F-28: idempotent SQL (DROP POLICY IF EXISTS guards) |
| `34c21fc` | F-29: Source Meta Report |
| (doc update) | NT + Punch List updated, S275 handoff |

---

## SQL run this session (all ✅ in Supabase)

| File | What |
|---|---|
| `session-275-f28-bounty-board.sql` | `bounties` + `bounty_attempts` tables, 8 RPCs, `_bounty_slot_limit`/`_expire_stale_bounties` helpers, rival-remove trigger, RLS |
| `session-275-f29-source-meta-report.sql` | `get_source_meta_report()` RPC, granted to anon + authenticated |

---

## Feature state

### F-28 Bounty Board ✅
Rivals-only token bounties. Posting gate: 25%→1 slot, 35%→2, 45%→3, 55%→4, 65%→5, 75%→6 (hard cap). Duration fee: 1 token/day, max 365 days. Cancel: 85% refund. Natural expiry: 0% refund. Trigger auto-cancels with zero refund if poster removes target from rivals. Pre-debate dropdown: select one bounty, 5% attempt fee locked immediately. Hunter win: face value − 5% platform cut, bounty claimed. Hunter loss: attempt fee burned, bounty stays open. Mod is blind.

**Client:** `src/bounties.ts` (all RPCs + `bountyDot()` + `loadBountyDotSet()` + `renderProfileBountySection()` + `renderMyBountiesSection()`), `src/arena/arena-bounty-claim.ts` (pre-debate dropdown UI), `arena-room-setup.ts` (bounty zone mounted in pre-debate, ranked + real-opponent gate), `auth.profile.ts` (bounty section in `showUserProfile` modal), `arena-room-end.ts` (`resolve_bounty_attempt` called post-debate).

**Deferred:** Gold dot callsites — `bountyDot(userId)` is exported and ready, needs to be dropped into: leaderboard username renders, feed card username renders, arena lobby opponent name, spectate username, scorecards, mod queue, comments, dialogue bubbles. Also `loadBountyDotSet()` needs one call on page load in `home.ts` init. And `renderMyBountiesSection()` needs wiring to own-profile view.

### F-29 Source Meta Report ✅
`get_source_meta_report()` — public RPC, no auth. 5 sections: top source per category (highest strikes, one per category), most persuasive (best win rate from `reference_royalty_log`, min 3 cites, top 10), most contested (most upheld challenges from `reference_challenges`, top 10), biggest Elo movers this week (summed `elo_change_a/b` from `arena_debates`, min 3 ranked debates, top 10), trending last 7 days (`reference_royalty_log.paid_at`, top 10). All sections return empty arrays gracefully when data is sparse — page works at zero data.

`moderator-source-report.html` — standalone public page. Supabase CDN. OG tags. Skeleton loaders. Category color badges, rarity badges, rank numbers. Footer CTA → arena. Registered in `vite.config.ts`.

Lives at `/moderator-source-report.html` on Vercel deploy.

---

## What's untested (full list)

- F-28 Bounty Board — post bounty, cancel bounty, pre-debate claim, resolve on win/loss
- F-36 Onboarding drip — walk all 7 days with new account
- F-26 Follow notifications — two accounts, follow + login
- F-21 Custom intro upload — 35%+ depth account + audio file
- F-19 Group banners — group needs 3+ GvGs to unlock Tier 2/3
- F-20 Shared Fate — group needs 3+ GvGs + profile depth
- F-39 Challenge links — two accounts, copy link, complete flow
- F-03 Entrance — debate history needed for Tier 2/3
- F-53 Profile Debate Archive — needs completed debates
- F-33 Verified Gladiator — needs 60%+ depth account
- F-51 Live Moderated Debate Feed — 2 debaters + 1 mod
- F-60 Saved Loadouts — needs real inventory
- F-54 Private Profile — two accounts
- F-55 Reference system — forge/cite/royalty flow
- F-10 Shop — buy modifier, verify inventory
- F-59 Invite flow — two accounts
- F-57 Effects — fire correctly post-debate
- F-58 Sentiment Tipping — tip + 50% refund verify
- F-25 Rival Alerts — two accounts, accepted rivals

---

## Codebase state

Build: Clean (verified S274, no new changes to TS source this session beyond edits confirmed at build-time).
Supabase: `faomczmipsccwbhpivmp`. ~285 live functions (est).
Circular deps: 37. main.js: ~422KB.

---

## Attack list

| Order | # | Feature | Status |
|---|---|---------|--------|
| 1–13 | various | F-60 through F-36 | ✅ S272–S274 |
| 14 | F-28 | Bounty Board | ✅ S275 |
| 15 | F-29 | Source Meta Report | ✅ S275 |
| 16 | F-43 | Google Ads in Structural Slots | ⏳ next |

---

## Deferred from this session (next session pick up)

1. **Gold dot callsites** — grep for all username-render points across leaderboard, feeds, lobby, spectate, scorecards, mod queue, comments, dialogue bubbles. Add `${bountyDot(userId)}` after every username. Also wire `loadBountyDotSet()` in `home.ts` init and `renderMyBountiesSection()` to own-profile view.
2. **F-43 Google Ads in Structural Slots** — next on attack list.

---

## What's next

**F-43 Google Ads in Structural Slots** — full spec in THE-MODERATOR-FEATURE-SPECS-PENDING.md.

---

## GitHub

Token: `[stored in project memory]`
Repo: `https://github.com/wolfe8105/colosseum.git`
Set remote: `git remote set-url origin https://<TOKEN>@github.com/wolfe8105/colosseum.git`
