# THE COLOSSEUM — SESSION 40: PRODUCT IDEAS (Out-of-Order Session)
### Date: March 5, 2026
### Status: IDEAS APPROVED — NOT YET BUILT
### Context: This session went out of order. Founder skipped ahead to product brainstorming before completing prior session work. Everything below is APPROVED direction. Build priority TBD.

---

> **READ THIS FIRST if you're a new Claude session.** This was a brainstorming session. Nothing was built. Nothing was coded. No schema, no files, no deployments. These are product decisions that need to be incorporated into future build sessions. Treat everything below as locked decisions unless the founder says otherwise.

---

## 1. RANKED vs CASUAL DEBATE MODES

**Decision: The Colosseum will have both Ranked and Casual debate modes.**

### Casual Mode
- Open to everyone, no profile requirements
- Elo does NOT move
- Low-stakes, fun, bar-atmosphere (Third Place Theory)
- Where 90% of users live
- Where new users land first
- No matchmaking requirements — jump in and argue
- Examples: "Is a hot dog a sandwich?" type debates

### Ranked Mode
- Elo is on the line, leaderboard matters
- **Requires complete profile** (all 159 questions or a threshold TBD)
- Skill-tiered matchmaking based on profile data
- Where qualifiers for special events happen
- Where serious debaters compete
- This is the arena

### Why This Matters
- Solves the questionnaire incentive problem — ranked requires profile completion, casual doesn't
- Solves intimidation — new users start casual, graduate to ranked when ready
- Solves B2B data segmentation — casual = volume/broad sentiment, ranked = depth/complete profiles
- Follows the League of Legends model (normals vs ranked vs special events)
- NT 8.4 already says "protected lobbies, no sharks in casual waters" — this makes it real

---

## 2. PROFILE QUESTIONNAIRE REFRAMING

**Decision: The 159-question profile is framed as matchmaking protection, not data collection.**

### The Pitch to Users (3 sentences)
"We use your profile to match you with opponents at your level. A first-timer won't face a championship debater. A teenager won't face a 50-year-old. The more you tell us, the better your matches get."

### What Profile Data Enables
- **Age + experience = skill tier.** 14-year-old first-timer matches with beginners. 55-year-old trial lawyer matches with people who can handle it.
- **Topic knowledge = better debates.** Deep expertise in immigration? You won't face someone who's never thought about it.
- **Political leaning = real disagreement.** Guarantees genuine opposition, not echo chambers.
- **Minor protection.** Age data keeps minors in age-appropriate matchmaking pools. Liability shield + parent-friendly.

### Drip Strategy
- Don't show 159 questions at once
- After a bad match: "That felt uneven, right? Complete your Debate Experience section and we'll find you better opponents."
- Tie questions to matchmaking quality, not arbitrary sections
- After signup: ask 3-5 questions. Next day: 3-5 more. Context-aware — if they just debated politics, serve the politics section
- Casual mode needs zero profile. Ranked requires completion. Natural progression.

### Profile Depth as Gate
- Casual: no profile needed
- Ranked: full profile required
- Celebrity debate qualifiers: ranked only (full profile required)
- Group creation/challenges: TBD but profile depth likely required

---

## 3. WIN A CHANCE TO DEBATE SOMEBODY FAMOUS

**Decision: Celebrity/creator debate events are a core engagement mechanic.**

### The Mechanic
1. Announce the event + who the famous debater is
2. Qualification round — users debate each other on the topic, community votes
3. Top 4 advance to a bracket
4. Winner gets the live debate slot against the famous person
5. Whole thing streamed, spectators bet predictions, vote live
6. **Qualifier is Ranked-only, full profile required**

### What This Solves
- **Questionnaire problem:** "Complete your profile to enter the drawing" — everyone does it for a shot at debating someone famous
- **Growth problem:** "Win a chance to debate [Famous Person]" is the bot army link that gets clicked. Aspiration-bait, not rage-bait. Shares itself.
- **Groups problem:** Famous person brings their audience. Fans form a group organically. 500 people show up for one event, stay for community.
- **B2B data problem:** One famous debate generates massive engagement data in a single night. Thousands of votes, predictions, reactions — all tied to complete profiles.
- **Cold start problem:** One celebrity debate = launch event. Day one content.

### Getting Famous People (Zero Network Strategy)
- **Micro-famous first.** Not Joe Rogan. YouTubers with 50K subs, political TikTokers with 100K, podcasters who cover debates. These people WANT engagement and new platforms.
- **The pitch to them:** "We'll set up a live debate event, promote it to our community, your fans can watch. You get content (clips to post), engagement data on your audience, and you get to look dominant. We're offering you a stage."
- **Bot army does outreach.** Automated DMs to mid-tier creators on Bluesky, Reddit, Discord. Zero founder time.

---

## 4. GROUPS + GROUP vs GROUP CONTESTS

**Decision: Groups are approved. Group vs group competition is the core draw.**

### Concept
- Groups have their own debate rooms, leaderboard, hot takes feed
- You debate within the group, Elo still counts globally, but there's also a group ranking
- **Group vs Group:** Your fantasy league challenges another fantasy league. Your college debate club challenges theirs. Each side picks their champion, rest spectates and votes. Group Elo moves.

### Why Groups Work for The Colosseum
- **Solves liquidity.** 15 people who already know each other, already disagree, already have context. No need for two strangers to be online simultaneously.
- **Supportive environment.** Debating your buddy is low-stakes and fun. You come back tomorrow because it's YOUR people.
- **Inherently viral.** When your group loses, everyone feels it and wants a rematch. Recruiting becomes organic — "we need better debaters, invite your friend."
- **B2B angle improves.** Group-level sentiment is more valuable. "Conservative friend groups in Ohio are shifting on tariffs" is a data point buyers pay for.
- **Bot army content writes itself:** "r/conservative just challenged r/liberal to a 5v5 debate series. First match: immigration. WATCH LIVE →"

### Open Questions (Not Yet Decided)
- Who can create groups? (Open / Gated / Open with gated features)
- Build priority vs go-live tasks
- Schema design
- Profile depth requirements for group creation/joining
- Group size limits

---

## 5. BOT ARMY EXPANSION: NEW PLATFORMS

**Decision: Expand bot army beyond Reddit/Discord/Twitter to fringe platforms.**

### Bluesky — TOP PRIORITY
- Free API, no approval process, no paid tiers
- All 3 legs work: Leg 1 (reactive scanning via firehose websocket), Leg 2 (proactive posting), Leg 3 (auto-debate rage-bait links)
- Auth: just username + app password
- Node.js SDK: @atproto/api
- Rules: bots welcome for scheduled posting. Replies/interactions must be opt-in (user tags bot first)
- Rate limits: login is tight, posting is generous. Log in once per session, reuse token.
- $0 cost
- **Replaces Twitter/X** which is useless on free tier (can only post, can't scan — LM-040)

### Lemmy — SECOND PRIORITY
- Reddit clone on the Fediverse, full API
- All 3 legs work: structured like Reddit (posts, comments, communities)
- Node.js bot library exists (lemmy-bot)
- Active politics, news, technology communities
- Where Reddit refugees went
- $0 cost

### Mastodon — THIRD PRIORITY
- Fully open API, free
- All 3 legs work: posting, replying, real-time streaming
- Dedicated bot instance: botsin.space
- Catch: fragmented across thousands of servers, lower per-post reach
- Opt-in interaction rule (same as Bluesky)
- $0 cost

### Threads (Meta) — LOW PRIORITY
- Has official API but requires Meta business verification (days, might get rejected)
- Posting only, no scanning/fishing
- More setup hassle than Bluesky for less capability

### Nostr — SKIP
- Technically easiest (just generate key, publish to relays)
- Wrong audience (crypto-heavy, not debate culture)

### Platform Priority Ranking
1. Bluesky — all 3 legs, free, huge and growing, right audience
2. Lemmy — all 3 legs, free, Reddit-like, debate communities exist
3. Mastodon — all 3 legs, free, fragmented reach
4. Threads — Leg 2/3 only, business verification wall
5. Nostr — wrong audience, skip

---

## 6. PUBLIC PROFILE PAGES (Discussed, Not Decided)

### Current State
- Profile modals exist (tappable usernames → bottom-sheet with stats, follow, rival)
- Modal does NOT show moderator stats (mod_rating, approval %, rulings)
- No standalone public profile page with its own URL

### Potential Value
- Shareable profile URL for bot army links ("@BigDebater247 just went 12-0")
- Mirror can link to profiles
- Users share their own stats externally
- Moderators get public reputation page
- Google-indexable

### Status: Discussed but not decided. Build priority TBD.

---

## SUMMARY: WHAT FUTURE SESSIONS NEED TO KNOW

1. **Ranked vs Casual is locked.** Two modes. Casual = open, no profile, no Elo movement. Ranked = profile required, Elo on the line, matchmaking tiered.
2. **Profile questionnaire is reframed** around matchmaking protection, not data collection. Drip contextually, gate behind ranked.
3. **Celebrity debate events are approved** as a core mechanic. Qualifier bracket → winner debates famous person. Micro-famous creators first. Bot army handles outreach.
4. **Groups with group-vs-group competition are approved** in concept. Schema and build priority not set.
5. **Bot army expanding to Bluesky (priority 1), Lemmy (priority 2), Mastodon (priority 3).** Bot files not yet written.
6. **Nothing was built this session.** No code, no schema, no deployments. This is all product direction.

---

*This file should be read alongside the New Testament and Land Mine Map at the start of any session that builds these features.*
