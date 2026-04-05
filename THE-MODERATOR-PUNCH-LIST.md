# THE MODERATOR — PUNCH LIST
### Created: Session 162 (March 23, 2026)
### Last Updated: Session 235 (April 5, 2026)

> **What this is:** The single source of truth for everything that needs doing.
> Loads every session via project knowledge. Read this first, pick what's next, go.
> Four sections: Housekeeping, Bugs, Features, Dependency Tiers. Each item has a status.
>
> **Status key:** ⏳ = open, 🔶 = in progress, ✅ = done, ❌ = won't do, 🅿️ = parked (blocked)

---

# SECTION 1: HOUSEKEEPING (clear before adding features)

These are tech debt, cleanup, and infrastructure items. None are features — they're the foundation work that prevents future sessions from hitting landmines.

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-01 | 3 page modules have `any` annotations (`spectate.ts`, `groups.ts`, `home.ts`) | ✅ | Session 165–166. `home.ts`: 4 `any` → `Category`, `Profile`, `User`. `groups.ts`: 4 `any` → `SupabaseClient`, `User`, `GroupListItem`. `spectate.ts`: 14 `any` → `SpectateDebate`, `DebateMessage`, `SpectatorChatMessage`. All eslint-disables removed. Vite build clean. |
| H-02 | `(window as any).navigateTo` in `home.ts` | ✅ | Session 163. Created `src/navigation.ts` with register/call pattern. 4 consumers updated. Zero `window.navigateTo` refs remain. |
| H-03 | Bible docs stale after Colosseum→Moderator rename | 🔶 | Session 173: NT fully rewritten (build logs moved to OT, all refs updated, modules/pages tables current). OT updated (sessions 108-173 appended). CLAUDE.md fully rewritten. Wiring Manifest and Land Mine Map internal content still have "Colosseum" references — not yet updated. Session 190: api/profile.js BASE_URL fixed (env var + fallback updated to themoderator.app). Env var set in Vercel. Deployed. Session 205: Full visual token migration — all hardcoded hex colors (#d4a843, #cc2936, #a0a8b8, etc.) and old fonts (Cinzel, Barlow) replaced with var(--mod-*) tokens across all .ts files. moderator-groups.html reskinned with bottom tab bar, footer removed. Only cards.ts Canvas API retains hardcoded colors (correct — CSS vars don't work in Canvas). |
| H-04 | `colosseum-arena.html` in Wiring Manifest but NOT in `vite.config.ts` | ✅ | Session 163. Non-issue — stale Wiring Manifest reference. Arena is a screen inside index.html via `arena.init()`, not a separate HTML file. |
| H-05 | Bot army quarantined from rename | ⏳ | `bot-config.ts`, `bot-engine.ts`, `lib/*`, `tests/*` still say "Colosseum" internally. Intentional during Session 160 but needs eventual cleanup. |
| H-06 | Stripe Edge Function templates use old imports | ⏳ | Not urgent until Stripe goes live. Will block monetization when that time comes. |
| H-07 | Edge Function CORS allowlist missing mirror domain | ⏳ | OK since mirror is pure HTML. Cleanup item. |
| H-08 | 3 older RLS policies still have `{public}` scope | ⏳ | Low priority security hygiene. |
| H-09 | `bot-engine.js` straggler in repo root | ✅ | Session 163. Already deleted. |
| H-10 | TS Migration Plan — remove from project knowledge | ✅ | Session 163. Removed. |
| H-11 | Navigation Architecture — remove from project knowledge | ✅ | Session 163. Removed. |
| H-12 | Land Mine Map internal filenames are pre-TS-migration | ✅ | Session 192. All `colosseum-auth.js`, `colosseum-arena.js` etc. updated to `src/auth.ts`, `src/arena.ts` etc. throughout. HTML filenames updated from `colosseum-*.html` to `moderator-*.html`. |
| H-13 | Wiring Manifest internal filenames are pre-TS-migration | ✅ | Session 192. All JS/HTML filenames updated. Section 3.7 Moderator System rewritten for F-47. Section 6B Page Load Map rewritten for post-TS reality. Section 8 Source Map overhauled. |
| H-14 | THE-MODERATOR-TEST-WALKTHROUGH.md needs full update | ⏳ | URLs, filenames, arena scenarios (4 modes, F-01, F-02, F-46, F-47), retire bot army scenario section. Dedicated session required. |
| H-15 | PRODUCT-WALKTHROUGH.md needs continuation | ⏳ | Only one screen documented (Mode Select). Walk every screen in a dedicated session. |
| H-16 | Groups page is a separate HTML page, not an inline SPA screen | ✅ | Session 205. Bottom tab bar added to moderator-groups.html with Groups active, other tabs link to index.html?screen=X. Back arrow removed from lobby view. Legal footer removed for consistency with main app. Detail view back arrow kept (navigates within page). |
| H-17 | Replace placeholder PWA icons with real art | ⏳ | Session 233. manifest.json uses generic placeholder icons. Need branded icons at all required sizes (192×192, 512×512 minimum). Blocks F-52 (TWA/Play Store submission). |

---

# SECTION 2: BUGS (all closed as of Session 227)

> **Full security recon (Sessions 212-214) identified 29 medium, 14 low, and multiple critical/high bugs across all phases. All were closed in Sessions 215-227. Only dormant payment stack bugs remain (ADV-4, PAY-BUG-1/2/3) — fix before Stripe goes live. SESSION-218-BUG-TRACKER.md removed from project knowledge Session 228.**

| # | Item | Status | Notes |
|---|------|--------|-------|
| B-01 | Arena view renders blank | ✅ | Session 163. Not a bug — arena is a screen inside index.html via `arena.init()`, not a separate HTML file. |
| B-02 | Auth redirect loop on cold visit | ✅ | Session 163. Root cause: 4000ms page timeout vs 5000ms auth timeout = 1s gap. Fix: 4000→6000ms in home.ts, profile-depth.ts, settings.ts. |
| B-03 | `get_my_milestones` — column 'action' does not exist | ✅ | Fixed Session 124. |
| B-04 | `claim_milestone` — column 'action' does not exist | ✅ | Fixed Session 124. |
| B-05 | Tier threshold gap — Tiers 3-5 unreachable | ✅ | Session 164. Expanded questionnaire from 39→100 questions (12→20 sections). 8 new B2B-driven sections added. All tier thresholds (10/25/50/75/100) now reachable. |
| B-06 | AI Sparring pre-debate navigation bug | ✅ | Session 163. Not reproducible — killed by TS migration Session 142. |
| B-07 | No responsive breakpoints | ✅ | Session 165. `@media (min-width: 768px)` content constraint: `.screen` capped at `max-width: 640px` + centered. Home screen (ring nav) exempted. Profile-depth grid 4-col on desktop. Groups/settings get body constraint. CSS only. |
| B-08 | AI sparring badge mobile overlap | ✅ | Session 169. `ai-generated-badge` div moved out of `.arena-room-header` flex row, placed between header and `.arena-vs-bar` as its own centered element with `align-self:center`. |
| B-09 | Spectator feed not filtered by category | ✅ | Session 206. Root cause: `get_arena_feed` RPC had no `p_category` parameter — client passed it, Supabase silently ignored it. Fix: added `p_category TEXT DEFAULT NULL` to RPC with WHERE clause on both sub-queries. Client fallback: if category returns empty, re-fetches with NULL (general feed). |
| B-10 | Middleware CORS missing themoderator.app | ✅ | Session 206. `middleware.js` ALLOWED_ORIGINS only had `colosseum-six.vercel.app` and `thecolosseum.app`. Added `themoderator.app`. Pre-existing bug from rename — undetected because all app API calls go to Supabase directly, not through `/api/*`. Discovered when `/go` page serverless function returned 403. |

---

# SECTION 3: FEATURES (things that could be added)

Organized by area. Priority column is empty — Pat decides priority, not the doc.

## 3A. Arena / Debates

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-01 | Waiting room | | ✅ Full research doc | Layer 1 ✅ Session 167: dual search ring, 4-phase status, 60s AI fallback prompt, 180s hard timeout, cancel button. Layer 2 ✅ Session 169: queue population count, spectator feed. Layer 3 ✅ Session 170: category-scoped queues with backoff. |
| F-02 | Match Found accept/decline screen | | ✅ Research doc §1.6 | ✅ Session 168. 12s countdown, accept/decline buttons, respond_to_match + check_match_acceptance RPCs, player_a_ready/player_b_ready columns. |
| F-03 | Entrance sequence / battle animations | | 🔶 Concept only | Plays on debate entry. Ties to group identity system. **Dep: needs F-31 (cosmetics defined) + F-21 (intro music).** |
| F-04 | Instant rematch from post-debate | | ❌ No spec | Button exists in nav map, no design. |
| F-05 | Debate recording + replay | | ✅ Attack Plan 3.1 | 🔶 Session 233: Replay enrichment live (power-ups, references, mod scores displayed in spectate via new `get_debate_replay_data` RPC). Remaining: AI scorecard persistence (needs write in `arena-room-end.ts`), inline point awards (blocked on F-51). |
| F-06 | Debate analytics overlay | | ✅ Attack Plan 3.1 | Speaking time, argument count, interruption count, score timeline. **Dep: needs F-05 (recording).** |
| F-07 | Spectator features (pulse, chat, live share) | | ❌ No spec | Conceptual. |
| F-08 | Tournament system | | ❌ No spec | Brackets, elimination, Swiss. Feature Room Map "New E". |
| F-45 | Desktop-optimized arena layout | | ❌ No spec | Two-column, sidebar stats. Currently phone UI centered with empty space on desktop. |
| F-46 | Private lobby / invite-only debate | | ✅ Session 173 | ✅ DONE. 3 visibility modes: username challenge, group members only, shareable join code. Client: showPrivateLobbyPicker, showUserSearchPicker, showGroupLobbyPicker, createAndWaitPrivateLobby, startPrivateLobbyPoll, joinWithCode. SQL: create_private_lobby, check_private_lobby, join_private_lobby, cancel_private_lobby, search_users_by_username. Columns on arena_debates: visibility, join_code, invited_user_id, lobby_group_id. No debate_invites table needed. |
| F-47 | Moderator Marketplace | | ✅ Session 179 | ✅ DONE. SQL Phases 1-3 ✅. Client Steps 1-6 ✅. Step 7 ✅ (renderModScoring: debaters get 👍/👎, spectators get slider 1–50, wired to score_moderator RPC). Step 8 ✅ (8 test cases in tests/f47-moderator-scoring.test.ts, all passing). |
| F-48 | Mod-initiated debate | | ✅ Session 210 | ✅ DONE. SQL: arena_debates.debater_a DROP NOT NULL. 4 RPCs: create_mod_debate, join_mod_debate (FOR NO KEY UPDATE SKIP LOCKED), check_mod_debate, cancel_mod_debate. Client: CREATE DEBATE button in Mod Queue, showModDebatePicker (mode/category/topic/ranked/ruleset), createModDebate, showModDebateWaitingMod (join code + slot names), showModDebateWaitingDebater, startModDebatePoll (4s), onModDebateReady (mod→observer, debater→matchFound). joinWithCode falls back to join_mod_debate. F48-MOD-INITIATED-DEBATE.sql committed to repo. |
| F-51 | Live Moderated Debate Feed | | 🔶 In progress | **THE core product feature.** Replaces Live Audio with fully moderated turn-based debate. Full spec: LIVE-DEBATE-FEED-SPEC.md (repo, 77 design questions answered). Key decisions: 4 rounds × 2min turns, one speaker at a time (other frozen), live inline scoring (two-tap), reference citations (max 5, one-and-done), 60s ad breaks between rounds, spectator sentiment gauge, Deepgram speech-to-text, 3 power-ups (2x/Shield/Reveal), concede after R1, moderator eject/null. Post-debate: vote gate → winner → archive. **Phase 1 code complete, untested (S234). Phase 2 code complete, untested (S235): pin fallback, fireworks on point_award, per-value scoring budget (5pts=2, 4pts=3, 3pts=4, 2pts=5, 1pt=6 per round). SQL: session-235-scoring-budget.sql run in Supabase. `scoring_budget_per_round` column on `arena_debates` now unused — enforcement moved to hardcoded CASE in `score_debate_comment`.** **Deps: Deepgram integration, Google AdSense integration, new feed events table, turn-taking enforcement over WebRTC.** |

## 3B. Token Economy / Staking

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-09 | Token prediction staking | | ✅ TOKEN-STAKING-POWERUP-PLAN.docx | Parimutuel pool, pre-debate only. Design decisions locked. |
| F-10 | Power-up shop | | ✅ Same plan doc | 4 power-ups designed (2x Multiplier, Silence, Shield, Reveal). Schema exists. |
| F-11 | Marketplace (cosmetics + references) | | ❌ No spec | Feature Room Map "New C". Buy/sell/trade. **Dep: needs F-31 + F-27.** |
| F-12 | Seasonal token boosts | | 🅿️ Session 182 | Another mechanism for people to earn tokens. Parked until token economy needs tuning. No design work needed until then. **Phase 6 open decisions (from TOKEN-STAKING-POWERUP-PLAN.docx, doc deleted Session 191):** (1) Platform rake: 0% at launch — revisit if token inflation becomes a problem, obvious fix is 5–10% rake on staking pools as a token sink. (2) Silence power-up in text debate mode: unresolved — block opponent typing for 10s, or audio-only? Needs testing. (3) Power-up pricing (15/25/20/30 tokens): starting points only, requires real earn-rate data before finalizing. |
| F-13 | Fantasy league-style picks | | ❌ Session 182 | **Scratched.** |

## 3C. Groups

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-14 | Role hierarchy (Leader, Co-Leader, Elder, Member) | | ✅ Research doc §3 | ✅ DONE. Session 181. 4 roles with permission matrix. SQL + client complete. |
| F-15 | Kick/ban/promote | | ✅ Research doc §3 | ✅ DONE. Session 181. Tied to role hierarchy. SQL + client complete. |
| F-16 | Group settings (edit name, description, type, requirements) | | ✅ Research doc §4 | Post-creation editing. |
| F-17 | Entry requirements (min Elo, tier, profile completion) | | ✅ Research doc §5 | Gate group membership. |
| F-18 | Audition system (debate-based entry with group vote) | | ✅ Research doc §5 | Exhibition only (no Elo). Leader sets entry rule via dropdown: allowed by leader, must debate leader, must debate member, must win vs leader, must win vs member. Session 166. **Dep: needs F-17 (entry requirements).** |
| F-19 | Three-tier banner progression | | ✅ Research doc §6 | Avg group win %: 0–25% standard icons, 26–50% custom static, 51%+ custom animated (10s max, 1080p small-space). Auto-unlock, permanent. Same rules for battle animations. Session 166. |
| F-20 | Shared fate mechanic | | ✅ Session 166 | Token multiplier: `floor(avg_questions / 100 × win_pct × 80)`. 25Q × 50% = 10%. Max 80%. Permanent once reached. Lookup table in Session 166 chat. |
| F-21 | Intro music (personal + group, 2 tiers) | | ✅ Session 166 | Renamed from "battle cries." Tier 1: 10 standard intros for everyone. Tier 2: custom 10-sec upload unlocked at 35%+ profile questions answered. |
| F-22 | GvG battle animations | | 🔶 Concept in research doc | 4 tracks, 3 tiers each. Ties to entrance sequence. **Dep: needs F-03.** |

## 3D. Social

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-23 | DM/Chat system | | ✅ Attack Plan 2.4 | Messages table, realtime, content filter, block user. Full schema designed. |
| F-24 | Search (users, debates, topics) | | ✅ Attack Plan 2.5 | User search, topic search, filtered lobby. |
| F-25 | Rival online alerts | | ✅ Session 182 | Renamed from "rivalry feed expansion." When a rival comes online, user gets an in-your-face popup even mid-debate: "that no good SOB [username] is in the [category] lobby looking for a debate." Fallback if popup too disruptive: red dot on nav element indicating rival presence. Needs Supabase Realtime presence tracking — when user comes online, check if any of their rivals' 5 rival slots include them, fire alert. **Popup is Tier 0. Email delivery is Tier 1 (needs F-35).** |
| F-26 | Follow notifications | | ✅ Session 182 | Renamed from "follow recommendations." NOT a suggestion engine — just deliver notifications when followed users are online or have a new archived debate. Follows table and follow/unfollow UI already exist. Work is wiring follow events to whatever notification channel exists (email for now via F-35, push later). **Dep: needs F-35 for email delivery.** |

## 3E. Reference Arsenal

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-27 | Reference Library (browse by category) | | 🔶 Session 99 brainstorm | Feature Room Map "New A" — most connected new room. |
| F-28 | Bounty board ("I need a source proving X") | | 🔶 Session 99 brainstorm | Could be leaderboard subsection or standalone. **Dep: needs F-27 (reference library).** |
| F-29 | Source Meta Report | | ✅ Session 182 | Public-facing weekly/monthly marketing content piece. Like ESPN power rankings but for debate sources. Content: most cited source per category, most persuasive source (highest win rate when cited), most contested topic, sources that flipped the most debates, biggest Elo movers. Data already exists in reference tracking system — report is a formatted query published as a webpage or email blast. Bot army or blog distributes it. Drives organic SEO, positions app as serious source-quality platform. |
| F-30 | Reference marketplace | | ❌ No spec | Buy/sell/trade verified sources. Subset of F-11. **Dep: needs F-27 + F-11.** |

## 3F. Profile / Identity

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-31 | Cosmetics/achievements store | | ⏳ Session 182 | Needs brainstorming session to define item categories (borders, badges, effects, titles, avatar frames, debate room themes, entrance animations) and what's earnable vs purchasable. OT references `cosmetics-shop-expanded.json` (45 items) but file no longer in repo. **Brainstorm before code.** |
| F-32 | AI Coach / post-debate feedback | | ✅ Attack Plan 3.3 | Argument strength analysis, improvement tips. |
| F-33 | Verified Gladiator badge | | 🔶 Session 68 concept | Voice intro for Ranked, profile depth as humanness proxy. |
| F-34 | Trust scores | | ❌ Session 182 | **Scratched.** |

## 3G. Notifications / Engagement

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-35 | Weekly newsletter + in-app toasts | | ✅ Session 190 | **(A) Newsletter via Resend** ✅ Session 187: newsletter.ts on VPS, cron live (Thu 8PM EST). **(B) In-app nudge toasts** ✅ Session 190: nudge.ts module (suppression: once/session, 24h cooldown, 3/session cap). 8 trigger points wired: enter_debate (arena.ts), round_end (arena.ts), final_score win/loss (arena.ts), return_visit (tokens.ts), first_signup (plinko.ts), replay_entry (spectate.ts), first_vote spectate (spectate.ts), first_vote hot-take feed (async.ts — added Session 190). |
| F-36 | 7-day onboarding drip | | 🅿️ Session 182 | Product Vision §7.1 has day-by-day design (Day 1: show up → badge, Day 2: first vote, Day 3: watch debate, escalating rewards, titles "Rookie"→"Regular"→"Gladiator"). **Parked: blocked on F-35 (delivery) + F-31 (awards/rewards defined).** |
| F-37 | Granular notification preferences | | 🅿️ Session 182 | User control panel — toggles per notification type (DMs, tournaments, bounties, citations, marketplace, rival alerts, follow activity). Feature Room Map lists this as furniture in Settings (Room 6). **Parked: blocked on F-35 (can't control channels that don't exist yet).** |

## 3H. External / Growth

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-38 | Browser extension ("Take it to The Moderator") | | 🅿️ Session 182 | Concept: browser button lets users pull arguments from Reddit/Twitter into the platform for a proper debate. War Plan §4.6 + OT §8.5.4. No technical design, no wireframe, no auth flow spec. **Parked: blocked on 50+ organic users.** |
| F-39 | Embeddable challenge links | | ✅ Session 182 | URL you paste into Reddit, Twitter, Discord, group chats. Format: `moderator.app/challenge?topic=X&user=Y`. Other person clicks, lands on challenge page (works without auth — guest sees OG tags with topic and challenger), signs up/logs in, auto-routed into private lobby. Extends F-46 infrastructure (create_private_lobby, join_private_lobby already exist). New work: public URL format, guest landing page with OG tags, signup flow that preserves challenge context, auto-routing after auth. Every link posted anywhere = user acquisition funnel. |
| F-40 | Mirror pages with live counts | | 🔶 Partial | Mirror generator runs every 5 min. No live counts yet. |
| F-41 | Celebrity/influencer challenge events | | ❌ Session 182 | **Way back burner.** Conceptual. |
| F-49 | `/go` — Guest AI Sparring landing page | | ✅ Session 206 | `themoderator.app/go` — standalone page, no auth, no DB. User types topic, picks For/Against, debates AI via voice or text. 3 rounds, running score after each round, final verdict with 4-criteria scorecard (Logic/Evidence/Delivery/Rebuttal). Signup CTAs throughout. Vercel serverless `api/go-respond.js` calls Groq directly. `GROQ_API_KEY` in Vercel env vars. Permanent Reddit/Discord comment: "You think you're right? Prove it: themoderator.app/go" |
| F-52 | TWA wrapper + Google Play submission | | ⏳ | Session 233. Wrap PWA in Trusted Web Activity for Play Store listing. **Deps: H-17 (real icons), minors policy decision.** |

## 3I. B2B / Revenue

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-42 | B2B data dashboard / API | | ✅ Session 182 | Industry standard for alt data vendors is API access. War Chest §14.2 lists requirements: topic-level access controls, real-time vs delayed feeds, custom dashboards per client, API gating by tier. Delivery: buyer gets API key → hits endpoints scoped to paid topics/categories → gets JSON. Tier 1 = delayed (24-48h lag), Tier 2 = near-real-time, Tier 3 = real-time streaming + raw exports. Dashboard is a nice-to-have web portal on top. Auto-generated Data Integrity Report ships with every delivery (War Chest describes this). **Parked: blocked on having a buyer. War Chest §14.3: "not day-one architecture, build when first buyer is close."** |
| F-43 | Google Ads in structural slots | | ✅ Session 182 | Renamed from "structural ad inventory." Using Google Ads (not custom ad server). Product Vision §3 defines 6 ad slots per debate at natural transition points: final score reveal, debater scorecards, moderator's verdict, pre-debate lobby, replay entry, highlight clip pre-roll. Three pricing tiers: Tier 1 (live debate breaks, premium), Tier 2 (replay breaks), Tier 3 (highlights + lobby, entry-level). Full ad format research in `THE-MODERATOR-AD-STRATEGY-RESEARCH.docx` (15 formats, eCPM data, revenue projections at 4 growth stages). Implementation work: Google AdSense integration at the 6 structural slot trigger points. |
| F-44 | Stripe subscription tiers ($9.99/$19.99/$29.99) | | 🔶 Schema exists | Shop UI built. Stripe integration needs Edge Function fix (H-06). |

## 3J. UX / Onboarding

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-35.3 | Orange Dot indicator | | ✅ Session 182 | Persistent indicator on nav for unclaimed token-earning opportunities (daily login not claimed, milestone ready, streak freeze available, unread notification). Current notification bell polls every 30s for unread count — Orange Dot is a second, always-visible indicator specifically for token actions. Simple highlight, not guided walkthrough. |
| F-50 | Moderator Discovery — 5 touchpoints | | ✅ Session 206 | The app is called The Moderator — the role should be front and center. 5 fixes: (1) Post-debate nudge in arena.ts via nudge.ts. (2) Arena lobby inline banner with one-tap toggleModerator(). (3) Home feed card at position 2 in hot takes. (4) Newsletter "Moderator Spotlight" section with top mod stats. (5) Plinko signup step 4 (opt-in, skippable) before Done step. All gated: only shows for logged-in non-moderators. Card/banner disappear once is_moderator=true. |

---

# SECTION 4: DEPENDENCY TIERS (build order)

Features ordered by what can go first. Check this before picking work.

**Tier 0 — no dependencies, can build now:**
- F-04 Instant rematch
- F-05 Debate recording + replay
- F-07 Spectator features
- F-08 Tournament system
- F-09 Token prediction staking
- F-10 Power-up shop
- F-16 Group settings
- F-17 Entry requirements
- F-19 Three-tier banner progression
- F-20 Shared fate mechanic
- F-21 Intro music
- F-23 DM/Chat system
- F-24 Search
- F-25 Rival online alerts (popup only — email needs F-35)
- F-27 Reference Library
- F-29 Source meta report
- F-32 AI Coach
- F-33 Verified Gladiator badge
- F-35 Newsletter + in-app toasts ✅ DONE
- F-39 Challenge links (extends F-46, already done)
- F-40 Mirror pages with live counts
- F-43 Google Ads in structural slots
- F-45 Desktop-optimized arena layout
- F-48 Mod-initiated debate (extends F-46 + F-47, both done) ✅ DONE
- F-31 Cosmetics brainstorm (design session, no code)
- F-35.3 Orange Dot indicator
- F-12 Seasonal token boosts (parked — use when token economy needs tuning)

**Tier 1 — needs one Tier 0 item first:**
- F-06 Debate analytics overlay → needs F-05 (recording)
- F-18 Audition system → needs F-17 (entry requirements)
- F-25 Rival online alerts (email delivery) → needs F-35
- F-26 Follow notifications → needs F-35
- F-28 Bounty board → needs F-27 (reference library)
- F-37 Notification preferences → needs F-35
- F-52 TWA wrapper + Google Play → needs H-17 (real icons) + minors policy decision

**Tier 2 — needs two+ Tier 0/1 items:**
- F-03 Entrance sequence / battle animations → needs F-31 + F-21
- F-22 GvG battle animations → needs F-03
- F-36 Onboarding drip → needs F-35 + F-31
- F-11 Marketplace → needs F-31 + F-27
- F-30 Reference marketplace → needs F-27 + F-11

**Tier 3 — blocked by external conditions:**
- F-38 Browser extension → needs 50+ users
- F-42 B2B data dashboard / API → needs a buyer
- F-41 Celebrity/influencer events → way back burner

**Scratched:** F-13, F-34

---

# OPEN QUESTIONS FROM RESEARCH DOCS

These are unresolved design questions that block specific features. Captured here so they don't get lost.

1. ~~What milestones trigger each group banner tier unlock? (F-19)~~ ✅ Session 166. Avg group win %: 0–25% = standard icons we provide, 26–50% = custom static flag, 51%+ = custom animated flag (max 10s, 1080p small-space equivalent).
2. ~~Does the group leader spend tokens to unlock tiers, or automatic at threshold? (F-19)~~ ✅ Session 166. Automatic at threshold. Permanent unlock — once crossed, never revoked.
3. ~~Animated banner format constraints — GIF size limit, loop duration? (F-19)~~ ✅ Session 166. Answered by Q1: max 10 sec, sized for 1080p equivalent in a small space. Same rules for battle animations.
4. ~~Battle cry audio format and duration constraints? (F-21)~~ ✅ Session 166. Renamed to "intro music." Two tiers: (a) 10 standard intros we provide for everyone, (b) custom 10-sec intro music upload unlocked at 35%+ profile questions answered.
5. ~~Exact shared fate calculation formula — percentage, flat, scaled by group size? (F-20)~~ ✅ Session 166. Formula: `floor(avg_questions / 100 × win_pct × 80)`. Anchor: 25 avg Q's × 50% win rate = 10% token multiplier. Max: 80% at 100 Q's × 100% wins. Permanent once reached.
6. ~~Audition debate: affects Elo or exhibition only? (F-18)~~ ✅ Session 166. Exhibition only. Group leader sets entry rule via dropdown: allowed by leader, must debate leader, must debate member, must win vs leader, must win vs member.
7. Member contribution tracking: what metrics, how displayed? (F-14) — **Still open.**

---

# SOURCE DOCUMENTS

This punch list was compiled from:
- THE-MODERATOR-NEW-TESTAMENT.md (known bugs, tech debt, infrastructure status)
- TYPESCRIPT-MIGRATION-PLAN.md (Phase 6 status, remaining items)
- THE-MODERATOR-NAVIGATION-ARCHITECTURE.md (screen inventory, planned screens)
- THE-MODERATOR-WAR-PLAN.md (shelved features, open decisions)
- THE-MODERATOR-PRODUCT-VISION.md (psychology framework, ad model, gamification)
- MODERATOR-FEATURE-ROOM-MAP.md (Ideas Master Map placement, ~90 items, 7 new rooms)
- SESSION-RESEARCH-WAITING-ROOM-AND-GROUPS.md (waiting room + groups deep design)
- TOKEN-STAKING-POWERUP-PLAN.docx (staking + power-up implementation plan)
- THE-MODERATOR-ATTACK-PLAN.md (original roadmap — DMs, search, replay, AI coach)
- Session handoffs 143, 144, 160, 161, 163, 164

---

# CHANGE LOG

| Date | Session | What |
|------|---------|------|
| 2026-03-23 | 162 | Initial creation. 11 housekeeping, 6 bugs, 44 features, 7 open questions. |
| 2026-03-23 | 163 | B-01/B-02/B-03/B-04/B-06 closed. H-02/H-04/H-09/H-10/H-11 closed. B-07 added. |
| 2026-03-23 | 164 | B-05 closed. Profile depth expanded 39→100 questions (12→20 sections) for B2B data coverage. |
| 2026-03-23 | 165 | B-07 closed (responsive breakpoints, CSS only). H-01 partial: home.ts + groups.ts `any` removed. F-45 added. |
| 2026-03-23 | 166 | H-01 closed. spectate.ts: 14 `any` → 3 interfaces. 6 of 7 open questions answered: F-18 audition (exhibition, 5 entry rules), F-19 banners (win% tiers, auto/permanent), F-20 shared fate (token multiplier formula), F-21 renamed to intro music (2 tiers). Q7 still open. |
| 2026-03-23 | 167 | F-01 Layer 1 done. Queue screen upgrade: dual search ring, 4-phase status text, 60s AI fallback prompt, 180s hard timeout, cancel button. F-02 JS started (not uploaded). |
| 2026-03-23 | 168 | F-02 done. Match found accept/decline screen. 7 new functions, MatchAcceptResponse interface, matchFound view. SQL migration: player_a_ready/player_b_ready columns, respond_to_match + check_match_acceptance RPCs. |
| 2026-03-23 | 169 | B-08 done (AI sparring badge mobile overlap). F-01 Layer 2 done: queue population count + spectator feed. SQL: check_queue_status() replaced via moderator-queue-population-migration.sql. |
| 2026-03-25 | 173 | F-46 complete (private lobby). F-47 SQL Phases 1-3 done, Client Step 4 done (mod category chips). H-03 partial: NT rewritten, OT updated (108-173), CLAUDE.md rewritten. |
| 2026-03-25 | 174 | F-47 Steps 5-6 done. Step 5: Mod Queue tab (MOD QUEUE button lobby-gated by is_moderator, showModQueue screen, loadModQueue 5s poll, claimModRequest race-condition-safe). browse_mod_queue() RPC fixed (ambiguous id→debate_id, added 'live' to status filter). Step 6: Debater opt-in toggle in category picker, request_mod_for_debate RPC, get_debate_mod_status RPC, startModStatusPoll in debate room, showModRequestModal with 30s countdown, handleModResponse accept/decline. F-48 added (mod-initiated debate concept). Files: src/arena.ts (GitHub), browse_mod_queue + request_mod_for_debate + get_debate_mod_status (Supabase). |
| 2026-03-26 | 179 | F-46 closed (verified complete: 5 RPCs live in Supabase, all columns on arena_debates, client fully wired). F-47 closed (Step 7 renderModScoring confirmed implemented, Step 8 8 tests passing — jsdom added to devDependencies). Vitest: 113 tests passing. |
| 2026-03-27 | 182 | Major spec session. F-13 scratched. F-34 scratched. F-41 way back burner. Specs written for: F-12 (parked token mechanism), F-25 (rival online alerts with popup + red dot fallback), F-26 renamed to follow notifications (not recommendations), F-29 (public source meta report for marketing), F-35 renamed to weekly newsletter + in-app toasts (full content list defined, Resend delivery, 10 polite nudge touchpoints), F-35.3 (Orange Dot = unclaimed token indicator), F-36 parked (blocked on F-35 + F-31), F-37 parked (blocked on F-35), F-38 parked (blocked on 50+ users), F-39 (challenge links extending F-46 with public URLs), F-42 (API-first B2B delivery, tiered access, parked until buyer), F-43 renamed to Google Ads in structural slots. B-09 added (spectator feed category filter). Section 4 added: full dependency tier map across all open features. F-31 needs brainstorming session before code. |
| 2026-03-28 | 190 | F-35B closed: nudge.ts confirmed complete, first_vote nudge added to async.ts. H-03 partial: api/profile.js BASE_URL → process.env.BASE_URL with themoderator.app fallback. Env var set in Vercel, deployed. Domain confirmed: themoderator.app live on Vercel production. |
| 2026-03-28 | 192 | Full bible audit. H-12/H-13 closed. 5 stray files deleted from repo (session-85-88 chart traces, profile-depth-expansion.md). CLAUDE.md: War Plan ref removed, OT session count fixed, nudge.ts added, F-47 RPCs completed. Punch List: change log reordered chronologically, H-03 notes corrected. War Chest: title fixed, all Colosseum→Moderator, duplicate content removed. Product Vision: title and all Colosseum refs fixed. Land Mine Map: title, LM-172 corrected (100Q all tiers reachable), LM-084 corrected (6s timeout + correct filenames), LM-022 dead note removed, LM-051 rewritten, all HTML/JS filenames updated. Wiring Manifest: title, container counts corrected, tier thresholds fixed, Section 3.7 fully rewritten for F-47, Section 6B rewritten for post-TS reality, Section 8 Source Map overhauled, maintenance log updated. |
| 2026-03-29 | 195 | Adversarial audit L1 + L8 resolved. L1 ✅: `app_config` table created (17 rows: 13 milestone configs + 4 power-up costs). `src/app-config.ts` new module — fetches live economy constants, 60-min cache, hardcoded fallback. `src/tokens.ts` + `src/powerups.ts` updated to pull from app-config. `src/arena.ts`: `showPowerUpShop()` made async, `await renderShop()`. L8 ❌ won't do: bot army growth strategy quarantined — `category-classifier.ts` has no live consumer, wiring it was pointless. Bot army quarantine confirmed and reflected in NT (sections 5, 7, 10, 11). `classifier_keywords` table and updated `lib/category-classifier.ts` + `lib/leg2-news-scanner.ts` exist in repo but are inert. NT updated: bot army quarantined throughout, `src/app-config.ts` added to modules table. |
| 2026-03-30 | 205 | Full visual token migration. ~350 hardcoded rgba/hex/font values replaced with var(--mod-*) CSS tokens across 17 .ts files (3 rounds: Claude Code rgba sweep, Claude Code hex+font sweep, manual stragglers in leaderboard.ts/rivals-presence.ts/groups.ts). moderator-groups.html: bottom tab bar added, back arrow removed, legal footer removed. H-16 added and closed. Zero old colors (#d4a843, #cc2936, #a0a8b8) or fonts (Cinzel, Barlow) remain in .ts files outside cards.ts Canvas API. |
| 2026-03-30 | 206 | B-09 closed (spectator feed category filter — added p_category to get_arena_feed RPC). B-10 added and closed (middleware CORS missing themoderator.app). F-49 added and closed (/go guest AI Sparring page + api/go-respond.js serverless function + GROQ_API_KEY in Vercel env vars). F-50 added and closed (5 moderator discovery touchpoints: post-debate nudge, arena lobby banner, home feed card, newsletter spotlight, Plinko signup step). Plinko now 5 steps (mod opt-in before Done). |
| 2026-03-31 | 209 | Amplified vs Unplugged ruleset system complete. arena_debates.ruleset TEXT column + CHECK constraint. 4 RPCs updated (update_arena_debate, join_debate_queue, create_private_lobby, get_arena_feed). Client: 3-step picker flow, unplugged debate room (no ELO/tokens/power-ups/spectator bar), post-debate token skip, 🎸 UNPLUGGED feed section. AI Sparring forced amplified. CSS: .arena-rank-badge.unplugged. ai-moderator edge function redeployed (auth validation + no localhost CORS). 5 stale Claude Code branches deleted. |
| 2026-03-31 | 210 | F-48 closed (mod-initiated debate). SQL: debater_a DROP NOT NULL, 4 new RPCs (create_mod_debate, join_mod_debate, check_mod_debate, cancel_mod_debate). FOR NO KEY UPDATE SKIP LOCKED used (not FOR UPDATE — prevents unnecessary FK child table blocking per CYBERTEC research). Client: ruleset picker added to showModDebatePicker, createModDebate passes p_ruleset, onModDebateReady uses result.topic/result.ruleset instead of hardcodes, cancelModDebate calls cancel_mod_debate (was cancel_private_lobby). ModDebateCheckResult interface updated with topic + ruleset fields. F48-MOD-INITIATED-DEBATE.sql committed. 8 F-48 tests passing, 77 total. Bible docs updated. |
| 2026-03-31 | 212-214 | Full app security recon. Every screen, every RPC, every flow traced. Bug tracker created (SESSION-218-BUG-TRACKER.md). Identified critical/high/medium/low bugs across all phases. |
| 2026-03-31 | 215 | Foundation fixes. 91 deployed functions exported to repo (supabase-deployed-functions-export.sql). Guard trigger expanded to 7 moderator columns (ADV-1 closed). 4 dangerous RLS write policies dropped (ADV-3, ADV-8, ADV-9 closed). CORS wildcard fixed (ADV-5). Hardcoded anon keys removed from API routes (SHARE-BUG-1). api/profile.js branding fixed (PROF-BUG-6). save_profile_depth section count 12→20 (PROF-BUG-1). 8 bugs closed. |
| 2026-04-01 | 216-219 | PROF-BUG-2 closed (profile column mismatches). PROF-BUG-3 closed (settings column mismatches). RTC-BUG-2 closed (round count chaos — config.ts as single source of truth). update_arena_debate rewritten S219. |
| 2026-04-01 | 220 | AI-BUG-1 closed (AI scoring mode). ai-sparring Edge Function rewritten: two modes (debate response + 4-criteria scoring). ai-moderator swapped Groq → Claude/Anthropic. Both Edge Functions now use ANTHROPIC_API_KEY. AI-BUG-2 closed (AI moderator). |
| 2026-04-01 | 221 | RTC-BUG-1 closed. Cloudflare TURN server set up. turn-credentials Edge Function created. Client fetches TURN creds before PeerConnection, falls back to STUN. ICE restart with 3 attempts added to webrtc.ts. |
| 2026-04-01 | 222 | RTC-BUG-3 closed (30s setup timeout). FEED-BUG-1 closed (ModeratorTokens window global → ES import). ECON-BUG-5 closed (leaderboard Week/Month tabs removed). ARENA-BUG-1 verified already fixed (opponent polling). |
| 2026-04-01 | 223 | Group RPC fixes: resolve_group_challenge, join_group hardened, update_group_elo dropped. Private group info leaks discovered (get_group_details, get_group_members). |
| 2026-04-01 | 224 | 9 medium bugs closed: JSON.parse crash (profile-depth.ts, settings.ts), logout/leaveDebate wired, grant_cosmetic RPC dropped (dead code), private group info leaks fixed, 56 inline onclick handlers removed (7 files, via Claude Code), escapeHTML duplicate removed (spectate.ts), MutationObserver leak fixed (leaderboard.ts), objectURL leak fixed (voicememo.ts). opponentName XSS in powerups.ts discovered already fixed. |
| 2026-04-01 | 225 | Remaining medium bugs triaged and closed/deferred. All 4 Edge Functions redeployed with correct CORS origins. AUTH-BUG-4 closed (analytics hardcoded key → import from config.ts). |
| 2026-04-02 | 226 | ECON-BUG-1 closed (9 RPC security fixes: token_balance CHECK constraint, race condition FOR UPDATE locks, auth checks on debit_tokens/finalize_debate, duplicate claim prevention). GRP-BUG-1 closed (14 group RPCs audited, respond_to_group_challenge restricted to leader/co_leader). turn-credentials CORS fixed. All 4 Edge Functions redeployed. Prediction system type mismatch discovered (not fixed). |
| 2026-04-02 | 227 | Prediction system fixed end-to-end (place_prediction UUID→TEXT revert, wager picker UI 1-500 tokens, refund-on-update with net charge). supabase-deployed-functions-export.sql fully re-synced (174 RPCs). localStorage key renamed colosseum_settings → moderator_settings with migration code. |
| 2026-04-02 | 228 | Documentation update session. NT updated through S228. Punch List changelog updated through S227. OT session logs S211-227 appended. SESSION-218-BUG-TRACKER.md removed from project knowledge (all bugs closed or dormant). |
| 2026-04-04 | 229 | Major doc cleanup. Land Mine Map: 66 entries killed (173→107), 4 sections removed, LM-092 corrected, LM-199 added, LM-029/LM-110 updated. 3 docs deleted from repo (PRODUCT-WALKTHROUGH, TECHNICAL-AUDIT, LCARS-Reference-Guide). 4 docs removed from project knowledge (Old Testament, Wiring Manifest, Test Walkthrough, Product Vision — all kept in repo). Product Vision unique content merged into NT Section 8. F-51 added (Live Moderated Debate Feed, references LIVE-DEBATE-FEED-SPEC.md). |
| 2026-04-05 | 233 | PWA infrastructure live. F-05 🔶 partial (replay enrichment: 1 new RPC `get_debate_replay_data`, spectate.ts enriched timeline with power-ups/references/mod-scores). H-17 added (placeholder PWA icons). F-52 added (TWA wrapper + Google Play). NT open decision closed (PWA manifest + service worker). |
| 2026-04-05 | 235 | F-51 ❌→🔶 (Phase 1 code complete S234, Phase 2 code complete S235 — both untested). Decisions locked: scoring budget per round (20 actions, 50 max points, per-value limits via hardcoded CASE in `score_debate_comment`). `scoring_budget_per_round` column on `arena_debates` now unused. Moderator token payout designed (~7 tokens, split: debater half instant, spectator half delayed 48h, zero spectators = spectator half stays 0). |
