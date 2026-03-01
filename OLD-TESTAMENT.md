# THE MODERATOR — STATE ARCHIVE
### Companion to NEW-TESTAMENT.md | Full history, brainstorm list, research, artifacts
### Read this when you need context on a specific topic, not every session.

---

## 10 PROJECT AREAS

All work on The Moderator falls into one of these areas. Established Session 3.

1. **DEFENSE** — Bot detection, ban evasion, data integrity, security tiers, air-gapped backups, rate limiting, fingerprinting, content moderation.
2. **MONEY** — Payments (Stripe/Apple/Google), token economy, subscriptions, cosmetics shop, ad revenue (30-sec round breaks), paywalls, pricing strategy.
3. **USER INTERACTION** — The debate experience itself — rounds, scoring, matchmaking, formats, moderator rating, concede mechanics, casual vs competitive pools.
4. **IDENTITY & ACCOUNTS** — Authentication, age gates, profile depth system (157 Qs), settings, account recovery, who the user IS to the platform and to B2B buyers.
5. **SOCIAL** — Follows, friends, DMs, notifications, share links, viral loops, teams/squads, the reason to come back tomorrow.
6. **EXPERIENCE DESIGN** — Layout overhaul (sections + banners), progressive disclosure, animations, the Hot Takes feed, how the app FEELS when you open it. The third place atmosphere.
7. **DATA / B2B** — Selling sentiment, argument trends, demographic data to media companies, polling firms, hedge funds, political campaigns. Requires identity + profile depth + recordings.
8. **CONTENT ENGINE** — Hot Takes feed, Trending section, debate highlights/clips, user-generated content, ambient content surfacing, engineered serendipity.
9. **EDUCATION** — Classroom mode, institutional licensing, separate-app-or-mode decision, teacher tools, curriculum alignment, minors policy.
10. **PLATFORM PHILOSOPHY** — Emergence engine design, third place theory, structured spontaneity, participatory culture, reciprocal gating, "make everything matter."

---

## DECISIONS MADE

| Date | Decision | Context |
|------|----------|---------|
| Feb 25 | State file over handoff doc | Living doc updated each session, not frozen snapshots |
| Feb 25 | Profile Depth System approved | 12 sections, 157 Qs, mixed rewards (discounts + badges + icons + feature unlocks), base price $14.99 reducible to $0.49 |
| Feb 25 | Reward mix: not always money | Alternate between discounts, badges, icons, cosmetic unlocks, feature unlocks across sections |
| Feb 25 | Question count: ~157 | "Be a bit painful but not so painful they stop" — sweet spot, not 300 |
| Feb 25 | Attack plan locked | 5 phases, 30 items, dependency-ordered. Filed as THE-MODERATOR-ATTACK-PLAN.md |
| Feb 26 | Kill the tile grid | Debate layout overhaul — themed sections (Sports, Politics, Misc, Championships, Trending) with progressive disclosure, not a flat grid of tiles |
| Feb 26 | Banner presentation per section | Each category drops like a championship banner with unique colors and animation. Animate on first visit, reduce on repeat |
| Feb 26 | Casual tier is king | Most users are casual debaters. Protected lobbies (like SBMM in gaming). No sharks in casual waters. Non-negotiable |
| Feb 26 | Spectators are the primary user | Design for the 90% who watch, vote, react — not the 10% who debate. Spectators = revenue base + data source + social proof |
| Feb 26 | Emergence engine philosophy | The Moderator is not a debate app. It's a social system with simple rules (post → react → challenge → structure appears) where debates are the most likely emergent outcome |
| Feb 26 | Reciprocal gating for data collection | Gate rewards behind actions we need (e.g., can't see debate score until you rate the moderator). Every action the platform needs should unlock something the user wants |
| Feb 26 | 30-second ad slots between rounds | Natural commercial breaks between 2-minute debate rounds. Like TV timeouts in basketball |
| Feb 26 | 10 project areas defined | Defense, Money, User Interaction, Identity/Accounts, Social, Experience Design, Data/B2B, Content Engine, Education, Platform Philosophy |
| Mar 1 | Name is "The Colosseum" | Live at colosseum-six.vercel.app, GitHub wolfe8105/colosseum |
| Mar 1 | Deployment: Supabase + Vercel | Supabase project faomczmipsccwbhpivmp, Vercel auto-deploys from main |
| Mar 1 | Verdict page bug was NOT a race condition | `sb.rpc().catch()` TypeError — Supabase rpc() returns query builder, not Promise. Misdiagnosed across sessions. |

---

## BRAINSTORM RUNNING LIST (Session 3)

Full running list from the brainstorm session with research annotations. Items marked with source indicate research validation.

### Owner Ideas (1–9)
1. **Money** — how to actually get paid (Stripe, payments, pricing strategy)
2. **Growth** — social/viral features, what makes people come back
3. **B2B / Data** — the unique selling point, who buys it, how to package it
4. **Debate layout overhaul** — stop doing the generic tile grid. Break into distinct sections like a newspaper: Sports, Politics, Miscellaneous, Championships, etc. *(Validated: progressive disclosure, choice overload research)*
5. **Banner presentation** — each category drops like a championship banner with animation, unique colors per section. *(Validated: micro-animation research, diminishing returns noted — smart decay needed)*
6. **Trending category** — social media feed logic. *(Validated but needs quality signals, not raw engagement — Georgetown Knight Institute research)*
7. **Social media angle** — TBD, to be expanded
8. **Casual tier is king** — most users are casual. Protect that energy. *(Strongly validated: SBMM/gaming retention research)*
9. **The funnel: conversation → debate** — casual space is the feed, debate is the event. Talk happens naturally, structure appears when it gets heated.

### Claude Additions (10–18)
10. **"Bet." button** — one-tap challenge when someone disagrees. *(Validated: low-friction CTA research. Risk: tone must be playful not aggressive)*
11. **Hot Takes feed** — short-form layer that generates debates organically. *(Essential: this IS the content engine. Cold start problem must be solved)*
12. **Spectator economy** — most people watch and vote, not debate. *(Strongly validated: 90-9-1 rule, updated to ~55-30-15 in branded communities)*
13. **Category identity** — people identify with sections, per-section leaderboards and cosmetics.
14. **Debate highlights / SportsCenter mode** — best 60 seconds, clip system. *(Strongly validated: short-form video data — possibly single biggest growth lever)*
15. **Casual matchmaking protection** — separate pools or comfort ratings. *(Non-negotiable per gaming research)*
16. **"Take it to The Moderator" embed/share link** — debate starts anywhere, resolves here. *(Validated: focus on group chats/Discord/iMessage, not major platforms — walled garden resistance)*
17. **Section editors / community captains** — community curators per section. *(Right idea, Phase 2-3 timing — needs regulars first)*
18. **The front page is earned, not algorithmic** — curated, not feed slop. *(Philosophy right, execution needs semi-automation — pure editorial won't scale)*

### Philosophy Layer (19–25)
19. **Kill the destination mentality** — people are tired of being told "go HERE." The Moderator should feel like a place you're already IN.
20. **The bar, not the arena** — default state is the hangout, not the lobby screen.
21. **Ambient content that sparks without asking** — live scores, headlines, trending clips surface passively.
22. **No cold start** — the app is alive before you got there. People are talking. Something's happening.
23. **Presence over sessions** — reward being around, not logging in to do a task.
24. **Friction is the enemy of organic** — casual path to debate: two taps max.
25. **The Moderator as a verb** — aspirational, not a design task. "Let's moderate this." *(Research: 5 syllables is heavy. This is a result of success, not something you build.)*

### Research-Driven Additions (26–33)
26. **You're not building an app. You're building a third place.** *(Source: Oldenburg's Third Place Theory, Discord research)*
27. **The tile grid is a jam shelf with 24 flavors.** *(Source: Iyengar jam study, Journal of Consumer Psychology — 7-9 options max before fatigue)*
28. **The "super app" instinct is correct but the approach is different.** More like Discord's model than WeChat's.
29. **"Ambient engagement" over "active sessions."** *(Source: PLOS Digital Health — embed functions where people already are)*
30. **Regulars are the product.** Without 50-100 active personality-driven users at launch, nothing else matters. *(Source: Oldenburg's regulars concept)*
31. **Walled garden fatigue has a name.** *(Source: industry research — users are exhausted from platforms trapping them)*
32. **Two-tap rule is backed by cognitive load research.** *(Source: Optimizely — too many choices = decision avoidance)*
33. **Energizing vs draining.** Debates are active participation, not passive scrolling. *(Source: PMC research on social media emotional exhaustion)*

### Emergence Framework (34–38)
34. **The Moderator is an emergence engine, not a debate app.** Post → React → Challenge → Structure appears. Four mechanics. Everything else emerges. *(Source: emergent gameplay theory — Juul, Smith, Salen & Zimmerman)*
35. **Structured spontaneity as the UX model.** Sections = structure. Hot takes = spontaneity. Neither works alone.
36. **Engineered serendipity as the content strategy.** Surface provocative content into section feeds. Pixar bathroom principle applied to discourse. *(Source: Zuckerman, MIT Civic Media Lab)*
37. **Participatory culture as the growth model.** Watching is participating. Voting is participating. The funnel is emotional investment escalating naturally. *(Source: Henry Jenkins, MIT)*
38. **Emergent debate is the new product category.** No one has named this. No one has built it. Debate apps are progression games. Social media is a feed. The Moderator is neither.

### Revenue & Behavioral Design (39–42)
39. **30-second ad slots between rounds** — natural commercial breaks. Like TV timeouts in basketball.
40. **Make everything matter** — every action the platform needs should be tied to something the user wants.
41. **Reciprocal gating** — gate rewards behind needed actions. Can't see debate score until you rate the moderator.
42. **Solve the "nobody wants to do it" problem with emotional stakes** — don't ask nicely. Make the rating the key that unlocks what they want.

---

## RESEARCH BUILD PRIORITY (from beat-up analysis)

🟢 **Build first:** Hot Takes feed (11), Spectator tools (12), Casual protection (8/15), Debate clips/highlights (14), Section layout with progressive disclosure (4/27)

🟡 **Build second:** Banner animations (5), "Bet." challenge button (10), Trending with quality signals (6), Embed/share links (16)

🔴 **Build later:** Community captains (17), Curated front page (18), "Moderator as a verb" is a result, not a task (25)

---

## ALL ARTIFACTS

| File | What | Session |
|------|------|---------|
| `the-moderator_2_1.html` | Core app (latest version) | Pre-existing |
| `server.js` + `package.json` | WebRTC signaling + Deepgram proxy | Pre-existing |
| `THE-MODERATOR-ATTACK-PLAN.md` | Full phased execution plan, 30 items, dependency map | 3 |
| `the-moderator-process-review.md` | Raw process review — every click, every gap, every dollar | 3 |
| `themoderatorprocessreview.pdf` | PDF version of process review, color-coded | 3 |
| `profile-depth-system.jsx` | Interactive React prototype of Profile Depth System | 3 |
| `cosmetics-shop-expanded.json` | 45 items (15 borders, 18 badges, 12 effects) | 2 |
| `cosmetics-shop-reference.md` | Visual reference guide with pricing, icons, integration notes | 2 |
| `subscription-tier-design.json` | Pro vs Free tier definition, features, pricing, revenue model | 2 |
| `subscription-tier-reference.md` | Visual comparison table + detailed feature breakdown | 2 |
| `token-earning-mechanics.json` | Daily challenges, streaks, leaderboard, earning paths | 2 |
| `token-earning-reference.md` | UI mockups, challenge rotation, affordability math, habit loop | 2 |
| `paywall-modal-design.json` | 4 variants (general, shop, social, leaderboard), timing, psychology | 2 |
| `paywall-modal-mockup.html` | Visual HTML preview of all 4 paywall variants | 2 |
| `paywall-strategy-reference.md` | Copy strategy, conversion psychology, KPIs, implementation checklist | 2 |

### Supporting Documents (Pre-existing)
| File | What |
|------|------|
| `the-moderator-handoff-v11.md` | Detailed technical handoff (LEGACY) |
| `the-moderator-5d-security-plan.md` | Security architecture |
| `the-moderator-bot-defense-tiers.md` | Bot detection tiers |
| `the-moderator-b2b-industry-analysis.md` | B2B market analysis |
| `b2b-industry-item-lists.md` | Specific data items by industry buyer |
| `the-moderator-education-deep-dive.md` | Education market models |
| `the-moderator-education-extracted.md` / `_1` / `_2` | Education mode extraction notes |
| `the-moderator-12month-roadmap.md` | 12-month revenue roadmap |
| `the-moderator-pitch-deck.html` / `.md` | Investor pitch deck |
| `the-moderator-stress-test.md` | Stress test analysis |
| `terms-of-service.html` | Legal ToS |
| `schema.sql` / `schema__1_.sql` | Database schemas |
| `rules_engine.py` / `b2b_export.py` / `backup_dump.py` / `rollback.py` / `restore_and_compare.py` | Backend utilities |

---

## SESSION SUMMARIES

### Session 1 (Feb 25, 2026)
Initial working session. Created process review, attack plan, profile depth system prototype. Established state file practice.

### Session 2 (Feb 25, 2026)
**Focus:** Phase 1 (Connect the Money) + Paywall design

**Completed:**
- ✅ Phase 1.3: Cosmetics shop (10 → 45 items, 3 categories)
- ✅ Phase 1.2: Subscription tiers (Free "Debater" vs Pro "Moderator Pro" $9.99/mo)
- ✅ Phase 1.4: Token earning path (daily login, challenges, streaks, leaderboard)
- ✅ Paywall modal design (4 variants, non-aggressive, benefit-focused)

**Key Decisions:**
- Free: 10 tokens/day, basic features, 40% shop
- Pro: $9.99/month, 30 tokens/day, all cosmetics, social, profile depth
- 7-day trial (no credit card required)
- 4 paywall variants triggered by user context
- Target conversion: 8-12% free → Pro in 6 months

**Time invested:** ~80 min

### Session 3 (Feb 26, 2026)
**Focus:** Strategic brainstorming — product philosophy, experience design, deep research

Owner-led brainstorm that reframed The Moderator from "debate app" to "emergence engine for structured discourse." Three rounds of academic/industry research conducted. Established 10 project areas and design philosophy.

**Key concepts adopted:**
- Third Place Theory (Oldenburg)
- Progressive Disclosure (Nielsen Norman Group)
- 90-9-1 Rule (Nielsen) — spectators are primary user
- Emergent Gameplay (Juul, Smith)
- Participatory Culture (Jenkins, MIT)
- Engineered Serendipity (Zuckerman, MIT)
- SBMM / Casual Protection (gaming industry)
- Short-form Clips as #1 growth lever

**Time invested:** ~120 min

### Session — March 1, 2026
**Focus:** Fix verdict page bug

**What happened:**
- Verdict page (`/verdict?id=...`) showed "Failed to load debate" despite all prior fixes (RLS, status filter, stray character)
- Previous handoff diagnosed it as a script execution race condition — that was wrong
- Systematically verified every link in the chain: Vercel rewrite ✅, deployed code matches GitHub ✅, config loads with real creds ✅, Supabase returns 200 with data ✅, render logic works ✅, middleware doesn't interfere ✅
- Root cause: line 344 `sb.rpc('view_auto_debate', {...}).catch(() => {})` — Supabase `rpc()` returns a query builder object, not a Promise. `.catch()` doesn't exist on it → TypeError → caught by outer try/catch → `showError('Failed to load debate.')` → render never happens
- Fix: wrapped in `try { sb.rpc(...); } catch(e) {}` instead
- Verdict page now loads fully: debate rounds, scorecard, vote buttons, share buttons, CTA all working

**User preferences established:**
- "suggest stuff, I choose the direction" — don't build without asking first
- "you are allowed to fail" — think and plan before executing
- "think. plan an attack. brainstorm what it could be" — systematic debugging, not shotgunning
