# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 18 (March 1, 2026)

> **The Old Testament** contains: session build logs, 502-item inventory, revenue model details, B2B data play, education plans, research foundations, growth strategy, and honest assessments. Read it when those areas are relevant.
> **Location:** `https://raw.githubusercontent.com/wolfe8105/colosseum/main/THE-COLOSSEUM-OLD-TESTAMENT.md`

---

# 1. WHAT THIS IS

1.1. Live audio debate platform / emergence engine
1.2. Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
1.3. Four core mechanics: Post → React → Challenge → Structure appears
1.4. Revenue: consumer subs, token economy, ads, B2B data licensing
1.5. Philosophy: digital third place — not a destination, a place you're already in
1.6. Identity question (OPEN): "The Moderator" or "The Colosseum"
   1.6.1. The Moderator: neutral, authoritative, verb potential ("let's moderate this"), started as teen debate platform
   1.6.2. The Colosseum: aggressive, male-coded, arena energy, targets men 16-65, Fox News/ESPN aesthetic DNA
   1.6.3. Colosseum rebrand expanded audience, shifted to subs + events + real-dollar tipping, spun off education
1.7. Owner: solo founder, no team, no money yet, no deadline

---

# 2. FOUNDER CONSTRAINTS (Session 18 — Critical Context)

2.1. Full-time engineering job (new job, no leverage yet)
2.2. Two children under age 10
2.3. Wife cannot assist with the project
2.4. No parents (both gone), no siblings, no aunts/uncles/cousins
2.5. No coworkers who can help (just started)
2.6. No friends in 25 years — zero personal network
2.7. No social media accounts — none (Reddit, X, Discord, nothing)
2.8. Android phone
2.9. ~1 hour free per day after work and kids
2.10. Up to $100/month budget for growth tools
2.11. **IMPLICATION: "Send to 10 friends" is impossible. Manual marketing is impossible. All growth must be automated with zero human involvement.**

---

# 3. GUIDING PRINCIPLES

3.1. **Temporary functional placeholders** — never block on human action, use "PASTE HERE" markers, app runs with placeholders
3.2. **Slow down, suggest, wait** — Claude presents 2-4 options, owner picks direction
3.3. **Small chunks with downloads** — work in pieces, present file, pause, ask what's next
3.4. **Allowed to fail** — better to attempt and fail than plan forever
3.5. **Verify before claiming done** — when "saved," confirm it's actually there
3.6. **Full file replacement over patches** — when updating any existing file, always produce the complete finished file ready to download and replace. Never produce diffs, patches, partial snippets, or "find this and replace with that" instructions. The human will delete the old file and replace with the new one. One action, not twenty.
3.7. **Bible is split** — New Testament (this file) is read every session. Old Testament is reference material, read only when relevant to the session's work.
3.8. **Read the bible first** — every session starts with `curl -s` on the New Testament via bash_tool, not web_fetch.
3.9. **Zero founder marketing time** — all growth is bot-driven, fully automated. Founder does not review, approve, or post anything. The machine runs itself. (Session 18)

---

# 4. KEY DECISIONS

4.1. Rebrand to The Colosseum, target male opinion culture 16-65
4.2. Mobile-forward design, phone is default
4.3. Real-dollar tipping replaces token microtransactions
4.4. Education removed for moral reasons, separate product later (August 2026)
4.5. Profile Depth System approved — 12 sections, 157 Qs, mixed rewards, $14.99 reducible to $0.49
4.6. Reward mix: not always money — discounts, badges, icons, cosmetic unlocks, feature unlocks
4.7. No B2B, no education, no bot defense until real users exist
4.8. Async debate mode is survival-critical
4.9. Predictions = core engagement loop
4.10. Follow system moves to free tier
4.11. Supabase chosen for backend
4.12. Kill the tile grid — themed sections with progressive disclosure
4.13. Casual tier is king — protected lobbies, non-negotiable
4.14. Spectators are the primary user — design for the 90%
4.15. Emergence engine philosophy
4.16. Reciprocal gating for data collection
4.17. 30-second ad slots between rounds
4.18. V2 rebuilds from scratch, foundation-first
4.19. Castle Ring Architecture
4.20. All JS modules use window.X global pattern (survives load failures)
4.21. Kill multi-zone home screen → spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
4.22. Visual system: Cinzel (display) + Barlow Condensed (body), diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80), dark frosted glass cards (rgba(10,17,40,0.6)), high-contrast white borders
4.23. Login flow: OAuth dominant (Google white, Apple black, full-width top), email collapsed behind toggle
4.24. Ticker bar and category tabs removed — spoke carousel IS the navigation
4.25. Zero-budget growth: intercept-arguments-where-they-happen, every shared link is an ad, every user is a promoter
4.26. Ungated first action: vote without signup, gate only on debate participation
4.27. All table writes locked behind server functions. Client JS uses supabase.rpc() for all mutations. Direct .from().insert()/.update()/.delete() blocked by RLS for sensitive tables
4.28. Hated Rivals mechanic — designated rival system, points doubled when you win against a rival
4.29. Couples Court added as topic category (Tier 2)
4.30. Client-side JS migration to .rpc() calls complete — all 4 JS modules with database writes (auth, async, notifications, voicememo) rewritten. Security hardening fully live (Move 1, 2, 3 all applied).
4.31. Paste order locked: Move 2 (functions) → Move 3 (sanitization patches) → Move 1 (RLS lockdown). Functions must exist before policies block direct writes.
4.32. react_hot_take() is a toggle function — single RPC handles both adding and removing reactions.
4.33. create_voice_take() function added for voice memo hot takes — handles voice_memo_url, voice_memo_path, voice_memo_duration, parent_id columns.
4.34. Profile upsert on signup removed from colosseum-auth.js — the auto-profile trigger in the schema already handles this.
4.35. deleteAccount() kept as direct .from('profiles').update({deleted_at}) — allowed by guard trigger since deleted_at is not in the protected columns list.
4.36. **Bot-driven growth model adopted** — fully automated 24/7 bot army replaces all manual marketing. Founder has zero involvement. Machine runs on Reddit, X, Discord. $100/month budget. (Session 18)
4.37. **"Send to 10 friends" is dead** — founder has no network. First users come from bots, not word of mouth. (Session 18)
4.38. **Growth scales with money, not founder energy** — double the bot budget = roughly double the output. (Session 18)

## 4.39. OPEN DECISIONS

4.39.1. Identity: The Moderator or The Colosseum?
4.39.2. Subscription price: $9.99 or $14.99 or tiered ($9.99/$19.99/$29.99)?
4.39.3. Minors policy: full app with restrictions or separate gated experience?
4.39.4. Launch date: what's real?

---

# 5. THREE CORE PROBLEMS

5.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Token purchases + subscriptions flow through. Still sandbox mode — switch to live when ready for real money.
5.2. **Single-player pretending to be multiplayer** — no follows, friends, teams, DMs, notifications, share links
5.3. **Sitting on a data business without collecting data** — B2B needs real accounts + profile depth + recordings, none exist
5.4. **No audience and no way to build one manually (Session 18)** — founder has zero network, zero social presence, zero free time. Bot army is the only viable path to first users.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

6.1. Ring 6 — Public Surface (designed to fall)
   6.1.1. Landing page, public debate listings, public leaderboard, public profiles, ToS
   6.1.2. Cloudflare CDN protection
6.2. Ring 5 — User Interaction (contained damage)
   6.2.1. Live debates (WebRTC audio), spectator chat, voting, predictions, Hot Takes feed, reactions
6.3. Ring 4 — Accounts & Trust (identity layer)
   6.3.1. Authentication, profiles, trust scores, cosmetics, achievements, settings
   6.3.2. Supabase auth + RLS policies
6.4. Ring 3 — Platform Data (integrity layer)
   6.4.1. Debate recordings, transcripts, Elo calculations, vote tallies, confidence scores
   6.4.2. Server-side only — never trust the client
   6.4.3. sanitize_text() + sanitize_url() — strips XSS from all inputs at DB boundary
   6.4.4. rate_limits table + check_rate_limit() — per-user per-action throttling
   6.4.5. 22 SECURITY DEFINER functions — the ONLY way to write to locked tables
6.5. Ring 2 — Financial Core (money layer)
   6.5.1. Stripe payments, subscription management, token ledger, transaction history
   6.5.2. Webhook-driven, no client-side financial logic
6.6. Ring 1 — B2B Intelligence
   6.6.1. Aggregated sentiment, argument trends, demographic cross-tabs, confidence scoring
   6.6.2. API-gated, rate-limited, watermarked
6.7. The Keep — Physical Gate
   6.7.1. Air-gapped backups — human plugs in USB nightly
   6.7.2. Script runs diff, flags anomalies, human reviews and approves
   6.7.3. YubiKey gates all B2B exports — no data leaves without physical key + human approval
6.8. Build order: Keep → Ring 2 → Ring 4 → Ring 3 → Ring 5 → Ring 6 → Ring 1

---

# 7. WHAT ACTUALLY EXISTS

## 7.1. LIVE INFRASTRUCTURE

7.1.1. ✅ Supabase project: faomczmipsccwbhpivmp (18 tables + rate_limits, RLS hardened, 22 server functions, sanitization, all pasted)
7.1.2. ✅ Vercel: colosseum-six.vercel.app (auto-deploys from GitHub)
7.1.3. ✅ Stripe sandbox: The Colosseum (7 products: 3 subs + 4 token packs)
7.1.4. ✅ Stripe Edge Functions deployed: create-checkout-session + stripe-webhook (on Supabase)
7.1.5. ✅ Stripe webhook listening for 4 events (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed)
7.1.6. ✅ Resend SMTP configured (custom email, rate limit removed)
7.1.7. ✅ Auth working end-to-end (signup → email verify → auto-login)
7.1.8. ✅ GitHub repo is source of truth (local folder redundant)
7.1.9. ✅ Security hardening FULLY LIVE — Move 1 (RLS), Move 2 (22 functions), Move 3 (sanitization + rate limits) all applied. Castle Ring 3 complete.

## 7.2. CURRENT FILE MANIFEST

### Core JS Modules (all use window.X global pattern)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-config.js | Central config, all credentials, feature flags | ✅ All PASTE spots filled except Deepgram |
| colosseum-auth.js | Supabase auth, profile CRUD via rpc(), follows via rpc() | ✅ Migrated Session 17 |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades | ✅ |
| colosseum-notifications.js | Notification center, mark read via rpc() | ✅ Migrated Session 17 |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper | ✅ |
| colosseum-async.js | Hot takes via rpc(), reactions via rpc() toggle | ✅ Migrated Session 17 |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links | ✅ |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank | ✅ |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic | ✅ |
| colosseum-arena.js | Debate arena, spectator mode, matchmaking, survey | ✅ |
| colosseum-home.js | Home screen logic, activity bar, predictions | ✅ |
| colosseum-scoring.js | Elo, XP, leveling (SELECT reads only, no migration needed) | ✅ |
| colosseum-webrtc.js | WebRTC audio via Supabase Realtime channels | ✅ |
| colosseum-voicememo.js | Voice memo mode, voice takes via rpc() | ✅ Migrated Session 17 |

### HTML Pages
| File | Purpose | Status |
|------|---------|--------|
| index.html | Main app shell, spoke carousel home, all module wiring | ✅ |
| colosseum-login.html | OAuth-dominant login, age gate, password reset | ✅ |
| colosseum-settings.html | All settings toggles, account mgmt, delete | ✅ |
| colosseum-profile-depth.html | 12 sections, 147 Qs, discount waterfall | ✅ |
| colosseum-terms.html | Terms of Service, Colosseum-branded | ✅ |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags | ✅ |

### Database SQL (paste into Supabase SQL Editor — order matters)
| File | Paste Order | Purpose | Status |
|------|-------------|---------|--------|
| colosseum-schema-production.sql | 1st | 18 tables, triggers, 45 cosmetics, 25 achievements | ✅ Pasted |
| colosseum-ring3-functions.sql | 2nd | Ring 3 server-side scoring/token functions | ✅ Pasted |
| colosseum-ring3-move2.sql | 3rd | Move 2: 22 SECURITY DEFINER validation functions | ✅ Pasted |
| colosseum-move3-sanitize-ratelimit.sql | 4th | Move 3: sanitize_text/url, rate_limits table | ✅ Pasted |
| colosseum-rls-hardened.sql | 5th (last) | Move 1: 24 hardened RLS policies, guard trigger, views | ✅ Pasted |

### Deployment & Infrastructure
| File | Purpose | Status |
|------|---------|--------|
| vercel.json | Routes, 12 security headers, CSP | ✅ (⏳ Session 16 hardened version not yet pushed to GitHub) |
| middleware.js | Edge Middleware: API rate limit, CORS, payload limit | ✅ (⏳ not yet pushed to GitHub) |
| DEPLOYMENT-GUIDE.md | Step-by-step paste instructions | ✅ |
| og-card-default.png | Default OG image for link previews (1200x630) | ✅ |

### API / Bots (Vercel serverless functions)
| File | Purpose | Status |
|------|---------|--------|
| api/telegram-webhook.js | Telegram bot: /debate, /settle, inline mode | ✅ Built, ⏳ needs BotFather setup |
| api/telegram-setup.js | One-time webhook registration | ✅ |
| api/discord-interactions.js | Discord bot: /settle, /debate, vote buttons | ✅ Built, ⏳ needs Discord Developer setup |
| api/discord-setup.js | One-time command registration + invite link | ✅ |

### Financial Models (Session 18)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-financials-session18.xlsx | Original projections (assumed organic network) | ✅ Reference only |
| colosseum-financials-v2-botdriven.xlsx | Bot-driven projections (founder's real situation) | ✅ Current model |

### Reference Files (not in repo)
| File | Purpose |
|------|---------|
| colosseum-stripe-functions.js | Deployed as Supabase Edge Functions |
| stripe-cors-patch.js | Reference for CORS fix on Stripe functions |
| RLS-AUDIT-REPORT.md | Documents 7 critical + 5 moderate vulnerabilities |
| MOVE2-CLIENT-MIGRATION-CHEATSHEET.md | Maps old .from() calls to new .rpc() equivalents |
| MOVE3-HUMAN-ACTIONS.md | 5-step human checklist for Move 3 |

### V1 Reference (superseded, not the path forward)
| File | Purpose |
|------|---------|
| the-moderator_2_1.html | 2,933 lines, ~265KB, vanilla JS, localStorage |
| the-moderator_2_2.html | Updated variant (~242KB) |
| server.js + package.json | WebRTC signaling + Deepgram proxy (not deployed) |
| terms-of-service.html | 19 sections (superseded by colosseum-terms.html) |

## 7.3. SECURITY STATUS (Session 17 — FULLY LIVE)

7.3.1. ✅ RLS audit completed — 7 critical vulnerabilities found and fixed
7.3.2. ✅ Move 2 pasted — 22 server-side SECURITY DEFINER functions across 11 sections
7.3.3. ✅ Move 3 pasted — sanitize_text(), sanitize_url(), rate_limits table, all functions patched
7.3.4. ✅ Move 1 pasted — 34 old policies dropped, 24 hardened replacements, guard trigger, public/private views
7.3.5. ✅ vercel.json hardened — CSP, HSTS, 12 security headers total (⏳ not yet pushed to GitHub)
7.3.6. ✅ middleware.js — API rate limiting (30/min per IP), CORS enforcement, payload limit (⏳ not yet pushed to GitHub)
7.3.7. ✅ Client-side JS modules migrated to .rpc() calls — all 4 modules with writes updated, pushed to GitHub
7.3.8. ⏳ Stripe Edge Function CORS needs patch from wildcard to allowlist (requires redeploy via Supabase CLI)
7.3.9. ⚠️ Known schema mismatch: Ring 3 place_prediction() expects UUID for predicted_winner, but predictions table has TEXT CHECK ('a','b'). Needs alignment later.

---

# 8. PRODUCT PHILOSOPHY

## 8.1. The Emergence Engine
8.1.1. Not a debate app — a social system where debates emerge
8.1.2. Source: emergent gameplay theory (Juul, Smith, Salen & Zimmerman)
8.1.3. Four mechanics: Post → React → Challenge → Structure appears
8.1.4. You don't go to the app to debate — you're hanging out and a debate happens to you

## 8.2. Third Place Theory
8.2.1. Source: Ray Oldenburg (1989), Discord research
8.2.2. Social space separate from home and work
8.2.3. Neutral ground, conversation is main activity, mood is playful, regulars set tone
8.2.4. The bar, not the arena — default state is the hangout
8.2.5. "Kill the destination mentality" — people are tired of being told where to go
8.2.6. "Presence over sessions" — reward being around, not logging in to do a task
8.2.7. "No cold start" — the app is alive before you got there

## 8.3. Spectators Are the Product
8.3.1. Source: 90-9-1 Rule (Nielsen), updated to ~55-30-15
8.3.2. Design for the 90% who watch, vote, react
8.3.3. Debaters are content, predictors are audience
8.3.4. Predictions work with 10 people online, not just 1,000

## 8.4. Casual Is King
8.4.1. Source: SBMM research (gaming industry)
8.4.2. Most users are casual — "Is Iverson underrated?" energy
8.4.3. Protected lobbies, no sharks in casual waters
8.4.4. Get bodied in a fun argument about pizza = never come back

## 8.5. Structured Spontaneity
8.5.1. Sections/banners = STRUCTURE
8.5.2. Hot takes/reactions = SPONTANEITY
8.5.3. Neither works alone

## 8.6. Engineered Serendipity
8.6.1. Source: Zuckerman, MIT Civic Media Lab
8.6.2. "Pixar bathroom principle" — trip over debates you weren't looking for
8.6.3. Live scores, headlines, trending clips surface passively

## 8.7. Reciprocal Gating — "Make Everything Matter"
8.7.1. Every platform action tied to something user wants
8.7.2. Can't see debate score until you rate moderator
8.7.3. Can't unlock cosmetic until profile section complete
8.7.4. Don't ask nicely — make the rating the key that unlocks what they want

## 8.8. The Liquidity Problem (SURVIVAL CRITICAL)
8.8.1. Live audio needs two people, same time, same topic, opposite sides
8.8.2. At small scale: users open lobby, see nobody, leave
8.8.3. Solutions:
   8.8.3.1. Text async debate — post argument, opponent replies later
   8.8.3.2. Voice memo mode — record take, opponent records theirs later
   8.8.3.3. AI sparring — practice against AI when nobody's online

## 8.9. The Content Funnel
8.9.1. Casual space IS the feed, debate IS the event
8.9.2. Internal path: conversation in app → escalates to debate
8.9.3. External path: conversation elsewhere → "take it to the Moderator" → resolves here
8.9.4. "Bet." button — one-tap challenge from disagreement
8.9.5. Browser extension for challenging from any website
8.9.6. Embeddable link/button for Reddit, Twitter, group chats, Discord
8.9.7. Research note: target group chats/Discord/iMessage, not major platforms (walled garden resistance)

---

# 9. DESIGN DNA

## 9.1. Fox News Elements
9.1.1. Navy blue top nav, white text category tabs
9.1.2. Red "BREAKING" / "TRENDING" badges — urgency
9.1.3. Ticker bar: trending left, personalized data right
9.1.4. "Watch TV" red CTA button
9.1.5. "ON AIR NOW" promo cards
9.1.6. Chyron-style lower-third overlays — punchy 2-4 word labels
9.1.7. Content hierarchy: lead stories 2-column, sub-stories bulleted beneath
9.1.8. Read time + comment count — engagement social proof
9.1.9. Right rail sidebar (~30% width) — permanent upsell column
9.1.10. Branded category names ("KITCHEN CABINET" not "Food")
9.1.11. "Fox News IQ" predictions widget — audience participation baked in
9.1.12. Topics not segregated — one feed — validates "one arena, many categories"
9.1.13. Palette: navy, white, red. Gold absent = Colosseum differentiator

## 9.2. ESPN Elements
9.2.1. Scoreboard ticker with live/final scores
9.2.2. "Tonight's Card" for upcoming matchups
9.2.3. Horizontal swipeable result cards
9.2.4. Tab-based content sections
9.2.5. Stats-heavy profile cards

## 9.3. The Colosseum Aesthetic
9.3.1. Fox chyron energy + ESPN stat cards + gladiator gold
9.3.2. Palette: navy, red, white, GOLD
9.3.3. Mobile-forward: phone default, 44px touch targets, scroll-snap
9.3.4. Desktop 1100px+ gets sidebar
9.3.5. Current visual system (Session 12):
   9.3.5.1. Fonts: Cinzel (display) + Barlow Condensed (body)
   9.3.5.2. Background: diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80)
   9.3.5.3. Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
   9.3.5.4. Borders: high-contrast white (rgba(255,255,255,0.2-0.3))

## 9.4. Topic Architecture
9.4.1. Tier 1 launch: Politics + Sports
9.4.2. Tier 2 bridge: Entertainment/Tabloids + Couples Court
9.4.3. Tier 3 depth: Music, Movies/TV, Cars/Culture

## 9.5. Customer Segments
9.5.1. Lurker (free/ads) — watches, votes
9.5.2. Contender ($9.99) — regular debater
9.5.3. Champion ($19.99) — competitor
9.5.4. Creator ($29.99) — showman, content creator tools

---

# 10. BOT-DRIVEN GROWTH MODEL (Session 18)

## 10.1. Why Bots, Not Manual Marketing
10.1.1. Founder has no network — zero friends, no family, no coworkers, no social accounts
10.1.2. Founder has ~1 hour/day free — cannot sustain manual outreach
10.1.3. Founder is an engineer, not a marketer — cannot evaluate "good threads" vs bad
10.1.4. Solution: fully automated bot army that runs 24/7 with zero human involvement

## 10.2. Two-Leg Bot Architecture
10.2.1. **Leg 1 — Reactive (fishing in other people's ponds):** Scan Reddit, X, Discord for existing arguments. Drop contextual replies with Colosseum links. Lower CTR (~3%) because you're a stranger in someone else's conversation.
10.2.2. **Leg 2 — Proactive (creating your own pond):** Scan Google News, ESPN, trending X topics, political headlines every few minutes. When something breaks, auto-generate a hot take post on @TheColosseum X account and auto-create a fresh debate/vote page on the app. The post links directly to the vote page. The debate page exists before anyone clicks.
10.2.3. Leg 2 is the higher-value play — you own the content, you own the audience, no risk of bans from other people's spaces.
10.2.4. Leg 1 drives steady drip traffic from established communities.
10.2.5. Both legs run 24/7 simultaneously.

## 10.3. Bot Output Capacity (per day)

### Leg 1 — Reactive
10.3.1. Reddit: 10 rotating accounts × 25 comments/day = 250 comments
10.3.2. X/Twitter reply accounts: 3 accounts × 30 replies/day = 90 replies
10.3.3. Discord: 15 servers, bots respond to arguments = ~30 interactions
10.3.4. **Leg 1 total: ~370/day raw, ~185 visible after moderation**

### Leg 2 — Proactive
10.3.5. Google News / ESPN / trending topic scan: continuous
10.3.6. @TheColosseum X posts: 5-10 hot takes/day timed to breaking news
10.3.7. Auto-generated debate pages on app for each post (page exists before anyone clicks)
10.3.8. X organic reach on trending topics: 500-5,000 impressions per well-timed post
10.3.9. **Leg 2 total: 5-10 original posts/day, ~2,500-25,000 impressions/day**
10.3.10. Leg 2 has higher CTR (~5-8%) because the content IS the hook, not a comment on someone else's thread

### Combined
10.3.11. **Total daily reach: ~3,000-25,000+ impressions**
10.3.12. ~5,550 visible Leg 1 mentions/month + Leg 2 impression volume
10.3.13. Leg 2 becomes dominant growth driver as @TheColosseum account builds followers

## 10.4. Conversion Funnel (bot mentions → users)
10.4.1. Leg 1 CTR: ~3% (stranger in someone else's conversation) → ~167 visits/month
10.4.2. Leg 2 CTR: ~5-8% (original content, direct link) → scales with impressions
10.4.3. 30% of visitors vote (ungated, one tap)
10.4.4. 15% of voters sign up (hooked by result, OAuth one-tap)
10.4.5. 1.3x word-of-mouth multiplier
10.4.6. **Month 1 estimate: ~9-15 new users** (Leg 1 dominant early)
10.4.7. **Month 12 estimate: ~200-400 new users** (Leg 2 dominant as X account grows)
10.4.8. Bot improves over time — account aging, better targeting, learning what converts

## 10.5. Bot Operating Costs ($100/month)
10.5.1. VPS for bot hosting: $10
10.5.2. Social listening tool: $30
10.5.3. ReplyAgent or similar: $30
10.5.4. Proxy rotation (avoid IP bans): $15
10.5.5. Reserve/new tools: $15

## 10.6. Revised Financial Projections (Bot-Driven)
10.6.1. Month 1 MAU: 9-15 (was 50 in old model)
10.6.2. Month 3 MAU: 30-50 (was 300)
10.6.3. Month 12 MAU: 400-700 (was 2,000) — higher than previous bot estimate due to Leg 2
10.6.4. Year 1 total signups: 900-1,500
10.6.5. Year 1 revenue: ~$3,100-6,000
10.6.6. Year 1 costs: ~$1,900 (including $1,200 bot costs)
10.6.7. **Year 1 net profit: ~$1,200-4,100**
10.6.8. Break-even month: ~Month 7-9
10.6.9. Total risk if strategy fails: ~$600-800 in bot costs before break-even

## 10.7. Key Insight: Scales With Money, Not Energy
10.6.1. Double bot budget ($200/mo) ≈ double output
10.6.2. Growth ceiling = wallet, not founder's sleep schedule
10.6.3. Affordable experiment: worst case you lose $800 and know it doesn't work

---

# 11. WHAT TO DO NEXT

## 11.1. PENDING HUMAN ACTIONS

11.1.1. ⏳ Push middleware.js + hardened vercel.json (from Session 16) to GitHub
11.1.2. ⏳ Lock Supabase CORS to colosseum-six.vercel.app only (Settings → API → CORS)
11.1.3. ⏳ Patch + redeploy Stripe Edge Function CORS (wildcard → allowlist, requires Supabase CLI)
11.1.4. ⏳ Telegram: talk to @BotFather, create bot, paste token into Vercel env vars, visit /api/telegram-setup
11.1.5. ⏳ Discord: create app at discord.com/developers, paste 3 env vars into Vercel, visit /api/discord-setup, set Interactions Endpoint URL, add bot to servers
11.1.6. ⏳ Create Reddit account (bot-operated, needed for growth machine)
11.1.7. ⏳ Create X/Twitter account (bot-operated, @TheColosseum brand account)
11.1.8. ⏳ Create Discord account (for joining argument servers with bot)
11.1.9. ⏳ Replace bible files on GitHub with Session 18 versions

## 11.2. NEXT BUILD PRIORITIES

11.2.1. Build and deploy the bot army (fully automated growth machine)
11.2.2. Watch what happens — monitor signups with zero involvement
11.2.3. Build next thing based on what real users do

## 11.3. GROWTH PRIORITIES (Updated Session 18)

| # | Tactic | Cost | Status |
|---|--------|------|--------|
| 1 | Bot army — Reddit, X, Discord automation | $100/mo | ⏳ Next build |
| 2 | F5Bot keyword alerts (feeds the bot) | $0 | ⏳ Setup during bot build |
| 3 | Dynamic OG meta tags | $0 | ✅ Session 14 |
| 4 | Watermark on all share outputs | $0 | ✅ Session 14 |
| 5 | Shareable result cards | $0 | ✅ Session 14 |
| 6 | Ungated debate landing page | $0 | ✅ Session 14 |
| 7 | Telegram /debate bot | $0 | ✅ Session 15 |
| 8 | Discord /settle bot | $0 | ✅ Session 15 |
| 9 | Brand X account (bot-posted hot takes) | $0 | ⏳ Part of bot army |
| 10 | Chrome extension MVP | $0 | When 50+ users |
| 11 | Embeddable widget | $0 | When content exists |
| 12 | Short-form video clips | $0 | When live debates exist |
| 13 | AI agent debates | $0 | If trend emerges |

---

*This is the New Testament. For session build logs, the 502-item inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy details — see the Old Testament.*
