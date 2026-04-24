# SESSION HANDOFF — April 23, 2026 (Session 3)

Paste this into the next Claude session to pick up where we left off.
Repo: `git clone https://github.com/wolfe8105/colosseum.git` (add PAT token from chat history)
Supabase project: `faomczmipsccwbhpivmp`

---

## What was shipped this session

| Commit | Description |
|--------|-------------|
| `6f4dd66` | Block system UI: 🚫 on profile modal, challenge cards, mod invite cards; blocked users list in Settings |
| `f505eac` | Notification deep links: tap notif → close panel → navigate to right screen |
| `a5f81b1` | Open debate lobby: YOUR OPEN DEBATES section, creator can re-enter or cancel waiting debates |
| `2650a81` | Fix hero images missing: `injectFeedCardHeroCSS()` added to home feed |
| `30100ed` | Fix pull-to-refresh: was querying `.mod-feed` (doesn't exist), fixed to `#screen-home` |
| `2de67f6` | Fix hero image height: `aspect-ratio:16/9` → `height:180px` (aspect-ratio collapses on mobile) |
| `6d586cb` | Fix home feed missing card CSS: all arena-card styles now self-inject via `injectFeedCardHeroCSS` |
| `a4d2880` | Rewrite pull-to-refresh: fixed-position indicator, listeners on document, translateY animation |
| `2d5ff4a` | Hero: full inline styles to bypass CSS class issues |
| `04c394a` | Debug: hardcode CSS values, console.error on img fail |
| `7c81c02` | Fix seed card URLs (were fake placeholders) |
| `11da5cf` | Debug: background on hero container, remove onerror |
| `6d586cb` | Restore onerror, fix card CSS |

---

## DB migrations applied this session

- `get_pending_mod_invites()` — added `inviter_id` column (dropped and recreated)
- `get_my_open_debates()` — new RPC, returns caller's pending debates
- `add_open_status_and_reopen_link_cards` — added `open` to `arena_debates_status_check` constraint, reopened 6 seed cards
- `fix_seed_card_links` — updated seed card URLs (were fake placeholders)

---

## Hero image issue — UNRESOLVED (next session priority)

**Status:** Hero images on feed cards are still not showing. This was the main bug worked on all session and never fully resolved.

**What we know for certain:**
- The `<a>` container renders at exactly **694×180px** (confirmed in DevTools Computed tab)
- The `<img>` tag IS in the DOM with the correct Supabase URL as src
- The Supabase images return HTTP 200, are real JPEGs, CORS allows `*.supabase.co`
- CSP `img-src` allows `https://*.supabase.co` ✓
- **Zero network requests** for the images in the Network tab (filtered by text "img" — but this was filtering by filename, not type — next session should filter by the **Img type button** and hard refresh to see actual image requests)
- `onerror` is blocked by CSP (no `unsafe-inline` in script-src), so image failures are silent
- The `<a>` has `overflow:hidden` — if the img has zero height, it's invisible

**Most likely cause:** The Network tab was filtered by text "img" (matching filenames) not by the **Img type** button. The images may actually be loading fine but the `<img>` itself has zero rendered height because `height:100%` inside the `<a>` isn't resolving. Need to:
1. Check Network tab with **Img type** filter + hard refresh to see actual requests
2. Check computed height of the `<img>` element itself (not the `<a>`)
3. If img height is 0: try `height:180px` directly on the `<img>` instead of `height:100%`

**Current code state (`feed-card.ts` `_renderLinkPreview`):**
```html
<a href="..." style="display:block;text-decoration:none;margin:-12px -16px 8px;height:180px;overflow:hidden;border-radius:6px 6px 0 0;position:relative;">
  <img src="..." style="width:100%;height:100%;object-fit:cover;display:block;" onerror="...">
  <span>domain pill</span>
</a>
```

**Quick fix to try next session:** Change `height:100%` on img to `height:180px` (absolute, not relative).

---

## Pull-to-refresh — FIXED ✓

Works on mobile now. Was broken because:
1. Was querying `.mod-feed` which doesn't exist in DOM
2. PTR indicator was `position:sticky` inside `position:fixed` (no-op)
3. Touch listeners were on the scroller, not document

Fixed: listeners on `document`, fixed-position indicator appended to `body`.

---

## Seed data state

6 cards are `open` with `link_preview` data:
- Trump/Pope (cnn.com) — `514f58b1`
- Pope Leo XIV (cnn.com) — `6db2d5aa`
- Ty Simpson/ESPN (espn.com) — `8dafd362`
- ESPN Masters (espn.com) — `50ead8bd`
- Raiders/Mendoza (twitter.com) — `568ebc86`
- College athletes (si.com) — `1c80471c`

All have `link_preview.image_url` pointing to Supabase storage at `link-previews/og/`.

---

## Pat's to-do list (needs human)
- [ ] **OneSignal App ID** — sign up free, create Web app, add `VITE_ONESIGNAL_APP_ID` to Vercel
- [ ] **Apple Developer account** ($99/yr) — needed for App Store AND Apple Sign In
- [ ] **Google Play — SHA-256** → report back for `assetlinks.json` fix (5 min)
- [ ] **Cancel SonarCloud** before April 30 ($34.40/month)
- [ ] **Fix "Needs Attention" Vercel env vars** — UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL, ANTHROPIC_API_KEY, GROO_API_KEY

---

## Next session priorities

1. **Hero images** — check Network Img tab, fix `height:100%` → `height:180px` on img, get images showing
2. **Notification deep links** — test end to end (shipped but untested)
3. **TWA / Google Play** — waiting on Pat's SHA-256
4. **Open debate lobby** — test creator re-entry flow
