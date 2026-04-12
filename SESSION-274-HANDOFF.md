# The Moderator — Session Handoff
## Session 274 | April 12, 2026

---

## What happened this session

9 features shipped. Biggest session in the project to date.

---

## Commits this session

| Commit | What |
|---|---|
| `3ca385c` | F-35.3: Orange Dot Indicator |
| `63670c6` | F-39: Embeddable Challenge Links |
| `75c3d97` | F-21: Intro Music |
| `769e965` | F-03: Entrance Sequences |
| `dcd969b` | F-19: Three-Tier Group Banner Progression |
| `ca73bad` | F-20: Shared Fate Mechanic |
| `50e61cb` | F-26: Follow Notifications |
| `0dc98a0` | F-37: Granular Notification Preferences |
| `addd588` | F-36: 7-Day Onboarding Drip |
| `eec1ea0` | F-36: Fix cosmetic_items constraints |
| (post-build) | S274 handoff + agent handoff updated |

---

## SQL run this session (all ✅ in Supabase)

| File | What |
|---|---|
| `session-274-f21-intro-music.sql` | intro_music_id + custom_intro_url on profiles, save_intro_music RPC, get_public_profile rebuilt, intro-music storage bucket |
| `session-274-f19-group-banners.sql` | gvg_wins/losses + banner columns on groups, _group_banner_tier helper, resolve_group_challenge rebuilt, save_group_banner RPC, get_group_details rebuilt, group-banners storage bucket |
| `session-274-f20-shared-fate.sql` | shared_fate_pct on groups, _calc_shared_fate + refresh_shared_fate RPCs, resolve_group_challenge rebuilt (adds fate refresh), claim_debate_tokens rebuilt (fate bonus), get_group_details rebuilt |
| `session-274-f26-follow-notifications.sql` | notify_followers_online RPC (6h dedup, privacy_online gate), add_debate_to_archive rebuilt (follow_debate fan-out) |
| `session-274-f37-notif-prefs.sql` | notif_rivals + notif_economy on user_settings, save_user_settings rebuilt |
| `session-274-f36-onboarding-drip.sql` | onboarding_drip_log table, 7 cosmetic items seeded, get_onboarding_progress + complete_onboarding_day RPCs |

---

## Feature state

### F-35.3 Orange Dot Indicator ✅
Dot lights up: daily login unclaimed OR unread notifications > 0. Removed wrong hasFreezes signal. setOrangeDotUnread() exported — notifications.ts pushes count on every 30s poll and on logout.

### F-39 Embeddable Challenge Links ✅
moderator-challenge.html public landing page. Logged in → immediate redirect. Guest → sign up/log in CTAs pass ?challenge=CODE through localStorage. arena-core.ts consumes localStorage('mod_pending_challenge') on init.

### F-21 Intro Music ✅
10 synthesized tracks in arena-sounds.ts. playIntroMusic() fires on match found, stopIntroMusic() on room entry. src/intro-music.ts picker sheet with Tier 2 custom upload (35%+ depth gate, Supabase Storage). Settings row wired.

### F-03 Entrance Sequences ✅
src/arena/arena-entrance.ts — 3-tier animated reveal (2.4s). Tier 1: fade. Tier 2: slide-in clash. Tier 3: full arena reveal with scanline, glow, W-L record. enterRoom() split into entrance → _renderRoom(). Live mode bypasses.

### F-19 Three-Tier Group Banner Progression ✅
gvg_wins/losses + banner columns on groups. resolve_group_challenge auto-upgrades banner_tier (GREATEST). save_group_banner RPC (leader only, tier-gated). src/pages/group-banner.ts renders Tier 1 CSS / Tier 2 img / Tier 3 video. #detail-banner zone in groups HTML.

### F-20 Shared Fate Mechanic ✅
Formula: floor(avg_questions/100 × win_pct × 80), cap 80%, requires 3+ GvGs. shared_fate_pct on groups (permanent max). claim_debate_tokens applies best fate % as token bonus. Toast shows "+12% Group Fate". SHARED FATE stat in group header.

### F-26 Follow Notifications ✅
notify_followers_online() fans out follow_online notifications (6h dedup, privacy_online gate), called on every login. add_debate_to_archive fans out follow_debate notifications. Two new types: follow_online (🟢) + follow_debate (📋).

### F-37 Granular Notification Preferences ✅
notif_rivals + notif_economy columns on user_settings. Two new settings rows: Rival Alerts + Economy Alerts. All 6 toggles wired through save_user_settings RPC.

### F-36 7-Day Onboarding Drip ✅
onboarding_drip_log table. 7 cosmetic rewards: Newcomer/Voter/Spectator/Hothead badges → Rookie/Regular/Gladiator titles. Progress card shown in home feed for users within 14 days of signup. All 7 trigger points wired across plinko.ts, tokens.ts, spectate.ts.

---

## What's untested (full list)

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

Build: Clean (4.51s, verified S274).
Supabase: `faomczmipsccwbhpivmp`. ~275 live functions (est).
Circular deps: 37. main.js: ~422KB.

---

## Attack list

| Order | # | Feature | Status |
|---|---|---------|--------|
| 1–13 | various | F-60 through F-36 | ✅ S272–S274 |
| 14 | F-28 | Bounty Board | ⏳ next |
| 15 | F-29 | Source Meta Report | ⏳ |
| 16 | F-43 | Google Ads in Structural Slots | ⏳ |

---

## What's next

**F-28 Bounty Board** — full spec in THE-MODERATOR-FEATURE-SPECS-PENDING.md.

---

## GitHub

Token: `[stored in project memory]`
Repo: `https://github.com/wolfe8105/colosseum.git`
Set remote: `git remote set-url origin https://<TOKEN>@github.com/wolfe8105/colosseum.git`
