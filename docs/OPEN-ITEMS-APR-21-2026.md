# THE MODERATOR — Open Items After April 21, 2026

> Everything that was not started or not completed across Sessions 292–296+ on April 21, 2026.
> Enough detail that the next Claude can act without searching past chats.

---

## ~~PRIORITY 1: Private Debate Join Flow (blocks F-69)~~ ✅ DONE

The private debate system lets two users match via a join code or challenge link. It's broken. This was discovered during live browser testing in Session 295 when wolfe8105 and Gladiator (second test account) tried to debate each other.

### Blocker A: Challenge Page Routing

**The problem:** The URL `/challenge?code=XXXXX` is served by a Vercel serverless function at `api/challenge.html.js`, NOT by `moderator-challenge.html`. The serverless function renders static HTML with an ACCEPT button that links to `/login?returnTo=/?joinCode=XXXXX&screen=arena`. When a logged-in user clicks ACCEPT, they go through the login page, which detects the session and redirects — but the `screen=arena` param gets lost in the redirect chain. The user lands on the Feed tab instead of the Arena tab. The `joinCode` param is never consumed because `arena-core.ts` (which reads `?joinCode=`) only runs when the Arena screen initializes.

**What was already tried:** Changed the redirect in `moderator-challenge.html` to include `screen=arena` — but that file is never served because Vercel routes `/challenge` to the serverless function instead.

**The fix (not yet implemented):** Either (1) add client-side auth detection in `api/challenge.html.js` so logged-in users skip the login redirect entirely and go straight to `/index.html?screen=arena&joinCode=CODE`, or (2) add a `joinCode` handler in `home.ts` or `navigation.ts` that auto-navigates to Arena when the param is present regardless of which tab loads first.

**Files involved:** `api/challenge.html.js` (serverless function), `vercel.json` (routing), `src/arena/arena-core.ts` (joinCode handler), `src/pages/home.ts` or `src/navigation.ts` (potential fix location).

### Blocker B: Join Code GO Button 400 Error

**The problem:** When a user types a 5-character join code into the JOIN CODE input on the Arena lobby and hits GO, the `join_private_lobby` RPC returns a 400 from PostgREST. The `join_mod_debate` fallback also 400s. The user sees "SOMETHING WENT SIDEWAYS. GIVE IT ANOTHER SHOT."

**What was already tried:** Cleaned up stale `create_private_lobby` overloads (reduced from 3 to 1). Ran `NOTIFY pgrst, 'reload schema'`. Changed client to not send `p_debate_id: null` (suspected PostgREST chokes on null UUID). The 400 persisted after all fixes.

**Root cause not yet confirmed.** Supabase logs show `POST /rest/v1/rpc/join_private_lobby` returning 400. The RPC itself works when called from SQL directly. The issue is in PostgREST's handling of the client request — could be parameter typing, could be a remaining overload issue, could be something else entirely.

**Files involved:** `src/arena/arena-private-lobby.ts` (client-side `joinWithCode` function), `join_private_lobby` RPC in Supabase, `join_mod_debate` RPC (fallback).

**Note:** The challenge link path DOES work — the debate goes live, both users appear in the feed as a LIVE DEBATE card. The routing is just wrong (Blocker A). So the join RPC itself succeeds through the challenge page flow, which means the 400 on the GO button might be a client-side parameter formatting issue specific to the manual code entry path.

### What success looks like:
Both users land on the pre-debate screen together. The reference loadout picker (from `reference-arsenal.ts`, gated behind `mode !== 'ai'`) appears. A forged reference can be equipped. The debate starts. F-69 E2E test passes.

---

## PRIORITY 2: F-69 — Reference System E2E Test

**Status:** Partially complete. The forge flow works (5 steps, reference created, 50 tokens deducted, card appears in My Arsenal). Blocked on getting two players into a pre-debate screen (see Priority 1 above).

**What was tested and works:**
- Forge flow: Source Details → Claim → Source Type → Arena → Review & Forge — all 5 steps functional
- Reference appears in My Arsenal with correct metadata (Academic, Common rarity, power 0/4, modifier slots)
- Token deduction (50T) applied correctly
- VIEW SOURCE link works

**What was NOT tested (blocked):**
- Equipping a reference to a loadout from the Arsenal (no equip button exists on the card — only EDIT, Delete, VIEW SOURCE)
- Reference loadout picker on pre-debate screen (gated behind `mode !== 'ai'`, needs human opponent)
- Using a reference in a live debate
- Reference power progression

**Bug found during testing:** The forge date input (`<input type="date">`) is nearly unusable. Chrome's native date picker mangles keyboard input — typing "08/01/2007" results in "mm/dd/12007". Pasting doesn't work cleanly either. **Fix needed:** Replace with a text input with placeholder "YYYY-MM-DD" or use month/year dropdown selectors. File: the forge form is rendered in `src/reference-arsenal.ts` or a sub-module.

---

## PRIORITY 3: F-70 through F-77 (Pat's Feature List)

These were formalized in Session 295 and added to the punch list.

| Feature | Description | Notes |
|---------|-------------|-------|
| ~~F-70~~ ✅ | ~~Social media links in profile~~ | **DONE.** 6 platforms (Twitter/X, Instagram, TikTok, YouTube, Snapchat, Bluesky). Username input, icon row on own + public profile. Migration applied. |
| F-71 | Adult content / pornography policy | Define and enforce policy. What happens when someone posts NSFW content? Content moderation rules, reporting flow, automated detection or manual review. Policy doc + potential content filter. |
| F-72 | Minor safety — USA/EU compliance (COPPA, GDPR-K) | Legal compliance for users under 13 (COPPA) and under 16 (GDPR-K). The app already has an age gate in the Plinko signup flow and `profiles.is_minor` flag. Need to decide: block minors entirely, or restrict features? Ties to the Launch Checklist "minors policy decision" item. |
| ~~F-73~~ ✅ | ~~Placeholder audit~~ | **DONE.** All user-facing "hot take" refs purged. Stale ad comment fixed. Remaining placeholder data is demo-mode only (intentional). |
| F-74 | Landing page redesign | Currently, unauthenticated users see a login prompt first. Pat wants the feed visible before signup — let people see the content, then prompt login when they try to interact. This is a significant auth flow change. |
| F-75 | Login UX redesign | Google is currently the primary/top login option. Pat doesn't like the prominence. Rethink the login page layout — maybe email/password first, social logins secondary, or a different arrangement entirely. |
| F-76 | Google Play auto-signup flow (One Tap / Credential Manager) | When the app is on Google Play and a user downloads it, Google has a native flow that can sign them up with one tap using their Google account. Research Google's Credential Manager API and wire it into the Supabase auth flow. |
| F-77 | Create 6 link-card debates | Manually create 6 debate cards with links to seed the feed: 2 from ESPN, 2 from CNN, 1 from Twitter/X, 1 from TikTok. Uses the F-62 link card system (create_debate_card RPC with link_url + link_preview). This is a content seeding task, not a code task — but the OG scraper (`api/scrape-og.js`) needs to work for each source. |

---

## ~~PRIORITY 4: F-68 Cosmetic Cleanup (Hot Takes Naming)~~ ✅ DONE

F-68 (unified feed) shipped in Session 294. Hot takes are dead as a concept — tables dropped, RPCs retired, 904 lines deleted. But several UI strings and code identifiers still say "hot takes." These are all simple find-and-replace tasks.

| File | What to change |
|------|----------------|
| `moderator-groups.html` | DOM element ID `detail-hot-takes` → `detail-feed` |
| `src/pages/groups.state.ts` | Default tab value `'hot-takes'` → `'feed'` |
| `src/pages/groups.nav.ts` | Tab array entry `'hot-takes'` → `'feed'` |
| `src/pages/groups.detail.ts` | Loading text references hot takes |
| F-67 tutorial (`docs/the-moderator-user-guide.jsx`) | Description still says "hot takes" |
| Notification placeholder text | Still says "hot take" somewhere in the notification rendering |
| `src/onboarding-drip.ts` | Text references hot takes |

---

## ~~PRIORITY 5: Challenge Page Cosmetic Issues~~ ✅ DONE

Found during Session 295 live testing. These don't block anything but look bad.

| Issue | Detail |
|-------|--------|
| Old Colosseum styling | The challenge page (`api/challenge.html.js`) renders with the old light blue/gold Colosseum theme instead of the dark cyberpunk Moderator theme. It's a standalone serverless-rendered HTML page that doesn't use the main app's CSS variables. Needs a full restyle. |
| "GET A 6-CHARACTER CODE" | The Shareable Join Code option in the private debate picker still says "6-CHARACTER" but codes are now 5 characters (changed in Session 295). Text is in `src/arena/arena-private-picker.ts` or `arena-private-lobby.ts`. |

---

## PRIORITY 6: Launch Checklist (Human Actions for Pat)

These require Pat to do them personally. No Claude work needed.

| Item | Time estimate | Notes |
|------|---------------|-------|
| Phone smoke test | 25 min | Open the app on your actual phone, walk through signup → feed → arena → debate. Check touch targets, scroll behavior, viewport rendering. |
| YubiKey negative test | 20 min | Try logging in with the wrong YubiKey or no key. Verify the system rejects properly. |
| Second YubiKey TOTP seeds | 5 min | Generate backup TOTP seeds for a second physical key. |
| Minors policy decision | — | Decide whether minors (under 13 for COPPA, under 16 for GDPR-K) are blocked entirely or restricted. This feeds into F-72. Required for Google Play Store submission. |

---

## ~~PRIORITY 7: Launch Checklist (Code Tasks)~~ ✅ DONE

| Item | Time estimate | Notes |
|------|---------------|-------|
| ~~Peermetrics setup~~ ✅ | 30 min | **DONE.** `@peermetrics/webrtc-stats` wired into WebRTC engine → PostHog. Events: `webrtc_stats` (10s intervals), `webrtc_quality_low`, `webrtc_session_end`. |
| ~~Outside-in Claude review~~ ✅ | 30 min | **DONE.** Flagged 5 concerns: main bundle size (fixed — 61% reduction via lazy-load arena), disable-button-no-finally (80 instances, documented), direct SELECTs (3, minor), no CSP headers, Profile index signature. |

---

## PRIORITY 8: Punch List Remaining Features

| Feature | Status | Notes |
|---------|--------|-------|
| F-03 | 🔶 In progress | Entrance sequence variants. Base 3-tier entrance animation works. Tournament variant (gold/trophy overlay) and GvG variant (group name + banner) were never built. |
| F-12 | 🅿️ Parked | Seasonal token boosts. Needs real users to tune the economy. Not buildable until post-launch. |

---

## ~~PRIORITY 9: Zod Contract Testing (20 remaining schemas)~~ ✅ DONE

Claude Code is currently working on this. Batches 1 and 2 (12 schemas) were completed and pushed in this chat session (commits `17bf423` and `ebd5949`). A CC prompt was written for the remaining 20 high-risk RPCs.

**What's done:**
- `safeRpc()` in `src/auth.rpc.ts` modified to accept optional `ZodType<T>` third parameter. Backward compatible. DEV throws on validation failure, PROD logs + falls through.
- `src/contracts/rpc-schemas.ts` created with 12 Zod schemas wired into 19 call sites across 16 files.
- CC prompt delivered to Pat for the remaining 20 RPCs.

**What CC is doing now:**
Writing Zod schemas for the remaining 20 high-risk untyped RPCs from `docs/BOUNDARY-INVENTORY.md`:
`send_spectator_chat`, `complete_onboarding_day`, `get_group_challenges`, `get_group_leaderboard`, `get_group_members`, `get_user_watch_tier`, `cast_sentiment_tip`, `discover_groups`, `create_group`, `create_group_challenge`, `respond_to_group_challenge`, `request_audition`, `get_pending_auditions`, `claim_invite_reward`, `claim_section_reward`, `increment_questions_answered`, `create_debate_card`, `cancel_debate_card`, `place_prediction`, `react_debate_card`.

**After all 32 are done:** 73 already-typed RPCs can be bootstrapped with `ts-to-zod` to generate schemas from existing TypeScript types, then validated against what PostgREST actually returns.

---

## Key Technical Context

| Item | Value |
|------|-------|
| Repo | `https://github.com/wolfe8105/colosseum` |
| GitHub token | Search past chats for "github token colosseum ghp" — current working token is `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` |
| Supabase project | `faomczmipsccwbhpivmp` (us-east-2) |
| Build tool | Vite (`npm run build`) |
| Conventions | Read `CLAUDE.md` in repo root before any code changes |
| Land mines | Read `docs/THE-MODERATOR-LAND-MINE-MAP.md` before any schema changes |
| Punch list | `docs/THE-MODERATOR-PUNCH-LIST.md` |
| Boundary inventory | `docs/BOUNDARY-INVENTORY.md` — all 213 crossing points mapped |
| Session handoffs | `docs/technical/SESSION-*-HANDOFF.md` |
