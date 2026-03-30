# TECHNICAL AUDIT — THE COLOSSEUM
**Generated:** 2026-03-30
**Auditor:** Claude Sonnet 4.6 (automated full-codebase review)
**Branch:** claude/practical-feynman
**Scope:** All src/ modules, supabase/functions/, api/, HTML pages, bot config, vite/vercel/tsconfig

---

## LEGEND
- **WILL-BREAK** — This will cause a production failure or security hole under normal use
- **FRAGILE** — Works now, breaks under specific conditions (concurrent users, mobile, cold start)
- **SUBOPTIMAL** — Works but wastes resources, creates tech debt, or has better alternatives
- **SOLID** — Correctly implemented; note why it's right

---

## 1. Supabase Auth — noOpLock Pattern

**How it's implemented:**
`src/auth.ts` lines 335–343. The noOpLock is defined as an inline arrow function inside `init()` and injected directly into `createClient()` via the `auth: { lock: noOpLock }` option. The Supabase client is created from npm `@supabase/supabase-js` (ES import, not CDN). There are no legacy `<script>` tags for Supabase or noOpLock in any HTML file.

**Correct or wrong:** CORRECT. The noOpLock bypasses the `navigator.locks` API that hangs `getSession()` in certain browser environments (supabase-js issue #1594). Because the Supabase client is created via npm import inside the module, the noOpLock is guaranteed to be in place before any Supabase auth call executes. This is the right approach.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A — currently solid.

**Severity:** SOLID

---

## 2. Supabase Auth — INITIAL_SESSION as Sole Init Path

**How it's implemented:**
`src/auth.ts` lines 356–382. `onAuthStateChange` is registered and only acts on `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, `PASSWORD_RECOVERY`, and `SIGNED_OUT` events. There is no call to `getSession()` anywhere in the module. The `readyPromise` resolves either when the INITIAL_SESSION fires (line 362–365) or after the 5-second safety timeout (line 348–352).

**Correct or wrong:** CORRECT. Using INITIAL_SESSION as the sole init path is required by the Supabase v2 auth contract. Calling `getSession()` directly is known to race against the lock and hang indefinitely in PWA/Safari contexts.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 3. Supabase Auth — 5-Second Safety Timeout

**How it's implemented:**
`src/auth.ts` lines 347–352. A `setTimeout(() => { ... _resolveReady(); }, 5000)` is set before `onAuthStateChange` is called. It only fires if `currentUser` is still null when it triggers. If INITIAL_SESSION fires first, `clearTimeout(safetyTimeout)` on line 358 cancels it.

**Correct or wrong:** CORRECT. This prevents the page from hanging forever if INITIAL_SESSION never fires (offline, Supabase outage, etc.). Guest users still get full access after 5s.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 4. Supabase Auth — safeRpc 401 Retry

**How it's implemented:**
`src/auth.ts` lines 221–253. `safeRpc` wraps every `supabase.rpc()` call. On 401 / PGRST301 / "jwt expired", it calls `supabaseClient.auth.refreshSession()`. If refresh fails, it calls `signOut()`. Otherwise it retries the original RPC call once.

**Correct or wrong:** CORRECT. This covers the most common auth failure mode (expired JWT mid-session). The single retry prevents infinite loops.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 5. Supabase Auth — readyPromise Pattern

**How it's implemented:**
`src/auth.ts` lines 177–178 create the promise and resolver. `src/pages/spectate.ts` line 20 `await ready` before any Supabase calls. All pages that use `src/pages/*.ts` follow the same pattern — they import `ready` and await it before querying.

**Correct or wrong:** CORRECT. Prevents race conditions where page JS fires before auth state is initialized.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 6. Supabase Auth — PKCE vs Implicit Flow

**How it's implemented:**
Not explicitly configured. `createClient()` in `src/auth.ts` line 339 passes only `{ auth: { lock: noOpLock } }` as options. No `flowType` is set, so Supabase JS v2 defaults to PKCE for web.

**Correct or wrong:** CORRECT. Supabase JS v2 defaults to PKCE, which is more secure than implicit flow (no access token in URL fragment). No action needed.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 7. Supabase Auth — Session Persistence

**How it's implemented:**
Not explicitly configured. Supabase JS v2 defaults to `localStorage` persistence. `src/analytics.ts` line 95 reads `sb-faomczmipsccwbhpivmp-auth-token` directly from localStorage to get the user ID before auth initializes.

**Correct or wrong:** Mostly correct. Reading directly from localStorage to get a user ID for pre-auth analytics is intentional and documented as an exception. However, the hardcoded localStorage key (`sb-faomczmipsccwbhpivmp-auth-token`) will break silently if the Supabase project is ever migrated or the key format changes in a future SDK version.

**If wrong, what's the right way:** Treat this as a known fragility. When feasible, use the Supabase client's `getUser()` lazily inside the analytics fire (fire-and-forget). But because analytics intentionally runs before auth init, the current approach is the accepted pattern.

**What breaks if you don't fix it:** Analytics `getUserId()` returns null for all users if the localStorage key format changes in supabase-js, causing all events to be anonymous.

**Severity:** FRAGILE

---

## 8. Castle Defense — All Mutations via RPC

**How it's implemented:**
Checked across `src/auth.ts`, `src/arena.ts`, `src/tokens.ts`, `src/staking.ts`, `src/powerups.ts`, `src/async.ts`, `src/notifications.ts`, `src/pages/spectate.ts`. Every write operation uses `safeRpc()` calling a named server function. The one exception is `src/auth.ts` line 302 which does a direct `.from('profiles').select()` for profile loading — this is a SELECT (read only), not a mutation, so it does not violate the castle defense rule.

**Correct or wrong:** CORRECT. No direct INSERT/UPDATE/DELETE from client JS was found.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 9. XSS Protection — escapeHTML Usage

**How it's implemented:**
`src/config.ts` lines 261–269 defines the canonical OWASP 5-char escape (`& < > " '`). All user-supplied data that enters `innerHTML` goes through `escapeHTML()` (imported from config.ts) in src/ modules. `api/profile.js` line 22 has its own identical local `escapeHtml()`. `src/pages/spectate.ts` line 72 has a local `escHtml()` re-implementation.

**Correct or wrong:** The multiple re-implementations are a maintenance liability. They are functionally correct (same OWASP mapping), but if a bug is found in the canonical version and fixed in `src/config.ts`, the local copies in `spectate.ts` and `api/profile.js` won't be updated automatically.

**If wrong, what's the right way:** `src/pages/spectate.ts` should import `escapeHTML` from `'../config.ts'` instead of redeclaring `escHtml` locally. `api/profile.js` is Node.js serverless so can't use ES imports from src/ — its local copy is acceptable but should be noted.

**What breaks if you don't fix it:** If a future XSS edge case is patched in `config.ts`, `spectate.ts` and `api/profile.js` remain vulnerable.

**Severity:** SUBOPTIMAL

---

## 10. XSS Protection — Numeric Values in innerHTML

**How it's implemented:**
Numeric values from API responses are cast with `Number()` before insertion into HTML in `src/auth.ts` (lines 742–754), `src/pages/spectate.ts` (line 267: `Number(d.spectator_count)`), and throughout arena.ts. The pattern is consistent.

**Correct or wrong:** CORRECT. `Number()` prevents injection through numeric fields (e.g. a field containing `"<script>alert(1)</script>"` would become `NaN`).

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 11. URL Validation — javascript:/data: Protocol Prevention

**How it's implemented:**
`src/auth.ts` line 863: `if (url && !/^https?:\/\//i.test(url)) return { success: false, error: 'Invalid URL ...' }` in `submitReference()`. `api/profile.js` line 29: `sanitizeAvatarUrl()` only passes through `https://` URLs, returning null otherwise.

**Correct or wrong:** CORRECT. Prevents stored XSS via `javascript:` or `data:` URLs in user-submitted references and avatar URLs.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 12. UUID Validation Before PostgREST Filters

**How it's implemented:**
`src/auth.ts` lines 161–164 defines `isUUID()`. It is called before `followUser`, `unfollowUser`, `getPublicProfile`, `declareRival`, `assignModerator` — all functions that use user IDs in filter strings. `src/pages/spectate.ts` lines 59–63 independently validates the debate ID from URL params against a UUID regex before any query.

**Correct or wrong:** CORRECT. UUID validation prevents PostgREST filter injection attacks.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 13. WebRTC Audio — Peer Connection, STUN/TURN, ICE

**How it's implemented:**
`src/webrtc.ts` lines 271–303. `createPeerConnection()` creates an `RTCPeerConnection` with ICE servers from `src/config.ts` lines 155–158 (two Google STUN servers: `stun.l.google.com:19302` and `stun1.l.google.com:19302`). No TURN server is configured. Audio constraints at line 150–157: `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`, `sampleRate: 48000`.

**Correct or wrong:** FRAGILE. Using only STUN servers is acceptable for users on the same network or with direct internet routing, but **STUN alone fails for ~15–20% of real-world WebRTC connections** (users behind symmetric NATs, corporate firewalls, and some mobile carriers). No TURN server means those users will never establish a live audio connection and will see a silent debate with no error message.

**If wrong, what's the right way:** Add a TURN server. Options: (a) Twilio Network Traversal Service (NTS) — free tier covers most use cases; (b) Coturn self-hosted on the DigitalOcean VPS; (c) Cloudflare Calls TURN. Add credentials to the ICE server config:
```js
{ urls: 'turn:turn.yourdomain.com:3478', username: 'user', credential: 'pass' }
```
Credentials should come from a short-lived token endpoint, not be hardcoded.

**What breaks if you don't fix it:** ~15–20% of live debates silently fail with "connecting" state that never resolves. The `connectionState === 'disconnected' || 'failed'` handler fires `disconnected` event but there is no automatic retry or fallback to text mode.

**Severity:** FRAGILE

---

## 14. WebRTC Audio — ICE Failure Handling and Renegotiation

**How it's implemented:**
`src/webrtc.ts` lines 290–302. `onconnectionstatechange` fires `disconnected` or `failed` events. There is no ICE restart logic and no automatic renegotiation. The `fire('disconnected', { state })` call passes control to the arena's `onWebRTC('disconnected', ...)` handler at line 1867, which only updates a status text label.

**Correct or wrong:** WRONG. When WebRTC connection state becomes `failed`, the standard recovery is `peerConnection.restartIce()` followed by re-offer. The current code has no recovery path; the debate is silently broken and the user has no way to reconnect without leaving and re-entering.

**If wrong, what's the right way:** In `onconnectionstatechange`, when `state === 'failed'`, call `peerConnection.restartIce()` (role A creates a new offer with `iceRestart: true`). Add a max retry counter (e.g., 3 attempts) to avoid infinite loops. After 3 failures, show a "Connection failed — falling back to text mode" message and automatically switch the debate to text mode.

**What breaks if you don't fix it:** Live audio debates silently fail permanently on any network hiccup. User has no recovery path except hard-refreshing the page and losing debate state.

**Severity:** FRAGILE

---

## 15. WebRTC Audio — AudioContext Lifecycle and Cleanup

**How it's implemented:**
`src/webrtc.ts` lines 179 and 471 create `AudioContext` objects for level metering and waveform visualization respectively. The level meter context (line 179) is never closed. The waveform context (line 471) is returned to the caller (`createWaveform` returns `{ analyser, audioCtx }`) but the `audioCtx.close()` call is never made — `leaveDebate()` at line 430 does not close it.

**Correct or wrong:** WRONG. Each `AudioContext` consumes system audio hardware resources. Chrome limits the number of AudioContexts per page (typically 6). Creating them without closing them causes resource leaks and will trigger `AudioContext was not allowed to start` errors on subsequent debates.

**If wrong, what's the right way:** `leaveDebate()` should close the `audioCtx` returned by `createWaveform`. The level meter context created in `getAudioLevel()` should be closed when the caller is done with the meter function. A pattern like returning `{ getLevelFn, closeCtx }` from `getAudioLevel` would allow proper cleanup.

**What breaks if you don't fix it:** After a few debate sessions, the browser throws `The AudioContext was not allowed to start` and waveform/level visualization silently stops. On mobile (stricter limits), this happens faster.

**Severity:** FRAGILE

---

## 16. WebRTC Signaling — Supabase Realtime Broadcast Channel

**How it's implemented:**
`src/webrtc.ts` lines 198–229. Signaling uses Supabase Realtime broadcast on a public channel named `'debate-' + debateId`. The channel is not private/authenticated — any user who knows the debate ID can subscribe and receive offer/answer/ICE-candidate messages.

**Correct or wrong:** FRAGILE. Broadcast signaling data is not sensitive in isolation (SDP offers and ICE candidates don't contain audio), but an adversary who knows the debate ID can inject fake signaling messages (malformed SDP, fake ICE candidates) to disrupt a live debate. The `msg.from === debateState.role` check at line 242 filters out self-messages but does not authenticate the sender.

**If wrong, what's the right way:** Use a private Realtime channel (requires JWT authentication). Alternatively, the `handleSignalingMessage` function should validate that the sender's role in the message matches the expected opponent role (not just that it's not the local role). A HMAC-signed payload using the debate ID as the secret would prevent injection.

**What breaks if you don't fix it:** A third party who knows the debate ID can send a malformed SDP answer and force both peers to enter a broken connection state, ending the debate.

**Severity:** FRAGILE

---

## 17. WebRTC Signaling — Channel Cleanup

**How it's implemented:**
`src/webrtc.ts` lines 445–448. `leaveDebate()` calls `signalingChannel.unsubscribe()` and nulls the reference. The channel is properly cleaned up on explicit leave.

**Correct or wrong:** CORRECT. Channel is unsubscribed and nulled, preventing memory leaks and dangling subscriptions.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 18. Groq API — Model Name

**How it's implemented:**
`supabase/functions/ai-sparring/index.ts` line 17: `const MODEL = 'llama-3.3-70b-versatile'`. `supabase/functions/ai-moderator/index.ts` line 99: `model: 'llama-3.3-70b-versatile'`. `bot-config.ts` line 159: `model: 'llama-3.3-70b-versatile'`.

**Correct or wrong:** CORRECT. The deprecated `llama-3.1-70b-versatile` model has been replaced with the current `llama-3.3-70b-versatile` across all three call sites.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 19. Groq API — Timeout Handling

**How it's implemented:**
`supabase/functions/ai-sparring/index.ts` line 126 and `supabase/functions/ai-moderator/index.ts` line 92 both call Groq via `fetch()` with no `AbortController` timeout. The Deno edge function platform has a global 60-second timeout, but individual Groq calls have no application-level timeout guard.

**Correct or wrong:** WRONG. Groq API calls can occasionally hang or return slowly under load. Without an explicit timeout, a single slow Groq call can consume the full edge function execution time (60s), blocking the debate client for a full minute. The AI sparring client in `src/arena.ts` line 1786 does have a fallback (local template responses), but it only triggers if the `fetch()` rejects — a hanging connection that never times out will not trigger the fallback.

**If wrong, what's the right way:** Wrap the Groq `fetch()` in `Promise.race()` with an `AbortController` timeout of 8–10 seconds:
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);
const groqRes = await fetch(GROQ_API_URL, { ..., signal: controller.signal });
clearTimeout(timeout);
```

**What breaks if you don't fix it:** During Groq latency spikes, AI debate turns take up to 60 seconds to respond. The user sees a spinning typing indicator indefinitely. The debate input is disabled (arena.ts line 1727) for the full duration.

**Severity:** FRAGILE

---

## 20. Groq API — Rate Limiting and Error Handling

**How it's implemented:**
`supabase/functions/ai-sparring/index.ts` lines 144–150: On non-OK Groq response, returns `{ error, status: 502 }` to the client. The client in `src/arena.ts` line 1782 catches this as an error and falls back to template responses. `ai-moderator` handles Groq errors by defaulting to `'allowed'` (fail-open, documented at line 148: "debate can't hang").

**Correct or wrong:** CORRECT for the moderator (fail-open is the right call — debates must not block). The ai-sparring fallback to local templates is also correct. No rate limiting is implemented client-side, but this is fine since each debate only fires one Groq call per round (1 call per ~2 minutes per active AI debate).

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 21. Groq API — Streaming vs Non-Streaming

**How it's implemented:**
Both edge functions use non-streaming (`stream` parameter not set, defaults to false). The client awaits the full response.

**Correct or wrong:** SUBOPTIMAL for AI sparring UX. With non-streaming, the typing indicator shows for 1–3 seconds and then the full response appears at once. Streaming would allow progressive text rendering, improving perceived responsiveness.

**If wrong, what's the right way:** Enable `stream: true` in the Groq request body. Stream the response through the edge function using `ReadableStream`. The client would need to handle SSE or chunked transfer. This is a UX enhancement, not a correctness fix.

**What breaks if you don't fix it:** AI responses feel abrupt (full block of text appears instantly rather than typing progressively). Not a breaking issue.

**Severity:** SUBOPTIMAL

---

## 22. Voice Recording — MediaRecorder API and Codec Selection

**How it's implemented:**
`src/voicememo.ts` lines 126–131. Codec selection: prefers `audio/webm;codecs=opus`, falls back to `audio/mp4`, then plain `audio/webm`. `mediaRecorder.start(250)` at line 142 collects data every 250ms. Max duration is 120s (line 45), min is 5s (line 46). Timeslice enforcement: a `setTimeout` at line 151 stops recording after MAX_DURATION_SEC * 1000.

**Correct or wrong:** CORRECT. The codec selection order is right (opus/webm is most efficient, mp4 covers Safari/iOS). 250ms timeslice ensures data is available incrementally. The min/max duration guards prevent trivially short or overly long recordings.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 23. Voice Recording — File Size Limits

**How it's implemented:**
There is no explicit file size check before upload in `src/voicememo.ts`. The upload at line 286 sends the blob directly to Supabase Storage via `supabase.storage.from('debate-audio').upload()`. At 120 seconds max duration and opus codec, a typical recording is 300–600KB — well under Supabase Storage's 50MB limit.

**Correct or wrong:** SUBOPTIMAL. While practical file sizes are small, there is no defensive size guard. If the browser produces unusually large recordings (e.g., uncompressed fallback audio at high bitrate), uploads could be unexpectedly large. More importantly, Supabase Storage RLS is not verified in the code — the bucket policy needs to enforce per-user path rules.

**If wrong, what's the right way:** Add a size check before upload: `if (blob.size > 10 * 1024 * 1024) { showToast('Recording too large'); return; }` — 10MB is a generous limit for 120s of audio. Ensure the `debate-audio` bucket has RLS policies that require the authenticated user's ID to match the upload path prefix.

**What breaks if you don't fix it:** No immediate break, but a user with a buggy browser could upload unexpectedly large files. No known exploits, but defensive coding is warranted.

**Severity:** SUBOPTIMAL

---

## 24. Voice Recording — Blob Collection and Memory

**How it's implemented:**
`src/voicememo.ts` line 53: `audioChunks: Blob[]` accumulates blobs. `cleanup()` at line 203 clears the array. The `stopRecording()` promise at lines 163–191 constructs a single Blob from all chunks and creates an `objectURL`. The `objectURL` from pending recordings is not revoked when the user retakes (line 366: `audioEl.src = ''` is set but `URL.revokeObjectURL` is not called).

**Correct or wrong:** FRAGILE. Object URLs hold a reference to the underlying Blob data in memory. Not revoking them in `retake()` creates a memory leak — each retake allocates a new objectURL (and backing memory) without releasing the previous one. For a 2-minute recording, this is ~500KB per retake. Not catastrophic for a few retakes but accumulates over a long session.

**If wrong, what's the right way:** In `retake()`, before nulling `pendingRecording`, call `URL.revokeObjectURL(pendingRecording.url)`.

**What breaks if you don't fix it:** Memory grows with each retake. On low-memory mobile devices, the browser may kill the tab after several retakes.

**Severity:** SUBOPTIMAL

---

## 25. Stripe — Client-Side Loading

**How it's implemented:**
`src/payments.ts` line 47 declares a global `Stripe` function (expected to be loaded via CDN `<script>` tag). The `init()` function at line 62 calls `Stripe(STRIPE_PUBLISHABLE_KEY)`. No HTML pages were found with a Stripe CDN `<script>` tag in the reviewed files (index.html, colosseum-login.html, colosseum-settings.html). The settings page loads via `type="module" src="/src/pages/settings.ts"`.

**Correct or wrong:** FRAGILE. If `payments.ts` is imported on a page that does not have the Stripe.js CDN `<script src="https://js.stripe.com/v3/"></script>` loaded before the module executes, `Stripe` will be undefined and `init()` will throw. The `try/catch` at line 70 catches this and sets placeholder mode, so payments silently break rather than crashing.

**If wrong, what's the right way:** Dynamically inject the Stripe CDN script from within `payments.ts` `init()` and wait for it to load before calling `Stripe()`. Pattern: `const script = document.createElement('script'); script.src = '...'; document.head.appendChild(script); await new Promise(r => script.onload = r);` — then call `Stripe()`.

**What breaks if you don't fix it:** On pages where the Stripe CDN script tag is missing, payments silently fall into placeholder mode. Users see the mock modal instead of a real checkout.

**Severity:** FRAGILE

---

## 26. Stripe — Webhook Verification

**How it's implemented:**
There is no Stripe webhook handler in the codebase. The `supabase/functions/` directory contains only `ai-sparring` and `ai-moderator`. No serverless function handles `stripe-webhook` events. The CLAUDE.md mentions "Stripe webhook body must be read with `req.text()` to preserve raw body for HMAC" as a documented pitfall.

**Correct or wrong:** MISSING. Without a webhook handler, Stripe subscription status changes (renewals, cancellations, payment failures, refunds) are never processed server-side. The app has no way to automatically downgrade users who cancel or have failed payments.

**If wrong, what's the right way:** Create a Supabase Edge Function `stripe-webhook` that: (1) reads the raw body with `await req.text()` (not `req.json()`), (2) verifies the `stripe-signature` header using `stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)`, (3) handles `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed` events by updating the user's `subscription_tier` via a service-role RPC.

**What breaks if you don't fix it:** Stripe subscriptions are one-way — users can pay to upgrade but the system never detects cancellations or payment failures. Churned subscribers retain premium access forever.

**Severity:** WILL-BREAK

---

## 27. Stripe — Idempotency

**How it's implemented:**
`src/payments.ts` lines 174–185 and 220–231 make POST requests to the Stripe checkout Edge Function with no idempotency key. The Edge Function (not present in repo) would need to handle this.

**Correct or wrong:** SUBOPTIMAL. Without an idempotency key, double-tapping the subscribe button could create two Stripe checkout sessions. The user is redirected on the first successful session creation, so practical double-charge risk is low, but idempotency is Stripe best practice.

**If wrong, what's the right way:** Generate a deterministic idempotency key (e.g., `userId + '_' + priceId + '_' + Date.now().toString().slice(0, -3)`) and include it in the checkout session creation request as a `Stripe-Idempotency-Key` header.

**What breaks if you don't fix it:** In rare cases, users who have network issues and retry the subscribe button might create multiple checkout sessions. Stripe deduplicates by default for 24h if the same idempotency key is used, but without one, there is no deduplication.

**Severity:** SUBOPTIMAL

---

## 28. Stripe — Minor Gate

**How it's implemented:**
`src/payments.ts` lines 82–84: `isMinor()` checks `getCurrentProfile()?.is_minor === true`. Both `subscribe()` (line 150) and `buyTokens()` (line 196) check `isMinor()` first and show an error toast blocking the payment flow.

**Correct or wrong:** CORRECT. Minors are blocked from payment flows client-side. Note: this is a UI gate only — the actual `is_minor` flag must be enforced server-side as well, which is presumably done in the Stripe checkout Edge Function.

**If wrong, what's the right way:** N/A — client gate is correct. Ensure server-side Supabase Edge Function also verifies `is_minor` from the profile before creating a session.

**What breaks if you don't fix it:** N/A for client gate. If the server-side check is missing in the Edge Function, a motivated minor could bypass the client check via browser DevTools.

**Severity:** SOLID (client-side gate), unverified for server side (Edge Function not in repo).

---

## 29. Analytics — Raw Fetch Before Auth Init

**How it's implemented:**
`src/analytics.ts` lines 139–149. `trackEvent()` fires a raw `fetch()` directly to the Supabase REST API endpoint `/rest/v1/rpc/log_event` with the anon key. It does not use the Supabase JS client or `safeRpc()`. The credentials are duplicated from config.ts (SUPABASE_URL at line 38, SUPABASE_ANON_KEY at line 39).

**Correct or wrong:** CORRECT for the intended purpose. Analytics fires before auth is initialized, so it can't use the Supabase client (which doesn't exist yet). Using a raw `fetch()` with the anon key is the correct approach — it's deliberately documented as an exception in CLAUDE.md. The `fetch()` is fire-and-forget (`.catch(() => {})`) so it never blocks page load.

**If wrong, what's the right way:** N/A — the pattern is correct. The credential duplication (same values in both analytics.ts and config.ts) is a maintenance concern but not a correctness issue.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 30. Analytics — Visitor UUID and Privacy

**How it's implemented:**
`src/analytics.ts` lines 46–64. Visitor ID is generated with `crypto.randomUUID()` and stored in `localStorage` as `colo_vid`. UTM params and referrer are stored as `colo_src` in `localStorage`. `getUserId()` at line 93 reads the session token from `localStorage`.

**Correct or wrong:** SUBOPTIMAL. The `colo_vid` UUID persists indefinitely in localStorage and constitutes a persistent identifier. Under GDPR/CCPA, persistent analytics identifiers require consent disclosure. The privacy policy is not reviewed here, but the absence of a consent mechanism (cookie banner, opt-out) is a legal risk in EU markets.

**If wrong, what's the right way:** At minimum, add an opt-out flag: if `localStorage.getItem('colo_analytics_opt_out') === '1'`, skip all tracking. Disclose the `colo_vid` identifier in the privacy policy. Consider using a session-scoped ID (`sessionStorage`) instead of `localStorage` to avoid "persistent identifier" classification.

**What breaks if you don't fix it:** Potential GDPR/CCPA compliance issue if EU users are targeted. No functional break.

**Severity:** SUBOPTIMAL

---

## 31. Edge Functions — CORS Allowlist

**How it's implemented:**
`supabase/functions/ai-sparring/index.ts` lines 19–22 and `supabase/functions/ai-moderator/index.ts` lines 14–17. Both use an `ALLOWED_ORIGINS` array with `['https://colosseum-six.vercel.app', 'https://thecolosseum.app']`. The `getCorsHeaders()` function falls back to `ALLOWED_ORIGINS[0]` for unauthorized origins (denies with the first allowed origin echoed back — effectively a no-op for the browser).

**Correct or wrong:** SOLID. Hardcoded CORS allowlist is the correct approach vs. wildcard `*`. The fallback to `ALLOWED_ORIGINS[0]` for disallowed origins means the browser will reject the preflight for unauthorized domains (the CORS header won't match the request origin, so the browser blocks it). **One gap**: `localhost` development is not in the allowlist. Developers testing locally will get CORS errors when calling these edge functions.

**If wrong, what's the right way:** Add `'http://localhost:3000'` to `ALLOWED_ORIGINS` conditionally (check `Deno.env.get('ENVIRONMENT') !== 'production'`), or add it permanently and document that local dev requires it.

**What breaks if you don't fix it:** Local development against deployed edge functions fails with CORS errors. Not a production issue.

**Severity:** SUBOPTIMAL (dev experience only)

---

## 32. Edge Functions — Auth Validation

**How it's implemented:**
`supabase/functions/ai-sparring/index.ts` and `supabase/functions/ai-moderator/index.ts` both accept the Supabase anon key in the `Authorization: Bearer` header (line 29 of ai-sparring client call in `src/arena.ts`). Neither edge function validates the JWT or checks if the user is authenticated before calling Groq.

**Correct or wrong:** FRAGILE. Any user with the anon key (which is public and in the client-side code) can call these edge functions directly without being a logged-in user. This means bots or scrapers can generate unlimited AI sparring responses and AI moderator rulings, consuming Groq quota at will.

**If wrong, what's the right way:** In the edge function, validate the JWT: `const { data: { user } } = await supabase.auth.getUser(req.headers.get('Authorization')?.split(' ')[1])`. Return 401 if user is null. This requires passing the user's actual JWT (not anon key) from the client. Alternatively, add a short-term rate limiter by IP using Deno's KV store.

**What breaks if you don't fix it:** Groq API quota can be exhausted by automated callers, breaking AI sparring and AI moderation for all users.

**Severity:** FRAGILE

---

## 33. Vercel Serverless — api/profile.js

**How it's implemented:**
`api/profile.js` lines 18–19. `SUPABASE_URL` and `SUPABASE_ANON_KEY` fall back to hardcoded values if env vars are not set. `BASE_URL` at line 20 is hardcoded as `'https://colosseum-six.vercel.app'` with no env var fallback.

**Correct or wrong:** FRAGILE. Hardcoded `BASE_URL` means profile links and OG tags will point to production even in preview deployments. All `og:url`, canonical links, and CTA hrefs will be wrong in Vercel preview branches.

**If wrong, what's the right way:** Use `process.env.VERCEL_URL || 'https://colosseum-six.vercel.app'` — Vercel automatically sets `VERCEL_URL` to the deployment URL in all preview environments. Prepend `https://` since `VERCEL_URL` doesn't include the protocol.

**What breaks if you don't fix it:** Preview branch profile pages have wrong OG tags and CTAs pointing to production. Not a production break, but preview testing of profile sharing is unreliable.

**Severity:** SUBOPTIMAL

---

## 34. Vercel Serverless — HTML Escaping in OG Tags

**How it's implemented:**
`api/profile.js` line 63: `const displayName = escapeHtml(p.display_name || p.username)`. All user-controlled fields passed into OG `content=""` attributes use `escapeHtml()`. The `ogDesc` at line 84 truncates bio at 120 chars and uses the already-escaped `bio` variable. Line 85: `bio.substring(0, 120)` is called on an already-escaped string, which is safe since `escapeHtml` doesn't add length.

**Correct or wrong:** CORRECT. All user data is escaped before insertion into HTML attributes.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 35. Vercel Serverless — Caching

**How it's implemented:**
`api/profile.js` line 434: `res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')`. 5-minute CDN cache with 10-minute stale-while-revalidate. Error responses are `no-cache`.

**Correct or wrong:** CORRECT. Profile data doesn't need to be real-time. 5-minute CDN caching is appropriate and prevents repeated Supabase calls for popular profile pages (e.g., shared links going viral).

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 36. Vercel Serverless — Cold Start

**How it's implemented:**
`api/profile.js` is a single serverless function with minimal dependencies (no SDK imports, raw `fetch()` only). Total cold start time should be 100–200ms.

**Correct or wrong:** CORRECT. The function avoids heavy SDK imports and uses direct fetch to Supabase REST API, minimizing cold start time.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 37. Content Security Policy

**How it's implemented:**
`vercel.json` lines 26–28. CSP includes:
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com https://unpkg.com`
- `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://js.stripe.com https://cdn.jsdelivr.net`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`

**Correct or wrong:** FRAGILE. `'unsafe-inline'` and `'unsafe-eval'` in `script-src` largely nullify the XSS protection of CSP. These are present to support inline event handlers (e.g., `onclick=...` in auth.ts modals) and dynamic script evaluation. `'unsafe-inline'` in particular means any XSS that gets through escapeHTML can run scripts.

**If wrong, what's the right way:** The `'unsafe-inline'` requirement comes from the inline JS in modal `innerHTML` strings (e.g., `onclick="this.closest('#payment-placeholder-modal').remove()"` in `src/payments.ts` line 133). These onclick attributes must be replaced with `addEventListener` bindings. Once removed, `'unsafe-inline'` can be dropped from `script-src` and replaced with a `nonce` or `hash` approach for any remaining inline scripts. `'unsafe-eval'` can be dropped once Vite build is fully in place (no eval needed in production bundle).

**What breaks if you don't fix it:** CSP provides little actual XSS protection as long as `unsafe-inline` is present. The existing `escapeHTML` discipline is the actual XSS defense, not the CSP.

**Severity:** SUBOPTIMAL

---

## 38. Polling Patterns — All setInterval Uses

**How it's implemented:**
The following polling intervals were found:

| Module | Variable | Interval | Has destroy/clear? |
|--------|----------|----------|-------------------|
| `src/arena.ts` | `queuePollTimer` | 4000ms | Yes (`clearQueueTimers()`) |
| `src/arena.ts` | `queueElapsedTimer` | 1000ms | Yes |
| `src/arena.ts` | `roundTimer` | 1000ms | Yes (`endCurrentDebate()`, `destroy()`) |
| `src/arena.ts` | `vmTimer` | 1000ms | Yes |
| `src/arena.ts` | `referencePollTimer` | 3000ms | Yes (`stopReferencePoll()`) |
| `src/arena.ts` | `_rulingCountdownTimer` | ~1000ms | Yes |
| `src/arena.ts` | `silenceTimer` | ~1000ms | Yes |
| `src/webrtc.ts` | `debateState.roundTimer` | 1000ms | Yes (`leaveDebate()`) |
| `src/webrtc.ts` | `debateState.breakTimer` | 1000ms | Yes |
| `src/voicememo.ts` | `recordingTimer` | 100ms | Yes (`cancelRecording()`, `stopRecording()`) |
| `src/notifications.ts` | poll timer | (unknown — not fully read) | Yes (`destroy()`) |
| `src/pages/spectate.ts` | `pollTimer` | 5000ms | Yes (`beforeunload`) |
| `src/pages/spectate.ts` | `chatPollTimer` | 6000ms | Yes |

**Correct or wrong:** MOSTLY SOLID. All setInterval uses expose a clear/stop path. `arena.ts` has a comprehensive `destroy()` at line 2635 that clears all 6 arena timers and removes the `popstate` listener. `spectate.ts` uses `beforeunload` to clear timers.

**One gap:** `spectate.ts` uses `beforeunload` for cleanup, but this event is unreliable on mobile Safari (not guaranteed to fire). If the user navigates away within a SPA context or the browser suspends the tab, the intervals may continue briefly. This is minor for polling intervals that only read data.

**What breaks if you don't fix it:** Minor: stale polls after navigation. No functional break.

**Severity:** SOLID (with the note above)

---

## 39. DOM Cleanup — Event Listeners

**How it's implemented:**
`src/arena.ts` line 2642: `window.removeEventListener('popstate', _onPopState)` is called in `destroy()`. Modal overlays created in `src/auth.ts` (profile modal, auth gate modal) add their own click handlers directly on the modal element and remove themselves from DOM via `modal.remove()` — no persistent listener leak.

**Correct or wrong:** CORRECT for the patterns found. The `popstate` listener added at module level is properly removed in `destroy()`.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 40. Canvas API — toBlob vs toDataURL

**How it's implemented:**
`src/cards.ts` line 302: `downloadCard()` uses `canvas.toDataURL('image/png')` and assigns to `link.href`. Line 309: `shareCard()` uses `canvas.toBlob()` for file sharing.

**Correct or wrong:** CORRECT. `toDataURL` for download links is acceptable (creates a data URL in the `<a>` href). `toBlob` for `navigator.share` is the correct approach — `File` objects require actual Blob data, and `toBlob` is more memory-efficient for large canvases than `toDataURL` (which creates a base64 string 1.33x larger than the binary).

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 41. Canvas API — Font Loading

**How it's implemented:**
`src/cards.ts` line 283: `ctx.font = '700 13px serif'`. The canvas uses generic serif/sans-serif fonts, not the branded Cinzel/Barlow Condensed fonts used throughout the UI.

**Correct or wrong:** SUBOPTIMAL. The share cards use generic system fonts rather than the brand fonts. This is a design gap — cards will look visually inconsistent with the rest of the app. The root cause is that Canvas requires fonts to be fully loaded before rendering; web fonts must be explicitly loaded via `document.fonts.load()` before canvas text draws them correctly.

**If wrong, what's the right way:** Before calling `generateCard()`, call `await document.fonts.load('700 16px "Cinzel"')` and `await document.fonts.load('600 14px "Barlow Condensed"')` to ensure the fonts are available in the canvas context. Then use `'Cinzel'` and `'Barlow Condensed'` in the canvas `ctx.font` assignments.

**What breaks if you don't fix it:** Share cards render with generic system serif/sans-serif fonts instead of brand fonts. Cards look off-brand.

**Severity:** SUBOPTIMAL

---

## 42. Vite Build — Entry Points and Chunking

**How it's implemented:**
`vite.config.ts` defines 11 HTML entry points (all pages). No explicit `manualChunks` configuration. No `outDir` asset hashing is configured separately from Vite defaults. `publicDir: false` disables the public directory.

**Correct or wrong:** SUBOPTIMAL. With 11 HTML entry points and no chunk configuration, each page may load its own copy of shared modules (auth, config, etc.) rather than sharing a common vendor chunk. Vite's default chunking for multi-entry builds may or may not deduplicate these — it depends on whether they're treated as separate entry points or shared chunks.

**If wrong, what's the right way:** Add `build.rollupOptions.output.manualChunks` to explicitly split shared code:
```js
manualChunks: {
  'vendor-supabase': ['@supabase/supabase-js'],
  'shared': ['/src/config.ts', '/src/auth.ts'],
}
```
This ensures the Supabase SDK (the largest dependency) is loaded once as a shared chunk across all pages.

**What breaks if you don't fix it:** Each page may load its own copy of the Supabase SDK bundle (~120KB gzipped), increasing total bytes transferred for users who visit multiple pages. No functional break.

**Severity:** SUBOPTIMAL

---

## 43. Vite Build — SRI Hashes

**How it's implemented:**
No SRI hashes are configured in `vite.config.ts`. The Vite build uses content-hashed filenames (e.g., `main.abc123.js`) which provides cache busting but not subresource integrity in the HTML. The CLAUDE.md mentions "SRI hashes pin supabase-js to @2.98.0" — this was applicable in the legacy CDN era but the current build uses npm imports, eliminating the CDN SRI concern.

**Correct or wrong:** CORRECT for the current npm import model. When Supabase is imported from npm (not CDN), SRI hashes are not needed — Vite bundles the dependency into the output. The CDN-era SRI concern is eliminated.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 44. TypeScript Strictness

**How it's implemented:**
`tsconfig.json` line 8: `"strict": true`. However, `noUnusedLocals: false` and `noUnusedParameters: false` at lines 18–19. The root `tsconfig.json` covers bot files (`lib/**/*.ts`, `*.ts`). `src/` uses Vite's TypeScript resolution. `src/arena.ts` has `as any` casts in several places (`(window as unknown as Record<string, unknown> & { navigateTo: ... }).navigateTo`).

`src/pages/spectate.ts` line 11: `/* eslint-disable @typescript-eslint/no-explicit-any */` — 24 uses of `any` in the file.

**Correct or wrong:** SUBOPTIMAL. `strict: true` is correct but `noUnusedLocals: false` allows dead code to accumulate undetected. The heavy use of `any` in `spectate.ts` eliminates TypeScript's safety guarantees for that entire file's data handling. The `eslint-disable` for `no-explicit-any` is a signal that the migration from `.js` to `.ts` was done quickly without proper typing.

**If wrong, what's the right way:** Progressively add types to `spectate.ts` using the existing interface definitions (e.g., `DebateMessage`, `ArenaFeedItem` from `src/arena.ts`). Enable `noUnusedLocals: true` and clean up dead code. Set `noUnusedParameters: true` for non-bot code.

**What breaks if you don't fix it:** TypeScript cannot catch type errors in `any`-typed code. The safety guarantees of the migration are partially lost for spectate.ts.

**Severity:** SUBOPTIMAL

---

## 45. Test Coverage

**How it's implemented:**
`tests/` directory contains 3 test files: `bot-config.test.ts`, `category-classifier.test.ts`, `content-filter.test.ts`. `vitest.config.ts` points at `tests/**/*.test.ts`. No tests exist for any `src/` module (auth, arena, webrtc, payments, etc.).

**Correct or wrong:** SUBOPTIMAL. The only tested code is bot infrastructure. All critical user-facing modules (auth init, safeRpc, UUID validation, escapeHTML, arena queue, WebRTC signaling) have zero test coverage.

**If wrong, what's the right way:** At minimum, add unit tests for: (1) `escapeHTML` — OWASP edge cases; (2) `isUUID` — valid/invalid UUID strings; (3) `friendlyError` — each error category; (4) `safeRpc` — 401 retry logic (mock Supabase client); (5) `getVisitorId` — localStorage fallback behavior. These are pure functions that are straightforward to test.

**What breaks if you don't fix it:** Regressions in security-critical functions (escapeHTML, UUID validation) go undetected until they hit production.

**Severity:** SUBOPTIMAL

---

## 46. Service Worker / PWA

**How it's implemented:**
No service worker found. No `manifest.json` found. No PWA configuration in `vite.config.ts`. No `<link rel="manifest">` in any HTML file reviewed.

**Correct or wrong:** Not wrong, but a notable gap. The app is mobile-first with offline-capable use cases (voice memo recording, browsing past debates). Without a service worker, the app has no offline support and no "Add to Home Screen" capability.

**If wrong, what's the right way:** Not a required fix for the current stage. When ready, add `vite-plugin-pwa` to Vite config with a workbox strategy. Cache the app shell and static assets. Don't attempt to cache Supabase API calls (they require auth).

**What breaks if you don't fix it:** No offline support. Users with poor connections get blank pages instead of cached content. No "Add to Home Screen" prompt. Not a breaking bug.

**Severity:** SUBOPTIMAL

---

## 47. WebAuthn / Passkeys

**How it's implemented:**
Not present. Auth is email/password + OAuth only.

**Correct or wrong:** Not wrong for the current stage.

**If wrong, what's the right way:** N/A — future enhancement, not a current gap.

**Severity:** SUBOPTIMAL (future enhancement)

---

## 48. Rate Limiting — Client-Side Guards

**How it's implemented:**
`src/arena.ts` lines 1206–1219: Queue polling has an `_queuePollInFlight` flag that prevents overlapping calls. `src/pages/spectate.ts` line 451: `let sending = false` prevents double-submit of chat messages. The arena queue poll interval is 4000ms.

**Correct or wrong:** CORRECT for the patterns found. Double-submit prevention for chat is proper. The in-flight flag for queue polling prevents concurrent requests.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 49. Rate Limiting — Server-Side

**How it's implemented:**
Server-side rate limiting is handled by Supabase RLS policies and server functions (not visible in this codebase — they live in the database). The bot army has jitter configured in `bot-config.ts` lines 238–239: `jitterMinMs: 60_000`, `jitterMaxMs: 480_000` (1–8 minute random jitter between bot actions).

**Correct or wrong:** CORRECT for the bot jitter. Cannot fully evaluate server-side rate limiting without access to the Supabase DB functions, but the pattern is established.

**If wrong, what's the right way:** N/A (cannot assess DB-level rate limiting from client code)

**Severity:** SOLID (bot jitter), UNVERIFIED (DB-level enforcement)

---

## 50. Error Boundaries — Supabase Down

**How it's implemented:**
`src/auth.ts` line 347–352: 5-second safety timeout resolves the `readyPromise` as guest if Supabase never responds. `safeRpc` returns `{ data: null, error: { message: 'Supabase not initialized' } }` if client is null. All RPC calls in arena, spectate, and other modules catch errors and render placeholder/empty states.

**Correct or wrong:** SOLID. Guest mode as fallback on Supabase outage is the right behavior for an app where "guest access is default."

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 51. Error Boundaries — Groq Down

**How it's implemented:**
`src/arena.ts` lines 1786–1797: When the `fetch()` to the ai-sparring Edge Function fails (or returns an error), the catch block generates a local template response after a simulated 1.2–3 second delay. The user never sees an error. `supabase/functions/ai-moderator/index.ts` lines 145–155: On any error, defaults to `'allowed'` ruling.

**Correct or wrong:** CORRECT. Both fail-open gracefully. AI sparring falls back to local templates. AI moderation fails open to keep debates moving.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 52. Error Boundaries — WebRTC Fail

**How it's implemented:**
As noted in finding #14, when WebRTC connection fails there is no automatic recovery — only a status label update. There is no fallback to text mode.

**Correct or wrong:** FRAGILE. See finding #14.

**Severity:** FRAGILE

---

## 53. Error Boundaries — localStorage Full

**How it's implemented:**
`src/analytics.ts` wraps all `localStorage` calls in try/catch blocks (lines 48–63, 73–85, 97–103). If localStorage is unavailable or full, analytics degrades gracefully. `src/auth.ts` does not explicitly handle `localStorage` quota errors — if `localStorage` is full, the Supabase client's session persistence will silently fail to save tokens, causing the user to be logged out on next page load.

**Correct or wrong:** FRAGILE for auth. Storage quota exceeded is rare on desktop but more common on low-storage mobile devices with many apps installed. Supabase JS handles this internally — it will catch the storage error and fall back to in-memory session (no persistence), but this means users get logged out on every page refresh.

**If wrong, what's the right way:** No direct fix needed — Supabase JS handles this internally. Document the behavior: users on storage-limited devices will experience session non-persistence.

**What breaks if you don't fix it:** Users on storage-limited devices are logged out on every page refresh. Not a security issue, just a UX degradation.

**Severity:** SUBOPTIMAL

---

## 54. Supabase Realtime — Presence and Private Channel Auth

**How it's implemented:**
`src/webrtc.ts` lines 204–205: Channel created with `supabase.channel('debate-' + debateId, { config: { presence: { key: getCurrentUser()?.id || 'anon' } } })`. The presence key is the user's UUID or 'anon'. There is no `isPrivate: true` or JWT requirement on the channel.

**Correct or wrong:** FRAGILE. Public channels mean any subscriber can join and receive presence/broadcast messages. As noted in finding #16, this allows malicious broadcast injection. The presence key being the user's UUID is correct for identity, but without channel-level authentication, the system trusts the self-reported role.

**If wrong, what's the right way:** Supabase Realtime private channels require a JWT with the channel name embedded. This can be generated server-side (via a Supabase DB function or Edge Function) and passed to the client at debate start. Alternative: use the existing RLS to restrict which users can join a `debate-{id}` channel.

**What breaks if you don't fix it:** See finding #16 — signaling injection risk.

**Severity:** FRAGILE

---

## 55. HTML Script Loading Order — Vite Migration

**How it's implemented:**
All reviewed HTML pages use a single `<script type="module" src="/src/pages/[page].ts">` tag as their only JavaScript entry point. There are no legacy CDN script tags for Supabase, noOpLock, or other libraries. All dependencies are resolved through ES module imports in the TypeScript files.

**Correct or wrong:** CORRECT. The migration from legacy `<script>` tags to ES module imports is complete for the reviewed pages. Loading order is now managed by the module dependency graph, not HTML script tag order. This eliminates the entire class of "noOpLock must load before Supabase CDN" bugs.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 56. Security Headers

**How it's implemented:**
`vercel.json` lines 16–55 sets: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, and CSP (see finding #37).

**Correct or wrong:** SOLID. The security header set is comprehensive and well-configured. HSTS with `preload` is the maximum hardening. COOP/CORP protect against cross-origin attacks. `Permissions-Policy` correctly restricts microphone to `self`.

**If wrong, what's the right way:** N/A

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 57. Inline onclick Handlers in HTML Strings

**How it's implemented:**
`src/payments.ts` line 133: `onclick="this.closest('#payment-placeholder-modal').remove()"`. `src/auth.ts` line 760: `onclick="document.getElementById('user-profile-modal')?.remove()"` and line 990: `onclick="this.closest('#auth-gate-modal').remove()"`. These are in template literal HTML strings passed to `innerHTML`.

**Correct or wrong:** FRAGILE. These inline `onclick` attributes require `'unsafe-inline'` in the CSP (see finding #37). They also bypass TypeScript's type checking since they're plain strings. If `getElementById` ever returns null, the `?.remove()` optional chain handles it, but the closure scope is limited compared to proper event listeners.

**If wrong, what's the right way:** Replace with `element.querySelector('[data-close]').addEventListener('click', () => modal.remove())` or similar declarative patterns. This removes the need for `'unsafe-inline'` in CSP.

**What breaks if you don't fix it:** CSP cannot be hardened to remove `'unsafe-inline'` while these exist. TypeScript cannot type-check these event handlers.

**Severity:** SUBOPTIMAL

---

## 58. Bot Army — Groq Model and Config

**How it's implemented:**
`bot-config.ts` line 159: Groq model correctly set to `'llama-3.3-70b-versatile'`. Bot jitter is configurable via environment variables (`JITTER_MIN_MS`, `JITTER_MAX_MS`) with sensible defaults (60s–480s). The config validator at line 296 checks `GROQ_API_KEY` is present.

**Correct or wrong:** SOLID.

**If wrong, what's the right way:** N/A

**Severity:** SOLID

---

## 59. Credentials in Source Code

**How it's implemented:**
`src/config.ts` line 137: Supabase anon key hardcoded as a string constant. `src/analytics.ts` lines 38–40: Supabase URL and anon key duplicated as constants. `api/profile.js` lines 18–19: Supabase credentials hardcoded with env var fallback.

**Correct or wrong:** SUBOPTIMAL for the anon key (it is designed to be public and is safe in client-side code per Supabase's design). However, hardcoding in source means it cannot be rotated without a code change and commit. The `api/profile.js` pattern (`process.env.SUPABASE_ANON_KEY || 'hardcoded'`) is better — it allows env var override without code changes.

**If wrong, what's the right way:** In a Vite build context, use `import.meta.env.VITE_SUPABASE_ANON_KEY` and set it in a `.env` file. The current hardcoded approach works for a solo project but creates friction if credentials need rotation.

**What breaks if you don't fix it:** Credential rotation requires a code commit and deployment. Not a security issue (anon key is public), but operationally inconvenient.

**Severity:** SUBOPTIMAL

---

## 60. Deepgram API Key

**How it's implemented:**
`src/config.ts` line 164: `const DEEPGRAM_API_KEY = 'PASTE_YOUR_DEEPGRAM_API_KEY_HERE'`. The placeholder detection at line 413 catches this (`val.startsWith('PASTE_')`), so `placeholderMode.deepgram` will be true.

**Correct or wrong:** CORRECT for current state — Deepgram is not yet wired up and the placeholder detection is working. No Deepgram functionality is exposed to users.

**If wrong, what's the right way:** N/A until Deepgram integration is activated.

**Severity:** SOLID (placeholder correctly detected)

---

## SUMMARY TABLE

| # | Finding | Severity |
|---|---------|----------|
| 1 | noOpLock pattern — correct | SOLID |
| 2 | INITIAL_SESSION sole init path | SOLID |
| 3 | 5-second safety timeout | SOLID |
| 4 | safeRpc 401 retry | SOLID |
| 5 | readyPromise pattern | SOLID |
| 6 | PKCE (default) | SOLID |
| 7 | Analytics localStorage key fragile | FRAGILE |
| 8 | Castle defense (all mutations via RPC) | SOLID |
| 9 | escapeHTML duplicate implementations | SUBOPTIMAL |
| 10 | Numeric casting before innerHTML | SOLID |
| 11 | URL protocol validation | SOLID |
| 12 | UUID validation before filter injection | SOLID |
| 13 | WebRTC: STUN-only, no TURN server | FRAGILE |
| 14 | WebRTC: no ICE restart / reconnection | FRAGILE |
| 15 | AudioContext leaks (webrtc.ts) | FRAGILE |
| 16 | Realtime signaling channel is public | FRAGILE |
| 17 | Realtime channel cleanup | SOLID |
| 18 | Groq model name (llama-3.3-70b-versatile) | SOLID |
| 19 | Groq API: no fetch timeout | FRAGILE |
| 20 | Groq API: error handling and fail-open | SOLID |
| 21 | Groq API: non-streaming (UX suboptimal) | SUBOPTIMAL |
| 22 | Voice recording: codec selection | SOLID |
| 23 | Voice recording: no file size guard | SUBOPTIMAL |
| 24 | Voice recording: objectURL leak on retake | SUBOPTIMAL |
| 25 | Stripe: CDN loading fragile | FRAGILE |
| 26 | **Stripe: no webhook handler — subscriptions never cancel** | WILL-BREAK |
| 27 | Stripe: no idempotency keys | SUBOPTIMAL |
| 28 | Stripe: minor gate (client-side) | SOLID |
| 29 | Analytics: raw fetch before auth (correct) | SOLID |
| 30 | Analytics: persistent visitor UUID, GDPR risk | SUBOPTIMAL |
| 31 | Edge Functions: CORS no localhost | SUBOPTIMAL |
| 32 | Edge Functions: no auth validation (Groq quota exposed) | FRAGILE |
| 33 | Vercel: BASE_URL hardcoded (breaks previews) | SUBOPTIMAL |
| 34 | Vercel: OG tag HTML escaping | SOLID |
| 35 | Vercel: 5-min cache on profiles | SOLID |
| 36 | Vercel: minimal cold start | SOLID |
| 37 | CSP: unsafe-inline weakens XSS protection | SUBOPTIMAL |
| 38 | Polling: all intervals have cleanup | SOLID |
| 39 | DOM cleanup: popstate listener removed | SOLID |
| 40 | Canvas: toBlob vs toDataURL | SOLID |
| 41 | Canvas: brand fonts not loaded | SUBOPTIMAL |
| 42 | Vite: no manualChunks for shared deps | SUBOPTIMAL |
| 43 | Vite: SRI hashes (N/A, npm imports) | SOLID |
| 44 | TypeScript: heavy `any` in spectate.ts | SUBOPTIMAL |
| 45 | Test coverage: only bot files tested | SUBOPTIMAL |
| 46 | No PWA / Service Worker | SUBOPTIMAL |
| 47 | No WebAuthn | SUBOPTIMAL |
| 48 | Rate limiting: client guards correct | SOLID |
| 49 | Rate limiting: bot jitter correct | SOLID |
| 50 | Error boundary: Supabase down | SOLID |
| 51 | Error boundary: Groq down | SOLID |
| 52 | Error boundary: WebRTC fail (no recovery) | FRAGILE |
| 53 | Error boundary: localStorage full | SUBOPTIMAL |
| 54 | Realtime: no private channel auth | FRAGILE |
| 55 | HTML: Vite ES module migration complete | SOLID |
| 56 | Security headers (Vercel) | SOLID |
| 57 | Inline onclick in innerHTML strings | SUBOPTIMAL |
| 58 | Bot: Groq model correct | SOLID |
| 59 | Credentials hardcoded (anon key, low risk) | SUBOPTIMAL |
| 60 | Deepgram placeholder correctly detected | SOLID |

---

## TOP PRIORITY FIXES

### P0 — WILL-BREAK
1. **Stripe webhook handler missing** (finding #26). Cancelled subscriptions are never downgraded. Implement `stripe-webhook` Edge Function with raw body HMAC verification.

### P1 — FRAGILE (user-visible)
2. **WebRTC: No TURN server** (finding #13). ~15-20% of live debates fail silently.
3. **WebRTC: No ICE restart on failure** (finding #14). Debates with network hiccups are permanently broken.
4. **Groq API: No fetch timeout** (finding #19). AI debates can hang for 60 seconds.
5. **Edge Functions: No auth validation** (finding #32). Groq quota exposed to anonymous callers.
6. **AudioContext leaks in webrtc.ts** (finding #15). Crashes after multiple debates.

### P2 — FRAGILE (edge case)
7. Realtime signaling channel public/no auth (finding #16 / #54).
8. Stripe CDN loading fragile (finding #25).
9. WebRTC fail no fallback (finding #52).

---

## ROUND 2 — FEATURE MODULES (Full Read)

---

## 61. async.ts — RPC Trusts Client-Supplied Topic Text

**How it's implemented:**
`src/async.ts` line 922: `safeRpc('create_challenge', { p_hot_take_id: takeId, p_counter_argument: text, p_topic: take.text })`. The `take.text` value comes from client-side state (the hot take's content). A user could modify this in DevTools before the RPC fires.

**Correct or wrong:** FRAGILE. The server should look up the hot take by `p_hot_take_id` and use its actual content as the topic, not trust the client-supplied `p_topic`.

**If wrong, what's the right way:** In the `create_challenge` PostgreSQL function, ignore `p_topic` and do: `SELECT content FROM hot_takes WHERE id = p_hot_take_id` to get the real text.

**What breaks if you don't fix it:** A malicious user could create a challenge with a fabricated topic that doesn't match the original hot take, poisoning the debate context.

**Severity:** FRAGILE

---

## 62. async.ts — Document-Level Click Listener Never Removed

**How it's implemented:**
`src/async.ts` lines 1113–1116: `document.addEventListener('click', (e) => { ... })` is added at module init to handle `data-action="post-take"` clicks via event delegation. No corresponding `removeEventListener` exists.

**Correct or wrong:** SUBOPTIMAL. In the current single-page architecture, the module loads once and persists. But if the module were ever re-initialized (hot reload, test harness), duplicate listeners would accumulate. The pattern is safe in production but violates the cleanup discipline.

**What breaks if you don't fix it:** No production break. Duplicate handlers accumulate only in dev/test scenarios.

**Severity:** SUBOPTIMAL

---

## 63. async.ts — Direct Supabase Queries (Not safeRpc)

**How it's implemented:**
`src/async.ts` lines 221–224: `client.from('hot_takes').select(...).order(...).limit(30)`. Lines 265–269: `client.from('hot_take_reactions').select('hot_take_id').eq('user_id', userId)`. Both are direct SELECT queries, not safeRpc.

**Correct or wrong:** CORRECT. These are read-only SELECTs, not mutations, so they don't violate the castle defense rule. They rely on Supabase RLS for access control. The `hot_take_reactions` query correctly filters by `userId` to get only the current user's reactions.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 64. async.ts — Optimistic UI Updates With Rollback

**How it's implemented:**
`src/async.ts` line 815: `react()` toggles `take.userReacted` and adjusts `take.reactions` optimistically before the RPC. Lines 828–832: on RPC error, the state is reverted and the feed reloaded. Lines 964–991: `postTake()` adds a fake take to the feed, calls RPC, removes it on error.

**Correct or wrong:** CORRECT. Optimistic updates with rollback on error is the standard pattern for responsive UIs. Both reactions and take posting properly revert on failure.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 65. powerups.ts — Unescaped opponentName in Silence Overlay

**How it's implemented:**
`src/powerups.ts` line 356: `renderSilenceOverlay(opponentName?)` interpolates `opponentName` into an innerHTML template without calling `escapeHTML()`. The caller in `src/arena.ts` passes the opponent's display name from `currentDebate.opponentName`, which originates from a server RPC response.

**Correct or wrong:** FRAGILE. If an opponent sets their display name to `<img src=x onerror=alert(1)>`, this is an XSS vector. The opponent name comes from the `profiles` table via RPC — the `guard_profile_columns` trigger protects against direct column manipulation, but the `display_name` column is user-editable via `updateProfile()`.

**If wrong, what's the right way:** Wrap in `escapeHTML(opponentName ?? '')` before interpolation.

**What breaks if you don't fix it:** Stored XSS via malicious display name that triggers when the silence power-up activates.

**Severity:** FRAGILE

---

## 66. tokens.ts — requireTokens() Is Client-Only Gate

**How it's implemented:**
`src/tokens.ts` lines 242–250: `requireTokens(amount, label)` checks the profile's `token_balance` and shows a toast if insufficient. Returns `false` to block the caller. Lines 317–372: All `claim*` functions call `safeRpc()` on the server, which independently validates token balance.

**Correct or wrong:** CORRECT. The client gate is UX-only (prevents unnecessary RPC calls). The server RPCs (`claim_action_tokens`, `claim_debate_tokens`, `claim_milestone`) all enforce balance/eligibility server-side. The client cannot mint or deduct tokens.

**What breaks if you don't fix it:** N/A — server enforces.

**Severity:** SOLID

---

## 67. tiers.ts — Client-Side Tier Calculation

**How it's implemented:**
`src/tiers.ts` lines 72–85: `getTier(questionsAnswered)` maps a count to tier level using hardcoded thresholds. Lines 88–95: `canStake()` and `getPowerUpSlots()` derive limits from the tier. These are used in `src/staking.ts` and `src/powerups.ts` for display gating.

**Correct or wrong:** CORRECT for display. The actual enforcement happens in server RPCs (`place_stake`, `buy_power_up`, `equip_power_up`) which validate tier eligibility from the server-side profile. The client calculation is display-only.

**What breaks if you don't fix it:** N/A — server enforces.

**Severity:** SOLID

---

## 68. notifications.ts — Polling Not Realtime

**How it's implemented:**
`src/notifications.ts` line 320: `setInterval(fetchNotifications, 30_000)`. Uses direct `.from('notifications').select(...)` with `.eq('user_id', user.id)`. No Supabase Realtime subscription.

**Correct or wrong:** SUBOPTIMAL. Polling every 30s is functional but inefficient. With 1000 concurrent users, this generates ~33 SELECT queries/second. Supabase Realtime `postgres_changes` on the `notifications` table filtered by `user_id = auth.uid()` would push updates only on insert, reducing load to near-zero when idle.

**What breaks if you don't fix it:** Under high user load, notification polling contributes to Supabase connection saturation.

**Severity:** SUBOPTIMAL

---

## 69. leaderboard.ts — MutationObserver Never Disconnected

**How it's implemented:**
`src/leaderboard.ts` lines 434–446: A `MutationObserver` watches for `#screen-leaderboard` to gain the `.active` class. It triggers `fetchLeaderboard().then(() => render())`. The observer is created once and never disconnected.

**Correct or wrong:** SUBOPTIMAL. The observer is lightweight (only fires on class attribute changes), but it runs for the entire page lifetime even when the leaderboard screen is never visited again. Proper cleanup would disconnect it if the leaderboard DOM element is removed.

**What breaks if you don't fix it:** Negligible memory/CPU cost. No functional break.

**Severity:** SUBOPTIMAL

---

## 70. share.ts — Deep Link Sanitization

**How it's implemented:**
`src/share.ts` line 240: Challenge name from URL params is sanitized: `.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30)`. Referral codes stored in localStorage for later claim.

**Correct or wrong:** CORRECT. Sanitizes untrusted URL input before use. Referral codes are not used for auth or privilege escalation — they're analytics identifiers.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 71. paywall.ts — Client-Side Feature Gating

**How it's implemented:**
`src/paywall.ts` lines 96–108: `gate(feature, requiredTier)` compares the user's subscription tier index against a required tier index. If insufficient, shows a paywall modal.

**Correct or wrong:** CORRECT as UX gate. The actual feature enforcement happens in server RPCs which validate `subscription_tier` from the profile. The client modal is a user-friendly blocker, not a security boundary.

**What breaks if you don't fix it:** N/A — server enforces.

**Severity:** SOLID

---

## ROUND 3 — BOT ARMY (Full Read)

---

## 72. Bot Engine — Process Lifecycle and Graceful Shutdown

**How it's implemented:**
`bot-engine.ts` lines 353–374: SIGTERM and SIGINT handlers call `leg1Discord.stop()`, wait 2 seconds, then `process.exit(0)`. Global `uncaughtException` and `unhandledRejection` handlers log errors but don't re-throw. Cron jobs wrapped in `jitteredRun()` (lines 108–114) which adds 0–8 minute random delay before each job execution.

**Correct or wrong:** CORRECT. The graceful shutdown cleanly disconnects the Discord WebSocket before exiting. The global error handlers prevent crashes from propagating. PM2 will restart the process on exit.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 73. Bot Engine — Daily Rate Counter Reset on Restart

**How it's implemented:**
`bot-engine.ts` lines 32–33: `autoDebatesToday` and `lastAutoDebateReset` are in-memory variables. Lines 207–211: Counter resets when the date string changes. If PM2 restarts the process (daily 04:00 UTC cron), the counter resets to zero.

**Correct or wrong:** FRAGILE. A PM2 restart mid-day resets the counter, allowing the bot to exceed its daily limit. If the `maxPerDay` limit is 3 and the bot already posted 2 before a restart, it can post 3 more after restart (5 total).

**If wrong, what's the right way:** Track the daily count in Supabase. Query `SELECT COUNT(*) FROM bot_activity WHERE leg = 'leg3' AND created_at > now() - interval '24 hours'` at startup to initialize the counter.

**What breaks if you don't fix it:** After PM2 restart, bot can exceed daily auto-debate limit. With the 04:00 UTC daily restart, this means the bot could produce up to 2x its daily limit.

**Severity:** FRAGILE

---

## 74. AI Generator — No Explicit Timeout on Groq SDK Calls

**How it's implemented:**
`lib/ai-generator.ts`: All Groq calls use `client.chat.completions.create()` from the `groq-sdk` npm package. No timeout or `AbortController` is configured. The SDK's default timeout behavior is unspecified in the code.

**Correct or wrong:** FRAGILE. Same issue as finding #19 (Edge Functions) but for the bot army. If Groq hangs, the bot-engine cron job blocks indefinitely. Unlike Edge Functions which have a 60s platform timeout, Node.js has no default network timeout — the call can hang forever.

**If wrong, what's the right way:** Configure the Groq SDK with a timeout: `new Groq({ apiKey, timeout: 15000 })` (15 seconds).

**What breaks if you don't fix it:** A Groq outage causes the bot-engine to hang on one cron job forever. Subsequent cron jobs queue up. PM2 may eventually kill the process due to memory growth.

**Severity:** FRAGILE

---

## 75. AI Generator — Complete Fallback Template System

**How it's implemented:**
`lib/ai-generator.ts` lines 488–674: Every Groq-dependent function has a fallback template generator. `fallbackHotTake()` (10 templates), `fallbackReply()` (3), `fallbackDebateTopic()`, `fallbackAutoDebateSetup()`, `fallbackAutoDebateRound()` (~140 template lines), `fallbackAutoDebateScore()`, `fallbackShareHook()`.

**Correct or wrong:** CORRECT. Full graceful degradation. If Groq is down, the bot army continues operating with lower-quality but functional content.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 76. Content Filter — Only Applied to Bluesky Posts

**How it's implemented:**
`lib/content-filter.ts` exports `filterContent()` and `filterHeadline()`. `lib/leg2-bluesky-poster.ts` lines 73–83 and 151–161 call `filterContent()` before posting. `lib/leg2-twitter-poster.ts` does NOT call any filter function. `lib/leg1-reddit.ts` does NOT call any filter function.

**Correct or wrong:** FRAGILE. Content filtering is only enforced on Bluesky. AI-generated replies posted to Twitter and Reddit bypass the content filter entirely. The AI system prompt includes content guidelines, but prompt engineering is not a reliable enforcement mechanism — the LLM can occasionally violate its own instructions.

**If wrong, what's the right way:** Call `filterContent()` on all generated text before posting to any platform. In `lib/leg2-twitter-poster.ts`, add: `const check = filterContent(text); if (!check.pass) { logger.warn('Blocked:', check.reason); return null; }`.

**What breaks if you don't fix it:** AI-generated content that passes Groq's system prompt but contains edge-case offensive content (e.g., borderline comparisons the regex would catch) gets posted to Twitter and Reddit without filtering.

**Severity:** FRAGILE

---

## 77. Supabase Client (Bot) — Dedup Substring Matching

**How it's implemented:**
`lib/supabase-client.ts` lines 225–230: `isHeadlineProcessed()` checks `bot_activity` table using `.ilike('generated_text', '%' + headline.substring(0, 50) + '%')`. Also checks `auto_debates.source_headline` with same 50-char substring.

**Correct or wrong:** SUBOPTIMAL. Substring matching on 50 characters creates false positives: "LeBron James trade rumors heat up" and "LeBron James trade rumors heat up again in March" share the same first 50 chars and would be treated as duplicates even though they're different stories.

**If wrong, what's the right way:** Use a hash-based dedup (MD5/SHA256 of full headline) with an exact match column, or increase substring length to 100+ chars, or combine with `source_url` matching.

**What breaks if you don't fix it:** Similar but distinct news stories are incorrectly deduplicated, causing the bot to skip legitimate new topics.

**Severity:** SUBOPTIMAL

---

## 78. Bot Logger — No PII Masking

**How it's implemented:**
`lib/logger.ts`: Winston logger with daily rotating files (30-day retention general, 60-day errors). Custom methods `leg1()`, `leg2()`, `leg3()`, `metric()` for structured logging. All content logged in plain text. Reddit usernames, Bluesky handles, Discord guild names, debate topics, and generated content are logged without masking.

**Correct or wrong:** SUBOPTIMAL. Social media handles are quasi-public information, not PII per se. But debate topics generated from news headlines could contain real names (politicians, athletes, celebrities). The logs are stored locally on the VPS (`./logs/`), not sent to any external service.

**What breaks if you don't fix it:** No legal/compliance break (logs are server-side, not exposed). Minor operational concern if VPS is compromised — logs contain full content inventory.

**Severity:** SUBOPTIMAL

---

## 79. Leg 1 Twitter — Free Tier Write-Only Limitation

**How it's implemented:**
`lib/leg1-twitter.ts` lines 4–11: Extensive comment documents that Twitter free tier is write-only (post + delete). Search/read requires Basic API ($100/month). Lines 47–50: Function checks config flag and returns early if disabled.

**Correct or wrong:** CORRECT as documentation. The limitation is properly documented and the feature is disabled by default.

**What breaks if you don't fix it:** N/A — properly documented and gated.

**Severity:** SOLID

---

## 80. Leg 3 Auto-Debate — Deliberately Lopsided Scoring

**How it's implemented:**
`lib/leg3-auto-debate.ts` lines 68–82: Margin weights are 15% close, 45% clear, 40% landslide. `lib/ai-generator.ts` lines 188–211: System prompt explicitly instructs AI to make scores "DELIBERATELY CONTROVERSIAL" and assigns a pre-determined winner with a specific margin.

**Correct or wrong:** This is an intentional product decision, not a bug. The lopsided scoring is designed to provoke engagement ("rage-bait"). The system is working as designed.

**What breaks if you don't fix it:** N/A — by design.

**Severity:** SOLID (intentional)

---

## ROUND 4 — HTML PAGES AND PAGE CONTROLLERS (Full Read)

---

## 81. HTML Pages — All Using ES Module Entry Points

**How it's implemented:**
Every HTML page uses a single `<script type="module" src="/src/pages/[name].ts">` tag. No legacy `<script>` tags for Supabase CDN, noOpLock, or other libraries. All dependencies resolved through ES imports.

**Correct or wrong:** CORRECT. The migration from legacy script tags to ES modules is complete. Loading order is managed by the module dependency graph, eliminating the entire class of script-ordering bugs.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 82. plinko.ts — Credential Clearing (Session 64 Fix)

**How it's implemented:**
`src/pages/plinko.ts` lines 227, 264–266: After signup or login, password fields are cleared from memory. `passwordInput.value = ''`. This is a Session 64 security fix.

**Correct or wrong:** CORRECT. Clearing credentials from DOM input elements after use prevents credential exposure via DevTools or memory inspection.

**What breaks if you don't fix it:** N/A — already fixed.

**Severity:** SOLID

---

## 83. login.ts — Client-Side Rate Limiting

**How it's implemented:**
`src/pages/login.ts` lines 118–139: Tracks login attempts with a counter. After 5 failed attempts, locks the form for 60 seconds with a countdown timer. Counter resets after 5 minutes of inactivity.

**Correct or wrong:** CORRECT as UX gate. Prevents accidental rapid-fire login attempts. Server-side rate limiting (Supabase GoTrue) provides the real brute-force protection.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 84. settings.ts — Typed DELETE Confirmation for Account Deletion

**How it's implemented:**
`src/pages/settings.ts`: Account deletion requires typing "DELETE" into a confirmation modal input. The modal checks the input value matches before proceeding.

**Correct or wrong:** CORRECT. Follows OWASP re-authentication guidance for destructive actions.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## 85. groups.ts — Inline onclick Handlers Remaining

**How it's implemented:**
`colosseum-groups.html` lines 434–436, 559–570: Inline `onclick="..."` handlers for tab switching, modal opening, and emoji selection. The handlers call page-scoped functions (not user data), so XSS risk is low.

**Correct or wrong:** SUBOPTIMAL. These inline handlers require `'unsafe-inline'` in the CSP (see finding #37). They should be migrated to `addEventListener` bindings in `groups.ts`, matching the pattern used in other page controllers.

**What breaks if you don't fix it:** CSP cannot be hardened to remove `'unsafe-inline'`. No functional break.

**Severity:** SUBOPTIMAL

---

## 86. vercel.json — Comprehensive Security Headers

**How it's implemented:**
`vercel.json` lines 16–55: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=(self)`.

**Correct or wrong:** SOLID. The security header set is comprehensive. HSTS with preload is maximum hardening. COOP/CORP protect against cross-origin attacks. Permissions-Policy correctly restricts microphone to self.

**What breaks if you don't fix it:** N/A

**Severity:** SOLID

---

## UPDATED SUMMARY TABLE

| # | Finding | Severity |
|---|---------|----------|
| 1 | noOpLock pattern — correct | SOLID |
| 2 | INITIAL_SESSION sole init path | SOLID |
| 3 | 5-second safety timeout | SOLID |
| 4 | safeRpc 401 retry | SOLID |
| 5 | readyPromise pattern | SOLID |
| 6 | PKCE (default) | SOLID |
| 7 | Analytics localStorage key fragile | FRAGILE |
| 8 | Castle defense (all mutations via RPC) | SOLID |
| 9 | escapeHTML duplicate implementations | SUBOPTIMAL |
| 10 | Numeric casting before innerHTML | SOLID |
| 11 | URL protocol validation | SOLID |
| 12 | UUID validation before filter injection | SOLID |
| 13 | WebRTC: STUN-only, no TURN server | FRAGILE |
| 14 | WebRTC: no ICE restart / reconnection | FRAGILE |
| 15 | AudioContext leaks (webrtc.ts) | FRAGILE |
| 16 | Realtime signaling channel is public | FRAGILE |
| 17 | Realtime channel cleanup | SOLID |
| 18 | Groq model name (llama-3.3-70b-versatile) | SOLID |
| 19 | Groq API: no fetch timeout (Edge Functions) | FRAGILE |
| 20 | Groq API: error handling and fail-open | SOLID |
| 21 | Groq API: non-streaming (UX suboptimal) | SUBOPTIMAL |
| 22 | Voice recording: codec selection | SOLID |
| 23 | Voice recording: no file size guard | SUBOPTIMAL |
| 24 | Voice recording: objectURL leak on retake | SUBOPTIMAL |
| 25 | Stripe: CDN loading fragile | FRAGILE |
| 26 | **Stripe: no webhook handler — subscriptions never cancel** | **WILL-BREAK** |
| 27 | Stripe: no idempotency keys | SUBOPTIMAL |
| 28 | Stripe: minor gate (client-side) | SOLID |
| 29 | Analytics: raw fetch before auth (correct) | SOLID |
| 30 | Analytics: persistent visitor UUID, GDPR risk | SUBOPTIMAL |
| 31 | Edge Functions: CORS no localhost | SUBOPTIMAL |
| 32 | Edge Functions: no auth validation (Groq quota exposed) | FRAGILE |
| 33 | Vercel: BASE_URL hardcoded (breaks previews) | SUBOPTIMAL |
| 34 | Vercel: OG tag HTML escaping | SOLID |
| 35 | Vercel: 5-min cache on profiles | SOLID |
| 36 | Vercel: minimal cold start | SOLID |
| 37 | CSP: unsafe-inline weakens XSS protection | SUBOPTIMAL |
| 38 | Polling: all intervals have cleanup | SOLID |
| 39 | DOM cleanup: popstate listener removed | SOLID |
| 40 | Canvas: toBlob vs toDataURL | SOLID |
| 41 | Canvas: brand fonts not loaded | SUBOPTIMAL |
| 42 | Vite: no manualChunks for shared deps | SUBOPTIMAL |
| 43 | Vite: SRI hashes (N/A, npm imports) | SOLID |
| 44 | TypeScript: heavy `any` in spectate.ts | SUBOPTIMAL |
| 45 | Test coverage: only bot files tested | SUBOPTIMAL |
| 46 | No PWA / Service Worker | SUBOPTIMAL |
| 47 | No WebAuthn | SUBOPTIMAL |
| 48 | Rate limiting: client guards correct | SOLID |
| 49 | Rate limiting: bot jitter correct | SOLID |
| 50 | Error boundary: Supabase down | SOLID |
| 51 | Error boundary: Groq down | SOLID |
| 52 | Error boundary: WebRTC fail (no recovery) | FRAGILE |
| 53 | Error boundary: localStorage full | SUBOPTIMAL |
| 54 | Realtime: no private channel auth | FRAGILE |
| 55 | HTML: Vite ES module migration complete | SOLID |
| 56 | Security headers (Vercel) | SOLID |
| 57 | Inline onclick in innerHTML strings | SUBOPTIMAL |
| 58 | Bot: Groq model correct | SOLID |
| 59 | Credentials hardcoded (anon key, low risk) | SUBOPTIMAL |
| 60 | Deepgram placeholder correctly detected | SOLID |
| 61 | async.ts: RPC trusts client-supplied topic | FRAGILE |
| 62 | async.ts: document click listener never removed | SUBOPTIMAL |
| 63 | async.ts: direct SELECTs (correct, read-only) | SOLID |
| 64 | async.ts: optimistic UI with rollback | SOLID |
| 65 | powerups.ts: unescaped opponentName in overlay | FRAGILE |
| 66 | tokens.ts: requireTokens is UX gate, server enforces | SOLID |
| 67 | tiers.ts: client tier calc, server enforces | SOLID |
| 68 | notifications.ts: polling not Realtime | SUBOPTIMAL |
| 69 | leaderboard.ts: MutationObserver never disconnected | SUBOPTIMAL |
| 70 | share.ts: deep link sanitization | SOLID |
| 71 | paywall.ts: client gate, server enforces | SOLID |
| 72 | Bot engine: graceful shutdown | SOLID |
| 73 | Bot engine: daily counter resets on restart | FRAGILE |
| 74 | AI generator: no timeout on Groq SDK calls | FRAGILE |
| 75 | AI generator: complete fallback system | SOLID |
| 76 | Content filter: only applied to Bluesky | FRAGILE |
| 77 | Supabase client (bot): dedup substring matching | SUBOPTIMAL |
| 78 | Bot logger: no PII masking | SUBOPTIMAL |
| 79 | Leg 1 Twitter: free tier documented | SOLID |
| 80 | Leg 3: deliberately lopsided scoring (by design) | SOLID |
| 81 | HTML: all ES module entry points | SOLID |
| 82 | plinko.ts: credential clearing | SOLID |
| 83 | login.ts: client rate limiting | SOLID |
| 84 | settings.ts: typed DELETE confirmation | SOLID |
| 85 | groups.html: inline onclick remaining | SUBOPTIMAL |
| 86 | vercel.json: comprehensive security headers | SOLID |

---

## UPDATED TOP PRIORITY FIXES

### P0 — WILL-BREAK
1. **Stripe webhook handler missing** (finding #26). Cancelled subscriptions are never downgraded. Implement `stripe-webhook` Edge Function with raw body HMAC verification.

### P1 — FRAGILE (user-visible)
2. **WebRTC: No TURN server** (finding #13). ~15-20% of live debates fail silently.
3. **WebRTC: No ICE restart on failure** (finding #14). Debates with network hiccups are permanently broken.
4. **Groq API: No fetch timeout** (findings #19, #74). AI debates can hang for 60 seconds (Edge Function) or indefinitely (bot engine).
5. **Edge Functions: No auth validation** (finding #32). Groq quota exposed to anonymous callers.
6. **AudioContext leaks in webrtc.ts** (finding #15). Crashes after multiple debates.
7. **Content filter only on Bluesky** (finding #76). Twitter/Reddit posts bypass content filtering.
8. **Unescaped opponentName in silence overlay** (finding #65). Stored XSS via malicious display name.

### P2 — FRAGILE (edge case)
9. Realtime signaling channel public/no auth (findings #16, #54).
10. Stripe CDN loading fragile (finding #25).
11. WebRTC fail no fallback (finding #52).
12. Bot daily counter resets on PM2 restart (finding #73).
13. async.ts RPC trusts client topic text (finding #61).
14. Analytics localStorage key hardcoded (finding #7).

### P3 — SUBOPTIMAL (tech debt)
15. Notifications polling not Realtime (finding #68).
16. Vite no manualChunks (finding #42).
17. CSP unsafe-inline (findings #37, #57, #85).
18. Test coverage gaps (finding #45).
19. Canvas brand fonts not loaded (finding #41).
20. Dedup substring matching in bot (finding #77).

---

## SCORECARD

| Severity | Count | Percentage |
|----------|-------|------------|
| WILL-BREAK | 1 | 1.2% |
| FRAGILE | 14 | 16.3% |
| SUBOPTIMAL | 25 | 29.1% |
| SOLID | 46 | 53.5% |
| **Total** | **86** | |

**Overall assessment:** 53% SOLID, 30% tech debt, 16% FRAGILE, 1 WILL-BREAK. The codebase has strong security fundamentals (castle defense, XSS escaping, UUID validation, auth patterns). The WILL-BREAK item (missing Stripe webhook) is the single critical gap. The FRAGILE items cluster around WebRTC reliability and bot army edge cases.

---

*Full audit complete. All src/, lib/, supabase/functions/, api/, HTML pages, and config files read.*
