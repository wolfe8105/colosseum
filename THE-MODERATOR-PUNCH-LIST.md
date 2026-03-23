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
| H-01 | 3 page modules have `any` annotations (`spectate.ts`, `groups.ts`, `home.ts`) | ⏳ | Compile but no real type safety. Any new feature touching these risks type bugs. |
| H-02 | `(window as any).navigateTo` in `home.ts` | ⏳ | Last remaining window global. Final Migration Plan loose end. |
| H-03 | Bible docs stale after Colosseum→Moderator rename | ⏳ | NT, OT, War Plan, Wiring Manifest, Land Mine Map all have old "Colosseum" references in content. Session 160 renamed files but internal content varies. |
| H-04 | `colosseum-arena.html` in Wiring Manifest but NOT in `vite.config.ts` | ⏳ | Flagged Session 143. Never investigated. Either dead reference in Manifest or missing from Vite. |
| H-05 | Bot army quarantined from rename | ⏳ | `bot-config.ts`, `bot-engine.ts`, `lib/*`, `tests/*` still say "Colosseum" internally. Intentional during Session 160 but needs eventual cleanup. |
| H-06 | Stripe Edge Function templates use old imports | ⏳ | Not urgent until Stripe goes live. Will block monetization when that time comes. |
| H-07 | Edge Function CORS allowlist missing mirror domain | ⏳ | OK since mirror is pure HTML. Cleanup item. |
| H-08 | 3 older RLS policies still have `{public}` scope | ⏳ | Low priority security hygiene. |
| H-09 | `bot-engine.js` straggler in repo root | ⏳ | Should have been deleted Session 144. One file, GitHub web UI delete. |
| H-10 | TS Migration Plan — remove from project knowledge | ⏳ | Migration complete (confirmed Session 162). Doc is historical. Keep in repo, remove from project knowledge to free context. |
| H-11 | Navigation Architecture — remove from project knowledge | ⏳ | Reference doc, not operational. Keep in repo, remove from project knowledge. |

---

# SECTION 2: BUGS (things that are broken right now)

| # | Item | Status | Notes |
|---|------|--------|-------|
| B-01 | Arena view renders blank | ⏳ | Discovered Session 144. Gradient only, no lobby UI. Likely pre-existing from Session 142 script tag removal. Never investigated. |
| B-02 | Auth redirect loop on cold visit | ⏳ | Long-standing since Session 26. Workaround: click Log In link. |
| B-03 | `get_my_milestones` — column 'action' does not exist | ⏳ | Fires on every page load. Wrong column name in RPC. |
| B-04 | `claim_milestone` — column 'action' does not exist | ⏳ | Same pattern as B-03. Fires on tier threshold cross. |
| B-05 | Tier threshold gap — Tiers 3-5 unreachable | ⏳ | 39 questions max = Tier 2 ceiling. Need more profile depth content or adjust thresholds. |
| B-06 | AI Sparring pre-debate navigation bug | ⏳ | Pre-debate screen clobbered by multiple `init()` calls. Debug logs added, root cause not confirmed. |

---

# SECTION 3: FEATURES (things that could be added)

Organized by area. Priority column is empty — Pat decides priority, not the doc.

## 3A. Arena / Debates

| # | Feature | Priority | Spec Exists? | Notes |
|---|---------|----------|-------------|-------|
| F-01 | Waiting room | | ✅ Full research doc | Timer, cancel, spectate in queue, AI sparring fallback after 60s. |
| F-02 | Match Found accept/decline screen | | ✅ Research doc §1.6 | Between queue and pre-debate. |
| F-03 | Entrance sequence / battle animations | | 🔶 Concept only | Plays on debate entry. Ties to group identity system. |
| F-04 | Instant rematch from post-debate | | ❌ No spec | Button exists in nav map, no design. |
| F-05 | Debate recording + replay | | ✅ Attack Plan 3.1 | Synced transcript, timestamp comments, analytics overlay. |
| F-06 | Debate analytics overlay | | ✅ Attack Plan 3.1 | Speaking time, argument count, interruption count, score timeline. |
| F-07 | Spectator features (pulse, chat, live share) | | ❌ No spec | Conceptual. |
| F-08 | Tournament system | | ❌ No spec | Brackets, elimination, Swiss. Feature Room Map "New E". |

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
| F-18 | Audition system (debate-based entry with group vote) | | ✅ Research doc §5 | Audition IS a debate. Cross-system connection to Arena. |
| F-19 | Three-tier banner progression | | ✅ Research doc §6 | Presets → custom static → custom animated. |
| F-20 | Shared fate mechanic | | 🔶 Concept in research doc | Group performance moves individual token balance. Formula TBD. |
| F-21 | Battle cries (personal + group, 3 tiers) | | 🔶 Concept in research doc | Audio format and duration constraints TBD. |
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

1. What milestones trigger each group banner tier unlock? (F-19)
2. Does the group leader spend tokens to unlock tiers, or automatic at threshold? (F-19)
3. Animated banner format constraints — GIF size limit, loop duration? (F-19)
4. Battle cry audio format and duration constraints? (F-21)
5. Exact shared fate calculation formula — percentage, flat, scaled by group size? (F-20)
6. Audition debate: affects Elo or exhibition only? (F-18)
7. Member contribution tracking: what metrics, how displayed? (F-14)

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
- Session handoffs 143, 144, 160, 161

---

# CHANGE LOG

| Date | Session | What |
|------|---------|------|
| 2026-03-23 | 162 | Initial creation. 11 housekeeping, 6 bugs, 44 features, 7 open questions. |
