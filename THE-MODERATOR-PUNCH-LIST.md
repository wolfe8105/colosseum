# THE MODERATOR — PUNCH LIST
### Created: Session 162 (March 23, 2026)

> **What this is:** The single source of truth for everything that needs doing.
> Loads every session via project knowledge. Read this first, pick what's next, go.
> Three sections: Housekeeping, Bugs, Features. Each item has a status.
>
> **Status key:** ⏳ = open, 🔶 = in progress, ✅ = done, ❌ = won't do

---

# SECTION 1: HOUSEKEEPING (clear before adding features)

These are tech debt, cleanup, and infrastructure items. None are features — they're the foundation work that prevents future sessions from hitting landmines.

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-01 | 3 page modules have `any` annotations (`spectate.ts`, `groups.ts`, `home.ts`) | ✅ | Session 165–166. `home.ts`: 4 `any` → `Category`, `Profile`, `User`. `groups.ts`: 4 `any` → `SupabaseClient`, `User`, `GroupListItem`. `spectate.ts`: 14 `any` → `SpectateDebate`, `DebateMessage`, `SpectatorChatMessage`. All eslint-disables removed. Vite build clean. |
| H-02 | `(window as any).navigateTo` in `home.ts` | ✅ | Session 163. Created `src/navigation.ts` with register/call pattern. 4 consumers updated. Zero `window.navigateTo` refs remain. |
| H-03 | Bible docs stale after Colosseum→Moderator rename | 🔶 | Session 173: NT fully rewritten (build logs moved to OT, all refs updated, modules/pages tables current). OT updated (sessions 108-173 appended). CLAUDE.md fully rewritten. War Plan, Wiring Manifest, Land Mine Map internal content still have "Colosseum" references — not yet updated. |
| H-04 | `colosseum-arena.html` in Wiring Manifest but NOT in `vite.config.ts` | ✅ | Session 163. Non-issue — stale Wiring Manifest reference. Arena is a screen inside index.html via `arena.init()`, not a separate HTML file. |
| H-05 | Bot army quarantined from rename | ⏳ | `bot-config.ts`, `bot-engine.ts`, `lib/*`, `tests/*` still say "Colosseum" internally. Intentional during Session 160 but needs eventual cleanup. |
| H-06 | Stripe Edge Function templates use old imports | ⏳ | Not urgent until Stripe goes live. Will block monetization when that time comes. |
| H-07 | Edge Function CORS allowlist missing mirror domain | ⏳ | OK since mirror is pure HTML. Cleanup item. |
| H-08 | 3 older RLS policies still have `{public}` scope | ⏳ | Low priority security hygiene. |
| H-09 | `bot-engine.js` straggler in repo root | ✅ | Session 163. Already deleted. |
| H-10 | TS Migration Plan — remove from project knowledge | ✅ | Session 163. Removed. |
| H-11 | Navigation Architecture — remove from project knowledge | ✅ | Session 163. Removed. |

---

# SECTION 2: BUGS (things that are broken right now)

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

---

# SECTION 3: FEATURES (things that could be added)

Organized by area. Priority column is empty — Pat decides priority, not the doc.

## 3A. Arena / Debates

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-01 | Waiting room | | ✅ Full research doc | Layer 1 ✅ Session 167: dual search ring, 4-phase status, 60s AI fallback prompt, 180s hard timeout, cancel button. Layer 2 ✅ Session 169: queue population count, spectator feed. Layer 3 ✅ Session 170: category-scoped queues with backoff. |
| F-02 | Match Found accept/decline screen | | ✅ Research doc §1.6 | ✅ Session 168. 12s countdown, accept/decline buttons, respond_to_match + check_match_acceptance RPCs, player_a_ready/player_b_ready columns. |
| F-03 | Entrance sequence / battle animations | | 🔶 Concept only | Plays on debate entry. Ties to group identity system. |
| F-04 | Instant rematch from post-debate | | ❌ No spec | Button exists in nav map, no design. |
| F-05 | Debate recording + replay | | ✅ Attack Plan 3.1 | Synced transcript, timestamp comments, analytics overlay. |
| F-06 | Debate analytics overlay | | ✅ Attack Plan 3.1 | Speaking time, argument count, interruption count, score timeline. |
| F-07 | Spectator features (pulse, chat, live share) | | ❌ No spec | Conceptual. |
| F-08 | Tournament system | | ❌ No spec | Brackets, elimination, Swiss. Feature Room Map "New E". |
| F-45 | Desktop-optimized arena layout | | ❌ No spec | Two-column, sidebar stats. Currently phone UI centered with empty space on desktop. |
| F-46 | Private lobby / invite-only debate | | ⏳ Session 170 research | Create a debate locked to: (a) one specific user by username, (b) a group, (c) a shareable join code for up to N users. Needs: `visibility` column on `arena_debates`, `debate_invites` table, notification path, "waiting for opponent" lobby UI. Category picker from F-01 Layer 3 reused as first step. |

## 3B. Token Economy / Staking

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-09 | Token prediction staking | | ✅ TOKEN-STAKING-POWERUP-PLAN.docx | Parimutuel pool, pre-debate only. Design decisions locked. |
| F-10 | Power-up shop | | ✅ Same plan doc | 4 power-ups designed (2x Multiplier, Silence, Shield, Reveal). Schema exists. |
| F-11 | Marketplace (cosmetics + references) | | ❌ No spec | Feature Room Map "New C". Buy/sell/trade. |
| F-12 | Seasonal token boosts | | ❌ No spec | Conceptual. |
| F-13 | Fantasy league-style picks | | ❌ No spec | Conceptual. Homeless feature in Room Map. |

## 3C. Groups

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-14 | Role hierarchy (Leader, Co-Leader, Elder, Member) | | ✅ Research doc §3 | 4 roles with permission matrix. |
| F-15 | Kick/ban/promote | | ✅ Research doc §3 | Tied to role hierarchy. |
| F-16 | Group settings (edit name, description, type, requirements) | | ✅ Research doc §4 | Post-creation editing. |
| F-17 | Entry requirements (min Elo, tier, profile completion) | | ✅ Research doc §5 | Gate group membership. |
| F-18 | Audition system (debate-based entry with group vote) | | ✅ Research doc §5 | Exhibition only (no Elo). Leader sets entry rule via dropdown: allowed by leader, must debate leader, must debate member, must win vs leader, must win vs member. Session 166. |
| F-19 | Three-tier banner progression | | ✅ Research doc §6 | Avg group win %: 0–25% standard icons, 26–50% custom static, 51%+ custom animated (10s max, 1080p small-space). Auto-unlock, permanent. Same rules for battle animations. Session 166. |
| F-20 | Shared fate mechanic | | ✅ Session 166 | Token multiplier: `floor(avg_questions / 100 × win_pct × 80)`. 25Q × 50% = 10%. Max 80%. Permanent once reached. Lookup table in Session 166 chat. |
| F-21 | Intro music (personal + group, 2 tiers) | | ✅ Session 166 | Renamed from "battle cries." Tier 1: 10 standard intros for everyone. Tier 2: custom 10-sec upload unlocked at 35%+ profile questions answered. |
| F-22 | GvG battle animations | | 🔶 Concept in research doc | 4 tracks, 3 tiers each. Ties to entrance sequence. |

## 3D. Social

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-23 | DM/Chat system | | ✅ Attack Plan 2.4 | Messages table, realtime, content filter, block user. Full schema designed. |
| F-24 | Search (users, debates, topics) | | ✅ Attack Plan 2.5 | User search, topic search, filtered lobby. |
| F-25 | Rivalry feed expansion | | ❌ No spec | Conceptual. |
| F-26 | Follow recommendations | | ❌ No spec | Conceptual. |

## 3E. Reference Arsenal

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-27 | Reference Library (browse by category) | | 🔶 Session 99 brainstorm | Feature Room Map "New A" — most connected new room. |
| F-28 | Bounty board ("I need a source proving X") | | 🔶 Session 99 brainstorm | Could be leaderboard subsection or standalone. |
| F-29 | Source Meta Report (publishable weekly stats) | | ❌ No spec | Marketing content: "most persuasive source in health debates." |
| F-30 | Reference marketplace | | ❌ No spec | Buy/sell/trade verified sources. Subset of F-11. |

## 3F. Profile / Identity

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-31 | Cosmetics/achievements store | | ❌ No spec | Borders, badges, effects. |
| F-32 | AI Coach / post-debate feedback | | ✅ Attack Plan 3.3 | Argument strength analysis, improvement tips. |
| F-33 | Verified Gladiator badge | | 🔶 Session 68 concept | Voice intro for Ranked, profile depth as humanness proxy. |
| F-34 | Trust scores | | ❌ No spec | Conceptual. |

## 3G. Notifications / Engagement

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-35 | Push notifications / daily digest | | ❌ No spec | Conceptual. |
| F-36 | 7-day onboarding drip | | ❌ No spec | Escalating rewards for new users. |
| F-37 | Granular notification preferences | | ❌ No spec | DMs, tournaments, bounties, citations, marketplace. |

## 3H. External / Growth

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-38 | Browser extension ("Take it to The Moderator") | | ❌ No spec | Needs 50+ users. |
| F-39 | Embeddable challenge links | | ❌ No spec | For Reddit, Twitter, Discord, group chats. |
| F-40 | Mirror pages with live counts | | 🔶 Partial | Mirror generator runs every 5 min. No live counts yet. |
| F-41 | Celebrity/influencer challenge events | | ❌ No spec | Conceptual. |

## 3I. B2B / Revenue

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-42 | B2B data dashboard / API | | ❌ No spec | Feature Room Map "New G". |
| F-43 | Structural ad inventory | | 🔶 Product Vision | Ad placement designed, no implementation spec. |
| F-44 | Stripe subscription tiers ($9.99/$19.99/$29.99) | | 🔶 Schema exists | Shop UI built. Stripe integration needs Edge Function fix (H-06). |

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
