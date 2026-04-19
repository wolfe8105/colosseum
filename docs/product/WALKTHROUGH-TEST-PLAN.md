# The Moderator — Single-User Walkthrough Test Plan
### Built from punch list + S260–S278 handoffs
### App: `https://themoderator.app` · Guest page: `/go` · Source report: `/moderator-source-report.html`

> **Scope:** Things I can verify on my own while logged in as you, driving around the app.
> Anything that requires a second human (live debate, DMs, GvG) is in the "DEFERRED — needs 2+ users" section at the bottom.
>
> **Method:** For each item — does it render, does the button work, does it match the spec in the handoff, any console errors, any visual jank. I take notes as I go; you get a report at the end grouped by severity.

---

## 0. Pre-flight (before you log in)

1. **Cold load** of `themoderator.app` on a fresh tab — watch for auth redirect loop (B-02 regression — was 4s→6s fix).
2. **`/go` guest AI sparring page** — topic input, For/Against, 3 rounds voice or text, final 4-criteria scorecard, signup CTAs throughout. No auth required. (F-49)
3. **Standalone source meta report** at `/moderator-source-report.html` — OG tags, 5 sections render. (F-29)
4. **Public profile** `/u/<your-username>` renders for guest.
5. **Desktop sidebar** appears at ≥1024px viewport width on Feed/Arena/Ranks/Profile tabs; not on Groups. (F-45)
6. **PWA icons** — manifest loads, real branded icons (not placeholder blobs). (H-17)

---

## 1. Home screen + global chrome

7. **Ring/spoke nav** renders, category overlay opens on spoke tap.
8. **Bottom tab bar** — all tabs navigate correctly (Feed / Arena / Ranks / Profile / Groups).
9. **Header has NO token bar** (removed S278 — balance lives on profile only). Any orange dot logic tied to tokens should be gone.
10. **Notification bell** — 30s poll, unread count badge.
11. **Orange dot** on nav — lights up for unclaimed daily login / milestone / streak freeze / unread notifs. (F-35.3)
12. **Gold dot** on bell — fast-blink when tournament match is ready. (F-08)
13. **Bounty gold dot** — on leaderboard rows, hot take cards, live feed debater names, pre-debate opponent, profile modal. (F-28/S276)
14. **In-app nudge toasts** fire at trigger points (return visit, first vote, replay entry, etc.) — suppression 3/session + 24h cooldown. (F-35)
15. **Home feed card at position 2** — Moderator card (shows for non-mods only). (F-50)
16. **Hot takes feed** — list, reactions, predictions tab, category filter. Spectator feed filtered by category correctly. (B-09)

---

## 2. Profile

17. **My profile view** — avatar, ELO, wins, losses, streak, tier badge.
18. **Token balance** displayed on profile (and only profile, per S278).
19. **Verified Gladiator badge** visible if profile depth ≥ 60%. (F-33)
20. **Profile depth / questionnaire** — progress bar, open questionnaire, answer a few, depth % updates.
21. **Debate Archive table** — spreadsheet-style, manual curation. "Add to archive" button on recent debates. Edit/remove entries. (F-53)
22. **Private profile toggle** in settings — flip it, confirm `get_public_profile` respects it, re-enable. (F-54)
23. **Individual archive links** still work when shared directly even if profile is private.
24. **Cosmetics store** — browse, check ownership state. (F-31)
25. **Profile modal** from tapping another user — renders with bounty gold dot if applicable.

---

## 3. Invite & Rewards (F-59)

26. **Invite & Rewards sub-page** — progress band, stable ref code URL (`/i/<5-char>`), copy button.
27. **Activity feed** (usernames only, recent).
28. **Unclaimed rewards section** with pulsing CLAIM button (if any).
29. **Claim flow** — opens F-57 catalog grid, filter/select effect, claim triggers rarity-tier animation.
30. **Post-debate invite modal** fires after ranked completion (rewired existing button).
31. **Plinko step-5 invite nudge** — visible in signup flow if re-walkable.
32. **Home feed nudge card** appears when 1–2 invites from next milestone.

---

## 4. Reference Arsenal (F-27 / F-55 / F-10 / F-60)

33. **My Arsenal tab** — references with socket dots visible. (F-27)
34. **Forge tab** — 5-step forge form, create a test reference, confirm it appears in library.
35. **Shop tab** — Modifier/Power-Up toggle, category + rarity + timing + affordability filter chips, card grid. (F-10)
36. **Buy flow** — tap a card, bottom-sheet confirm, verify token debit and inventory add (via `buy_modifier` / `buy_powerup`).
37. **Armory browse** — search bar, filters, trending shelf, bottom sheet detail view. (F-27)
38. **Saved loadouts** — create, name, save up to 6 presets; delete; apply. (F-60)

---

## 5. Groups

39. **Groups list** — search, filter by category, public/private indicators.
40. **Create group** — walk creation flow.
41. **Group detail view** — members, GvG record, banner.
42. **Leader-only gear icon → Settings modal** — edit description, category, visibility, emoji, join_mode, entry_requirements, audition_config. Name locked. (F-16)
43. **Entry requirements** — min ELO, min debates, tier gate — set and save. (F-17)
44. **Audition queue** — submit audition, leader approve/reject. (F-18)
45. **Delete group** — type-name-to-confirm, cascade happens but GvG history preserved (group_id nulled, not deleted).
46. **Three-tier banner progression** — visible on group detail; leader upload to storage bucket. (F-19/S274)
47. **GvG win/loss counters** (`gvg_wins`/`gvg_losses` columns) render on group.

---

## 6. Arena — pre-debate (solo-testable paths)

48. **Mode select** — all 4 modes (Live Audio / Voice Memo / Text / AI Sparring).
49. **Category selection** per mode.
50. **AI Sparring full flow** — pick topic + side, 3 rounds, voice or text input, running score per round, final 4-criteria scorecard (F-32). **This is the main solo-testable debate path.**
51. **Save AI scorecard to archive** — confirm `save_ai_scorecard` write and later rendering in replay.
52. **Private lobby creation** (F-46) — all 3 modes: username challenge / group-only / shareable join code. Cancel before match = refund.
53. **Shareable join code flow** — create lobby, copy code, verify `check_private_lobby` / `join_private_lobby` (would need a 2nd session; can at least verify creation + link).
54. **Challenge link (F-39)** — generate `moderator.app/challenge?topic=...&user=...`, verify OG preview + landing page.
55. **Mod-initiated debate create** (F-48) — from Mod Queue, "CREATE DEBATE" button, pick mode/category/topic/ranked/ruleset.
56. **Bounty claim dropdown** on pre-debate screen — if you have any active bounties on you, they appear. (F-28)
57. **Entrance sequence** (F-03) — animated tier-based reveal when entering a debate room.
58. **Intro music** — plays on match-found; custom upload works for Tier 2. (F-21)
59. **Pre-debate lobby ad slot** renders (AdSense). (F-43 Slot 4)

---

## 7. Bounty Board (F-28)

60. **Bounty Board page** — list view, filter by status.
61. **Create bounty** (requires a rival) — bounty slot limit enforced.
62. **Bounty auto-cancels** when rival is removed (trigger).
63. **Bounty attempt flow** — from pre-debate dropdown.

---

## 8. Tournaments (F-08 — may be broken: SQL pending Pat run)

64. **Tournaments page / list** — does it load without SQL errors?
65. **Create tournament button** — F-33 Verified Gladiator gate (60% depth). Walk the flow even if SQL fails.
66. **Gold blink dot** on bell when match ready.
67. **Cancel before lock** — full refund path.
> Expect errors here if the S278 SQL hasn't been run yet. Flag but don't treat as bugs.

---

## 9. Spectate / Replay

68. **Spectator feed** for a live category — sentiment updates, speaker events.
69. **Past debate replay** — open from profile archive or feed.
70. **Timeline with inline point awards** — `+N × M = T pts` badges on scored events. (F-05/S277)
71. **Replay renders AI scorecard** for AI sparring debates. (F-32)
72. **References cited** in debate render in timeline.
73. **Replay entry interstitial ad** (F-43 Slot 5).
74. **Spectator chat panel** in live feed room (spectator view only — hidden from debaters/mods). (F-07)
75. **"Share to watch live" copy button** on pre-debate screen — copies `?spectate=<id>` URL.

---

## 10. Search (F-24)

76. **Global search button** in top nav — query users, debates, groups.
77. **Inline search** in arena lobby.
78. **Inline search** in groups page.
79. **DM picker search** (eligibility filter applies).
80. **2-char minimum + 300ms debounce**.
81. **Searchable opt-out** — `profiles.searchable` toggle in settings hides you from search results.

---

## 11. DMs (F-23) — solo-testable UI only

82. **DM inbox** renders.
83. **Eligibility gate** — can only DM users you've interacted with via `arena_debates` / `arena_votes` / `sentiment_tips` / `debate_watches` (the `dm_eligibility` materialized table).
84. **Thread opens** (even empty) without errors.
85. **Block / silent block** — settings flow.
> Actual message send/receive = 2-user, deferred.

---

## 12. Notifications

86. **Notification bell panel** opens, renders notification list.
87. **Unread count** updates.
88. **Granular preferences** in settings (F-37) — DMs / tournaments / bounties / citations / marketplace / rivals / follow / economy toggles. `notif_rivals` + `notif_economy` (S274).
89. **Follow notifications** (F-26) — follow someone, confirm online + archive fan-out is configured (actual delivery = live test).
90. **7-day onboarding drip card** visible if within first 7 days. (F-36/S274)

---

## 13. Leaderboards

91. **Elo / Wins / Streak tabs** switch correctly.
92. **Verified Gladiator badges** render on qualifying rows. (F-33)
93. **Bounty gold dots** render on rows. (F-28)
94. **Search within leaderboard**.

---

## 14. Settings

95. **Settings page** loads, all sections present.
96. **Moderator toggle** — `toggleModerator()` works (F-50 touchpoints).
97. **Privacy section** — private profile, searchable opt-out.
98. **Notification preferences** — all F-37 toggles.
99. **Intro music** — default track picker, custom upload (Tier 2).
100. **Loadout presets** management.

---

## 15. Console / performance sanity

101. **Console errors** — zero on each screen I visit.
102. **No `navigator.locks` orphan bug** — noOpLock loaded before Supabase CDN.
103. **All mutations go through `.rpc()`** — no direct table writes (check Network tab spot-sample).
104. **No `window.navigateTo` references** at runtime (H-02).
105. **PWA installable** — manifest valid, icons real.

---

## DEFERRED — needs 2+ simultaneous users

Not testing today. Listing so it's in one place for the next session:

- **F-51 Live Moderated Debate Feed** — full end-to-end with 2 debaters + 1 mod. Verify audio, Deepgram transcription, ad breaks between rounds. (THE core product feature, code complete, never live-tested.)
- **F-58 Sentiment Tipping** — tier-gated live tipping, 50% refund on winner, burn on loser, gauge math.
- **F-23 DMs** — actual 1:1 thread send/receive, rate limits (30/min, 5 new threads/24h), silent block effect.
- **F-25 Rival Online Alerts** — presence popup when a rival comes online.
- **F-26 Follow Notifications** — real fan-out delivery.
- **GvG debates** — group vs group matchmaking, banner progression trigger.
- **F-48 Mod-initiated debate** — mod creates, two debaters join.
- **F-47 Moderator Marketplace** scoring flow — live score a debate.
- **F-08 Tournament System** — bracket play (also needs SQL run first).
- **F-55 Reference challenges** — one user cites, another challenges, mod rules.
- **F-20 Shared Fate** — group stake resolution.

---

## How the walk runs

1. You log in on your end and hand me browser control (Claude in Chrome).
2. I work top-to-bottom through sections 0–15.
3. For each item: **PASS** (works, matches spec) / **FAIL** (what broke) / **SKIP** (can't test alone / not wired yet) / **NOTE** (works but something's off).
4. I take screenshots of anything weird.
5. At the end: a grouped report — Criticals / Bugs / Polish items / Questions for you.

Roughly 105 items. At ~1–2 min each for the ones that work and more for the ones that don't, this is a long walk. I can pause at any section boundary if you want to review mid-run.
