# THE COLOSSEUM — IMPLEMENTATION MAP
### How Every Design Principle Gets Built
### Created: Session 27 (March 2, 2026)

> Each area lists what needs to happen, which features it touches, where it connects to other areas, and what's done vs not. When areas intertwine, the connection is noted at the point it happens — not in a separate section you have to go hunt for.

---

# AREA 1: DEFENSE
**See: THE-COLOSSEUM-DEFENSE-MAP.md for the full breakdown.**
**Summary: 12 defense layers, all 86 features traced, gaps prioritized by phase.**

Defense touches every other area. Rather than repeat it all here, the Defense Map is the reference. When other areas below mention defense, they point back to the specific layer.

---

# AREA 2: MOBILE FORWARD

## The Road: Make the phone the default experience for everything.

### Layout & Navigation
2.1. Spoke carousel as home screen (6 categories, hollow center, 18° tilt)
2.2. Thumb-spin interaction on carousel
2.3. Bottom navigation bar
2.4. Category overlays slide up from carousel tap
2.5. Back navigation always one tap
2.6. No horizontal scrolling required for core actions
2.7. Sidebar content moves inline on mobile, sidebar appears at 1100px+ desktop only

### Touch & Interaction
2.8. 44px minimum touch targets on all buttons, links, interactive elements
2.9. Scroll-snap on all horizontal swipeable content
2.10. Touch momentum on swipes
2.11. Swipeable hot takes feed (vertical)
2.12. Swipeable result cards (horizontal, ESPN style)
2.13. Swipeable leaderboard avatar cards (horizontal)
2.14. Bottom-sheet modals for user profiles (not full-page popups)
2.15. Pull-to-refresh on feeds

### Debate Experience on Mobile
2.16. Arena lobby grid optimized for portrait
2.17. Mode select as visual cards (not dropdown)
2.18. Text battle input pinned to bottom of screen (keyboard-friendly)
2.19. Voice memo one-tap record button (large, centered, thumb-reachable)
2.20. Live audio debate — minimal UI during active debate (timer, opponent name, end button)
2.21. Post-debate stats in scrollable cards (not a dense table)

### Sharing & Links
2.22. Deep links that open correctly on mobile browsers
2.23. OG tags on all shareable pages (rich previews in iMessage, WhatsApp, Twitter, Discord)
2.24. Web Share API for native share sheet on mobile
2.25. Share cards sized for mobile social platforms (Instagram story, Twitter, etc.)

> **Connects to Area #3 (Ease of Use):** Every mobile layout decision IS an ease-of-use decision. If a touch target is too small, that's both a mobile failure and a usability failure. These two areas are nearly inseparable on phone.

> **Connects to Area #7 (Guest Access):** Deep links from bot army must land correctly on mobile. If someone taps a Reddit link on their phone, they see content immediately — no login wall, no broken layout.

> **Connects to Area #10 (Rage Engine):** Share cards and OG tags are the viral mechanism. A rage-bait auto-debate verdict needs to look compelling in a link preview or nobody taps it.

### Status
- ✅ Spoke carousel built
- ✅ 44px targets implemented
- ✅ Scroll-snap on feeds
- ✅ Bottom-sheet profile modals
- ✅ Category overlays
- ✅ Deep links
- ✅ OG tags on debate landing page
- ⏳ Pull-to-refresh not implemented
- ⏳ Share card sizing for specific platforms not optimized
- ⏳ Voice memo UX not tested on real phones
- ⏳ Keyboard handling in text battle not verified on mobile

---

# AREA 3: EASE OF USE

## The Road: A new user should never ask "where am I?" or "what do I do?"

### First 10 Seconds (Guest Lands From Bot Link)
3.1. Page loads in under 3 seconds (auth timeout guarantees this)
3.2. Content visible immediately (no loading gates)
3.3. Spoke carousel communicates "pick a category" without instructions
3.4. Active category shows activity indicators (debate count, hot take count)
3.5. No modals, popups, or cookie banners blocking the view

> **Connects to Area #7 (Guest Access):** The first 10 seconds ARE guest access. These two roads run parallel from landing to first action.

> **Connects to Area #12 (Ship or Die):** If the first 10 seconds are broken, the bot army is useless. This is a shipping prerequisite.

### Navigation Clarity
3.6. Every screen has a clear title showing where you are
3.7. Back button always visible and predictable
3.8. No more than 2 taps to reach any major feature from home
3.9. Feature flags hide anything not ready (v2.2.0 pattern — never show broken features)
3.10. Arena lobby clearly shows which debates are live vs AI vs waiting
3.11. Queue timeout gives clear alternatives (never a dead end)

> **Connects to Area #4 (Never Feel Empty):** An empty category with no hot takes and no debates IS a navigation problem. The user thinks they went to the wrong place. Content seeding directly affects ease of use.

### Action Clarity
3.12. Every tappable element looks tappable (visual affordance)
3.13. Auth prompts explain what you gain by signing up, not just "log in required"
3.14. Reactions provide instant visual feedback (color change, count update)
3.15. Vote confirms your choice visually
3.16. Post hot take has a clear input area and submit button
3.17. Prediction placement shows what you're predicting and the stakes
3.18. Follow/unfollow is a single toggle with clear state

> **Connects to Area #9 (Reciprocal Gating):** Gating works only if the user understands what they're getting in return. "Complete your profile to unlock this" needs to be clear, not confusing.

### Error Handling
3.19. Rate limit hit → friendly message with "try again in X seconds"
3.20. Network error → "Something went wrong, tap to retry"
3.21. Auth expired mid-session → soft prompt to re-login, not a hard kick
3.22. Supabase down → app still loads (guest mode), shows cached or static content where possible
3.23. No raw error codes or stack traces shown to users

> **Connects to Area #1 (Defense):** Defense Layer 12 (Auth Resilience) directly serves ease of use. The timeout safety net means the user never sees a broken state.

### Learning Curve
3.24. Elo explanation accessible from leaderboard
3.25. Debate mode descriptions on mode select screen
3.26. First-time tooltips on key actions (future)
3.27. "How it works" section accessible from somewhere (future)

### Status
- ✅ Spoke carousel communicates navigation
- ✅ Feature flags hide unfinished work
- ✅ Queue timeout offers alternatives
- ✅ Auth prompts appear at action point, not as wall
- ✅ Toggle reactions with visual feedback
- ✅ Auth timeout prevents broken states
- ⏳ Activity indicators on categories (debate count, hot take count)
- ⏳ Pull-to-refresh
- ⏳ First-time tooltips
- ⏳ Elo explainer
- ⏳ Error messages are generic — need friendlier copy
- ⏳ Loading states may be inconsistent across features

---

# AREA 4: NEVER FEEL EMPTY

## The Road: The app must feel alive from the first tap, even with zero real users.

### AI-Generated Content (Always Running)
4.1. Auto-debate engine generates 6 AI debates per day
4.2. Auto-debates cover all active categories (not all in one category)
4.3. Auto-debate topics selected for maximum disagreement potential
4.4. AI deliberately picks the unpopular winner (rage-bait scoring)
4.5. Auto-debates populate arena lobby feed
4.6. Auto-debate landing pages are fully functional (vote, view verdict)
4.7. AI Sparring always available as instant-start opponent (no queue wait)

> **Connects to Area #10 (Rage Engine):** Auto-debates ARE the rage engine. These two roads are the same road for the first 3 months. The content that fills the empty room is the same content that drives growth.

> **Connects to Area #11 (Zero Founder Marketing):** Auto-debate generation is automated via Groq. Founder doesn't write topics, doesn't review output. It runs.

### Bot-Seeded Content
4.8. Leg 2 bots post 5-10 hot takes per day across categories
4.9. Hot takes spread across all categories (not clustered)
4.10. Bot hot takes are written to sound like real users, not corporate
4.11. Bot content goes through same sanitize/RPC pipeline as user content

> **Connects to Area #1 (Defense):** Bot-seeded content passes through sanitize_text and post_hot_take RPC. The defense system treats bots and users identically. This is intentional — it means the pipeline is tested before real users arrive.

### Ambient Activity Signals
4.12. Category overlay shows hot takes count
4.13. Arena lobby shows active debate count
4.14. Trending indicators on categories with recent activity
4.15. Follow feed shows activity from followed users (populated once real users exist)
4.16. Rivals feed shows rival activity (populated once real users exist)
4.17. Notification system fires on relevant events (new debate in your category, rival posted, etc.)

> **Connects to Area #5 (Spectators First):** Ambient signals are FOR spectators. The person who never posts still sees a living, breathing app because of these signals.

### Async Modes (Solve Empty Queue Problem)
4.18. Text battle — post your argument, opponent responds whenever
4.19. Voice memo — record your take, opponent records theirs when they can
4.20. Both modes allow debates to exist across hours/days (not just real-time)
4.21. Async debates appear in arena lobby alongside live ones

> **Connects to Area #6 (Casual Energy):** Async modes ARE casual. You argue about pizza when you're on the bus, your opponent replies from their couch later. No pressure, no performance, no scheduling.

### Pre-Launch Seeding (One-Time Founder Tasks)
4.22. Founder posts 3-5 hot takes in each category before bot army goes live
4.23. Ensure at least 2 active predictions exist per category
4.24. Verify auto-debates are generating and displaying correctly
4.25. Check that arena lobby has at least 3 items visible at all times

### Status
- ✅ Auto-debate engine built
- ✅ AI Sparring live (Groq)
- ✅ Auto-debates populate arena lobby
- ✅ Async modes exist (text battle, voice memo)
- ✅ Bot army code writes hot takes through standard pipeline
- ⏳ Bot army not deployed (hot takes not being seeded yet)
- ⏳ Auto-debate generation scheduling not configured (timing throughout day)
- ⏳ Trending indicators not implemented
- ⏳ Activity counts on category overlays not implemented
- ⏳ Pre-launch seeding not done (waiting for bot deployment)
- ⏳ Notification triggers for ambient activity not all wired

---

# AREA 5: SPECTATORS FIRST

## The Road: Design every feature for the person who watches, votes, and reacts — but never debates.

### Watching
5.1. Live debate spectator view (watch without participating)
5.2. Auto-debate verdict pages (read the debate, see the score)
5.3. Arena lobby is a spectator experience (browse what's happening)
5.4. Hot takes feed is spectator content (read, react, don't have to post)
5.5. Leaderboard is spectator entertainment (who's the best?)
5.6. Post-debate stats visible to all viewers

### Voting & Predicting
5.7. Vote on live debates (one tap, minimal friction)
5.8. Vote on auto-debates (ungated on landing page for maximum participation)
5.9. Place predictions before debates start (pick a side)
5.10. Prediction leaderboard (who's the best predictor?)

> **Connects to Area #9 (Reciprocal Gating):** Voting could be gated behind other actions (rate the moderator first). This creates tension — gating increases quality but reduces participation. Current approach: votes are easy, ratings are gated.

> **Connects to Area #1 (Defense):** Vote integrity (one vote per user, anti-manipulation) is what makes spectator participation meaningful. If votes can be stuffed, predictions become pointless.

### Reacting
5.11. Hot take reactions (agree/disagree/laugh/rage)
5.12. Reaction counts visible on every hot take
5.13. Reactions are toggle (tap to add, tap again to remove)
5.14. Crowd energy indicators during live debates (future)

### Following
5.15. Follow favorite debaters
5.16. Follow feed shows followed users' activity
5.17. Rival declarations (track who you love to hate)
5.18. Rival feed shows rival activity

> **Connects to Area #4 (Never Feel Empty):** Follow/rival feeds are only useful with real users. Before real users exist, these feeds are empty. The spectator experience during the bot-only phase relies entirely on hot takes, auto-debates, and predictions — not social feeds.

### Sharing (Spectators Spread The Word)
5.19. Share a debate result (generates ESPN-style card)
5.20. Share a hot take
5.21. Share a leaderboard position
5.22. Share an outrageous auto-debate verdict
5.23. All shares include rich link previews (OG tags)

> **Connects to Area #10 (Rage Engine):** Spectators sharing outrageous verdicts IS the growth loop. The spectator who shares "Can you believe the AI said THIS?" is doing free marketing.

> **Connects to Area #2 (Mobile Forward):** Shares need to look good on mobile platforms. Card sizes, OG images, preview text — all mobile-first.

### Status
- ✅ Auto-debate verdict pages with voting
- ✅ Hot take reactions (toggle via RPC)
- ✅ Follow system
- ✅ Hated rivals
- ✅ Predictions
- ✅ Leaderboard (3 tabs + time filters + My Rank)
- ✅ Share cards (canvas generator, 4 sizes)
- ✅ Web Share API
- ✅ OG tags on debate landing page
- ⏳ Live debate spectator view (needs testing with real debates)
- ⏳ Prediction leaderboard not built
- ⏳ Crowd energy indicators not built
- ⏳ Share integration per-platform optimization

---

# AREA 6: CASUAL ENERGY

## The Road: It should feel like arguing at a cookout, not performing in a courtroom.

### Tone & Language
6.1. All UI copy uses casual language (no formal debate jargon)
6.2. AI Sparring personality is populist hot-take debater ("pushes back hard, real-world examples, 2-4 sentences max")
6.3. Category names are familiar (Sports, Politics, Couples Court — not "Political Science" or "Athletics")
6.4. Reactions are emotional (agree/disagree/laugh/rage — not "upvote/downvote")
6.5. Hot takes are short-form by design (not essays)
6.6. Challenge language feels personal ("Think you can do better?" not "Initiate formal debate")

> **Connects to Area #3 (Ease of Use):** Casual language IS ease of use. Formal jargon creates confusion. If someone has to google what Elo means, the tone failed.

### Topic Selection
6.7. Tier 1 launch topics: Politics + Sports (everyone has opinions)
6.8. Tier 2 topics: Entertainment + Couples Court (co-ed pull, relationship drama)
6.9. Tier 3 topics: Music, Movies/TV, Cars/Culture (identity-driven)
6.10. Auto-debate topics chosen for everyday arguments, not academic debates
6.11. "Is Iverson underrated?" energy, not "Resolved: the federal government should..."

> **Connects to Area #10 (Rage Engine):** Topic selection directly affects rage potential. Everyday topics generate more rage than academic ones. "Ketchup on steak is fine" triggers more clicks than "Trade policy analysis."

### Protection From Sweats
6.12. Skill-based matchmaking (Elo-based) prevents new users from getting stomped
6.13. AI Sparring as safe first opponent (no embarrassment, no audience)
6.14. Text battle as lowest-barrier entry (no voice, no real-time pressure)
6.15. Multiple debate lengths (quick 3-round for casual, longer for competitive)
6.16. No public loss count on profile unless user opts in (future consideration)

> **Connects to Area #1 (Defense):** Anti-manipulation (Defense Layer 8) protects the Elo system that makes matchmaking fair. If Elo can be gamed, casual protection fails.

### Couples Court (Unique Casual Category)
6.17. Relationship arguments as a category
6.18. Gender-neutral framing (not "men vs women")
6.19. Designed to pull in co-ed audience (Tier 2 expansion)

### Debate Structure Feels Casual
6.20. Rounds have casual names or framing (not "Opening Statement, Cross-Examination, Closing")
6.21. Post-debate is celebration/roasting energy, not formal adjudication
6.22. Hated Rivals mechanic adds drama and narrative (sports rivalry energy)

> **Connects to Area #9 (Reciprocal Gating):** Hated Rivals capped at 5. Scarcity makes them matter. This is a casual mechanic that creates serious engagement.

### Status
- ✅ AI Sparring personality is casual/populist
- ✅ Category names are familiar
- ✅ Couples Court exists as category
- ✅ Text battle as low-barrier mode
- ✅ Hated rivals with 5-cap
- ✅ Multiple debate modes (different commitment levels)
- ⏳ Elo-based matchmaking not tested with real users
- ⏳ Topic selection for auto-debates needs tuning for casual energy
- ⏳ UI copy audit for formal language not done
- ⏳ Debate round framing may still feel formal
- ⏳ Post-debate flow could be more celebratory

---

# AREA 7: NO GATEKEEPING THE FRONT DOOR

## The Road: See everything, sign up only when you want to act.

### The Split (What's Open vs What's Gated)
7.1. Home screen / spoke carousel — OPEN
7.2. Category overlays (hot takes + predictions tabs) — OPEN
7.3. Arena lobby — OPEN
7.4. Auto-debate verdict pages — OPEN
7.5. Leaderboard (all tabs) — OPEN
7.6. User profile modals — OPEN
7.7. Trending indicators — OPEN
7.8. Post a hot take — GATED
7.9. React to a hot take — GATED
7.10. Vote on a debate — GATED
7.11. Place a prediction — GATED
7.12. Follow/unfollow — GATED
7.13. Declare rival — GATED
7.14. Enter queue / start debate — GATED
7.15. All purchases — GATED
7.16. All settings — GATED
7.17. Report — GATED

> **Connects to Area #1 (Defense):** Defense Layer 3 (Auth Gating) IS this area. The split defined here is enforced by the auth system. Defense Layer 12 (Auth Resilience) ensures the split never breaks (timeout → guest, not timeout → broken).

> **Connects to Area #3 (Ease of Use):** The moment the auth prompt appears is critical. It should say "sign up to post your take" not "login required." The why matters.

### The Auth Prompt Experience
7.18. Auth prompt appears inline at the moment of gated action
7.19. Prompt explains what the user gains (not what they're blocked from)
7.20. OAuth dominant (Google, Apple — one-tap signup)
7.21. Email signup collapsed behind toggle (not the default path)
7.22. Signup-to-first-action in under 30 seconds
7.23. After signup, return to exactly where the user was (not home screen)

> **Connects to Area #2 (Mobile Forward):** OAuth one-tap on mobile is the fastest path. Email signup with keyboard on mobile is painful. OAuth dominant is a mobile-forward decision.

### Bot Funnel Integrity
7.24. Every bot-posted link lands on content, not a login page
7.25. Auto-debate landing pages fully functional for guests (read + vote)
7.26. Category overlay links work for guests (browse + read)
7.27. No redirects to login.html for unauthenticated users (Session 26 fix)

> **Connects to Area #10 (Rage Engine):** The entire rage funnel depends on this. Reddit user sees rage-bait → taps link → sees the "wrong" verdict → wants to vote → signs up. If any step in that chain shows a login wall, the funnel breaks.

> **Connects to Area #11 (Zero Founder Marketing):** Bots post links. Those links MUST work for anonymous users. This was the Session 26 realization and fix.

### Status
- ✅ Guest access default (Session 26)
- ✅ No login redirect (Session 26)
- ✅ Auth timeout safety net
- ✅ Auto-debate landing page ungated
- ✅ OAuth dominant login
- ✅ Email collapsed behind toggle
- ⏳ Auth prompt copy not optimized ("sign up to..." messages)
- ⏳ Return-to-location after signup not verified
- ⏳ Signup-to-action timing not measured

---

# AREA 8: REAL MONEY, NOT FAKE TOKENS

## The Road: Every dollar is a real dollar. No confusing conversions.

### Subscription Tiers
8.1. Free tier — ads, limited features, the funnel
8.2. Contender $9.99/mo — unlimited debates, Elo tracking, no ads, challenges, post-debate stats
8.3. Champion $19.99/mo — priority matchmaking, replay library, advanced analytics, private rooms
8.4. Creator $29.99/mo — host events, custom branding, revenue share, podcast export
8.5. Stripe Checkout session created server-side for each tier
8.6. Webhook processes subscription.created, subscription.updated, subscription.deleted, invoice.paid
8.7. Subscription status stored in profiles, verified server-side

> **Connects to Area #1 (Defense):** Defense Layer 7 (Financial Protection) covers all of this. Server-initiated Checkout, webhook verification, no client-side price manipulation.

> **Connects to Area #9 (Reciprocal Gating):** Profile Depth discount ($14.99 reducible to $0.49) creates a link between answering questions and saving money. The discount calculation must be server-side.

### Tipping
8.8. Real-dollar tips ($1, $5, $10, $25) during or after debates
8.9. Platform takes 20-30%
8.10. Stripe Connect for creator payouts (debaters cash out)
8.11. Tip history visible to tipper and recipient

> **Connects to Area #5 (Spectators First):** Spectators tip. This is spectator monetization. The person who never debates but loves watching — tipping is their way to participate with money.

### Purchases
8.12. Token packs for cosmetic purchases
8.13. Cosmetic items priced in real amounts (not obscured by token math)
8.14. Tournament entry fees in real dollars
8.15. PPV events priced in real dollars

### Profile Depth Discount
8.16. Base subscription $14.99
8.17. Each completed Profile Depth section reduces price
8.18. Minimum price $0.49 (all sections complete)
8.19. Discount calculated server-side, stored in profiles
8.20. User sees their current price and how to reduce it further

> **Connects to Area #9 (Reciprocal Gating):** This IS reciprocal gating applied to money. You want cheaper? Give us data. Fair trade.

### Status
- ✅ Stripe sandbox with 7 products (3 subs + 4 token packs)
- ✅ Stripe Checkout Edge Functions deployed
- ✅ Webhooks receiving 4 event types
- ✅ Profile Depth page built (12 sections, 157 questions)
- ⏳ Stripe still in sandbox — no real money ever processed
- ⏳ Stripe Connect not set up (creator payouts)
- ⏳ Tipping UI not wired to real Stripe flow
- ⏳ Cosmetic purchase flow not end-to-end tested
- ⏳ Tournament/PPV pricing not implemented
- ⏳ Profile Depth discount calculation not wired to Stripe

---

# AREA 9: EVERYTHING EARNS ITS PLACE

## The Road: No freeloader features. Every element pulls double duty.

### Profile Depth Gates
9.1. Cosmetic unlock requires specific profile section completion
9.2. Feature unlocks tied to profile progress (which features TBD)
9.3. Subscription discount tied to profile completion
9.4. Rewards alternate across sections: discounts, badges, icons, cosmetic unlocks, feature unlocks
9.5. 12 sections, 157 questions — "a bit painful but not so painful they stop"

> **Connects to Area #8 (Real Money):** Profile Depth discount is the biggest reciprocal gate. Data for dollars. This is also the B2B play foundation — the data collected here is what gets sold (with consent) down the road.

> **Connects to Area #1 (Defense):** Profile Depth answers are the most sensitive data in the app. Defense Layer 9 (Privacy) protects them. profile_depth_answers table is private to owner via RLS.

### Engagement Gates
9.6. Rate the moderator to see debate score (future)
9.7. Achievements tied to real actions (not participation trophies)
9.8. XP earned from meaningful engagement (not login streaks alone)
9.9. Cosmetics tied to accomplishments (can't just buy everything)
9.10. Daily challenges require specific actions
9.11. Win streaks reward consistency

### Scarcity Mechanics
9.12. Hated Rivals capped at 5 (choosing who to rival matters)
9.13. Seasonal cosmetics (limited-time, FOMO)
9.14. Tournament slots limited
9.15. Creator tier limited features (hosting, branding — worth paying for)

> **Connects to Area #6 (Casual Energy):** Hated Rivals is a casual mechanic with serious engagement. The cap makes it a real choice. "Do I really hate this person enough to use one of my 5 slots?"

### Notification Value
9.16. Every notification links to an action the user can take
9.17. No "thanks for logging in" notifications (waste of attention)
9.18. Notification types: rival posted, followed user debating, prediction result, challenge received

> **Connects to Area #4 (Never Feel Empty):** Notifications create ambient aliveness. But only if they're valuable. Bad notifications teach users to ignore all notifications.

### Paywall Design
9.19. 4 contextual paywall variants (general, shop, social, leaderboard)
9.20. Each variant explains what you gain, not what you're blocked from
9.21. Paywall appears at point of desire, not randomly

> **Connects to Area #3 (Ease of Use):** A confusing paywall is worse than no paywall. The user should think "that's worth it" not "what just happened?"

> **Connects to Area #7 (Guest Access):** Paywall is NOT the front door. Guests see everything. Paywall appears only on premium actions after the user is already hooked.

### Status
- ✅ Profile Depth page built (12 sections, 157 questions)
- ✅ Hated Rivals capped at 5
- ✅ Achievements system exists
- ✅ XP and leveling system exists
- ✅ Cosmetics shop exists (45 items)
- ✅ 4 paywall variants designed
- ⏳ Profile Depth → cosmetic unlock not wired
- ⏳ Profile Depth → subscription discount not wired
- ⏳ Achievement triggers not all connected
- ⏳ Daily challenges not implemented
- ⏳ Notification triggers not all wired
- ⏳ Seasonal cosmetic rotation not built
- ⏳ "Rate to see score" gate not implemented

---

# AREA 10: RAGE IS THE ENGINE

## The Road: People click because something is wrong and they need to fix it.

### Auto-Debate Rage Machine (Leg 3)
10.1. AI generates full debates on controversial everyday topics
10.2. AI scores debate and deliberately picks the unpopular winner
10.3. Lopsided scores (70-30, 80-20) make the result feel outrageous
10.4. Auto-debate landing pages display the "wrong" verdict prominently
10.5. "Do you agree with this verdict?" CTA drives voting
10.6. Voting on auto-debates requires no signup (funnel optimization)
10.7. Topics rotate across categories daily
10.8. 6 auto-debates generated per day

> **Connects to Area #4 (Never Feel Empty):** Auto-debates are the primary content that prevents the app from feeling dead. The rage engine IS the content engine for Phase 1.

> **Connects to Area #7 (Guest Access):** Ungated auto-debate voting is the top of the funnel. Person sees verdict → disagrees → votes → maybe explores → maybe signs up. Each gate you add kills conversion.

### Bot Distribution (Legs 1 & 2)
10.9. Leg 1 reactive bot — finds existing arguments on Reddit/Twitter, drops Colosseum links (~370/day)
10.10. Leg 1 targets specific subreddits with high argument density
10.11. Leg 2 proactive bot — posts original hot takes on Reddit/Twitter (5-10/day)
10.12. Leg 2 content designed to provoke responses that lead back to Colosseum
10.13. Discord bot engages in debate communities
10.14. All bot posts include Colosseum links (auto-debate verdicts, category pages, hot takes)

> **Connects to Area #11 (Zero Founder Marketing):** Legs 1, 2, and 3 together ARE the marketing. Automated. 24/7. Founder touches nothing.

> **Connects to Area #1 (Defense):** Bot Army Self-Defense (Defense Layer 11) protects the bots from getting banned. Internal rate limits, dedicated accounts, DRY_RUN testing.

### Rage-to-User Conversion Funnel
10.15. Rage-bait link → land on auto-debate verdict (ungated)
10.16. User disagrees → votes (ungated)
10.17. User explores → browses other verdicts, hot takes, arena
10.18. User wants to post own take → auth prompt → signup
10.19. User posts → now a real user generating real content
10.20. Real content attracts more organic users → flywheel

> **Connects to Area #3 (Ease of Use):** Every step of this funnel must be frictionless. Confusion at any step = lost user.

> **Connects to Area #2 (Mobile Forward):** Most Reddit/Twitter users are on mobile. The entire rage funnel must work perfectly on phone.

### Controversial Topics (The Fuel)
10.21. Sports: GOAT debates, overrated/underrated, referee controversies
10.22. Politics: policy hot takes (not partisan attacks — those get banned on social platforms)
10.23. Entertainment: celebrity takes, show opinions, award predictions
10.24. Couples Court: "is this a red flag?" scenarios
10.25. Music: genre wars, artist rankings, decade comparisons
10.26. Movies: remake vs original, casting choices, franchise rankings
10.27. Cars: brand loyalty, EV vs gas, overpriced models

### Status
- ✅ Auto-debate engine built
- ✅ Leg 3 scoring picks unpopular winner
- ✅ Bot army code complete (17 files)
- ✅ Auto-debate landing pages with ungated voting
- ✅ Groq generates AI debate content
- ⏳ Bot army not deployed (THE blocker)
- ⏳ Topic selection and rotation not tuned
- ⏳ Funnel analytics not set up (can't measure conversion)
- ⏳ Reddit subreddit targeting not configured
- ⏳ Twitter targeting not configured
- ⏳ Discord community targeting not configured

---

# AREA 11: ZERO FOUNDER TIME ON MARKETING

## The Road: If the founder has to touch it, it doesn't ship.

### Bot Army Infrastructure
11.1. 17 files, ~2,800 lines, standalone Node.js app
11.2. Runs on $6/mo DigitalOcean VPS (separate from Vercel)
11.3. PM2 process manager (auto-restart on crash, survives reboot)
11.4. DRY_RUN mode as default (test without posting)
11.5. .env file for all credentials
11.6. bot_stats_24h Supabase view for monitoring
11.7. auto_debate_stats for engagement tracking

### Three Legs
11.8. Leg 1: Reactive — fish in existing arguments, drop links (~370 mentions/day)
11.9. Leg 2: Proactive — create original content on platforms (5-10 posts/day)
11.10. Leg 3: Auto-Debate — AI generates full debates with rage-bait scoring (6/day)

> **Connects to Area #10 (Rage Engine):** These three legs ARE the rage engine's distribution mechanism. Area 10 is what gets created. Area 11 is how it gets distributed.

### Platform Accounts
11.11. Dedicated Reddit bot account (not founder's)
11.12. Dedicated Twitter/X bot account (not founder's)
11.13. Discord bot via discord.com/developers
11.14. Telegram bot via @BotFather
11.15. All accounts separate from founder's identity

> **Connects to Area #1 (Defense):** Bot Army Self-Defense (Defense Layer 11). If a bot gets banned, founder is unaffected.

### Monitoring (Founder's Only Task: Glance At Stats)
11.16. Check bot_stats_24h once per day (~2 minutes)
11.17. Check auto_debate_stats for engagement trends
11.18. Check Vercel analytics for traffic patterns
11.19. If bot dies (PM2 crash), SSH in and restart (~5 minutes)
11.20. Total daily founder time on marketing: under 5 minutes

### Content Pipeline
11.21. Groq free tier generates all AI content
11.22. Auto-debate topics generated by AI (not hand-picked)
11.23. Leg 2 posts generated by AI (not hand-written)
11.24. Leg 1 finds arguments algorithmically (not manually selected)
11.25. Content stored in bot_activity table for analytics

### Costs
11.26. VPS: $6/mo
11.27. Groq: free tier
11.28. Reddit API: free
11.29. Twitter API: free tier
11.30. Discord: free
11.31. Telegram: free
11.32. Total: $6-16/mo

### Status
- ✅ All 17 files written
- ✅ Groq integration for AI content
- ✅ Bot schema designed
- ✅ DRY_RUN mode implemented
- ✅ PM2 configuration ready
- ⏳ VPS not purchased
- ⏳ Bot accounts not created
- ⏳ Bot schema not pasted into Supabase
- ⏳ .env not configured
- ⏳ Nothing is running

---

# AREA 12: SHIP OR DIE

## The Road: Three projects died the same death. This one doesn't.

### Anti-Pattern Rules
12.1. No new features until bot army is live
12.2. No redesigning features that already work
12.3. No planning features for users that don't exist
12.4. Every session produces something shippable or fixes something broken
12.5. Bible updates happen at END of session, not instead of building
12.6. If it needs a human step, placeholder it and move on
12.7. "Good enough" ships. "Perfect" dies in a folder.

> **Connects to Every Other Area:** This is the meta-principle. Every other area has a "shelved" or "future" list. Area 12 is what prevents those lists from becoming the priority over the things that are marked "now."

### Decision Framework
12.8. New feature request? → Do real users need it? → If no users exist, the answer is no.
12.9. Bug found? → Does it block the funnel? → If yes, fix now. If no, log it.
12.10. Design improvement? → Does it affect first-time experience? → If yes, consider. If no, shelve.
12.11. "We should add..." → Does it help get to 100 users? → If no, it waits.

### Milestones That Matter
12.12. Bot army deployed and running ← CURRENT MILESTONE
12.13. First organic user who isn't the founder
12.14. First hot take from a non-founder
12.15. First organic debate (no founder involved)
12.16. First paid subscriber
12.17. 100 real users
12.18. First day with zero founder involvement where activity still happens
12.19. Revenue covers VPS cost ($6/mo)
12.20. Revenue covers $100/mo tool budget

### Honest Assessment Checkpoints
12.21. 30 days after bot launch: Are people clicking? If not, retarget bots.
12.22. 60 days after bot launch: Are people signing up? If not, fix the landing experience.
12.23. 90 days after bot launch: Are people staying? If not, fix retention.
12.24. 6 months: Is there any organic growth? If not, hard conversation about pivot.
12.25. 12 months: Is revenue covering costs? If not, honest assessment of viability.

> **Connects to Area #10 (Rage Engine):** The rage engine is the testable hypothesis. If rage-bait links don't convert to users, the hypothesis is wrong and the approach needs to change. Area 12 is what forces that honest evaluation.

### Status
- ✅ App is live and deployed (further than any previous project)
- ✅ All infrastructure exists
- ✅ Bot army code complete
- ⏳ Bot army not deployed (the only thing between here and the first real milestone)

---

# HOW THE 12 AREAS CONNECT (Quick Reference)

Instead of a tangled web, here's where the major roads cross:

**Area 4 + Area 10 + Area 11 = The Content-to-Growth Pipeline**
Auto-debates (4) are rage-bait (10) distributed by bots (11). These three areas are one system.

**Area 3 + Area 7 + Area 2 = The First-Time Experience**
Ease of use (3), guest access (7), and mobile-forward (2) together determine whether a new visitor stays or bounces. These three are tested as one.

**Area 8 + Area 9 = The Monetization Loop**
Real money (8) flows through reciprocal gates (9). Profile Depth discount is the clearest example: give data, get cheaper subscription.

**Area 5 + Area 6 = The Atmosphere**
Spectators first (5) and casual energy (6) together define how the app FEELS. One is about who you design for, the other is about the tone you set.

**Area 1 = The Floor Under Everything**
Defense touches all 11 other areas. The Defense Map is the cross-reference for that.

**Area 12 = The Ceiling Above Everything**
Ship or die is the constraint that prevents all other areas from expanding indefinitely. Every "future" and "shelved" item exists because Area 12 says "not now."

---

*This document + the Defense Map + the War Plan + the New Testament + the Old Testament = the complete project system. Any Claude that reads these five documents knows what the app is, what's built, how it's protected, where it's going, and what not to do.*
