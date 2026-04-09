# THE MODERATOR — FEATURE SPECS PENDING

Working spec document for unspec'd punch list items. One paragraph per feature. Walked and approved one at a time with Pat. Writing order follows original 13-item punch list order, with newly-spawned items appended at the end.

---

## F-04 Instant Rematch

REMATCH button below final score on post-debate results screen, either debater can initiate, sends prompt to opponent + original moderator simultaneously, both have 30s to accept or auto-decline, opponent decline = no rematch, moderator decline/timeout = rematch goes to mod queue pool for category, rematch identical to original (same topic/sides/format/timer/ranked/stats weight), no cap on rematches between same pair.

**Status addendum:** Button location exists at `src/arena/arena-room-end.ts:253` but click handler at line 271 just calls `enterQueue(debate.mode, debate.topic)` — only 1 of 10 spec points actually built.

---

## F-05 Debate Recording + Replay

Replay enrichment for the archive pipeline. Two distinct pieces, both landing on the existing `arena_debates` row and feeding the `get_debate_replay_data` / `get_arena_debate_spectator` read paths. **(1) Final AI scorecard persistence.** When a debate ends with an AI moderator, the client writes the final 4-criteria scorecard (Logic / Evidence / Delivery / Rebuttal, per debater) to `arena_debates.ai_scorecard` via the already-deployed `save_ai_scorecard` RPC (see `session-234-ai-scorecard-persistence.sql`). SQL is already live: JSONB column exists, RPC is idempotent and participant-gated, `get_arena_debate_spectator` already returns it. **Remaining work is entirely client-side** — wire the write in `src/arena/arena-room-end.ts` immediately after AI scoring completes, once per debate. Only the final scorecard is persisted (not per-round, not running). AI scorecards coexist with human-moderator scores — the archive header shows whoever actually moderated (if AI, it says "AI"). Scorecard is visible to everyone in the replay. Debates that ended before this wires land keep `ai_scorecard = NULL` and the replay renders a blank scorecard section — no backfill. **(2) Inline point awards in the live feed dialogue.** Every mod-awarded point appears inline on the comment line it scores, single-line format, persisted to the archive. Format: `[username]: comment text. +N pts` when no modifier is active, `[username]: comment text. +N × M = T pts` when an in-debate modifier is active (see F-57 for the modifier system). The `×` and `=` characters are literal; the modifier is hidden entirely when it equals 1.0 (no `× 1.0` clutter). Modifier stacks present as a single combined multiplier — `+2 × 1.875 = 3.75 pts`, not `+2 × 1.25 × 1.5 = 3.75 pts` — to keep the line readable. Negative stacked results floor at zero (a comment cannot contribute negative points to the scoreboard). The awarding flow stays F-51's two-tap pattern (tap comment → tap 1-5) — modifiers apply automatically on top of the mod's base score from whatever power-ups or socketed reference modifiers are currently active on the awarded debater. Mod never picks a modifier manually. Scoreboard running totals reflect the **modified** number (base × modifier, then summed). The feed archive table stores three columns per point-award event: `base_score` (what the mod tapped), `in_debate_modifier` (the combined multiplier applied inline, default 1.0), and `final_contribution` (base × modifier, floor zero). This gives B2B buyers full visibility into the scoring chain. The "tiny fireworks" animation from F-51 §4.2 is dropped in the new inline model (reserve for post-debate winner celebration only). **Post-match "after effects" line.** End-of-debate modifiers (F-57 category) do NOT render inline during the debate — they apply at the final score screen as a separate "after effects" breakdown, lifted from the S182/S183 design: `Raw score: 47 → Point surge +2 → Opponent siphon -1 → Final: 48`. Both in-debate and end-of-debate modifiers can compound in the same debate — the math handles it naturally (`final = (sum of inline-modified comments) × (1 + sum of end-of-debate multipliers) + sum of end-of-debate flats`). **Build dependency note:** this F-05 spec unblocks when F-51 gains the modifier math in its scoring section (landed in this session's F-51 edit). F-57 is the source of truth for which modifiers exist, how they stack, and how they're acquired.

---

## F-07 Spectator Features

Pulse/sentiment gauge is a paid token-burn mechanism — see **F-58 Sentiment Tipping** below for the full spec. The old `cast_sentiment_vote` free-tap-to-vote model is SCRATCHED S249; there is no free vote button. Every point of sentiment movement is paid for by a spectator tip. F-51 Phase 5's legacy "tipping tier gates" and "correct predictions refund 50% per F-09" phrasing is superseded by F-58. Two additions: (1) In-debate spectator chat — a single separate channel per debate, distinct from the two debater channels, open to all spectators with no tier gating, rate limit high enough to be invisible in normal use but defensive against spam/flood, report-only moderation routing flagged messages to reports@themoderator.app, hidden from debaters entirely, ephemeral and erased at debate end. Design goal: get spectators arguing with each other so they spin up their own debates. (2) Pre-debate share link — when a debate is created, the creation screen surfaces a shareable spectator link with a copy-icon button so the creator can paste it anywhere ("hey I'm debating mom at 7pm, come watch"). This is distinct from the debater/moderator invite link generated in the same flow. The share link is only copyable from the creation screen; once the debate starts that screen is gone and the link can no longer be copied from there. Recipients landing on the link go to the live spectate view if the debate is live, or the mirror/replay page if it has ended. Reuses the `?spectate=<debateId>` URL pattern wired in S240.

---

## F-08 Tournament

New Room E hosts brackets, seasonal events, qualification rounds, celebrity events, and spectator betting. Two tournament types: singles (player vs player) and groups (group vs group). **Format:** single-elimination at launch. Round-robin added second once single-elim is stable (cheapest second add, good for small groups). Double-elim and Swiss deferred until demand justifies. **Seeding:** ELO-based. Gives Elo real stakes beyond ranked ladder. **Bracket size:** dynamic fill — no fixed 8/16/32/64 requirement, especially critical for groups where teams will never have matching player counts. Max bracket size 64 at launch; group tournaments may lift this later. **Prize distribution:** singles tournaments use top-3 split; group-vs-group tournaments use ladder payout (top N positions). **Timing:** configurable per tournament — creator chooses single-sitting (all rounds same day) or scheduled across days. **Drop-out / no-show:** auto-forfeit after 10 minutes. No Elo or token penalty. In group tournaments a no-show counts as nothing (does not damage the group's standing beyond the lost match). **Tournament-only power-ups:** 3x multiplier, Double Silence, Golden Ref Slot. **User-created tournaments:** anyone meeting the gate can create. Tournament creation requires the F-33 Verified Gladiator badge (60% profile depth). This is the launch gate, not a future upgrade. Min entry fee 10 tokens, max entry fee 1000 tokens at launch (raised later as trust grows). Max bracket size 64. **Escrow:** entry fees go into platform escrow at join, never to the creator. Creators cannot rug-pull. Platform releases prize pool to winners after tournament concludes, retains 10% platform cut, refunds unfilled bracket slots automatically. **Moderator compensation:** hybrid model. 5% of prize pool is carved out as a moderator pool, split evenly per match moderated across all mods used in the tournament. Winners take 85% (per the prize distribution rules above), platform takes 10%, mods take 5%. On top of the token pay, tournament-exclusive cosmetics unlock at moderation milestones (Tournament Moderator badge, exclusive borders, tournament-only titles), piggybacking on the F-31 auto-unlock trigger system already shipped. Spectator betting and celebrity events carry forward from the original Room E concept.

---

## F-10 Power-Up Shop

Token-spend storefront for the 60-effect Modifier & Power-Up system. See F-57 for the canonical effect list, pricing table, socketing rules, and rarity mapping. This F-10 paragraph spec's the storefront UI only — the catalog, purchase flow, and inventory — and defers every gameplay rule to F-57. **Shop location:** new tab in The Armory (F-27) alongside My Arsenal and Forge, labeled "Shop" (gladiator vocabulary — consider renaming to "Quartermaster" at build time). **Catalog layout:** two top-level filters, "Modifiers" and "Power-Ups," which toggle between the permanent-socketed set and the one-shot consumable set. Each set exposes the same 60-effect list (30 end-of-debate + 30 in-debate) — the filter just swaps the product type and the price column. Chip-row sub-filters (matching F-27's Sharpen pattern): category (Token / Point / Reference / Elo+XP / Crowd / Survival / In-Debate), rarity tier (Common / Uncommon / Rare / Legendary / Mythic), affordability (show-only-what-I-can-buy). **Card format:** effect name, one-line description, category, rarity tier badge, tier gate label ("Requires Rare+ reference"), token cost, and a "Buy" button. Tapping a card opens a bottom sheet with full description, socket compatibility (which rarity tier and higher can hold this modifier), and a confirm-purchase button. **Purchase flow:** tap Buy → confirm bottom sheet → debit tokens via `buy_powerup` or `buy_modifier` RPC (new, TBD in next ref-system session) → on success, item added to inventory (power-ups to a new `user_powerups` table, modifiers to a new `user_modifiers` table staging area where they wait to be socketed into a forged reference). **Modifier socketing flow:** from The Arsenal tab, tap a forged reference, tap an empty socket, pick a modifier from the user's unsocketed modifier inventory, confirm (with a warning: "Socketing is permanent. This modifier cannot be removed from this reference.") — socket filled, modifier consumed from inventory. Socketing is a separate RPC (`socket_modifier`) that writes to a new `reference_sockets` table. **Power-up equip flow:** pre-debate loadout screen (F-51 §5.1 today picks references; extends to also pick power-ups). User picks up to 3 power-ups per debate per F-57 cap. Power-ups consume on debate start and cannot be refunded even if the debate nulls. **Drops (from the F-27/F-55 reference reward loop):** winning a debate has a small chance to drop a power-up; rarer chance to drop a modifier. Drop rates and trigger conditions are TBD and will be walked in a dedicated economy session once live token earn rates exist. Drops land in the user's inventory the same way purchases do. **Pricing at launch:** lifted verbatim from the S182 design table (see F-57 for the full list). Pricing is subject to re-balancing once live data exists — treat as starting values, not permanent. **Token spend RPCs needed (not yet built):** `buy_modifier(effect_id, tier)`, `buy_powerup(effect_id, tier)`, `socket_modifier(reference_id, socket_index, modifier_id)`, `equip_powerup_for_debate(debate_id, powerup_id)`. All four need race-condition-safe token debits with `FOR UPDATE` locks on `profiles.token_balance` and atomic consumption of the purchased item. **F-10 supersedes the old `TOKEN-STAKING-POWERUP-PLAN.docx`** (deleted from the repo Session 191) which listed only 4 power-ups (2x Multiplier, Shield, Reveal, Silence). That list is scrapped. The new canonical list is F-57.

---

## F-11 Marketplace

**DELETED S182/S183.** No spec. Not building.

---

## F-30 Reference Marketplace

**DELETED S182/S183.** No spec. Not building. Reference economy is handled via forging, seconding, and the escalating per-round cite cost — see F-55.

---

## F-31 Cosmetics Store

**SHIPPED.** Pointer only. Backend: `cosmetic_items`, `user_cosmetics` tables; `get_cosmetic_catalog()`, `purchase_cosmetic()`, `equip_cosmetic()` RPCs. UI: `moderator-cosmetics.html`, `src/pages/cosmetics.ts`. The F-31 auto-unlock trigger system is referenced by F-08 tournament-exclusive cosmetics (Tournament Moderator badge, exclusive borders, tournament-only titles unlocked at moderation milestones) and by F-55 graduated-forger badges. No further spec work needed.

---

## F-45 Desktop Arena Layout

Shipped in Session 196 and verified intact after the S201-203 cyberpunk shell redesign. At viewport widths ≥1024px, `#desktop-panel` in `index.html` renders as a left-hand sidebar via `lcars-shell.css` flex layout, populated live by `home.ts` `updateUIFromProfile()`. Sidebar contents: avatar, ELO, wins, losses, win streak, token balance, profile depth bar, and nav links. Renders on Feed, Arena, Ranks, and Profile tabs. Currently does not render on the Groups tab — Groups is a work in progress and will be reconciled with the desktop panel as part of that work, not as part of F-45. Hidden on mobile widths. No further desktop redesign planned; the S196 sidebar fits the new shell.

---

## F-03 Entrance Sequences / Battle Animations

**Pointer only.** Full spec lives in the groups research doc (chat `63951588-66c3-4c68-af1d-145f4e98efa6`) plus Session 166 additions. Covers debater entrance sequences and in-debate battle animation system. F-22 collapses into this — same animation system, group-scaled.

---

## F-22 GvG Battle Animations

**Collapsed into F-03.** See F-03 pointer above. Same animation system, scaled from 1v1 to group-vs-group.

---

## F-27 Reference Library Browse — "The Armory"

Mobile-first design. Library is renamed **The Armory** throughout the UI, with full gladiator vocabulary: Filters → **Sharpen**, Add to Loadout → **Equip**, Verify → **Second**, Challenge stays, cites → **strikes**, verifications → **seconds**, search placeholder "Hunt a blade...". Page is a three-tab structure at the top: **The Armory** (public library of all references), **My Arsenal** (user's forged + equipped refs), **Forge** (contribution flow for creating new references). **Sticky header** under tabs contains a search bar plus a "Sharpen" filter button with an active-filter-count badge. **Chip-row filters** replace the desktop-style dropdown stack — horizontal-scrolling row of single-tap toggleable chips for category, rarity tier (Common/Uncommon/Rare/Legendary/Mythic), source type (Primary/Academic/News/Book/Other), verified vs unverified, clean vs disputed, graduated vs ungraduated, forged-by-me, in-my-loadout. Multiple chips can be active simultaneously (AND logic). **Default view** is a "Hot in the Arena this week" horizontal-scroll trending shelf (top 5 most-struck references from the last 7 days) sitting above a single-column card stack of YouTube-tile-style reference cards. **Sort options** (in the Sharpen drawer): rarity high→low (default), strikes count, newest, oldest, seconds count, alphabetical. **Rarity visual language** on cards: Mythic = full purple border + tinted background (the only tier with a full treatment), Legendary / Rare / Uncommon = colored left edge only, Common = plain card with no accent. Each card shows reference name, forger credit, category, rarity badge, graduated/disputed badges where applicable, and a stat footer with power X/cap, seconds count, strikes count. **Tap any card opens a bottom sheet** (not a centered modal) with a grab handle at top, full source details table (source type, title, author, date, locator, seconds, strikes), the `claim_text` as an italic callout block, and action buttons pinned to the bottom in thumb reach: Equip / Second / Challenge / Close. **Search queries** against reference name, `claim_text`, `source_title`, `source_author`, and forger username — full-text match, case-insensitive. **Desktop** (≥1024px) reflows the same page to a multi-column card grid; no separate desktop layout, just CSS grid autofill. **Empty states** get in-world copy: zero search results → "The Armory has no blades matching that grip. Forge one?" with a Forge button.

---

## F-28 Bounty Board

Leaderboard/profile hybrid for putting tokens on an opponent's head. **Posting gate (graduated profile depth):** 25% depth unlocks 1 open bounty slot, 35% unlocks 2, 45% unlocks 3, 55% unlocks 4, 65% unlocks 5, 75% unlocks 6 (hard cap, stops there). **Target selection:** poster can only bounty users on their own rivals list — no general-population targeting. Rivals list uses the existing F-25 mechanism (no new relationship type). Rival-add flow: profile page has a rivals section with a username search bar; click adds them; target receives a notification. Not automatic or mutual — one-sided add is enough to enable bountying (no reciprocation required). If the poster removes the target from rivals while a bounty is open, the bounty auto-cancels with zero refund. **Bounty amount:** no cap. Poster picks any amount they can afford. **Duration / cost:** flat linear 1 token per day of open time. Minimum 1 day / 1 token. Maximum 365 days / 365 tokens (hard ceiling). The duration fee is on top of the bounty amount itself — it's not carved out of the prize, it's an additional cost. **Cancellation:** poster can cancel an open bounty and gets back 85% of what they spent (duration fee + bounty amount). 15% is a processing-fee burn. Natural expiration without claimant: zero refund — everything burns. This is intentional to throttle speculative posting. **Approval flow:** none. Bounties post instantly. **Target awareness:** passive only. Target sees their bounties in a new profile page section (see below). No push notification, no toast, no email alert. Target cannot block a specific user from posting bounties on them and cannot opt out of being bountyable entirely. Live with it. **Profile Bounties section (new UI on profile page):** two lists — "Bounties On Me" (incoming, hunters are gunning for this user) and "Bounties I've Posted" (outgoing). Each row shows bounty amount, poster/target username, days remaining, and status. Outgoing list also shows a cancel button with a 15% fee warning on tap. **Bounty indicator dot:** gold dot rendered next to the username everywhere the username appears — leaderboards, feeds, arena lobby, spectate, profile, scorecards, mod queue, chat, comments, dialogue bubbles. Universal meaning: "has an active bounty on them." Only shows if the user has at least one open bounty against them. One dot regardless of how many incoming bounties — no stacking. No dot for outgoing bounties (posters don't advertise that they're hunting). **Claim flow (pre-debate dropdown):** in the ranked pre-debate screen, a new dropdown is always visible. It lists all open bounties against the current opponent. If the opponent has no bounties, the dropdown is empty but still rendered. Hunter selects ONE bounty from the dropdown (one per debate max, even if the target has multiple open). Selecting charges a 5% attempt fee calculated off the selected bounty's face value. Fee is burned regardless of outcome, even on a hunter win. This is the throttle — each attempt costs something. Selection is LOCKED once paid. No backing out, no re-selection, no refund. Because selection only happens in pre-debate (after matchmaking assigns the hunter to the target), there's no race condition — only one hunter is in pre-debate against the target at any given moment. **Debate eligibility:** ranked debates only. Casual, AI Sparring, voice memo, etc. — not eligible. Private-lobby invite debates DO count if they route through the ranked pool (which per F-46 they do — invites reserve a slot in the corresponding ranked pool). New UI addition: debate cards sitting in the pool with a reserved invite show a "reserved for [username]" indicator so other queue members know why that card isn't pairable. **Moderator visibility:** moderator is BLIND to the bounty. Mod neutrality preserved. **Payout:** bounty only pays out if (a) the hunter claimed it in pre-debate AND (b) the hunter wins the debate. Hunter win: hunter receives bounty face value minus a 5% platform cut. Poster's escrow is fully consumed. Hunter loss: hunter forfeits the 5% attempt fee (already burned). Bounty stays open until natural expiration or a future successful claim — one-shot per debate, not one-shot per bounty. Platform cut: 5% of bounty face value on successful payouts. Results screen shows a new row in the token breakdown: "Bounty claimed: +X tokens" (or "Bounty failed: -Y attempt fee"). Visible to everyone — debaters, moderator, spectators. **Matchmaking:** bounties do NOT create matchmaking priority. Hunter waits in the normal ranked queue; if they happen to draw the bountied target, the dropdown lights up. If the target is mid-debate, hunter waits their normal turn. **No restrictions:** no opt-out, no block, no mode exceptions beyond ranked-only, no stacking multiple bounties per debate, no matchmaking favoritism.

---

## F-33 Verified Gladiator Badge

Profile-depth-gated identity badge that also serves as the F-08 tournament creation gate. **Earn path:** 60% profile depth. Nothing else — no voice intro required, no debate count, no manual approval, no payment. **Tournament-creation gate:** possession of this badge is the hard gate for creating tournaments under F-08. This is the launch gate, not a post-launch upgrade. **Retroactive:** users currently above 60% depth at feature launch auto-receive the badge. **Revocation:** never. Once earned, permanent. Depth drops (from new questionnaire questions, profile reset, etc.) do not revoke the badge. **Badge display:** renders next to the username everywhere the username appears, same universal-placement rule as the F-28 bounty dot — leaderboards, feeds, arena lobby, spectate, profile, scorecards, mod queue, chat, comments. Must be legible at 16px in-line with text. Visual direction: military medal style (final artwork chosen at build time). **Voice/video intro (separate optional feature that sits alongside the badge):** NOT required to earn the badge. Separate profile feature. Users do NOT record inside the app — they upload pre-made clips from their own device. Upload constraints: 5 seconds maximum, 5MB maximum file size, audio formats MP3/M4A/OGG, video format MP4 at up to 1080p. Stored in Supabase Storage. Client-side validation on upload (length, size, format) plus server-side re-validation before commit. Playback autoplay-muted by default on profile page with a tap-to-unmute control. Copyright posture: don't mention it, play it dangerously. No ToS language, no DMCA agent surface, no fingerprint gate, no safe-harbor posture at launch. The risk is known and accepted.

---

## F-40 Mirror Pages with Live Counts

**SCRATCHED Session 245.** Mirror system deprecated. Rationale: SEO cannibalization risk (second indexable property competing with the main app + /u/ profiles + /go for the same keywords), /go owns the cold-traffic funnel, bot army was quarantined in S195 and no traffic has been pointed at the mirror in months. Disaster-recovery framing does not justify carrying a whole separate deployment. Mirror generator (`/opt/colosseum/colosseum-mirror-generator.js` on VPS) and Cloudflare Pages deployment (`colosseum-f30.pages.dev`) to be sunset. See Land Mine Map for the mirror deprecation entry and the Bible cleanup flag.

---

## Bot Army Growth System

**SCRATCHED Session 248.** The 3-leg bot army growth/marketing system (reddit/twitter/discord posting, news scanning, Leg 3 Auto-Debate Rage-Click Engine) is scratched in full. Bot army was already quarantined in Session 195 (growth strategy discontinued, PM2 idle, no active posting) and is now formally retired. Scope of scratch covers anything bot-army-related anywhere in the docs: growth legs, auto-debate generation, bot army link templates (Product Vision §5), rematch narrative hook (PV §7.3.4), article distribution (PV §9.3), and F-29 Source Meta Report's bot-army distribution line. Not scratched: AI Sparring and AI Moderator (separate live systems on Supabase Edge Functions using Claude), F-06 Debate Analytics Overlay on the punch list (unrelated feature, numbering collision only — the "F-06 bot army" phrasing that appeared in earlier docs was a wrong F-number, bot army was never formally F-numbered; see H-05 on punch list for the only real bot-army task). DigitalOcean VPS (`161.35.137.21`, $6/mo) and repo files left in place ("float in the ether") — no teardown plan, no Groq key rotation, no table drop. `bot_activity` table, `hot_takes.is_bot_generated`/`source_headline`/`source_url` columns, and ~19 bot army `.ts` files in repo are inert. Retirement is indefinite; Pat's mental horizon is "end of this year" at earliest but that is not a written review date. See Land Mine Map for related cleanup entries (LM entries touching bot army funnel rationale, bot-config.js notes, and the wrong-F-number reference all updated S248).

**S249 EXTENSION — Auto-debate consumer side FULL RIP.** The bot army scratch left the auto-debate consumption plumbing dormant-but-alive (`auto_debates` table, `auto_debate_votes`, `auto_debate_stakes` + 4 S99 auto-debate staking RPCs, `cast_auto_debate_vote`, `view_auto_debate`, `moderator-auto-debate.html`, `src/auto-debate.ts`, vite autoDebate entry, UNPLUGGED-QUEUE-FIX.sql UNION, NT line 180, CLAUDE.md entries). Session 249 extends the scratch into a full rip on the consumer side: files deleted, tables dropped in production, RPCs dropped in production, UNION removed. Auto-debate is gone end-to-end. Distinct from the bot army carcass (which remains "float in the ether") — the auto-debate consumer plumbing is fully demolished. H-14 Test Walkthrough auto-debate scenarios were folded into the bot army scenario deletion at H-14. Old Testament / War Chest / Playbook historical references to auto-debate left as historical narrative. See Land Mine Map LM-211 for the scratch record.

---

## F-53 Profile Debate Archive

New section on the main profile page presenting the user's past debates as a spreadsheet-style table (Excel freeze-frame feel) with one row per debate. Columns: user-set name/description, opponent, date, topic, win/loss, final score, category. Every column is filterable. Each row links to the existing debate archive page — same filename/link used by the canonical archive system, no separate URL. The user-supplied name and description live only on the profile row for the user's own reference and labeling; they do not modify the archive itself. Users can add or remove any of their own debate archives from this profile list at will (manual curation — losses can be hidden, highlights can be featured). The list is public to anyone viewing the profile. Archive pages themselves are public and viewable by anyone with the link, no login required, and contain the full transcript (with inline reference links already embedded), final score, sentiment gauge history, and spectator count. Archives and profile list entries are kept forever — no expiration. Naming/description can be edited any time from the profile page.

---

## F-54 Private Profile Toggle

Account setting allowing a user to flip their entire profile to private. When private: the profile page is not viewable by other users, the F-53 debate archive list is hidden, and the user does not appear in public-facing surfaces (leaderboards, feeds, search) where applicable. Individual debate archive links remain publicly accessible if shared directly (the archive system is link-public per F-53), but they will not be discoverable through the user's profile. Default is public.

---

## F-55 Reference System Overhaul

Consolidates and corrects the two-table reference architecture (`arsenal_references` + `debate_references`) that Pat flagged as a "general mistake" — these were never meant to be separate systems. This spec locks the canonical reference model going forward. **S247 update:** the 17 parked ref-system questions (#24-40 from S243) are all walked and locked in this paragraph — leasing/royalties, soft-delete, source-type policy, category taxonomy, lifecycle, dedup, and indexes. F-55 is now fully specced. **Greenfield launch.** Zero references exist in production at S247. The entire F-55 system launches fresh — no migration concerns, no legacy data to preserve. Whatever schema lands is what ships.

**Single canonical path.** Every reference is a library reference. There is no separate ad-hoc-mid-debate path; the old `submit_reference` raw-URL-drop RPC is slated for retirement. The new arsenal/loadout `cite_debate_reference` path is the primary and only cite mechanism. **Escalating per-round cite cost** carries forward onto the new path, lifted verbatim from the legacy `debate_references.token_cost` schedule: 1st cite free, 2nd 5 tokens, 3rd 15, 4th 35, 5th 50, hard cap 5 cites per round per debater. Cite-cost tokens **burn to the platform** (not routed to the forger). **Forging cost remains** (current value TBD, needs code verification).

**Dedup at forge time via canonical fingerprint.** Forging requires structured fields: `source_title`, `source_author`, `source_date`, `locator` (line/page/timestamp/paragraph), and `claim_text`. The first four are hashed into a canonical fingerprint (lowercased, whitespace-collapsed, punctuation-stripped) and enforced at the DB level via a UNIQUE index. Attempting to forge a reference whose fingerprint already exists surfaces the canonical ref instead ("This source+locator already exists as '[existing name]' by [forger]. Use it?") — the user is redirected to the existing ref with no co-cite / dual-credit model. First forger owns the canonical ref, period. **Canonical references are truly singular. No forks.** The first forger's `claim_text` stands. Subsequent users who disagree with the wording argue their interpretation in the debate itself.

**In-debate display.** The link dropped into the debate dialogue IS the library link. Same URL serves the live cite and the post-debate browse lookup. Click anywhere = info card popup. This is the universal signal: the only way anyone — debaters, moderator, or spectators — knows a reference or power-up has been used is when the link or icon appears in the text dialogue box. No separate mod-only loadout view; the mod sees cited refs only, same as everyone else.

**Source-type taxonomy and ceilings.** Five source types, locked at creation, chosen by the forger from a dropdown (no URL auto-detection). Source type ceilings: `primary` 5, `academic` 4, `book` 3, `news` 1, `other` 1. **News and other are intentionally weak** — the system structurally rewards primary sources, peer-reviewed scholarship, and books over aggregated journalism or miscellaneous content. `Primary` means firsthand records: peer-reviewed papers with original data, raw government/census/SEC filings, court rulings, speech transcripts, historical documents, direct datasets from collecting bodies. `Academic` is scholarly work (primary research or secondary review articles). `News` is journalism reporting on primary sources — a Washington Post article *about* a CDC report is `news`; the CDC report itself is `primary`. `Book` is long-form published work. `Other` is the deliberate catchall for everything else (Reddit, YouTube, tweets, blog posts, podcasts). No promotion path past the ceiling except graduation at 25 strikes (+1 ceiling). Forger picks source type and lives with the ceiling — if a ref is mis-categorized (e.g., a CNN article tagged `primary`), that is a valid challenge ground and a successful mis-categorization challenge downgrades the ceiling to the correct type's cap, clamps current power to the new ceiling, applies the Disputed badge and the normal -5 seconds penalty.

**Category taxonomy.** Reference categories and debate categories share **one unified enum** — same strings, same IDs, same admin-managed list, one source of truth. Launch list (already live in production SQL): `politics`, `sports`, `entertainment`, `music`, `couples_court`. A `general` catchall exists for hot takes only and is **excluded from the reference Forge picker** — forgers must pick one of the five real categories, enforced via whitelist check at the `forge_reference` RPC level. One category per reference (single column, not an array). Categories are admin-only to add; no user-suggested, no voting. If future scale requires richer reference browsing, add a secondary `tags[]` array rather than splitting the taxonomy. Debate category determines matchmaking; reference category determines Armory filtering and can naturally surface relevant refs in the pre-debate loadout screen as suggestions.

**Edit button (10-token fee).** Forgers can edit their own references after creation by tapping an Edit button on the ref card, which opens a "Pay 10 tokens to edit?" confirmation bottom sheet. After payment, all fields are editable EXCEPT: (a) socketed modifiers/power-ups (locked permanently per F-57), and (b) `source_type` (locked at creation forever, no exceptions — this is the one field whose value directly determines the economic ceiling, so allowing paid edits would create a workaround for successful mis-categorization challenges). Editable fields: `source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `category`. Editing recomputes the canonical fingerprint; if the new fingerprint collides with another existing ref, the edit is rejected. Disputed/Heavily Disputed badges survive edits.

**Rarity and power mechanics.** Rarity is derived, not manually assigned, and recomputes on every seconding and every strike — no background schedule needed. Composite score formula: `(seconds × 2) + strikes`. Thresholds: Common 0-9, Uncommon 10-29, Rare 30-74, Legendary 75-199, Mythic 200+ AND graduated. Mythic is gated behind graduation to prevent brand-new refs from being brigaded straight to top tier. Seconds weight 2x because seconding is harder to earn than striking. Rarity can decrease asymmetrically: successful challenges subtract from seconds (-5 per successful challenge), but strike count is monotonic — history cannot be un-struck. **Rarity tier naming is Common / Uncommon / Rare / Legendary / Mythic** — "Legendary" replaces any prior use of "Epic" in older docs; global rename applied. **Socket counts by rarity** (for F-57 modifier socketing): Common 1 socket, Uncommon 2, Rare 3, Legendary 4, Mythic 5. Sockets unlock as the reference climbs tiers. Existing sockets filled at a lower tier persist through tier climbs. **Graduation at 25 strikes** does three things: permanent rarity floor bump (cannot drop below Rare regardless of challenges), power ceiling +1 (the only path past source_type ceiling), and a "Graduated Forger" badge piggybacking on the F-31 auto-unlock trigger system. **Power formula** is stepped: `power = min(ceiling, floor(seconds / 3)) + graduation_bonus` where graduation_bonus = +1 if graduated else 0. Every 3 seconds = +1 power.

**References are immortal.** No time-based decay. A 2015 stat stays at full power forever regardless of how stale its claim becomes. Immortality is load-bearing by design: the challenge system is the mechanism that drives outdated claims out of rotation. If refs auto-decayed, the challenge system would atrophy. Stale claims are handled the same as every other challenge — any user who notices an outdated claim files a 25-token library challenge; the mod or community reviews; if successful, the normal graduated penalty applies. Dead links are handled the same way — the app does not run automated HEAD-request crawlers at launch; if a ref's URL 404s or the content changes, any user can challenge on "dead link" grounds via the same 25-token library challenge flow. The challenge cost is flat 25 tokens regardless of grounds (dead link, stale claim, mis-categorization, wrong source_type, bad claim_text) — one cost, one flow, no special cases. An optional passive HEAD-request crawler can be bolted on post-launch as an assistive flag to the community (not an auto-freeze mechanism) if link rot becomes a noticeable problem at scale.

**Seconding (verification).** Minimum profile depth 25% to cast a seconding vote (humanness gate, lower than the F-08 tournament 60% gate because seconding is lighter-weight than creating). Self-seconding is hard-blocked at the RPC level. No downvotes — the challenge mechanic is the negative signal, kept separate from the positive seconding signal to prevent brigade collapse.

**Challenge mechanic.** Challenger escrows 10 tokens to issue an in-debate challenge; refunded if the challenge succeeds, burned if it fails. Live in-debate challenges are ruled by the active moderator (debate pauses briefly, mod rules, debate resumes). Post-debate, mod rulings enter a community review queue where seconding-eligible users (profile depth ≥25%) can flag bad rulings; repeated bad rulings hurt the mod's rep score. Out-of-debate library challenges cost 25 tokens flat (higher because out-of-context challenges skew petty) and enter a 48-hour community review queue. Successful challenges apply a graduated penalty: 1st successful = -5 seconds + "Disputed" badge, 2nd = another -5 + "Heavily Disputed" badge, 3rd = ref auto-frozen (uncitable, unbrowseable, owner notified, can request admin re-review). Auto-frozen refs generate zero royalties (zero cites possible).

**Loadout.** Capacity tiered by profile depth: 0-24% = 3 slots, 25-49% = 5, 50-74% = 7, 75-100% = 10. Locked at debate start — no mid-debate editing. Exception: if a ref gets auto-frozen mid-debate (3rd successful challenge lands during the match), it is removed from the active loadout and the slot stays empty for the remainder. Moderator sees cited refs only, not the full loadout (neutrality). Spectators see cites live in the feed with a 5-second delay on the full detail card popup.

**Leasing / royalties (new in S247).** Any user can cite any other user's forged reference in their own debate — references are freely leasable with no lease fee, no approval, no capacity cap on leasers. Leasing is implicit: adding a ref to your loadout IS leasing it. When a leaser cites a ref, two things happen: (1) the cite contributes a strike to the canonical ref (driving rarity upward, unchanged from the base system), AND (2) a **royalty** pays out to the original forger from the token faucet. Royalty is a separate payout on top of the strike — not funded from the burned cite cost. **Tiered royalty schedule** scales with the ref's live rarity at the moment of cite: Common 0.1 / Uncommon 0.25 / Rare 0.5 / Legendary 1.0 / Mythic 2.0 tokens per cite. **Win bonus:** if the citer wins the debate, the per-cite royalty **doubles** (Common 0.2, Mythic 4.0). Self-cite pays zero royalty (hard-blocked at RPC, same rule as self-seconding) but the owner's socketed modifiers still fire for self-cites (that's the point of socketing). **Royalty timing:** batched at match-end, one consolidated payout per forger per debate, paired with the win-bonus calculation. **Null/abandoned debates** (both debaters drop, tech failure, mod abort, F-04 rematch replacing a void match) pay zero royalties across the board. **Tournament debates** (F-08) pay royalties at full rate from the normal token faucet, unchanged from regular debates — royalties do not come out of the tournament prize pool. **No per-debate royalty cap** — the 5-cites-per-round hard cap already bounds the upside. **Disputed-ref royalty rates:** Disputed = 75% of base rate, Heavily Disputed = 25% of base rate, Auto-frozen = 0% (no cites possible). **Graduation does not bump the royalty rate** — royalty is strictly tied to current live rarity, no graduation bonus. **Rounding:** royalty payouts round up to the nearest 0.1 token. **Royalties land in `profiles.token_balance`** (single bucket, same as all other token earnings — no separate `royalty_balance` column). **Token ledger** records royalty payouts as distinct line items with fields: `timestamp, royalty_amount, ref_id, ref_name, ref_rarity_at_time_of_cite, debate_id, citer_user_id, citer_won_debate, final_payout` — this is B2B-data-grade granularity so buyers can reconstruct the full economy flow. **Royalty payouts are silent in the F-05 live feed** (no display during the debate) — visible only post-match in the forger's token ledger / history view. **Mods cannot see royalty amounts in real time** (neutrality; mod queries exclude royalty fields).

**Leaser visibility of socketed modifiers.** When a leaser browses a forged ref in the Armory or taps it in the bottom sheet, they see the **full socket contents** — every modifier socketed into the ref, by name and tier. This is intentional marketing: a Mythic ref with 5 premium modifiers socketed is visibly a flagship piece, which drives leasing demand. **However, socketed modifiers only fire for the ref owner.** When a leaser cites someone else's ref, they get the raw reference (strikes, rarity, royalty to owner) but none of the socketed modifier effects. Modifiers remain a private investment per F-57 — the owner paid the tokens to socket them, only the owner gets the effect. Leasers see the powers as a signal, not as a capability.

**AI opponents cannot cite references.** Reference loadouts are human-only. AI sparring opponents skip the loadout/cite system entirely — they debate without refs. This closes a farm-your-own-ref loophole (non-human counterparties cite their owner's refs and farm royalties) structurally rather than via detection. Enforcement: the `cite_debate_reference` RPC checks `profiles.is_bot = false` on both the citer and the citer's opponent. Bot-flagged accounts have the cite pathway hard-blocked. (Note: the `profiles.is_bot` column does not yet exist in schema — see Land Mine Map entry for F-55 migration dependency. The bot army growth system formerly tracked separately is SCRATCHED S248 — see scratch note below.)

**Soft-delete.** Forgers can delete their own references at any time. Delete is immediate and final — no undo grace window. Rate-limited to a maximum of 7 deletes per rolling 24-hour window (spite-delete / mass-delete abuse prevention). Delete semantics: the ref gets a `deleted_at` timestamp (soft-delete, not hard-delete) and is stripped from Armory browse, Forge search, and all loadouts where the owning debate hasn't started yet. **Debates already in progress at delete time keep the ref live in their locked loadouts until the match ends** — you picked your refs, you fight with them, grandfathered. Historical `debate_references` rows, feed events, and archive entries keep their `reference_id` pointer forever — never cascade-deleted, so replays stay intact. The deleted ref disappears from the owner's UI entirely — no archive view, no lifetime stats page. **Post-delete royalties are zero** — in-flight grandfathered debates still cite the ref for replay integrity, but royalty payouts to the deleted-ref owner are zero; tokens that would have been paid out burn to platform. Deleted refs are non-recoverable from the user's perspective. **Socketed modifiers burn with the ref on delete** — permanent socket per F-57 means permanent fate; the owner loses the socketed modifiers when they delete the ref.

**References are not tradeable or sellable.** No marketplace, no transfer, no gifting. A forged ref is bound to its original forger forever. The only "economy" around a ref is the royalty stream to the owner and the soft-delete option.

**Indexes (launch migration).** Required indexes on `arsenal_references`: `idx_arsenal_refs_category_rarity` on `(category, rarity DESC)` for F-27 chip-row filters and rarity sort; `idx_arsenal_refs_owner` on `(user_id)` for "forged-by-me" filter and profile reference lists; `idx_arsenal_refs_fingerprint` UNIQUE on `canonical_fingerprint` to enforce dedup at the DB level; `idx_arsenal_refs_strikes` on `(strikes DESC)` for the "Hot in the Arena this week" trending shelf; `idx_arsenal_refs_deleted_at` partial index on `(deleted_at) WHERE deleted_at IS NOT NULL` for soft-delete filtering across all browse queries.

**F-55 is now fully specced.** All 40 S243 reference-system questions are answered. No parked items remaining on this feature.

---

## F-57 Modifier & Power-Up System

Locks the 60-effect gameplay modifier system originally designed in Session 182 but never propagated from the handoff docx into canonical spec. Consolidates, extends, and replaces: the old 4-power-up list in the deleted `TOKEN-STAKING-POWERUP-PLAN.docx`, F-51 §9's bolt-on 3-power-up section, and all scattered references to "modifiers" in earlier chats. This is the source of truth for everything modifier-related going forward. F-05, F-10, F-27, F-51, and F-55 all point here.

**Core split — modifier vs power-up.** Every effect exists in two product forms: **modifier** (permanent, forged into a reference socket, cannot be un-forged, expensive, one-time investment) and **power-up** (one-shot consumable, burns after one debate, cheap, recurring sink). Same effect, two purchase products, different economics. Modifiers are the end-game gear; power-ups are the week-to-week fuel.

**Effect timing split — end-of-debate vs in-debate.** Effects come in two timing buckets. **End-of-debate effects (30)** apply once at the final score screen, producing the "after effects" breakdown on the post-match display — `Raw: 47 → +2 Point surge → -1 Opponent siphon → Final: 48`. **In-debate effects (29)** apply inline during the debate, modifying individual mod-awarded comment scores as they happen — visible on the F-05 inline format (`+2 × 1.25 = 2.5 pts`). The timing split is orthogonal to the modifier/power-up split: any of the 59 effects can be socketed as a permanent modifier or bought as a one-shot power-up. Total addressable SKUs: 59 effects × 2 product types = 118 distinct shop items.

**Why 59 and not 60.** The original design brief called for 30 in-debate effects to parallel the 30 end-of-debate effects, but one candidate ("Flywheel — every 3rd score ×2") was cut at walkthrough because it required per-comment counter state that no other effect needed, adding implementation complexity disproportionate to its value. Rounded down to 29 in-debate effects. The 30 end-of-debate effects are untouched from the S182 design.

**Rarity and socket counts — anchored to F-55.** Rarity tiers: Common / Uncommon / Rare / Legendary / Mythic. Socket counts per rarity on a forged reference: Common 1, Uncommon 2, Rare 3, Legendary 4, Mythic 5. Sockets can hold any modifier type — end-of-debate or in-debate, mixed freely. A Mythic reference with 5 sockets could hold 5 in-debate modifiers, 5 end-of-debate modifiers, or any mix. There is no separate socket pool per type. Effect tier gating determines which rarity a modifier can be socketed into (a Mythic-only effect cannot go into a Common reference's socket even if that reference has a socket available).

**Power-up cap per debate: 3.** Regardless of how many power-ups a user owns, only 3 can be equipped and brought into a single debate. Enforced at pre-debate loadout. Power-ups burn on debate start and are not refunded if the debate nulls.

**Stacking and math.** Multiple modifiers and power-ups can be active simultaneously. Math rules:

1. **In-debate modifier stacking.** All active in-debate multipliers on a given awarded debater sum into a single combined modifier applied to that comment's base score. `final_contribution = base_score × (1 + sum(in_debate_multipliers)) + sum(in_debate_flats)`. Negative multipliers (opponent debuffs) subtract. Result floors at zero — a comment cannot contribute negative points.
2. **End-of-debate modifier application.** After all comments are scored and summed into a running total, end-of-debate modifiers apply on top: `final_score = running_total × (1 + sum(end_of_debate_multipliers)) + sum(end_of_debate_flats)`. Negatives (e.g., Point siphon applied to the opponent) subtract from the opponent's final score. Result floors at zero per debater.
3. **Compounding is natural and expected.** An in-debate +25% modifier on a comment followed by an end-of-debate +25% on the running total produces a compound +56.25% effect on that comment's contribution. This is intended — the S182 design anticipated compounding as a reward for stacking investment.
4. **Archive storage.** Each point-award event in the feed archive table stores `base_score`, `in_debate_modifier_applied`, and `final_contribution` as separate columns. The post-match breakdown stores raw total, per-effect adjustments, and final total as separate fields on the debate row. Full B2B visibility into the scoring chain.

**Acquisition.** Both modifiers and power-ups are acquired in two ways: (1) **purchase from the F-10 shop** with tokens at listed prices, (2) **drop from debates** as post-match rewards (drop rates and trigger conditions TBD — parked for a dedicated economy session once live earn rates exist). Modifiers are drop-rarer than power-ups. Higher-tier effects are drop-rarer across both categories.

**The 30 end-of-debate effects (S182 list, pricing locked):**

*Token modifiers (5):*

| # | Name | Effect (per socket) | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 1 | Token boost | +10% tokens earned on win cite | Common+ | 40 | 5 |
| 2 | Token drain | -8% opponent tokens on survived challenge | Uncommon+ | 60 | 8 |
| 3 | Token multiplier | 2x all token earnings this debate | Mythic | 500 | 50 |
| 4 | Tip magnet | +15% spectator tips routed to you | Rare+ | 100 | 12 |
| 5 | Streak saver | Loss doesn't break win streak | Legendary+ | 200 | 25 |

*Point modifiers (7):*

| # | Name | Effect (per socket) | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 6 | Point surge | +1 point to your final score | Legendary+ | 250 | 30 |
| 7 | Point shield | Absorbs 1 opponent point modifier | Rare+ | 120 | 15 |
| 8 | Point siphon | -1 point from opponent's final score | Mythic | 500 | 50 |
| 9 | Momentum | +0.5 pts per consecutive round led | Rare+ | 100 | 12 |
| 10 | Comeback engine | +2 pts when trailing by 5+ | Legendary+ | 180 | 20 |
| 11 | Last word | +3 pts if speaking final round | Rare+ | 120 | 15 |
| 12 | Pressure cooker | -1 pt if opponent no cite by round 3 | Legendary+ | 200 | 22 |

*Reference modifiers (6):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 13 | Citation shield | Reference can't be challenged | Rare+ | 100 | 12 |
| 14 | Double cite | Each citation counts as 2 for stats | Uncommon+ | 60 | 8 |
| 15 | Forge accelerator | +3 citations instead of 1 this debate | Common+ | 40 | 5 |
| 16 | Counter cite | +1 pt when opponent cites | Legendary+ | 250 | 28 |
| 17 | Mirror | Copy random mod from opponent's best ref | Mythic | 600 | 60 |
| 18 | Burn notice | On win, destroy modifier from opponent's ref | Mythic | 600 | 55 |

*Elo + XP modifiers (5):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 19 | Elo shield | -25% Elo loss on defeat | Rare+ | 100 | 12 |
| 20 | Elo amplifier | +15% Elo gain on win | Uncommon+ | 60 | 8 |
| 21 | XP boost | +20% XP this debate | Common+ | 35 | 4 |
| 22 | Trophy hunter | Beat 200+ Elo above: double rewards | Legendary+ | 200 | 22 |
| 23 | Underdog | +1 pt/round if lower Elo | Rare+ | 120 | 15 |

*Crowd + spectator modifiers (4):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 24 | Crowd pleaser | Tips on your side = 1.5x gauge move | Rare+ | 100 | 12 |
| 25 | Spectator magnet | Debate ranks higher in spectator feed | Uncommon+ | 50 | 6 |
| 26 | Intimidation | Opponent sees loadout warning pre-debate | Legendary+ | 180 | 20 |
| 27 | Fog of war | Your loadout hidden from Reveal | Rare+ | 100 | 12 |

*Survival modifiers (3):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 28 | Insurance | On loss, modifiers on this ref survive | Legendary+ | 250 | 28 |
| 29 | Chain reaction | On win, one modifier regenerates as power-up | Mythic | 500 | 45 |
| 30 | Parasite | On win, steal opponent modifier to inventory | Mythic | 700 | 65 |

**The 29 in-debate effects (new, designed S246, pricing parallel to end-of-debate effects):**

*Self multipliers on scored comments (7):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 31 | Amplify | Next score ×2 | Rare+ | 120 | 15 |
| 32 | Surge | Next score ×1.5 | Uncommon+ | 60 | 8 |
| 33 | Echo | Next 2 scores ×1.25 each | Rare+ | 100 | 12 |
| 34 | Rally | All your scores this round ×1.5 | Legendary+ | 250 | 28 |
| 35 | Finisher | Your scores in round 4 ×2 | Rare+ | 120 | 15 |
| 36 | Opening gambit | Your scores in round 1 ×2 | Uncommon+ | 60 | 8 |
| 37 | Mic drop | Your final comment of the debate ×3 | Mythic | 500 | 50 |

*Self flat adders (5):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 38 | Boost | Next score +2 flat | Common+ | 40 | 5 |
| 39 | Double tap | Next 3 scores +1 each flat | Uncommon+ | 60 | 8 |
| 40 | Citation bonus | Next scored comment that contains a cited ref +3 flat | Rare+ | 100 | 12 |
| 41 | Closer | Last score of the debate +5 flat | Legendary+ | 180 | 20 |
| 42 | Banner | Every scored comment this round +0.5 flat | Rare+ | 100 | 12 |

*Opponent debuffs (6):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 43 | Dampen | Next opponent score ×0.5 | Rare+ | 120 | 15 |
| 44 | Drain | Next opponent score ×0 (nullified) | Mythic | 500 | 50 |
| 45 | Choke | Opponent's next 2 scores -1 flat each | Legendary+ | 180 | 20 |
| 46 | Static | Opponent's first score this round ×0.5 | Rare+ | 100 | 12 |
| 47 | Pressure | If opponent doesn't score this round, they lose 2 pts at round end | Legendary+ | 200 | 22 |
| 48 | Interrupt | Cancel the next opponent score entirely (counts as zero) | Mythic | 600 | 55 |

*Cite-triggered (5):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 49 | Weaponize | Your next cite's comment scores ×2 automatically | Rare+ | 120 | 15 |
| 50 | Backfire | If opponent cites a challenged reference, you +3 inline | Legendary+ | 180 | 20 |
| 51 | Counter-cite | When opponent cites, your next score +2 flat | Uncommon+ | 60 | 8 |
| 52 | Mythic echo | Citing a Mythic ref triggers inline ×1.5 on that comment | Legendary+ | 250 | 28 |
| 53 | Loadout lock | After your first cite, all following scores +1 flat | Rare+ | 100 | 12 |

*Conditional / momentum (4):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 54 | Streak | Each consecutive scored comment adds +0.5 to the next (stacks) | Rare+ | 120 | 15 |
| 55 | Comeback | If trailing by 5+, next 2 scores ×2 | Legendary+ | 200 | 22 |
| 56 | Underdog surge | If you're lower Elo, +1 flat on every scored comment | Rare+ | 120 | 15 |
| 57 | Spite | First score after opponent scores, ×1.5 | Uncommon+ | 60 | 8 |

*Specials (2):*

| # | Name | Effect | Tier | Mod cost | PU cost |
|---|---|---|---|---|---|
| 58 | Overload | Next score ×3, but only if mod's base award ≥3 | Legendary+ | 200 | 22 |
| 59 | Bait | If opponent challenges one of your references this debate, your next score ×2.5 | Rare+ | 120 | 15 |

**Implementation notes:**

- All modifier application happens server-side in `score_debate_comment` (F-51 scoring RPC) and in an end-of-debate finalization RPC that computes the "after effects" breakdown. Clients never compute final scores — they render what the server says.
- The inline modifier display format (`+2 × 1.25 = 2.5 pts` or `+2 pts` when modifier = 1.0) is a render-layer concern in F-51's feed event rendering. Server returns base_score, modifier, final_contribution; client composes the line.
- Power-up equipped state is a row in a new `user_powerups_equipped_in_debate` staging table keyed on `(user_id, debate_id, powerup_id)`, populated at pre-debate loadout, consumed at debate start, never refunded.
- Reference socket state is a row in a new `reference_sockets` table keyed on `(reference_id, socket_index)` with `modifier_id` pointing to the specific effect socketed. Never deleted — socketing is permanent per the "cannot un-forge" rule.
- Pricing is launch-default, subject to re-balancing after live earn-rate data exists. Do not treat as final.
- The old F-51 §9 power-up list (2x Multiplier, Shield, Reveal) is superseded by this spec. 2x Multiplier's "doubles staking payout on win" behavior is preserved as a standalone staking rule in F-09, NOT as an in-debate effect. Shield's "blocks a reference challenge" behavior is preserved as effect #13 Citation shield above. Reveal's "shows opponent's pre-loaded references" is preserved as a new effect (to be added in a future F-57 supplement) OR scratched — Pat decision at build time.

---

## F-09 Token Prediction Staking — Audit (Session 249)

F-09 is substantially built and live in production. This section is an audit of as-shipped state, not a forward spec. The source of truth `TOKEN-STAKING-POWERUP-PLAN.docx` was erased from the repo in an earlier session; all F-09 content is now captured here.

**What shipped.** Parimutuel stake pool on any pending/lobby/matched debate, pre-debate only. Single stake per user per debate, no updates, no cancel-after-placement. Panel renders at `src/staking.ts:renderStakingPanel()` (343-line TS module, migrated from `moderator-staking.js` in S126, window-bridged S140). Three live RPCs: `place_stake`, `get_stake_pool`, `settle_stakes`. Tables: `stakes` and `stake_pools`. Screenshot confirmation S249 shows the panel live at `themoderator.app` in an AI Sparring match (SPECTATOR+ · MAX 5 tier gate displayed, NO STAKES YET pool state, two side buttons showing 2.00X starting odds, 5/10/25 quick-amount buttons, SELECT A SIDE CTA).

**Tier ladder (from `place_stake` source of truth, not TS mirror):**

| Questions answered | Tier | Stake cap |
|---|---|---|
| 0–9 | Unranked | 0 (locked) |
| 10–24 | Spectator+ | 5 |
| 25–49 | Contender | 25 |
| 50–74 | Gladiator | 50 |
| 75–99 | Champion | 100 |
| 100+ | Legend | 999999 (effective no cap) |

Client mirror `src/tiers.ts TIER_THRESHOLDS` must stay in sync — LM-172 governs the dual-update rule.

**Parimutuel settlement math.** `settle_stakes` reads the authoritative winner from `arena_debates.winner` (never from client param post-S230), loops stake rows with FOR UPDATE locks, and pays out `FLOOR((stake_amount / winning_side_total) * total_pool)` to each winner. Losers get zero (original stake was deducted at `place_stake` time). Draws refund every staker their original amount. Multi-pass safe via `v_pool.status = 'settled'` idempotency check at the top of the RPC. Concurrent-settlement race blocked by the `SELECT ... FOR UPDATE` lock on the pool row.

**2x Multiplier carryover from F-51 §9 (standalone F-09 rule).** The legacy 2x Multiplier power-up's "doubles staking payout on win" behavior is preserved as a standalone F-09 staking rule, NOT as an F-57 in-debate effect. Only applies to staking refund math. Does NOT apply to F-58 sentiment tipping refunds. Implementation path: `settle_stakes` accepts a `p_multiplier` parameter (originally client-sent, hardened S230 to always read server-side — current implementation hardcodes to 1.0 pending F-57 build). When F-57 ships and 2x Multiplier becomes a real user-purchasable power-up, `settle_stakes` reads the winner's equipped multiplier from the F-57 staging table and applies `v_payout := FLOOR(v_payout * multiplier)`.

**Pre-debate window.** `place_stake` enforces `status IN ('pending','lobby','matched')`. Once the debate flips to `'live'` (via `update_arena_debate` in `enterRoom`), the staking window is closed. LM-184 protects this: AI debates must be created as `'pending'` not `'live'` or staking is impossible.

**Known issues.**

1. **Deployed-functions export is stale (LM-210).** `supabase-deployed-functions-export.sql` was last re-synced at S227 — before the S230 `settle_stakes` hardening and before any subsequent signature changes. The committed export shows `settle_stakes(p_debate_id uuid, p_winner text, p_multiplier numeric DEFAULT 1)` with `p_winner` having no default, while `src/staking.ts:105` calls the RPC with only `{p_debate_id}`. Settlement works in production (Pat confirmed winning payouts appear on the results screen), so the deployed signature was further modified in a session between S230 and now and that change is not captured in any `.sql` file in the repo. NT line 127's claim that the export is "in sync with production" is false. See LM-210.

2. **`try/catch` swallows settlement errors silently.** `src/arena/arena-room-end.ts:184` wraps the `settleStakes(debate.id)` call in `try { ... } catch { /* warned */ }` but there is no `console.warn` inside the catch block — only a comment. If settlement ever fails (RPC exception, auth issue, schema drift), the failure is invisible to both the user and the dev console. Recommend adding a real `console.error('[Arena] settleStakes failed:', err)` inside the catch when F-09 is next touched.

3. **`cast_sentiment_vote` RPC is missing from the export** (LM-210 symptom). `src/arena/arena-feed-room.ts:544` calls it, the client-side enum references it, but no `cast_sentiment_vote` definition exists in `supabase-deployed-functions-export.sql`. Either deployed and not exported, or missing entirely. Moot post-F-58 scratch of the free-vote mechanic, but worth verifying during the F-58 build.

**F-09 punch list status:** ✅ shipped, with the three known issues above logged against LM-210 and future cleanup.

---

## F-58 Sentiment Tipping

New feature. Replaces the scratched F-51 Phase 5 free-tap sentiment vote model. **There is no free vote button.** The only way to move the sentiment gauge is to spend tokens. Every gauge tick is paid for.

**Core loop.** During a live debate, spectators see a pulse gauge (cyan = side A, magenta = side B) and a four-button tip strip: **2 · 3 · 5 · 10**. Each tap immediately burns that many tokens from the spectator's balance and adds the same number to the chosen side's running sentiment total on `arena_debates`. The gauge visual renders the two totals as an absolute bar — no percentages, no log scale. Every token = 1 unit of gauge movement. Tipping is continuous throughout the live debate window; no ad-break gating, no 30s-end-of-debate window restriction. A user may tip both sides of the same debate if they want (no side-lock, unlike staking which is one-side-only). Unlimited cumulative taps.

**Minimum tip = 2 tokens.** Server-side floor. The `FLOOR(amount * 0.5) = 0` refund edge on 1-token tips is the reason — no point letting a user pay 1 token to win back 0 tokens even on the winning side. Button strip is **2 · 3 · 5 · 10**.

**Scope — live only, human vs human only.** Tipping is enabled only while `arena_debates.status = 'live'`. Replays, mirror pages, and completed debates show the gauge read-only (final sentiment totals frozen). AI Sparring matches (mode = `'ai'`) have the tip strip **hidden entirely** — no tipping against an AI opponent. Cancelled or declined debates keep all burned tips (no refund) — the tokens already moved the gauge before cancellation, so the burn stands.

**Tier gate — watch-based, not question-based.** F-58 introduces a second tier ladder parallel to (and completely independent of) the F-09 `questions_answered` staking ladder. The tipping ladder is based on **debates watched**, derived from the new `debate_watches` table (see below):

| Debates watched | Tier | Tipping allowed? |
|---|---|---|
| 0 | Unranked | Locked — "Watch a debate to unlock tipping" |
| 1–4 | Observer | ✅ |
| 5–14 | Fan | ✅ |
| 15–49 | Analyst | ✅ |
| 50+ | Insider | ✅ |

The ladder is a **binary gate** — once Observer tier is reached, all tiers have unlimited tipping up to the 1-billion-per-side per-debate cap. No per-tier amount caps. The tier display is purely a status marker.

**Settlement — 50% refund for winners.** When a debate ends (status `'complete'`, winner set on `arena_debates`), a new `settle_sentiment_tips` RPC loops every unsettled tip row for that debate and:

- If tipper's side = winner side: `refund_amount = FLOOR(amount * 0.5)`, credited back to `profiles.token_balance`.
- If tipper's side = loser side: `refund_amount = 0`. The original burn stands.
- If winner = `'draw'`: `refund_amount = 0` for all tips. Burn stands (draws do not refund tips, unlike stakes which fully refund on draw). Deliberate: the tokens already moved the gauge during the live debate, which is the thing they paid for.

Settlement is called from the same post-debate path as `settle_stakes` (in `src/arena/arena-room-end.ts`), ideally wrapped in the same transaction for atomicity. Both settlement functions should co-locate in the post-debate flow so a failure in one rolls back the other.

**Database schema.**

```sql
-- New table: debate_watches (B2B tracking + tier gate source)
CREATE TABLE debate_watches (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  debate_id   UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  watched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, debate_id)
);
CREATE INDEX idx_debate_watches_user ON debate_watches(user_id);
CREATE INDEX idx_debate_watches_debate ON debate_watches(debate_id);

-- RLS: service-role only, access via RPC (Option A: maximum privacy)
ALTER TABLE debate_watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY debate_watches_service_only ON debate_watches
  FOR ALL USING (current_setting('role') IN ('postgres', 'service_role'));

-- New table: sentiment_tips
CREATE TABLE sentiment_tips (
  id             BIGSERIAL PRIMARY KEY,
  debate_id      UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  side           TEXT NOT NULL CHECK (side IN ('a','b')),
  amount         INTEGER NOT NULL CHECK (amount >= 2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  refund_amount  INTEGER,           -- NULL until settled
  settled_at     TIMESTAMPTZ
);
CREATE INDEX idx_sentiment_tips_debate ON sentiment_tips(debate_id);
CREATE INDEX idx_sentiment_tips_user_recent ON sentiment_tips(user_id, created_at DESC);
CREATE INDEX idx_sentiment_tips_settlement ON sentiment_tips(debate_id) WHERE settled_at IS NULL;

-- Cached running totals on arena_debates (gauge reads one row, not an aggregate)
ALTER TABLE arena_debates
  ADD COLUMN sentiment_total_a BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN sentiment_total_b BIGINT NOT NULL DEFAULT 0,
  ADD CONSTRAINT sentiment_cap_a CHECK (sentiment_total_a <= 1000000000),
  ADD CONSTRAINT sentiment_cap_b CHECK (sentiment_total_b <= 1000000000);
```

**RPCs to build.**

1. **`log_debate_watch(p_debate_id UUID)`** — SECURITY DEFINER. Called from `src/pages/spectate.ts` on page load, same moment as `bump_spectator_count`. Inserts into `debate_watches`, ON CONFLICT DO NOTHING (UNIQUE handles re-entry). **Debaters excluded:** check if `auth.uid()` matches either `debater_a` or `debater_b` on `arena_debates`; if yes, skip the insert. **Guest spectators excluded:** NULL `auth.uid()` returns early with success. Instant log — no dwell threshold.

2. **`get_user_watch_tier()`** — SECURITY DEFINER, no params. Returns `{tier: text, count: int}`. Reads `COUNT(*) FROM debate_watches WHERE user_id = auth.uid()` and derives the Observer/Fan/Analyst/Insider tier from the ladder. Cheap — indexed on `user_id`. Called once per spectate-page-load by the client to render the tier badge and unlock the tip strip.

3. **`cast_sentiment_tip(p_debate_id UUID, p_side TEXT, p_amount INTEGER)`** — SECURITY DEFINER. Auth check → validate side `IN ('a','b')` → validate amount `>= 2` → derive user's watch tier via inline subquery on `debate_watches` → reject if tier = Unranked → read debate status + mode → reject if status != `'live'` → reject if mode = `'ai'` → atomically deduct `p_amount` from `profiles.token_balance` (WHERE `token_balance >= p_amount` defense-in-depth) → insert `sentiment_tips` row → update `arena_debates.sentiment_total_<side>` by `p_amount` (CHECK constraint rejects if the add would push past 1B — per-side cap) → emit `sentiment_tip` feed event via `append_feed_event` → return `{success, new_total_a, new_total_b, new_balance}`. Rate limit client-side to ~4 taps/sec; no server-side per-second rate limit since the token cost is itself the throttle.

4. **`settle_sentiment_tips(p_debate_id UUID)`** — SECURITY DEFINER. Called from post-debate flow. Reads authoritative winner from `arena_debates.winner`. Loops unsettled tip rows (`WHERE debate_id = p_debate_id AND settled_at IS NULL FOR UPDATE`). For each: if `side = winner AND winner IN ('a','b')`, compute `refund_amount = FLOOR(amount * 0.5)`, credit to profile balance, set `settled_at = now()`. Otherwise (loser or draw), set `refund_amount = 0` and `settled_at = now()` with no credit. Idempotent via `WHERE settled_at IS NULL`. Should run in the same transaction as `settle_stakes` for post-debate atomicity.

5. **DROP `cast_sentiment_vote`** — the free-vote RPC (if it exists in production; export is stale so unclear) is dropped. No fallback. The feed event type `sentiment_vote` is superseded by `sentiment_tip` in `debate_feed_events`. Historical rows with `sentiment_vote` remain as legacy tags; new events use `sentiment_tip`.

**Client changes.**

- `src/arena/arena-feed-room.ts:544` — delete the `cast_sentiment_vote` call, replace with a `cast_sentiment_tip` handler wired to the 2/3/5/10 tip strip.
- `src/arena/arena-types.ts:276` — add `'sentiment_tip'` to the `FeedEventType` enum (keep `'sentiment_vote'` for historical row compatibility).
- `src/pages/spectate.ts:305` — add `safeRpc('log_debate_watch', {p_debate_id: debateId})` right after the existing `bump_spectator_count` call.
- New tip strip UI component in the arena feed-room render path: four buttons labeled **2 · 3 · 5 · 10**, color-coded per side (cyan A, magenta B), shown in the debate room while `debate.status === 'live' && debate.mode !== 'ai'`. Locked state for Unranked tier: "Watch a full debate to unlock tipping." The gauge bar above reads `arena_debates.sentiment_total_a` and `sentiment_total_b` as absolute values.
- The gauge renders as an absolute bar — side A's length proportional to `sentiment_total_a`, side B's length proportional to `sentiment_total_b`, the total bar width is the sum. When side A = 50M and side B = 100, the bar is essentially all cyan with a hairline of magenta at the end. This is deliberate — the visual communicates dominance directly.

**B2B data payload.** Every tip emits a `sentiment_tip` feed event with `{side, amount, new_total_a, new_total_b, tipper_user_id}`. The `debate_feed_events` archive is the B2B export — buyers can reconstruct exactly how the gauge moved over time during the live debate. The `debate_watches` table is also B2B-grade (who watched what, when) — service-role-only RLS keeps it off the client, aggregate exports to buyers per standard analytics flow. **Dwell time (`left_at` column, session-length data) is NOT part of the launch spec.** Research during S249 confirmed dwell data is valuable when the platform runs ad inventory or sponsorship deals (DOOH model: high-dwell screens command premium CPMs; Litmus charges $25-35K/year for enterprise email dwell analytics as a standalone product), but no such inventory exists on The Moderator yet. Adding `left_at` is a cheap ALTER TABLE later when ad monetization becomes concrete. Don't pre-build speculative infrastructure.

**Build blockers.**

- Neither `debate_watches` nor `sentiment_tips` exists in schema. F-58 build migration must create both tables first, then the RPCs, then the client wiring.
- `cast_sentiment_vote` RPC cleanup depends on first verifying deployed state (LM-210 stale export). Safe move: run a diagnostic query against production to confirm whether the RPC exists before dropping anything.
- No dependency on F-55 or F-57 — F-58 can ship independently.

**Out of scope for F-58:**

- Per-tier tip amount caps (none — all tipping tiers have unlimited amount).
- Dwell time tracking / `left_at` column on `debate_watches`.
- Tipping on completed debates / replays.
- Tipping on AI Sparring matches.
- Integration with the 2x Multiplier staking carveover (staking-only rule, does not apply to tip refunds).
- Backfill of `debate_watches` from historical spectator activity (everyone starts at 0 watched on rollout).
- Anonymous/guest tipping (guests watch but do not tip; tipping requires auth).
- Debaters tipping on their own matches (allowed — per Pat S249, "oh who cares. let them if they have time").
- Tip-history personal page for users (out of scope; watch history is service-role-only).


---

## F-16 / F-17 / F-18 — Groups: Settings, Entry Requirements, Auditions (S250)

Walked S250. Three features walked as a cluster because they share a single `join_mode` state machine on `groups` and a single Settings UI surface. Build order is flexible — can ship as one migration or sequentially, but the DB columns land together. **F-17 and F-18 are siblings (not parent/child) because the Model A decision below makes them mutually exclusive join modes, dissolving the apparent F-18→F-17 dependency from the original stub.**

**Model A — Mutually Exclusive Join Modes.** A group has exactly one `join_mode` at any time, set by the leader. Values:

- `open` — anyone can join (current default behavior)
- `requirements` — F-17 gates checked on join
- `audition` — F-18 audition flow intercepts join
- `invite_only` — leader-generated invite is the only entry path (no Join button for non-invited users)

Switching `join_mode` is a leader-only action via Group Settings. Existing members are never affected by a mode change — gates and auditions apply only to new joiners. Leader-generated invites bypass ALL gates and auditions in ALL modes (invite is a leader override, per S250 Q20 confirmation).

---

### F-16 — Group Settings (post-creation edit)

**Who can edit:** Leader only. No co-leader concept is introduced — the promote RPC and `group_role_rank()` hierarchy is noted but not extended for this feature. Leader-only for all settings, all deletes, all audition approvals, all "must debate leader" audition debates. Members have no elevated permissions.

**Editable fields.** Every field captured in `create_group` is editable post-creation **except `name`**. Name is locked at creation because downstream history (GvG records, leaderboards, challenge logs) references groups by name and renames would break audit trails. Editable:

- `description` (free text)
- `category` (one of: general, politics, sports, entertainment, music, couples_court — free-for-all to change, no cooldown per S250 Q28)
- `is_public` (freely flippable per S250 Q24 — no cooldown, no restriction, flipping public→private keeps existing members; mitigation against "build-then-lock" abuse: members can leave at any time, so it's not a trap)
- `avatar_emoji`
- `join_mode` (the Model A state machine — drives F-17 and F-18 visibility)
- F-17 gate values (only visible when `join_mode = requirements`)
- F-18 audition rule + optional debate parameter overrides (only visible when `join_mode = audition`)

**Delete group.** Leader-only. When deleted:

- Cascade-delete `group_members`, `group_bans`, `group_auditions`, pending `group_challenges`.
- **Preserve** completed GvG debate history by nulling out the `group_id` foreign key on `arena_debates` (or the equivalent GvG junction table) rather than hard-cascading. Historical debates survive, they just no longer link back to a live group (per S250 Q26).
- Delete is immediate and final — no soft-delete, no recovery, no undo window. A confirmation modal with a "type the group name to confirm" input is required at the UI layer to prevent fat-finger.

**UI surface — mobile-forward.** Group Settings is a **full-screen modal** pushed from the Group Detail screen (Screen W), accessed via a gear icon in the Group Detail header visible only to the leader. Full-screen modal (not a centered dialog) because (a) mobile screens are narrow and form fields need room to breathe, and (b) the Play Store app target means the Settings screen should feel like an app screen, not a popover. The modal has its own back button, its own scroll, and a "Save" button pinned to the bottom in thumb reach. Sections: General (description, category, avatar, is_public toggle), Join Mode (radio buttons for the 4 modes + conditional sub-sections), Danger Zone (delete group with confirmation).

**Mobile-first design notes.** Thumb reach zones respected — destructive actions (Delete Group) sit inside the Danger Zone section and require an extra confirmation step. Form fields are spaced for 44pt tap targets. The `is_public` toggle uses a native-feeling switch component, not a checkbox. The category selector is a bottom sheet picker, not a dropdown (better for mobile touch).

**New RPC.** `update_group_settings(p_group_id uuid, p_description text, p_category text, p_is_public boolean, p_avatar_emoji text, p_join_mode text, p_entry_requirements jsonb, p_audition_config jsonb)`. SECURITY DEFINER. Leader-only guard via `group_members.role = 'leader'` check. Returns the updated group row as JSON. Any parameter passed as NULL is left unchanged (partial update semantics). `p_entry_requirements` and `p_audition_config` are JSONB for schema flexibility — the F-17 and F-18 fields live inside those columns rather than as dedicated columns, keeping the `groups` table narrow.

**New RPC.** `delete_group(p_group_id uuid, p_confirm_name text)`. SECURITY DEFINER. Leader-only. Requires `p_confirm_name` to match the group name exactly as a fat-finger guard. Runs the cascade + history-preservation sequence documented above. Emits a `group_deleted` event to the event log.

---

### F-17 — Entry Requirements

Active only when `join_mode = requirements`. Gates checked inside `join_group` RPC (single entry point per S250 Q9). Order of checks: ban → audition (N/A in this mode) → entry requirements → insert member row.

**Gate types shipping in v1:**

- **Minimum global Elo.** Integer. Checked against `profiles.elo_rating`. Per S250 Q6, there is no per-category Elo in production — only a single global Elo per user. Per-category Elo gating is out of scope and would be a separate feature requiring a matchmaking and leaderboard rewrite.
- **Minimum token staking tier.** One of the F-09 tiers: Unranked / Spectator+ / Contender / Gladiator / Champion / Legend. Per S250 Q6, this is the only "tier" system in the codebase. Leader picks a minimum from a dropdown.
- **Profile completion.** Boolean. "Requires complete profile" means the user has a display name, avatar, bio, and has finished Plinko (the existing `profiles.profile_complete` or equivalent flag). Checked against the existing column.

**Gate combination logic.** AND logic per S250 Q7 — a user must meet **every** gate the leader has set. Leaders can set any subset (zero, one, two, or all three gates). Zero gates with `join_mode = requirements` is legal but functionally identical to `open`.

**Non-member view on a gated group (S250 Q8).** When a non-member taps into a Group Detail screen for a gated group and they don't meet the gates:

- The Join button is **hidden entirely** (not disabled, not shown with a lock icon — the S250 answer was "they can see group members only").
- The full group info (name, description, member count, member list, Group Elo, category) remains visible.
- No explanation of WHY they can't join is shown — the group's requirements are not disclosed to non-members. This prevents gate-farming (users calibrating their stats specifically to clear a known bar) and keeps the group's bar a private leader decision.

**Grandfathering (S250 Q10).** Existing members are unaffected when a leader enables or raises gates. New gates apply only to new joiners. No retroactive enforcement, no admin "kick everyone below the bar" tool.

**Storage.** Entry requirement values live in `groups.entry_requirements JSONB` with shape:

```json
{
  "min_elo": 1200,
  "min_tier": "contender",
  "require_profile_complete": true
}
```

Any field absent or null = that gate is not active. All three fields absent = no gating (functionally open).

**`join_group` modification.** Inside the existing RPC, after the ban check and before the insert, add a `join_mode` branch. If mode is `requirements`, fetch `entry_requirements` and check each active gate. Fail with a specific error message per failed gate, e.g., `'Minimum Elo 1200 required'`, `'Minimum tier Contender required'`, `'Profile must be complete'`. The client discards the specific message and shows a generic "You do not meet the requirements to join this group" — the specific failure stays server-side for debugging only (prevents gate-reverse-engineering).

---

### F-18 — Audition System

Active only when `join_mode = audition`. Exhibition-only per S250 Q11 — audition debates do not affect Elo, XP, stats, or Group Elo for either participant. Win/loss is determined by normal debate scoring (whichever debater has the higher final score wins; draws count as fail).

**The 5 audition rules (S250 Q12 confirmed).** Leader picks exactly one from a dropdown in Group Settings:

1. `allowed_by_leader` — no debate required. Candidate taps Join → audition row inserted → leader sees it in a pending list → approve/deny buttons. Shortest flow.
2. `debate_leader_any` — candidate must debate the leader. Win or lose, completing the debate admits the candidate. Tests willingness, not skill.
3. `debate_member_any` — candidate must debate any group member. Win or lose, completing the debate admits.
4. `debate_leader_win` — candidate must debate and WIN against the leader.
5. `debate_member_win` — candidate must debate and WIN against any group member.

**Audition initiation flow (S250 Q13, suggestion adopted).**

- Candidate taps Join on an audition-mode group → audition modal opens showing the group's audition rule in plain language ("Must win a debate vs. a group member").
- Candidate fills in the debate parameters: topic, category, ruleset (amplified/unplugged), total rounds. **Leader-override support per S250 Q27:** any parameter the leader has locked in the group's audition config is pre-filled and disabled; any parameter the leader left blank is candidate-editable. Leader who wants full control locks all four; leader who wants "show me what you've got" locks nothing.
- Candidate taps "Request Audition" → `group_auditions` row inserted with status `pending`, parameters stored, candidate identity stored.
- For `allowed_by_leader`: notification fires to the leader, leader sees the pending row in a Pending Auditions section on the group page with Approve / Deny buttons.
- For `debate_leader_*`: notification fires to the leader, leader sees the pending row with an Accept Audition button that launches the debate directly. Leader can also decline with no debate.
- For `debate_member_*` (S250 Q14, simplified model): pending auditions are visible to ALL group members in a Pending Auditions section on the group page. Any member can tap Accept Audition to claim it, first-come-first-served. Debate launches between the accepting member and the candidate. No assignment, no queue management, no leader intervention required.

**Audition debate wiring.** Launches through the existing `create_private_lobby` infrastructure with a new flag `p_audition_id uuid` that tags the debate as exhibition. The existing `update_arena_debate` / scoring pipeline already has an `unplugged` ruleset branch that skips Elo/XP/stats — audition debates reuse that branch by setting ruleset effects to exhibition-mode regardless of the candidate's ruleset pick. On debate completion, a trigger (or the existing end-of-debate RPC) reads the `audition_id` from the debate row, looks up the audition record, determines pass/fail based on the audition rule type and the winner, and writes the result back to `group_auditions.status` and `group_auditions.resolved_at`. On pass, the candidate is auto-inserted into `group_members`.

**Pending audition lifetime (S250 Q15).** Pending auditions never expire automatically. They sit in the Pending Auditions section of the group page forever unless:

- The leader deletes the group (cascade).
- The leader manually deletes the audition row via a trash icon in the Pending section.
- The candidate withdraws by tapping a Withdraw button on their own pending audition.
- The audition is accepted and the debate runs to completion.

**Retry policy (S250 Q17).** Unlimited retries. A candidate who fails an audition can immediately request another one. No cooldown, no attempt counter, no lockout. This is simple for users to understand and impossible to gate-farm since a failed audition is an exhibition match that costs no tokens and moves no ratings — the only cost is the candidate's time.

**Concurrency (S250 Q18).** Serialized per candidate per group. A candidate can have **one pending audition per group at a time**. Attempting to request a second audition for the same group while one is pending returns an error. Different groups are independent — a candidate can have pending auditions at multiple groups simultaneously.

**Audition debate format (S250 Q27 resolved).** Per-field leader override. The group's `audition_config` JSONB holds optional overrides:

```json
{
  "rule": "debate_member_win",
  "locked_topic": null,
  "locked_category": "politics",
  "locked_ruleset": "amplified",
  "locked_total_rounds": null
}
```

In this example, the leader has locked category and ruleset but lets the candidate pick topic and round count. Any locked field becomes disabled (pre-filled, non-editable) in the candidate's audition request modal.

**New table — `group_auditions`.**

```sql
CREATE TABLE public.group_auditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule TEXT NOT NULL CHECK (rule IN ('allowed_by_leader','debate_leader_any','debate_member_any','debate_leader_win','debate_member_win')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','in_progress','passed','failed','denied','withdrawn')),
  topic TEXT,
  category TEXT,
  ruleset TEXT DEFAULT 'amplified',
  total_rounds INTEGER DEFAULT 4,
  claimed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  debate_id UUID REFERENCES public.arena_debates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  UNIQUE (group_id, candidate_user_id) DEFERRABLE
);
```

The UNIQUE constraint enforces the "one pending audition per candidate per group" rule (S250 Q18). DEFERRABLE so it can be dropped and re-inserted inside a transaction when a candidate retries after a failed audition (the failed row is deleted first, then the new pending row is inserted).

**New RPCs.**

- `request_audition(p_group_id uuid, p_topic text, p_category text, p_ruleset text, p_total_rounds int)` — candidate-facing, creates pending row with leader-override validation.
- `accept_audition(p_audition_id uuid)` — member-facing (or leader-facing for `debate_leader_*` rules), claims the audition and launches the debate via `create_private_lobby` with `p_audition_id` wired through.
- `approve_audition(p_audition_id uuid)` — leader-only, for `allowed_by_leader` rule, directly admits the candidate.
- `deny_audition(p_audition_id uuid, p_reason text)` — leader-only, for any rule. Marks status `denied`.
- `withdraw_audition(p_audition_id uuid)` — candidate-only, marks status `withdrawn`.
- `resolve_audition_from_debate(p_debate_id uuid)` — internal, called by the end-of-debate pipeline. Reads the debate winner, matches against the audition rule, writes final status, admits the candidate on pass.
- `get_pending_auditions(p_group_id uuid)` — list pending auditions visible to the caller based on their relationship to the group.

**RLS.** The `group_auditions` table is gated: candidates can see their own rows, group members can see pending rows for their group, leaders can see everything for their group, everyone else sees nothing. Matches the existing group private-info pattern.

**Integration with `join_group` RPC.** When `join_mode = audition`, the `join_group` RPC does NOT insert into `group_members`. Instead it returns a special response `{success: false, audition_required: true, rule: 'debate_member_win'}` which the client uses to open the audition request modal. This keeps `join_group` as the single entry point while cleanly branching to the audition flow.

---

### Cluster — build order and migration shape

**One combined migration.** All three features touch `groups` (adding `join_mode`, `entry_requirements`, `audition_config` columns) and add the `group_auditions` table. Bundling into one migration keeps the schema change atomic and avoids a half-shipped state where settings exist but the join modes they toggle don't work.

**Column additions to `groups`:**

```sql
ALTER TABLE public.groups
  ADD COLUMN join_mode TEXT NOT NULL DEFAULT 'open'
    CHECK (join_mode IN ('open','requirements','audition','invite_only')),
  ADD COLUMN entry_requirements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN audition_config JSONB DEFAULT '{}'::jsonb;
```

Backfill is trivial — every existing group defaults to `open` and the JSONB fields default empty, preserving current behavior.

**Client work:** Group Settings modal (new), Pending Auditions section on Group Detail page (new), audition request modal (new), join flow branch handling (modify existing join button handler), audition debate flag plumbing through the private lobby creation path.

**Build blockers:** none. Zero dependencies on F-10, F-55, F-57, F-58. Can ship independently whenever scheduled.

**Out of scope for this cluster:**

- Co-leader role or any expansion of the group role hierarchy beyond what already exists.
- Per-category Elo gating (would require a full per-category Elo system that does not exist in production).
- Group-wide chat, announcements, or sub-groups.
- Group token balance or group inventory (out of scope for F-16; relevant to F-59 group rewards which were cut from v1 for the same reason).
- Audition tournaments or multi-round audition sequences — one debate decides, period.
- Audition spectatorship — pending auditions are internal to the group; no public feed of "hey come watch this audition."
- Retroactive gate enforcement tools for existing members.
- Group name editing — permanently locked post-creation.

---

## F-59 — Invite Rewards (Growth Loop)

Walked S250. New feature. The existing `src/share.ts` has a half-built `inviteFriend()` with a broken `generateRefCode()` (returns a random suffix every call, not stable per-user) and a `handleDeepLink()` that captures `?ref=` into localStorage but **never reads it back out anywhere in `src/`**. F-59 replaces that infrastructure with a real attribution system and a tiered item-reward ladder designed to be the first genuinely motivating reason for users to share the app.

**The ladder.** Cumulative milestones (S250 confirmed). Each milestone drops once per user, additive to prior drops:

- **1 successful invite** → 1 **Legendary power-up** (one-shot consumable from the F-57 catalog, user picks from all Legendary-tier power-ups at claim time)
- **5 successful invites** → 1 **Mythic power-up** (one-shot consumable, user picks from all Mythic-tier power-ups)
- **25 successful invites** → 1 **Mythic modifier** (permanent, socket into a forged reference, user picks from all Mythic modifiers across both end-of-debate and in-debate categories per S250 Q10)

**Repeating tier.** After the 25-invite prestige reward, users earn **1 additional Mythic power-up for every 25 further successful invites** (at invite 50, 75, 100, …). No further permanent modifiers — the 25-invite Mythic modifier is one-time-only. This keeps the loop rewarding indefinitely for super-inviters without minting infinite permanents into the economy.

**Between-milestone invites are silent.** Invites 2-4 and 6-24 produce no item drops, only a progress counter update on the Invite & Rewards screen and a conversion notification. The milestones ARE the reward — silent grinding builds anticipation.

**Invitee reward (S250 Q9 adopted).** When a new user signs up via an invite link and completes their first ranked debate, they receive **500 tokens** as a welcome gift. This symmetric-reward model measurably lifts conversion in referral systems (Dropbox-style). Small cost, meaningful lift. Awarded automatically at the conversion trigger, same RPC path as the inviter credit.

---

### Definition of "successful invite" (S250 Q1)

A referral converts to "successful" status when the invitee's account reaches **"first ranked debate completed."** Specifically:

- Invitee creates an account via the invite link (status `signed_up` in `referrals` table)
- Invitee completes Plinko and all onboarding
- Invitee enters and **completes** (runs to final scoring, not a rage-quit or disconnect) their **first ranked arena debate**

Only at that moment does the referral row flip to `converted`, the inviter's milestone counter increment, and the reward evaluation run. This threshold is:

- Low enough that any legitimate new user will hit it naturally (they're here to debate)
- High enough to filter out bot-farm signups that never engage
- Tied to a concrete action that's hard to fake (requires a real opponent, a real matchmaking cycle, a real debate completion)

Completed AI Sparring matches do NOT count as "first ranked debate" — they're unranked practice mode.

---

### Anti-fraud (S250 Q2)

Four protections ship in v1:

1. **Device fingerprint block.** Leverages the existing `src/analytics.ts` visitor UUID pipeline. If the inviter and invitee share the same visitor UUID (same browser, same device), the referral is auto-rejected with `status = 'rejected_fraud', fraud_reason = 'shared_device'`. Invitee keeps their account; inviter gets no credit.
2. **IP rate-limit.** Max 3 successful conversions per source IP per rolling 30-day window. Protects against a single user cycling through alt accounts on the same network. Shared Wi-Fi households stay under the cap; abusers hit it fast.
3. **Email domain rate-limit.** Max 5 successful conversions from the same `@domain.com` per inviter per rolling 30-day window. Specifically targets temp-mail farms (`@mailinator.com`, `@10minutemail.com`, etc.) without blocking legitimate workplace/household domains outright.
4. **Manual review at the 25-invite Mythic modifier tier.** The 1-invite Legendary drop and the 5-invite Mythic power-up drop are auto-paid immediately on conversion. The 25-invite Mythic modifier is paused with status `pending_review` and flagged for admin inspection before the drop lands. A quick glance at the inviter's `referrals` history reveals obvious fraud patterns (IP clustering, time-stamp clustering, same-device-family fingerprints). Admin approves → drop lands normally. Admin rejects → reward cancelled, referrer flagged. This is cheap insurance on the platform's most valuable single reward.

Fraud-rejected referrals stay in the `referrals` table for audit and pattern-matching — never hard-deleted.

---

### Attribution mechanics

**Invite link format (S250 Q1c).** `themoderator.app/i/<code>`. Short, shareable, obviously an invite. A new Vercel route `/i/:code` handles the redirect, records the click server-side via `record_invite_click(p_ref_code text)`, sets the localStorage hint for the happy-path attribution, then forwards the browser to the Plinko signup flow (`moderator-plinko.html`).

**Ref code format (S250 Q2b).** 5-character base36 random string (e.g., `7k2m9`, `a3x4f`). Generated once at signup, stored in `profiles.ref_code TEXT UNIQUE`. ~60 million combinations, non-guessable, username-independent (survives username changes), and compact enough that the full invite link fits comfortably in an SMS preview.

**Attribution flow (S250 Q3 hybrid adopted).**

1. **Click:** User clicks `themoderator.app/i/7k2m9`. Server inserts a `referrals` row with `status = 'clicked'`, stores IP and device fingerprint, sets `localStorage.colosseum_referrer = '7k2m9'`, redirects to Plinko.
2. **Signup (happy path):** User completes Plinko in the same browser session. Signup RPC reads `localStorage.colosseum_referrer`, calls `attribute_signup(p_ref_code text)`, which matches the ref code to the latest `clicked` row for that code, flips status to `signed_up`, links `invitee_user_id` to the new profile.
3. **Signup (fallback path):** User clears localStorage, switches devices, or comes back 3 days later. If no ref code in localStorage at signup time, the server runs a fallback match: look for the most recent `clicked` row matching the new account's IP and device fingerprint within a 30-day window. If found, attribute. If not found, no attribution — per S250 Q3, the user "can complain to their friend and get a new invite." The fallback is a best-effort convenience, not a guarantee.
4. **Conversion:** Invitee completes first ranked debate. The end-of-debate RPC checks if it was the invitee's first ranked completion. If yes AND they have a `signed_up` referral row, the RPC calls `convert_referral(p_invitee_user_id uuid)`, which flips the row to `converted`, increments the inviter's milestone counter, awards the 500-token invitee welcome bonus, and fires milestone evaluation.
5. **Milestone evaluation:** If the converted invite hits a reward milestone (1, 5, 25, or any multiple of 25 above 25), insert a row into `invite_rewards_log` with `claimed = false`. Fire an in-app toast and inbox notification to the inviter. The reward waits for explicit claim.

**Last-click-wins on competing referrers (S250 Q5).** If an invitee clicked multiple people's invite links before signing up, the **most recent click within the 30-day window** is the attributed referrer. This is the standard affiliate marketing rule and rewards the person who actually closed the deal.

**Existing-user clicks (S250 Q4).** If someone clicks a ref link but their IP/device/email matches an existing user account, the system displays a toast: **"You're already a member"** and takes no attribution action. Existing users never generate credit for anyone, ever.

**Self-invite block.** Hard-block at the RPC layer. If an inviter's own session somehow tries to attribute to their own ref code (alt accounts, shared devices, etc.), the conversion is rejected as fraud. Combined with the device fingerprint check, this catches most trivial self-farm attempts.

---

### Who gets a ref code (S250 Q6)

Ref codes are generated and visible **only after Plinko completion**. Brand-new accounts in the middle of Plinko cannot see their invite link yet. This gates against half-created bot accounts generating ref codes and spamming. Once Plinko is complete, the ref code is immediately visible — no further gating (no "must have played a debate first"). If a brand-new user wants to invite their friends the moment they finish signup, that's the best possible growth moment and we do not block it.

---

### Surface area — 4 proactive nudges (S250 Q7)

All four ship in v1. Growth loops need surface area.

1. **Plinko completion screen nudge.** Final Plinko step displays a "Bring your friends" panel with the user's invite link + share buttons. First impression, maximum momentum.
2. **Post-debate modal (existing).** The existing post-debate share modal already has an `📨 INVITE` button wired to `inviteFriend()`. Keep the button, rewire it to use the new stable ref code instead of the broken random generator. No visual change.
3. **First-win celebration nudge.** After a user's first debate win, the celebration modal gets a bonus panel: "Share your first victory AND your invite link."
4. **Home feed nudge card.** Periodic card in the home feed rotation: "You're 2 invites away from your Mythic power-up." Shown when the user is 1-2 invites from a milestone. Not every load — rate-limited to once per day per user, dismissible, re-surfaces only when progress changes.

---

### Invite & Rewards screen (dedicated)

New profile sub-page accessed from the profile tab. Contents:

- **Headline progress band.** Large text: "X of 25 invites to your Mythic modifier." Progress bar below, filled to the current invite count. Once past 25, headline shifts to "X invites sent" with a repeating Mythic power-up counter underneath.
- **Your invite link.** Large, copyable, tap-to-copy. Native share button below it (calls `navigator.share` on mobile, falls back to clipboard). Secondary share buttons for WhatsApp, SMS, email.
- **Recent activity feed.** List of recent invite events: "Alice completed her first debate — your Legendary power-up is ready to claim" / "Bob just signed up — waiting for their first debate". Username visible per S250 Q12, no email or display name.
- **Unclaimed rewards.** Each unclaimed reward row shows the milestone hit, the item tier, and a pulsing "CLAIM" button. Tapping Claim opens the item picker modal (see below).
- **Total stats.** "X successful invites / Y rewards claimed / Z currently pending".
- **How it works.** Collapsible FAQ section with the ladder explanation, fraud rules, and conversion trigger definition.

**Claim flow (S250 Q14).** Tap Claim → bottom sheet opens showing the item picker. For Legendary power-ups: filterable grid of all Legendary-tier power-ups from the F-57 catalog (same chip-row pattern as F-27). For Mythic power-ups: grid of all Mythic-tier power-ups. For the 25-invite Mythic modifier: grid of all Mythic-tier modifiers across both end-of-debate and in-debate categories. User taps an item → full-screen confirmation with the item card in its rarity treatment (Mythic = full purple border + tinted background per F-27 rarity visual language) → tap Confirm → celebration animation (item drops in with rarity-tier visual effect) → item lands in the user's inventory (power-ups to `user_powerups`, modifiers to `user_modifiers` staging area pending F-57 build).

**Heads-up from S250 walk:** The Legendary power-up picker at the 1-invite milestone will show ~30 effects. For a brand-new inviter this may feel overwhelming. If it tests poorly at build time, we can trim to a curated subset of 5-8 "beginner-friendly" Legendary effects without schema changes — just a client-side filter. Flagged for build-time evaluation, not pre-decided.

**Claim expiration (S250 Q8).** Unclaimed rewards **never expire**. They sit in the Unclaimed Rewards section of the Invite & Rewards screen indefinitely. Claim fatigue is a lesser sin than yanking rewards away from users.

---

### Notifications (S250 Q13)

When an invite converts, two notifications fire:

1. **In-app toast (immediate).** "🎉 Alice completed her first debate — your Legendary power-up is ready!" Auto-dismiss after 5 seconds. Tap to jump to Invite & Rewards screen.
2. **Persistent inbox entry.** Added to the existing notification inbox system. Survives until explicitly dismissed by the user. Serves as the audit trail for users who miss the toast.

No email notifications at launch (those flow through F-35 weekly newsletter infrastructure — defer to that feature's cadence).

---

### Group rewards — CUT from v1

Per S250 walk, group-level invite rewards are **explicitly cut from v1 and deferred to a future version.** Reasoning: groups have no token balance column, no inventory, no item-holding infrastructure. Adding all of that just to support group-level invite attribution is a substantial side quest that would triple the feature's scope and delay the whole growth loop. Individual invites are what growth loops run on. Ship individual-only.

**Optional lightweight group flavor (deferred, not shipping).** The lightest possible group tie-in would be: every successful individual invite where the inviter is a member of a group also adds a small Group Elo bump (e.g., +10) to their primary group. Zero new tables, zero inventory, pure leaderboard pressure — groups start competing to recruit the most active inviters. This is noted here as a v2 extension but is NOT part of the v1 build spec.

---

### Account deletion (S250 Q11)

Clean exit. When a user deletes their account:

- Their `profiles.ref_code` disappears with the profile row (cascade).
- Their `referrals` rows cascade-delete (both as `referrer_user_id` and `invitee_user_id` via `ON DELETE CASCADE` and `ON DELETE SET NULL` respectively — see schema).
- Their `invite_rewards_log` unclaimed and claimed rows cascade-delete.
- In-flight attributions pointing at them (other users' referral rows where this user was the invitee mid-conversion) have `invitee_user_id` nulled out and marked `status = 'rejected_fraud', fraud_reason = 'account_deleted'`.

No data preservation, no soft-delete, no tombstones. Account deletion is final across the whole invite system.

---

### Data model

**Column addition:**

```sql
ALTER TABLE public.profiles
  ADD COLUMN ref_code TEXT UNIQUE;
```

Generated at Plinko completion time via a helper that loops on collision (extremely rare with 60M combinations but the UNIQUE constraint enforces it). Existing users get a ref code backfilled on next login via a one-time migration step.

**Table — `referrals`:**

```sql
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ref_code TEXT NOT NULL,
  invitee_ip TEXT,
  invitee_device_id TEXT,
  invitee_email_domain TEXT,
  status TEXT NOT NULL DEFAULT 'clicked'
    CHECK (status IN ('clicked','signed_up','converted','rejected_fraud','paid')),
  fraud_reason TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_invitee ON public.referrals(invitee_user_id);
CREATE INDEX idx_referrals_ref_code_status ON public.referrals(ref_code, status);
CREATE INDEX idx_referrals_ip_device ON public.referrals(invitee_ip, invitee_device_id) WHERE status = 'clicked';
```

**Table — `invite_rewards_log` (append-only audit ledger):**

```sql
CREATE TABLE public.invite_rewards_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL,
  reward_type TEXT NOT NULL
    CHECK (reward_type IN ('legendary_powerup','mythic_powerup','mythic_modifier')),
  reward_effect_id INTEGER,
  claimed BOOLEAN NOT NULL DEFAULT false,
  pending_review BOOLEAN NOT NULL DEFAULT false,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_invite_rewards_user_unclaimed ON public.invite_rewards_log(user_id) WHERE claimed = false;
```

The `reward_effect_id` is populated only at claim time (when the user picks which effect from the tier). Null on creation, set on claim.

**RLS.** Users see only their own `referrals` and `invite_rewards_log` rows. Service role bypasses for fraud review and admin tools. Referrers CANNOT see details of their invitees beyond the username — no IP, no device fingerprint, no email domain exposure client-side.

---

### RPCs needed

- `get_my_invite_link()` — returns `ref_code` and full URL. Generates the code if missing (Plinko completion flow). Gated behind Plinko completion.
- `record_invite_click(p_ref_code text, p_device_id text)` — called from the `/i/:code` route handler. Inserts `clicked` row. Service-role callable (unauthenticated, but rate-limited by IP).
- `attribute_signup(p_ref_code text, p_device_id text)` — called from the Plinko completion flow. Matches ref code to the latest `clicked` row, flips to `signed_up`, runs fraud checks (existing user? self-invite? device match?).
- `convert_referral(p_invitee_user_id uuid)` — called internally from the end-of-debate RPC when a user completes their first ranked debate. Flips status to `converted`, awards 500 tokens to invitee, evaluates milestones for referrer, inserts `invite_rewards_log` rows as earned.
- `claim_invite_reward(p_reward_id uuid, p_effect_id integer)` — user-facing. Validates the reward belongs to the caller, is unclaimed, is not `pending_review`, and the effect matches the reward's tier. On success, adds the item to the user's inventory via the same code path as F-10 purchases and marks the reward claimed.
- `review_invite_reward(p_reward_id uuid, p_approve boolean, p_reason text)` — admin-only. For the 25-invite manual review tier. Approves (clears `pending_review`) or rejects (marks inviter as flagged, cancels the reward).
- `get_my_invite_stats()` — returns the Invite & Rewards screen data: total invites clicked, signed up, converted, unclaimed rewards list, recent activity feed.

---

### Build blockers

- `src/share.ts` `generateRefCode()` is broken and must be replaced. The existing `inviteFriend()` function stays but is rewired to fetch the stable ref code from the server on first call and cache it client-side.
- The `/i/:code` route is a new Vercel serverless function — `api/i.js` or `api/invite.js`. Needs to be added to the Vercel routing config.
- F-59 depends on F-57 inventory tables (`user_powerups`, `user_modifiers`) existing at build time — these are specified in F-10/F-57 but not yet built. If F-59 ships before F-57, the claim flow can stub the inventory insert and defer the actual item addition to F-57 build. Cleaner path: ship F-57 first, then F-59.
- Fraud detection needs the `src/analytics.ts` visitor UUID pipeline to be reliable. Confirmed exists per NT line 89.
- Manual review tooling for the 25-invite tier needs a minimal admin surface (even if it's just a Supabase table view + a `review_invite_reward` RPC call from the SQL editor). Full admin panel is out of scope — just needs a way for Pat to approve/reject.

---

### Out of scope for F-59 v1

- Group-level invite rewards (explicitly deferred per S250 walk).
- Email notifications (deferred to F-35 newsletter infrastructure).
- Cross-platform attribution (iOS → Android, web → app). Single-device attribution is the v1 target.
- Invite leaderboards (public "top inviters this week" rankings) — would be a fun v2 add.
- Invite-based cosmetic unlocks (special badges for hitting milestones) — would piggyback on F-31 badge system, defer.
- Time-limited invite campaigns (double-rewards weekends) — no infrastructure needed yet.
- Invitee's ability to see who invited them or thank them in-app.
- Anti-fraud appeals process — rejected inviters can contact support manually.
- Integration with F-39 challenge links: currently treated as separate systems. Challenge link signups do NOT count as invite conversions in v1 to avoid double-credit exploitation. This may be unified in a v2 pass once data shows whether the separation is worth maintaining.

---

## F-23 DM / Chat System

**Walked and locked S253.** Not a social platform. No feeds, no posts, no profiles-as-content-surfaces. Just 1:1 text messaging between users who have co-occurred in at least one debate. Lifted from Product Vision §8 and fully walked S253. **Core loop:** after a debate, a Message button appears next to Rematch on the end screen, opening a DM thread with the opponent. Inbox icon in top nav with unread badge. Full DM inbox page lists threads by last-message-at. **Eligibility — shared-debate gate:** a user can DM another only if the two have co-occurred in any debate as any combination of (debater × debater, debater × voter, debater × staker, debater × watcher, voter × voter, etc.). Enforced via materialized `dm_eligibility` table populated by triggers on `arena_debates` / `arena_votes` / `sentiment_tips` / `debate_watches`. Permanent once established. `send_dm` does a single indexed lookup at send time. **One-time backfill at build.** No open inbox, no cold DMs, no follow system required. Spam prevention is structural, not rate-limit-dependent. **1:1 only at launch** — no group threads (schema balloons). **No self-DM** (hard-rejected at RPC level). **Database schema:** 5 new tables — `dm_eligibility` (canonical pair ordering via `CHECK (user_a_id < user_b_id)`), `dm_threads` (1:1 with per-user `last_read_at` + per-user archive flags), `dm_messages` (TEXT body 1-2000 chars, soft-delete tombstone), `dm_blocks` (DM-scoped only, not full-user block), `dm_reports` (for moderation trail). All 5 service-role only, access via RPC. **Block model — silent, DM-scoped:** blocked user's `send_dm` returns success and their UI shows the message delivered, but blocker never receives it. Harassment-reduction gold standard (no retaliation, no alt-escalation). Blocker's thread auto-archives on block. Full-user-block is a separate future feature. **Soft-delete by sender** (tombstone hides body from both sides with "message deleted" placeholder, row preserved for report trail). **No edit** (edit opens screenshot-then-edit harassment vector). **Read state — per-thread, Slack-grade:** `a_last_read_at` / `b_last_read_at` tracks per-user read position; unread count computed as `messages where created_at > last_read_at AND deleted_at IS NULL`. One write per inbox open. **No "seen" indicator shown to sender.** **Realtime — single user-scoped channel** per logged-in user (`postgres_changes` on `dm_messages` filtered by `receiver_id = auth.uid()`). Not per-thread subscriptions — channel-slot conservation. **Silent-block realtime enforcement is LM-219 (CRITICAL)** — blocked sender's messages must NOT publish to blocker's realtime channel. RLS on the realtime publication (or row-level filter in `send_dm`) strips `(sender, receiver) ∈ dm_blocks`. Explicit build-time test: block B from A, send from B, verify A's realtime subscriber receives zero events. **Rate limits:** 30 messages/min global per user + 5 brand-new threads opened per 24h per user. **Text only at launch** — no attachments, no media, no links, no voice memos. Every media type opens a door (link previews = SSRF, images = storage + nudity scan, voice = F-01 pipeline). Auto-linkify is a one-line future add. **Free forever**, no XP, no retention purge, no push notifications, no edit. **Deleted users** render as `[deleted user]` (`ON DELETE SET NULL`, messages preserved for receiver). **RPC surface — 9 new RPCs:** `send_dm`, `get_inbox`, `get_thread`, `mark_thread_read`, `get_dm_eligibility_list` (powers new-message picker), `block_user`, `unblock_user`, `report_message`, `delete_message`. Admin tools out of scope for v1 (Pat reviews `dm_reports` via SQL Editor). **Client surface:** new `src/dm-inbox.ts` + `src/dm-realtime.ts`; edits to `arena-room-end.ts` (Message button), `src/pages/home.ts` (inbox icon + badge), `src/nav.ts` (route wiring for `/dm` and `/dm/:thread_id`). **Build dependencies: NONE.** F-23 is standalone — does not depend on F-57/F-58/F-59. Can build in any order. If F-58 has not yet shipped, its tip/watch eligibility triggers are added in F-58's migration instead. **Build size:** smaller than F-55, one-CC-session job with dedicated build brief. **Land Mines:** LM-217 (atomic eligibility backfill), LM-218 (idempotent triggers via `ON CONFLICT DO NOTHING`), LM-219 (silent-block realtime leak — non-negotiable explicit test at build time). **Status: fully specced S253. No parked items. Ready to build.**

---

## F-24 Search (Users, Debates, Groups)

**Walked and locked S253.** Discovery surface for the three main entity types. Greenfield build — zero existing search infrastructure in the codebase (grep for existing search turned up only `URLSearchParams`). **Core model — one materialized index, one query.** Dedicated `search_index` table with one row per searchable entity (user, debate, group), a concatenated `search_text` column, and a denormalized `engagement_score`. Single `pg_trgm` GIN index powers every query. Fuzzy matching via trigrams gives typo tolerance out of the box (`jhon` finds `john`) — no Elasticsearch, no custom similarity library, no vector embeddings. Results ranked by `similarity(search_text, query) * engagement_boost` with recency as tiebreaker. One query path handles global search and every contextual inline bar. **Entity types at launch:** users, debates, groups. Deferred: references (future marketplace surface), hot takes (ephemeral). **Entry points:** (1) global top-nav search icon → full-screen search page with empty-state trending feed; (2) contextual inline search bars in existing pickers — DM new-message picker calls with `p_types := ['users']`, lobby with `['debates']`, groups page with `['groups']`. Same RPC, different type filter. **Query behavior:** 2-char minimum, 300ms debounce, top 10 per entity type, max 30 rows per global query, no pagination (discovery not browse), client-side 60s in-memory cache. **Ranking — engagement-boosted:** users by debate count then wins, debates by vote count then stake volume, groups by member count then debate count. Each ranks by recency as tiebreaker. Refreshed nightly via cron RPC `refresh_search_engagement()` — NOT live triggers. Write-load cascade from F-58 tips + F-51 votes would be brutal. Staleness of a few hours is invisible. New entities get `engagement_score = 0` and are picked up on next refresh. **Empty state = trending feed** (top N across all three types by engagement score). **Result rows:** name + entity-type icon + one-line context (`@username · ELO 1847 · 23W/12L` for users, topic + category + date + vote count for debates, name + member count + category for groups). Tap → direct nav to target, no modal preview. **Privacy — per-user search opt-out.** New column `profiles.searchable BOOLEAN DEFAULT true NOT NULL`. Settings toggle: "Hide me from search results." When false, user excluded from `search_all` with `p_types := ['users']`. **Not a full private-profile feature** — user still appears in leaderboards, their debates still show in debate search, their DMs still work via F-23 eligibility gate. Search is the only surface affected. Full private profiles = separate future build (note: F-54 Private Profile Toggle is that build; this is the minimal F-24 hook). **Deleted users hard-excluded** from `search_index` via trigger on `profiles.deleted_at`; their authored debates/groups stay indexed with creator label frozen to `[deleted user]`, matching F-23 pattern. **Bidirectional block hide** via F-23's `dm_blocks` table — single `NOT EXISTS` subquery in `search_all`. When A blocks B, neither sees the other in search (user search only at launch — groups/debates aren't block-ownable). Does NOT retroactively affect leaderboards, debate feeds, or spectator lists — **search only**. **Rate limits:** 60/min authed per `auth.uid()`, 20/min unauth per IP. **Unauth can only search debates and groups** — user search is authed-only to prevent DB enumeration. **No profanity / slur filtering on search queries** — filtering search input is different from filtering content output; Scunthorpe problem, name collisions, unicode workarounds, no safety benefit. **Database:** `CREATE EXTENSION pg_trgm`, `ALTER TABLE profiles ADD COLUMN searchable`, new `search_index` table with trigram GIN index + engagement index + entity lookup index, service-role RLS. **Triggers** on `profiles` / `arena_debates` (completed only) / `groups` INSERT/UPDATE/DELETE, all using `INSERT ... ON CONFLICT DO UPDATE` for idempotency. **Cron RPC** `refresh_search_engagement()` walks source tables, updates scores, idempotent and concurrent-safe. **RPC surface — 3 new RPCs:** `search_all(p_query, p_types, p_limit)` (unified query with rate limit + block-hide + searchable respect), `get_trending(p_types, p_limit)` (empty-state feed), `refresh_search_engagement()` (cron). **Client surface:** new `src/search.ts`; edits to `src/nav.ts` (top-nav icon + `/search` route), `src/dm-inbox.ts` (new-message picker uses `search_all`), `src/arena/arena-lobby.ts` (inline debate search), `src/pages/groups.ts` (inline group search). **Build dependency: F-23 must ship first.** Bidirectional block-hide clause references `dm_blocks` (introduced in F-23). Shipping F-24 before F-23 would either require a stub `dm_blocks` table or a retrofit — the exact pattern that leaves security holes in production. **Build order: F-23 → F-24.** No dependency on F-57/F-58/F-59. **Build size:** smaller than F-23 (1 new table + 1 new column + 3 RPCs + 3 triggers + 1 cron + 1 new client file + 4 edited clients + backfill). One-CC-session job. **Land Mines:** LM-220 (atomic backfill with trigger creation), LM-221 (cron idempotent + concurrent-safe via `ON CONFLICT DO UPDATE`, no read-then-write races), LM-222 (soft-deleted user trigger must atomically update user row AND frozen `display_label` on authored entities), LM-223 (bidirectional block clause written generically, forward-compat for future entity types). **Status: fully specced S253. No parked items. Ready to build after F-23 ships.**

---

# SHIPPED — DOCUMENTED SPEC-ONLY

Features that are already running in production but historically sat on the "unwalked" list because nobody realized the thing the punch list was asking for had already been built. Documented here for mother-doc completeness. Zero build work required.

---

## F-32 AI Moderator Scoring (SHIPPED S220, documented S253)

**Status: SHIPPED.** F-32 has been live in production since Session 220 (AI-BUG-2 fix, Groq/Llama → Claude swap) and was mis-categorized as "unwalked" on the punch list for 30+ sessions. S253 discovered the shipped implementation during the mother-doc walk-close pass. No build work is required. This spec entry documents what is already running, where it lives, and how it works. **The punch list row** ("Argument strength analysis, improvement tips") misnamed the feature — there is no user-facing coach and there was never going to be one. The real feature is the **AI judge** that scores debates in AI Sparring mode and produces the 4-criteria scorecard that ships through the already-deployed `save_ai_scorecard` RPC.

**What's shipped.** Two Supabase Edge Functions, both running on Claude Sonnet 4 (`claude-sonnet-4-20250514`), both authed via `ANTHROPIC_API_KEY`:

1. **`supabase/functions/ai-sparring/index.ts`** — AI debate opponent AND AI judge in the same function, mode-selected via request body. Two distinct prompts live here: **`buildSystemPrompt(topic, totalRounds)`** at line 39 — personality prompt for the AI opponent, casual/hot-takes/push-back-hard persona, max ~60 words per response, never starts with "I," never uses debate jargon, round-specific guidance (round 1 stake boldly with real-world example, middle rounds attack specific weaknesses, final round land memorable knockout line). **`buildScoringPrompt(topic)`** at line 67 — **the F-32 core**. Post-debate 4-criteria judge scoring both sides on Logic / Evidence / Delivery / Rebuttal, each 1-10. Calibration guidance already in the prompt: *"Be a tough judge. Don't give 8+ unless they earned it. Most scores should be 4-7. Differentiate."* Temperature `0.3` for consistency. Max tokens `800`. Output is a JSON object with `side_a.{logic,evidence,delivery,rebuttal}.{score,reason}`, same for `side_b`, plus `overall_winner` and a one-sentence `verdict`. Every criterion score validated and clamped server-side to 1-10 (`validateCriterion` at line 126).

2. **`supabase/functions/ai-moderator/index.ts`** — reference/evidence validator. **This is NOT the debate scorer despite the misleading filename.** It fires when a debater submits a citation mid-debate and rules ALLOW or DENY. Solid system prompt at lines 104-127. "Tough but fair. Most legitimate submissions get ALLOWED. You only DENY clear garbage." Fail-safe: on any error or missing API key, returns `ruling: 'allowed'` so debates can't hang (LM-087). Separate from F-32 but worth noting in the same doc because the filename causes confusion — worth renaming the file if a future session does a doc sweep on `supabase/functions/`.

**Scale: 1-10 per criterion, not 1-5.** AI scorecard uses 1-10 per criterion, max 40 per side. Intentional and documented here for clarity: **it does NOT match the F-51 human-mod 1-5 per-comment scale.** They feed different surfaces. Human mod 1-5 → inline point awards in live feed (F-05/F-51), running totals on scoreboard, final score = sum of all awarded points. AI judge 1-10 → post-debate scorecard stored via `save_ai_scorecard`, displayed on replay as a 4-bar breakdown. A spectator watching a human-modded replay sees "Player A: 23 pts" with inline tags. A spectator watching an AI-modded replay sees "Player A: Logic 7, Evidence 5, Delivery 8, Rebuttal 6 = 26." **Two different scoring artifacts depending on who moderated.** This is not a bug — it's a deliberate split surfaced by S253 for mother-doc clarity. Any future "unify the scoring artifacts" work is a **separate feature** (call it F-32.5 or fold into F-51 Phase 2), NOT part of F-32. F-32 is the AI judge's rubric. It already exists.

**Product posture: intentionally mid.** Per S253 walk: the AI moderator is meant to be "good enough that the scorecard looks reasonable, weird enough in edge cases that users notice." Core product strategy — AI mod is the onboarding hook and the "try it alone" mode, not the destination. Users are expected to face humans for real scoring. The current prompt supports this posture naturally: a tough-but-imperfect judge using Claude Sonnet 4 with calibration guidance but no per-category tuning, no example comments, no penalty-condition matrix. **The weirdness is a feature.** No rubric expansion work planned. S253 explicitly decided against per-category rubrics (politics vs sports vs couples court vs entertainment vs music — universal rubric stays universal), example comments per score tier (would improve consistency but also reduces charm-of-imperfection), penalty-condition lists (ad hominem -N, dodge -N — left to Claude's judgment), and scale harmonization with F-51 human mod flow (separate feature if ever pursued). **No model change planned** — S253 explicitly kept `claude-sonnet-4-20250514`. Not upgrading to Sonnet 4.6. Not downgrading to Haiku. Not switching to Gemini or Groq. Current model and pricing acceptable at launch-scale traffic.

**Surface area:** AI opponent personality prompt at `ai-sparring/index.ts:39`; AI judge scoring prompt at `ai-sparring/index.ts:67`; output validator at `ai-sparring/index.ts:126-163`; client handler `requestAIScoring()` at `src/arena/arena-room-ai.ts:129`; scorecard persistence RPC `save_ai_scorecard` (S234); scorecard display in replay via `get_arena_debate_spectator`; scorecard render `renderAIScorecard()` at `arena-room-ai.ts:168`; reference validator prompt at `ai-moderator/index.ts:104` (separate feature, mis-labeled file); fallback on Claude API failure via random-score fallback at `arena-room-ai.ts:156`. **Zero new build work required.** Zero new RPCs. Zero new tables. Zero new client files. Zero new triggers.

**Future iteration path (NOT PLANNED, documented for mother doc only).** If the AI mod ever feels too weird or too sharp and needs tuning, the entire tuning surface is: (1) edit `buildScoringPrompt()` in `ai-sparring/index.ts`; (2) redeploy the Edge Function (`supabase functions deploy ai-sparring`); (3) observe the next few AI-modded debates; (4) iterate. No migrations, no client changes, no downtime. **Tuning F-32 is a 5-minute edit-and-deploy**, not a feature build. Nothing on the mother doc, punch list, or build queue should treat F-32 as a multi-session effort ever again.

**Land Mines — none added.** F-32 does not introduce new land mines. The existing LM-087 (AI moderator must not hang debates on API failure) is already mitigated: both Edge Functions fall back to `ruling: 'allowed'` or random scoring on any error path, and the client has a hardcoded fallback in `arena-room-ai.ts:156`.

**Production verification checklist** (NOT build test — run any time someone wonders if F-32 is still healthy): (1) Start an AI Sparring debate on any topic — AI opponent responds within ~5s. (2) Complete debate through final round. (3) Scorecard appears on end screen with 4 criteria per side, scores 1-10. (4) Each criterion has a one-sentence reason string. (5) `overall_winner` is 'a', 'b', or 'draw'. (6) `verdict` is a non-empty string under 300 chars. (7) Scorecard persists to `arena_debates.ai_scorecard` JSONB via `save_ai_scorecard`. (8) Replay page renders scorecard from `get_arena_debate_spectator`. (9) Edge Function logs show Claude API calls, not Groq or Llama. (10) Temperature 0.3 confirmed in code. (11) Model `claude-sonnet-4-20250514` confirmed on line 19. (12) Fallback path: temporarily unset `ANTHROPIC_API_KEY` in Supabase dashboard, attempt an AI debate, confirm client shows random-fallback without crashing. Restore key. If any above fails, F-32 has regressed — file as a bug against `ai-sparring/index.ts`, not as a feature re-build.

