# SESSION HANDOFF — April 23, 2026 (Session 2)

Paste this into the next Claude session to pick up where we left off.
Repo: `git clone https://github.com/wolfe8105/colosseum.git` (add your PAT token)

---

## What was shipped this session

| Commit | Description |
|--------|-------------|
| `b2cda28` | Debate card redesign: hero image top, title second, avatar initials third |
| `4f89079` | Push notifications: OneSignal SDK wired, prompt after debate posted, mod invite filter tab |
| `ee4932b` | Mod invite flow: pending invites in mod queue with ACCEPT/DECLINE |
| `1d2c52c` | Mod invite flow: invite specific mod from category screen, search_moderators RPC |

---

## DB migrations applied this session (Supabase: faomczmipsccwbhpivmp)

All 4 original handoff migrations + extras — all confirmed applied:

- `arena_debates` — added `mod_invite_status` (text) and `mod_invited_id` (uuid) columns
- `invite_moderator(p_debate_id, p_moderator_id)` RPC — sends invite, notifies moderator, checks blocks
- `respond_mod_invite(p_debate_id, p_accept boolean)` RPC — accept assigns mod, decline flips to open + notifies creator
- `search_moderators(p_query)` RPC — returns matching mods, excludes blocked users, ordered by rating
- `get_pending_mod_invites()` RPC — returns debates where caller is the invited mod, status pending
- `user_blocks` table — RLS enabled, blocker_id/blocked_id unique pair
- `get_blocked_users()` RPC — new
- `block_user` / `unblock_user` — already existed, now have a table to write to

---

## Current architecture (confirmed this session)

### Debate card redesign (b2cda28)
New hierarchy across ALL card states (open, live, voting, verdict):
1. **Hero image** — full bleed, bleeds to card edges, domain pill overlaid bottom-left. Hidden if no link.
2. **Title** — below image, prominent
3. **Avatar initials** — small 26px circles in footer, VS pill between them for live/verdict

CSS classes added to `arena-css-lobby.ts`:
- `.feed-card-hero-link` / `.feed-card-hero-img` / `.feed-card-hero-domain` — hero image block
- `.feed-card-badges` — replaces `.arena-card-top`
- `.feed-card-footer` / `.feed-card-avatars` / `.feed-card-avatar` / `.feed-card-avatar-name` / `.feed-card-vs-pill`

### Moderator invite flow (fully end-to-end)
**Creator side (category screen):**
- REQUEST A MODERATOR checkbox → reveals "INVITE A SPECIFIC MODERATOR" button
- Tap → live search (2+ chars) → results with name, @username, debates moderated, rating
- Tap result → confirmed card with × to clear
- Post debate → `create_debate_card` fires, then `invite_moderator` with new debate_id

**Moderator side (mod queue screen):**
- "INVITED TO MODERATE" section at top (hidden when empty)
- ACCEPT → assigns as moderator, toast, card disappears
- DECLINE → flips to "any moderator will do", creator gets `mod_declined` notification

**Notification types added to `notifications.types.ts`:**
- `mod_invite`, `mod_declined`, `mod_accepted`, `challenged`
- New filter tab "⚖️ Mod Invites" in notification panel

### Push notifications (OneSignal — wired, needs Pat's App ID)
- `src/push-notifications.ts` — full module: init, requestPermission, hasPushPermission, disable
- `public/OneSignalSDKWorker.js` — required SW redirect file
- OneSignal SDK added to `index.html`
- `initPushNotifications()` called automatically after auth in `notifications.ts`
- Push permission prompt fires after user posts a debate (high-intent moment)

**Pat needs to do (5 min):**
1. onesignal.com → free account → New App → Web → site URL: `https://themoderator.app`
2. Copy App ID
3. Add `VITE_ONESIGNAL_APP_ID` to Vercel env vars
4. Redeploy — everything else is wired

### Block system (DB complete, frontend UI still needed)
DB is fully set up — `user_blocks` table, `block_user`, `unblock_user`, `get_blocked_users` RPCs, RLS.
The invite/search RPCs already respect blocks (blocked mods won't appear in search, can't be invited).
**What's still missing:** Block button UI on user profile pages, challenge cards, mod invite cards, and a blocked users list in Settings.

---

## Supabase
- Project: `faomczmipsccwbhpivmp`
- Service role key: (in Vercel env vars — do not commit)
- Pat's UUID: `7873b9f6-b9b3-4133-bdc5-b9995016e757`
- Storage bucket: `link-previews` (public) — OG images at `og/*.jpg`

---

## Pat's to-do list (needs human)
- [ ] **OneSignal App ID** — sign up free, create Web app, add `VITE_ONESIGNAL_APP_ID` to Vercel
- [ ] **Apple Developer account** ($99/yr) — needed for App Store AND Apple Sign In
- [ ] **Google Play — AAB upload** → get Google SHA-256 → report back (5 min fix once received)
- [ ] **Cancel SonarCloud** before April 30 ($34.40/month)
- [ ] **Fix "Needs Attention" Vercel env vars** — UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL, ANTHROPIC_API_KEY, GROO_API_KEY

---

## Next session build plan

### Priority 1 — Block button UI (DB already done, just needs frontend)
- Block button on: user profile pages, challenge cards, mod invite cards
- Settings screen → blocked users list with unblock option
- Pattern: `safeRpc('block_user', { p_blocked_id })` / `safeRpc('unblock_user', { p_blocked_id })`
- `get_blocked_users()` returns `{ id, username, display_name }[]`

### Priority 2 — Notification deep links (tap a notif → go somewhere)
Currently tapping a notification just marks it read. It should navigate:
- `mod_invite` → open Mod Queue screen
- `mod_accepted` / `mod_declined` → open the relevant debate lobby
- `challenged` → open pending challenges section
- `challenge` / `debate_start` → open the debate

### Priority 3 — TWA / Google Play (waiting on Pat's SHA-256)
Once Pat uploads AAB to Play Console internal testing and gets Google's SHA-256 fingerprint:
- 5 min fix: update `assetlinks.json` with the fingerprint
- TWA runs fullscreen after that

### Priority 4 — Open debate lobby (creator can re-enter their own debate)
When a user creates a debate and it's sitting open in the feed, they should be able to tap it and enter "their" lobby — see it waiting, potentially chat, and get notified when someone challenges. Currently tapping your own open card does nothing useful.

---

## Key architectural decisions confirmed

**Card hierarchy:** Image → Title → Avatars. Locked in. Pat loves it.

**Async debate model:** Post debate → lives in feed + lobby up to 30 min → anyone challenges → both get notified → enter lobby when ready. Nobody sits waiting. Can have 3 open debates while browsing ESPN.

**Moderator two-path model:** Checkbox "any moderator" OR username search to invite specific. No dropdown list (would grow to 50+ names). Block system protects mods from spam.

**Push over SMS:** OneSignal web push first (free, works with TWA/PWA on Android now). SMS is opt-in premium later. iOS push needs Apple Developer account.

**The Moderator — core product insight:**
Reddit where you can challenge someone to a live debate right from the feed card. Feed IS the product. Game mechanics make it sticky. Async by design — have 3 debates sitting open while you browse ESPN for 10 minutes.
