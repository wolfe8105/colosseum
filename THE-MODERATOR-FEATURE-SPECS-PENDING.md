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

