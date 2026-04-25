# Integrator Seams — The Moderator
# 623 seams ranked by risk score. Work top to bottom.
# Format: [rank] [status] Module A → Module B — what crosses

## Rank 001–010: Core rendering + auth chain (highest risk)

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 001 | ✅ DONE | `feed-card` → `auth` + `badge` + `bounties.dot` | `getCurrentUser()` ownership check; `vgBadge()` verified badge; `bountyDot()` active bounty dot — all land in rendered HTML |
| 002 | ⬜ TODO | `home.feed` → `feed-card` | `renderFeedCard()` called with RPC data; result inserted into DOM |
| 003 | ⬜ TODO | `home.overlay` → `feed-card` | Overlay renders open card; cancel/challenge buttons present for owner vs non-owner |
| 004 | ⬜ TODO | `groups.feed` → `feed-card` | Groups feed renders cards via `renderFeedCard()`; empty state on no data |
| 005 | ⬜ TODO | `tokens.claims` → `tokens.balance` → `auth.core` | Daily claim fires `get_token_balance` RPC; balance rendered in DOM |
| 006 | ⬜ TODO | `notifications.panel` → `notifications.actions` → `notifications.state` | Panel renders unread badge; mark-read fires RPC; badge clears |
| 007 | ⬜ TODO | `staking.rpc` → `depth-gate` → `auth` | Staking blocked when depth gate requires auth; RPC only fires when authed |
| 008 | ⬜ TODO | `rivals-presence` → `rivals-presence-channel` → `async` | Presence channel wired through async rivals state |
| 009 | ⬜ TODO | `share` → `auth` + `navigation` | Share fires RPC with user ID; navigation.call invoked on success |
| 010 | ⬜ TODO | `onboarding-drip` → `auth` + `rpc-schemas` | Drip fires correct RPCs; auth-gated actions blocked for guests |

## Rank 011–020: Arena config + queue chain

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 011 | ⬜ TODO | `arena-config-mode-select` → `arena-config-category` → `arena-state` | Mode selection mutates state; category picker reflects it |
| 012 | ⬜ TODO | `arena-queue` → `arena-match-found` → `arena-room-enter` | Queue join → match found → enter room transition |
| 013 | ⬜ TODO | `arena-match-flow` → `arena-match-found` + `arena-match-timers` | Timer fires → match flow progresses |
| 014 | ⬜ TODO | `arena-private-picker` → `arena-private-lobby` → `arena-match-found` | Private lobby creation → match found fires |
| 015 | ⬜ TODO | `arena-mod-queue-browse` → `arena-mod-debate-picker` → `arena-mod-debate-waiting` | Mod browses queue → picks debate → waiting state |
| 016 | ⬜ TODO | `arena-room-end-finalize` → `tokens` + `staking` + `reference-arsenal` | End-of-debate settlement calls token/staking/reference RPCs |
| 017 | ⬜ TODO | `arena-room-end-render` → `arena-mod-scoring` + `arena-room-ai-scoring` | Score rendering pulls from both scoring modules |
| 018 | ⬜ TODO | `arena-pending-challenges` → `arena-match-found` → `arena-room-enter` | Challenge accepted → match found → room enter |
| 019 | ⬜ TODO | `arena-feed-wiring` → `arena-feed-wiring-debater` + `arena-feed-wiring-mod` + `arena-feed-wiring-spectator` | Wiring orchestrator delegates to role-specific wiring |
| 020 | ⬜ TODO | `arena-lobby` → `arena-lobby.open-debates` + `arena-mod-queue-browse` | Lobby loads open debates + mod queue |

## Rank 021–040: Profile, settings, groups

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 021 | ⬜ TODO | `auth.profile` → `auth.core` + `auth.follows` + `auth.rivals` + `badge` + `bounties` | Full profile load chain |
| 022 | ⬜ TODO | `profile-depth.section` → `profile-depth.render` + `profile-depth.tier` + `tokens` | Section renders tier and token state |
| 023 | ⬜ TODO | `settings.load` → `settings.helpers` | Settings loaded into form fields |
| 024 | ⬜ TODO | `settings.save` → `auth` + `settings.helpers` | Save calls RPC; form state updated |
| 025 | ⬜ TODO | `groups.detail` → `groups.feed` + `groups.members` + `groups.challenges` + `groups.auditions` | Detail page loads all sub-sections |
| 026 | ⬜ TODO | `groups.load` → `groups.state` | Load populates state; downstream renders correctly |
| 027 | ⬜ TODO | `groups.challenges` → `auth` + `rpc-schemas` | Challenge submission fires validated RPC |
| 028 | ⬜ TODO | `groups.members` → `groups.members.modal` → `groups.state` | Modal opens; member data from state |
| 029 | ⬜ TODO | `home.nav` → `home.feed` + `home.profile` + `home.invite` + `home.arsenal` | Nav wires all home sub-sections |
| 030 | ⬜ TODO | `home.profile` → `auth` | Profile header renders with auth state |

## Rank 031–050: Token economy + payments

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 031 | ⬜ TODO | `tokens.balance` → `auth.core` | Balance fetch calls RPC; returned value set in state |
| 032 | ⬜ TODO | `tokens.milestones` → `tokens.balance` + `tokens.animations` | Milestone check reads balance; fires animation on unlock |
| 033 | ⬜ TODO | `powerups.rpc` → `auth` + `tokens` | Powerup activation calls RPC; token cost deducted |
| 034 | ⬜ TODO | `powerups.loadout` → `powerups.rpc` + `tiers` | Loadout shows tier-gated powerups; activation fires RPC |
| 035 | ⬜ TODO | `paywall` → `auth` + `navigation` | Paywall blocks unauthenticated access; navigation fires on auth |
| 036 | ⬜ TODO | `payments` → `auth` + `dependency-clamps` | Payment initiation fires analytics event via clamp |
| 037 | ⬜ TODO | `staking.render` → `staking.rpc` + `tiers` | Render shows tier-appropriate staking options |
| 038 | ⬜ TODO | `staking.wire` → `staking.rpc` | Wire calls correct staking RPCs on button press |
| 039 | ⬜ TODO | `reference-arsenal.forge` → `reference-arsenal.forge-submit` + `reference-arsenal.forge-wiring` | Forge form submits via RPC |
| 040 | ⬜ TODO | `reference-arsenal.armory` → `reference-arsenal.armory.sheet` + `reference-arsenal.render` | Armory renders cards; sheet opens on selection |

## Rank 041–060: Spectate + leaderboard + DM

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 041 | ⬜ TODO | `spectate.chat` → `auth` + `depth-gate` + `rpc-schemas` | Chat blocked by depth gate; message fires validated RPC |
| 042 | ⬜ TODO | `spectate.vote` → `auth` + `tokens` + `rpc-schemas` | Vote fires RPC; token cost deducted |
| 043 | ⬜ TODO | `spectate.render` → `spectate.chat` + `spectate.vote` + `spectate.render-timeline` | Full spectate page render |
| 044 | ⬜ TODO | `leaderboard.render` → `leaderboard.list` + `leaderboard.state` | Leaderboard renders from state |
| 045 | ⬜ TODO | `leaderboard.list` → `leaderboard.fetch` + `badge` + `bounties` | List rows include badge/bounty data |
| 046 | ⬜ TODO | `dm.ts` → `dm.fetch` + `dm.render` | DM page loads messages; renders them |
| 047 | ⬜ TODO | `notifications.ts` → `notifications.panel` + `push-notifications` | Notifications init wires panel and push |
| 048 | ⬜ TODO | `rivals-presence` → `rivals-presence-popup` + `rivals-presence-channel` | Presence popup shown when rival online |
| 049 | ⬜ TODO | `async.actions-predict` → `async.fetch` + `async.render` + `tokens` | Predict action fetches, renders, deducts tokens |
| 050 | ⬜ TODO | `async.rivals` → `async.state` + `auth` | Rivals async state loaded from auth |

## Rank 051–100: Plinko + login + misc (lower risk, less interconnected)

(Remaining seams continue below — added as needed)

| Rank | Status | Seam | What crosses |
|------|--------|------|--------------|
| 051 | ⬜ TODO | `plinko.ts` → `plinko-step1-method` + `plinko-step2-age` + `plinko-step3-username` + `plinko-step4-step5` | Multi-step signup flow |
| 052 | ⬜ TODO | `plinko-auth-return` → `auth` + `plinko-helpers` | OAuth return updates state; helpers advance step |
| 053 | ⬜ TODO | `login.ts` → `login.forms` + `auth` | Login form submits credentials via auth |
| 054 | ⬜ TODO | `home.arsenal` → `reference-arsenal` + `home.arsenal-shop` | Arsenal section renders with shop |
| 055 | ⬜ TODO | `home.invite` → `home.invite-render` + `home.invite-sheet` + `auth` | Invite sheet opens; RPC fires with user ID |
| 056 | ⬜ TODO | `modifiers-catalog` → `auth` + `rpc-schemas` | Catalog fetch fires validated RPC |
| 057 | ⬜ TODO | `profile-debate-archive` → `profile-debate-archive.render` + `auth.rpc` | Archive loaded via safeRpc; rendered |
| 058 | ⬜ TODO | `scoring` → `auth` | Scoring fetch uses Supabase client from auth |
| 059 | ⬜ TODO | `search` → `auth` | Search fires RPC via auth client |
| 060 | ⬜ TODO | `tournaments` → `tournaments.indicator` + `auth` | Tournaments init loads indicator state |
