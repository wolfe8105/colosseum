# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 17 (March 1, 2026)

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

# 2. GUIDING PRINCIPLES

2.1. **Temporary functional placeholders** — never block on human action, use "PASTE HERE" markers, app runs with placeholders
2.2. **Slow down, suggest, wait** — Claude presents 2-4 options, owner picks direction
2.3. **Small chunks with downloads** — work in pieces, present file, pause, ask what's next
2.4. **Allowed to fail** — better to attempt and fail than plan forever
2.5. **Verify before claiming done** — when "saved," confirm it's actually there
2.6. **Full file replacement over patches** — when updating any existing file, always produce the complete finished file ready to download and replace. Never produce diffs, patches, partial snippets, or "find this and replace with that" instructions. The human will delete the old file and replace with the new one. One action, not twenty.
2.7. **Bible is split** — New Testament (this file) is read every session. Old Testament is reference material, read only when relevant to the session's work.
2.8. **Read the bible first** — every session starts with `curl -s` on the New Testament via bash_tool, not web_fetch.

---

# 3. KEY DECISIONS

3.1. Rebrand to The Colosseum, target male opinion culture 16-65
3.2. Mobile-forward design, phone is default
3.3. Real-dollar tipping replaces token microtransactions
3.4. Education removed for moral reasons, separate product later (August 2026)
3.5. Profile Depth System approved — 12 sections, 157 Qs, mixed rewards, $14.99 reducible to $0.49
3.6. Reward mix: not always money — discounts, badges, icons, cosmetic unlocks, feature unlocks
3.7. No B2B, no education, no bot defense until real users exist
3.8. Async debate mode is survival-critical
3.9. Predictions = core engagement loop
3.10. Follow system moves to free tier
3.11. Supabase chosen for backend
3.12. Kill the tile grid — themed sections with progressive disclosure
3.13. Casual tier is king — protected lobbies, non-negotiable
3.14. Spectators are the primary user — design for the 90%
3.15. Emergence engine philosophy
3.16. Reciprocal gating for data collection
3.17. 30-second ad slots between rounds
3.18. V2 rebuilds from scratch, foundation-first
3.19. Castle Ring Architecture
3.20. All JS modules use window.X global pattern (survives load failures)
3.21. Kill multi-zone home screen → spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
3.22. Visual system: Cinzel (display) + Barlow Condensed (body), diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80), dark frosted glass cards (rgba(10,17,40,0.6)), high-contrast white borders
3.23. Login flow: OAuth dominant (Google white, Apple black, full-width top), email collapsed behind toggle
3.24. Ticker bar and category tabs removed — spoke carousel IS the navigation
3.25. Zero-budget growth: intercept-arguments-where-they-happen, every shared link is an ad, every user is a promoter
3.26. Ungated first action: vote without signup, gate only on debate participation
3.27. All table writes locked behind server functions. Client JS uses supabase.rpc() for all mutations. Direct .from().insert()/.update()/.delete() blocked by RLS for sensitive tables
3.28. Hated Rivals mechanic — designated rival system, points doubled when you win against a rival
3.29. Couples Court added as topic category (Tier 2)
3.30. Client-side JS migration to .rpc() calls complete — all 4 JS modules with database writes (auth, async, notifications, voicememo) rewritten. Security hardening fully live (Move 1, 2, 3 all applied).
3.31. Paste order locked: Move 2 (functions) → Move 3 (sanitization patches) → Move 1 (RLS lockdown). Functions must exist before policies block direct writes.
3.32. react_hot_take() is a toggle function — single RPC handles both adding and removing reactions.
3.33. create_voice_take() function added for voice memo hot takes — handles voice_memo_url, voice_memo_path, voice_memo_duration, parent_id columns.
3.34. Profile upsert on signup removed from colosseum-auth.js — the auto-profile trigger in the schema already handles this.
3.35. deleteAccount() kept as direct .from('profiles').update({deleted_at}) — allowed by guard trigger since deleted_at is not in the protected columns list.

## 3.36. OPEN DECISIONS

3.36.1. Identity: The Moderator or The Colosseum?
3.36.2. Subscription price: $9.99 or $14.99 or tiered ($9.99/$19.99/$29.99)?
3.36.3. Minors policy: full app with restrictions or separate gated experience?
3.36.4. Launch date: what's real?

---

# 4. THREE CORE PROBLEMS

4.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Token purchases + subscriptions flow through. Still sandbox mode — switch to live when ready for real money.
4.2. **Single-player pretending to be multiplayer** — no follows, friends, teams, DMs, notifications, share links
4.3. **Sitting on a data business without collecting data** — B2B needs real accounts + profile depth + recordings, none exist

---

# 5. ARCHITECTURE — CASTLE RING MODEL

5.1. Ring 6 — Public Surface (designed to fall)
   5.1.1. Landing page, public debate listings, public leaderboard, public profiles, ToS
   5.1.2. Cloudflare CDN protection
5.2. Ring 5 — User Interaction (contained damage)
   5.2.1. Live debates (WebRTC audio), spectator chat, voting, predictions, Hot Takes feed, reactions
5.3. Ring 4 — Accounts & Trust (identity layer)
   5.3.1. Authentication, profiles, trust scores, cosmetics, achievements, settings
   5.3.2. Supabase auth + RLS policies
5.4. Ring 3 — Platform Data (integrity layer)
   5.4.1. Debate recordings, transcripts, Elo calculations, vote tallies, confidence scores
   5.4.2. Server-side only — never trust the client
   5.4.3. sanitize_text() + sanitize_url() — strips XSS from all inputs at DB boundary
   5.4.4. rate_limits table + check_rate_limit() — per-user per-action throttling
   5.4.5. 22 SECURITY DEFINER functions — the ONLY way to write to locked tables
5.5. Ring 2 — Financial Core (money layer)
   5.5.1. Stripe payments, subscription management, token ledger, transaction history
   5.5.2. Webhook-driven, no client-side financial logic
5.6. Ring 1 — B2B Intelligence
   5.6.1. Aggregated sentiment, argument trends, demographic cross-tabs, confidence scoring
   5.6.2. API-gated, rate-limited, watermarked
5.7. The Keep — Physical Gate
   5.7.1. Air-gapped backups — human plugs in USB nightly
   5.7.2. Script runs diff, flags anomalies, human reviews and approves
   5.7.3. YubiKey gates all B2B exports — no data leaves without physical key + human approval
5.8. Build order: Keep → Ring 2 → Ring 4 → Ring 3 → Ring 5 → Ring 6 → Ring 1

---

# 6. WHAT ACTUALLY EXISTS

## 6.1. LIVE INFRASTRUCTURE

6.1.1. ✅ Supabase project: faomczmipsccwbhpivmp (18 tables + rate_limits, RLS hardened, 22 server functions, sanitization, all pasted)
6.1.2. ✅ Vercel: colosseum-six.vercel.app (auto-deploys from GitHub)
6.1.3. ✅ Stripe sandbox: The Colosseum (7 products: 3 subs + 4 token packs)
6.1.4. ✅ Stripe Edge Functions deployed: create-checkout-session + stripe-webhook (on Supabase)
6.1.5. ✅ Stripe webhook listening for 4 events (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed)
6.1.6. ✅ Resend SMTP configured (custom email, rate limit removed)
6.1.7. ✅ Auth working end-to-end (signup → email verify → auto-login)
6.1.8. ✅ GitHub repo is source of truth (local folder redundant)
6.1.9. ✅ Security hardening FULLY LIVE — Move 1 (RLS), Move 2 (22 functions), Move 3 (sanitization + rate limits) all applied. Castle Ring 3 complete.

## 6.2. CURRENT FILE MANIFEST

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

## 6.3. SECURITY STATUS (Session 17 — FULLY LIVE)

6.3.1. ✅ RLS audit completed — 7 critical vulnerabilities found and fixed
6.3.2. ✅ Move 2 pasted — 22 server-side SECURITY DEFINER functions across 11 sections
6.3.3. ✅ Move 3 pasted — sanitize_text(), sanitize_url(), rate_limits table, all functions patched
6.3.4. ✅ Move 1 pasted — 34 old policies dropped, 24 hardened replacements, guard trigger, public/private views
6.3.5. ✅ vercel.json hardened — CSP, HSTS, 12 security headers total (⏳ not yet pushed to GitHub)
6.3.6. ✅ middleware.js — API rate limiting (30/min per IP), CORS enforcement, payload limit (⏳ not yet pushed to GitHub)
6.3.7. ✅ Client-side JS modules migrated to .rpc() calls — all 4 modules with writes updated, pushed to GitHub
6.3.8. ⏳ Stripe Edge Function CORS needs patch from wildcard to allowlist (requires redeploy via Supabase CLI)
6.3.9. ⚠️ Known schema mismatch: Ring 3 place_prediction() expects UUID for predicted_winner, but predictions table has TEXT CHECK ('a','b'). Needs alignment later.

---

# 7. PRODUCT PHILOSOPHY

## 7.1. The Emergence Engine
7.1.1. Not a debate app — a social system where debates emerge
7.1.2. Source: emergent gameplay theory (Juul, Smith, Salen & Zimmerman)
7.1.3. Four mechanics: Post → React → Challenge → Structure appears
7.1.4. You don't go to the app to debate — you're hanging out and a debate happens to you

## 7.2. Third Place Theory
7.2.1. Source: Ray Oldenburg (1989), Discord research
7.2.2. Social space separate from home and work
7.2.3. Neutral ground, conversation is main activity, mood is playful, regulars set tone
7.2.4. The bar, not the arena — default state is the hangout
7.2.5. "Kill the destination mentality" — people are tired of being told where to go
7.2.6. "Presence over sessions" — reward being around, not logging in to do a task
7.2.7. "No cold start" — the app is alive before you got there

## 7.3. Spectators Are the Product
7.3.1. Source: 90-9-1 Rule (Nielsen), updated to ~55-30-15
7.3.2. Design for the 90% who watch, vote, react
7.3.3. Debaters are content, predictors are audience
7.3.4. Predictions work with 10 people online, not just 1,000

## 7.4. Casual Is King
7.4.1. Source: SBMM research (gaming industry)
7.4.2. Most users are casual — "Is Iverson underrated?" energy
7.4.3. Protected lobbies, no sharks in casual waters
7.4.4. Get bodied in a fun argument about pizza = never come back

## 7.5. Structured Spontaneity
7.5.1. Sections/banners = STRUCTURE
7.5.2. Hot takes/reactions = SPONTANEITY
7.5.3. Neither works alone

## 7.6. Engineered Serendipity
7.6.1. Source: Zuckerman, MIT Civic Media Lab
7.6.2. "Pixar bathroom principle" — trip over debates you weren't looking for
7.6.3. Live scores, headlines, trending clips surface passively

## 7.7. Reciprocal Gating — "Make Everything Matter"
7.7.1. Every platform action tied to something user wants
7.7.2. Can't see debate score until you rate moderator
7.7.3. Can't unlock cosmetic until profile section complete
7.7.4. Don't ask nicely — make the rating the key that unlocks what they want

## 7.8. The Liquidity Problem (SURVIVAL CRITICAL)
7.8.1. Live audio needs two people, same time, same topic, opposite sides
7.8.2. At small scale: users open lobby, see nobody, leave
7.8.3. Solutions:
   7.8.3.1. Text async debate — post argument, opponent replies later
   7.8.3.2. Voice memo mode — record take, opponent records theirs later
   7.8.3.3. AI sparring — practice against AI when nobody's online

## 7.9. The Content Funnel
7.9.1. Casual space IS the feed, debate IS the event
7.9.2. Internal path: conversation in app → escalates to debate
7.9.3. External path: conversation elsewhere → "take it to the Moderator" → resolves here
7.9.4. "Bet." button — one-tap challenge from disagreement
7.9.5. Browser extension for challenging from any website
7.9.6. Embeddable link/button for Reddit, Twitter, group chats, Discord
7.9.7. Research note: target group chats/Discord/iMessage, not major platforms (walled garden resistance)

---

# 8. DESIGN DNA

## 8.1. Fox News Elements
8.1.1. Navy blue top nav, white text category tabs
8.1.2. Red "BREAKING" / "TRENDING" badges — urgency
8.1.3. Ticker bar: trending left, personalized data right
8.1.4. "Watch TV" red CTA button
8.1.5. "ON AIR NOW" promo cards
8.1.6. Chyron-style lower-third overlays — punchy 2-4 word labels
8.1.7. Content hierarchy: lead stories 2-column, sub-stories bulleted beneath
8.1.8. Read time + comment count — engagement social proof
8.1.9. Right rail sidebar (~30% width) — permanent upsell column
8.1.10. Branded category names ("KITCHEN CABINET" not "Food")
8.1.11. "Fox News IQ" predictions widget — audience participation baked in
8.1.12. Topics not segregated — one feed — validates "one arena, many categories"
8.1.13. Palette: navy, white, red. Gold absent = Colosseum differentiator

## 8.2. ESPN Elements
8.2.1. Scoreboard ticker with live/final scores
8.2.2. "Tonight's Card" for upcoming matchups
8.2.3. Horizontal swipeable result cards
8.2.4. Tab-based content sections
8.2.5. Stats-heavy profile cards

## 8.3. The Colosseum Aesthetic
8.3.1. Fox chyron energy + ESPN stat cards + gladiator gold
8.3.2. Palette: navy, red, white, GOLD
8.3.3. Mobile-forward: phone default, 44px touch targets, scroll-snap
8.3.4. Desktop 1100px+ gets sidebar
8.3.5. Current visual system (Session 12):
   8.3.5.1. Fonts: Cinzel (display) + Barlow Condensed (body)
   8.3.5.2. Background: diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80)
   8.3.5.3. Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
   8.3.5.4. Borders: high-contrast white (rgba(255,255,255,0.2-0.3))

## 8.4. Topic Architecture
8.4.1. Tier 1 launch: Politics + Sports
8.4.2. Tier 2 bridge: Entertainment/Tabloids + Couples Court
8.4.3. Tier 3 depth: Music, Movies/TV, Cars/Culture

## 8.5. Customer Segments
8.5.1. Lurker (free/ads) — watches, votes
8.5.2. Contender ($9.99) — regular debater
8.5.3. Champion ($19.99) — competitor
8.5.4. Creator ($29.99) — showman, content creator tools

---

# 9. WHAT TO DO NEXT

## 9.1. PENDING HUMAN ACTIONS

9.1.1. ⏳ Push middleware.js + hardened vercel.json (from Session 16) to GitHub
9.1.2. ⏳ Lock Supabase CORS to colosseum-six.vercel.app only (Settings → API → CORS)
9.1.3. ⏳ Patch + redeploy Stripe Edge Function CORS (wildcard → allowlist, requires Supabase CLI)
9.1.4. ⏳ Telegram: talk to @BotFather, create bot, paste token into Vercel env vars, visit /api/telegram-setup
9.1.5. ⏳ Discord: create app at discord.com/developers, paste 3 env vars into Vercel, visit /api/discord-setup, set Interactions Endpoint URL, add bot to servers
9.1.6. ⏳ Send link to 10 people — THE only remaining pre-launch item

## 9.2. NEXT BUILD PRIORITIES

9.2.1. Send link to 10 real humans
9.2.2. Watch what happens
9.2.3. Build next thing based on what real users do

## 9.3. GROWTH PRIORITIES (from Section 8 in Old Testament)

| # | Tactic | Cost | Status |
|---|--------|------|--------|
| 1 | F5Bot keyword alerts | $0 | ⏳ Human action |
| 2 | X Reply Guy (Moderator persona) | $0 | ⏳ Human action |
| 3 | Dynamic OG meta tags | $0 | ✅ Session 14 |
| 4 | Watermark on all share outputs | $0 | ✅ Session 14 |
| 5 | Shareable result cards | $0 | ✅ Session 14 |
| 6 | Ungated debate landing page | $0 | ✅ Session 14 |
| 7 | Telegram /debate bot | $0 | ✅ Session 15 |
| 8 | Discord /settle bot | $0 | ✅ Session 15 |
| 9 | Brand X account (hot takes) | $0 | ⏳ Human action |
| 10 | ReplyAgent trial | $10 | ⏳ Human action |
| 11 | F5Bot + n8n automation | $0 | ⏳ Human action |
| 12 | Chrome extension MVP | $0 | When 50+ users |
| 13 | Embeddable widget | $0 | When content exists |
| 14 | Short-form video clips | $0 | When live debates exist |
| 15 | AI agent debates | $0 | If trend emerges |

---

*This is the New Testament. For session build logs, the 502-item inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy details — see the Old Testament.*
