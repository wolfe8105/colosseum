# SESSION HANDOFF — April 23, 2026

Paste this into the next Claude session to pick up where we left off.
Repo: `git clone https://github.com/wolfe8105/colosseum.git  # add your PAT token`

---

## What was shipped this session

| Commit | Description |
|--------|-------------|
| `519a3cf` | Arena: debate creation posts card to feed instead of entering live queue |
| `acb4ded` | Fix: missing closing brace in showModeSelect |
| `7e56af7` | Arena: remove topic/link/mod from mode select — single location on category screen |
| `cc0f294` | Fix: escape onerror attribute quotes in link preview img |
| `925caec` | Arena category picker: title + link fields, REQUEST A MODERATOR prominent |
| `4982b30` | Auth flow: SIGN IN button → moderator-login.html, SIGN UP tab → plinko |
| `58b8e12` | Feed: remove composer — pills + debates only. MODERATOR QUEUE full label |
| `6b7a872` | F-77: Microlink Pro + async background OG scrape |

---

## Current architecture (confirmed this session)

### Feed
- Pure scroll. Category filter pills up top. No composer. That's it.
- Debates appear here as open cards with CHALLENGE button.
- Clicking a card goes to pre-debate lobby (same as category lobby — it's the same debate).

### Arena tab
- **ENTER THE ARENA** — live matchmaking queue (find opponent RIGHT NOW, no topic)
- **Debate creation flow** — ENTER THE ARENA → pick mode → pick category screen
  - Category screen has: category grid, rounds picker, Debate Title, Add a Link, REQUEST A MODERATOR checkbox
  - Tapping a category calls `create_debate_card` → posts to feed + lobby → toast → navigates home
  - AI Sparring still goes direct to queue (no card posted)
- **PRIVATE DEBATE** — join code flow, unchanged
- **POWER-UPS** — unchanged
- **MODERATOR QUEUE** — moderators browse debates needing moderation

### Auth flow
- Top-right button → "SIGN IN" → `moderator-login.html`
- SIGN UP tab on login page → redirects to `moderator-plinko.html` (low-friction funnel)
- All gates (feed actions, challenges) → still go to plinko directly

### OG image pipeline (F-77 — CONFIRMED WORKING)
1. User creates debate with link on category screen
2. Card appears in feed immediately
3. `_scrapeOgBackground()` fires async
4. Calls `/api/scrape-og` → Microlink Pro (real Chromium, residential proxies)
5. Image proxied to Supabase Storage `link-previews/og/`
6. Debate record patched with stable CDN URL
7. Image appears on next feed refresh

---

## Supabase
- Project: `faomczmipsccwbhpivmp`
- Service role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5Mzg3MiwiZXhwIjoyMDg3NzY5ODcyfQ.otPJzn0_GcTHTs0L8I24DkHgkFxNWgzKKh4eQ7idL8k`
- Pat's UUID: `7873b9f6-b9b3-4133-bdc5-b9995016e757`
- Storage bucket: `link-previews` (public) — OG images at `og/*.jpg`

---

## Vercel env vars
| Key | Notes |
|-----|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Added |
| `MICROLINK_API_KEY` | ✅ Added (acLdTy9cYNa8m2aDCnKKm6TPY4E2XuZ99zoMIjs6) |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Needs Attention |
| `UPSTASH_REDIS_REST_URL` | ⚠️ Needs Attention |
| `ANTHROPIC_API_KEY` | ⚠️ Needs Attention |
| `GROO_API_KEY` | ⚠️ Needs Attention |

---

## Pat's to-do list (needs human)
- [ ] **Apple Developer account** ($99/yr) — needed for App Store AND Apple Sign In
- [ ] **Google Play — AAB upload** → get Google SHA-256 → report back to Claude (5 min fix once received)
- [ ] **Cancel SonarCloud** before April 30 ($34.40/month, not worth it at this stage)
- [ ] **Fix "Needs Attention" Vercel env vars** above

---

## F-76 TWA (Google Play) — still needs Pat
- AAB built at `android/app/build/outputs/bundle/release/app-release.aab`
- Keystore in Google Drive, password `themoderator2026`, alias `themoderator`
- **Critical missing step:** Upload AAB to Play Console internal testing → get Google's SHA-256 fingerprint → add to `assetlinks.json` → TWA runs fullscreen

---

## Next session build plan

### Priority 1 — Moderator invite flow (frontend ready, needs DB)

**Frontend to build (Claude can do):**
- "INVITE A SPECIFIC MODERATOR" button below REQUEST A MODERATOR checkbox on category screen
- Tapping opens username search — type to find moderator by username
- Sends invite tied to debate_id → moderator gets notification
- Moderator's arena lobby shows pending mod invites (same pattern as `arena-pending-challenges.ts`) with ACCEPT / DECLINE buttons
- On DECLINE → creator gets notification, debate flips to "any moderator will do"
- Moderator invite filter tab added to notification panel

**DB migrations needed (Pat runs in Supabase):**
```sql
-- 1. Add mod_invite and mod_declined notification types
-- (notifications table already exists, just needs new type values)

-- 2. New RPC: invite_moderator(p_debate_id, p_moderator_id)
-- Creates notification for moderator, sets debate.mod_invite_status = 'pending'

-- 3. New RPC: respond_mod_invite(p_debate_id, p_accept boolean)
-- If accept: joins as moderator
-- If decline: sets mod_invite_status = 'open', notifies creator

-- 4. New RPC: search_moderators(p_query text)
-- Returns moderators matching username/display_name, with rating + approval stats
```

**New notification types to add to `notifications.types.ts`:**
```typescript
| 'mod_invite'    // moderator received an invite
| 'mod_declined'  // creator's invited mod declined
| 'mod_accepted'  // creator's invited mod accepted
| 'challenged'    // someone challenged your open debate card
```

### Priority 2 — Block system (everyone gets it)

**What it does:**
- Any user can block any other user
- Blocked users can't: challenge you, invite you to moderate, DM you, see your profile
- Moderators need it most (spam protection from invite requests)

**Frontend:**
- Block button on: user profile pages, challenge cards, mod invite cards, DM threads
- Settings screen shows blocked users list with unblock option

**DB needed:**
```sql
-- user_blocks table: blocker_id, blocked_id, created_at
-- RPCs: block_user, unblock_user, get_blocked_users
-- RLS on challenge/invite/DM RPCs to check block status
```

### Priority 3 — Push notifications (no SMS yet)

**Recommendation: OneSignal (free tier)**
- Works with existing TWA/PWA for Android push
- iOS push needs Apple Developer account (Pat's to-do)
- Web push works in Chrome desktop too

**What triggers a push:**
- Someone challenges your debate card
- Your invited moderator accepts/declines
- Your debate match found (live queue)
- Debate starting in 5 minutes (pre-lobby countdown)

**Implementation:**
- Add OneSignal SDK
- Wire to existing notification types
- Service worker already partially set up for TWA — extend it for push

### Priority 4 — Debate card redesign (Pat mentioned)
- Pat wants to change the structure of the debate card itself
- Wait for Pat's direction before touching feed-card.ts

---

## Key architectural decisions confirmed this session

**Debate creation = post to feed, not live queue.**
The two flows are:
1. **Create debate** (category screen) → posts card → lives in feed + lobby for 30 min → anyone can challenge anytime → creator gets notified → enters lobby when ready
2. **Find opponent now** (ENTER THE ARENA) → live matchmaking queue → 60s timeout → AI fallback offer

**Moderator list capped.**
Currently `loadAvailableModerators` returns all moderators with no limit. Will grow to 50+ entries. Fix: two options on category screen — checkbox "any moderator" OR "invite specific" (username search). No dropdown list.

**The Moderator — core product insight:**
Reddit where you can challenge someone to a live debate right from the feed card. Feed IS the product. Game mechanics make it sticky. You can have 3 debates sitting open while you browse ESPN for 10 minutes — async by design.
