# SESSION 133 — Full Codebase Audit

**Date:** 2026-03-19
**Scope:** All 93 files in the repository
**Auditor:** Claude Opus 4.6 (automated)

---

## Issue 1: Hardcoded Supabase Anon Key in Client-Side Config
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-config.js`, line 16
- **Description:** Supabase anon key is hardcoded in plain text. While anon keys are designed to be public and RLS should protect data, this is a credential committed to source control. If RLS policies have gaps, the exposed key grants direct API access.
- **Fix:** Ensure all RLS policies are airtight. Consider loading the key from environment variables at build/deploy time, though for a no-build static site this is an accepted tradeoff as long as RLS is solid.
- **Status:** OPEN

## Issue 2: Hardcoded Stripe Test Publishable Key
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-config.js`, line 19
- **Description:** Stripe publishable key (`pk_test_...`) is hardcoded. If the app ships to production with a test key, payments will not work. If swapped to a live key, it would be committed to Git history.
- **Fix:** Add a check or warning when running in production with a `pk_test_` key. When switching to live keys, use environment injection to avoid committing live keys.
- **Status:** OPEN

## Issue 3: Stripe Price IDs Hardcoded
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-config.js`, lines 22-28
- **Description:** Stripe price IDs are hardcoded test-mode IDs. Switching environments requires a code change and commit.
- **Fix:** Consider environment-based configuration or a mapping that selects test vs. live price IDs.
- **Status:** OPEN

## Issue 4: Console.log Leaks User Email in Placeholder Mode (signUp)
- **Severity:** MEDIUM
- **Category:** PII
- **File:** `colosseum-auth.js`, line 189
- **Description:** `console.log('[Placeholder] signUp called:', email)` logs the user's email address to the browser console. Even in placeholder mode, this exposes PII.
- **Fix:** Remove the email parameter from the console.log call, or remove the log entirely.
- **Status:** OPEN

## Issue 5: Console.log Leaks User Email in Placeholder Mode (logIn)
- **Severity:** MEDIUM
- **Category:** PII
- **File:** `colosseum-auth.js`, line 221
- **Description:** `console.log('[Placeholder] logIn called:', email)` logs the user's email to the console.
- **Fix:** Remove the email from the log output or remove the log entirely.
- **Status:** OPEN

## Issue 6: Missing UUID Validation on userId Parameters (Auth Module)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 373, 387, 402, 416, 432, 446, 468, 512
- **Description:** Functions `followUser`, `unfollowUser`, `getFollowers`, `getFollowing`, `getFollowCounts`, `getPublicProfile`, `declareRival`, and `showUserProfile` accept `userId`/`targetUserId` parameters without validating UUID format before passing to Supabase. Per CLAUDE.md, all user IDs must be UUID-validated before use in filters.
- **Fix:** Add UUID format validation (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) at the top of each function.
- **Status:** OPEN

## Issue 7: Missing UUID Validation on Moderator/Debate Function Parameters
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 662, 678, 694, 708, 740
- **Description:** `submitReference`, `ruleOnReference`, `scoreModerator`, `assignModerator`, and `getDebateReferences` accept `debateId`, `referenceId`, `moderatorId` parameters without UUID validation.
- **Fix:** Validate all ID parameters as UUIDs before passing to `safeRpc`.
- **Status:** OPEN

## Issue 8: Numeric Values Not Cast Before innerHTML in showUserProfile
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 554-566
- **Description:** `profile.elo_rating`, `profile.wins`, `profile.losses`, `profile.followers`, `profile.following` are injected directly into innerHTML without `Number()` casting. Per CLAUDE.md, numeric values in innerHTML must be cast with `Number()`.
- **Fix:** Wrap each numeric field with `Number()`, e.g., `${Number(profile.elo_rating) || 1200}`.
- **Status:** OPEN

## Issue 9: `requireAuth` Returns True for Placeholder User — Auth Bypass
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-auth.js`, line 795
- **Description:** `requireAuth` checks `if (currentUser) return true;`. In placeholder mode, `currentUser` is set to a fake object, meaning `requireAuth` returns `true` in placeholder mode, bypassing the auth gate entirely.
- **Fix:** Change to `if (currentUser && !isPlaceholderMode) return true;`.
- **Status:** OPEN

## Issue 10: Hardcoded PII — Placeholder Email Address
- **Severity:** LOW
- **Category:** PII
- **File:** `colosseum-auth.js`, line 137
- **Description:** Placeholder mode sets `email: 'gladiator@colosseum.app'`. Could confuse users or appear in logs as a real user.
- **Fix:** Use `placeholder@example.com` or omit the email field.
- **Status:** OPEN

## Issue 11: `_notify` Exposed as Public API — Auth State Spoofing
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, line 877
- **Description:** `_notify` is exported in the public API. Any script on the page can call `ColosseumAuth._notify(fakeUser, fakeProfile)` to spoof auth state to all listeners.
- **Fix:** Remove `_notify` from the returned public API object.
- **Status:** OPEN

## Issue 12: No Listener Cleanup / Unsubscribe Mechanism
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-auth.js`, lines 821-824
- **Description:** `onChange` pushes listeners to an array but provides no way to remove them. Stale listeners accumulate over time.
- **Fix:** Return an unsubscribe function from `onChange`.
- **Status:** OPEN

## Issue 13: CORS Bypass — Requests Without Origin Header Pass Through
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `middleware.js`, lines 95-108
- **Description:** The CORS check only runs `if (!isWebhook && origin)`. Requests without an `Origin` header (curl, Postman, server-side scripts) bypass CORS entirely.
- **Fix:** For non-webhook API routes requiring browser-only access, reject requests lacking an `Origin` header.
- **Status:** OPEN

## Issue 14: Rate Limit Map Memory Leak Risk
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `middleware.js`, lines 23, 66-78
- **Description:** The `rateLimitMap` is an in-memory `Map` with cleanup only every 5 minutes. Under DDoS from many unique IPs, the map could grow unbounded.
- **Fix:** Add a max size check to the map (e.g., force cleanup if > 10,000 entries).
- **Status:** OPEN

## Issue 15: IP Spoofing via x-forwarded-for Header
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `middleware.js`, lines 40-46
- **Description:** `getClientIP` trusts `x-forwarded-for` directly. On non-Vercel deployments, attackers could spoof IP to bypass rate limiting.
- **Fix:** Document this assumption. If deploying elsewhere, use a trusted proxy configuration.
- **Status:** OPEN

## Issue 16: OPTIONS Preflight Reflects Arbitrary Origin
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `middleware.js`, line 151
- **Description:** The OPTIONS handler reflects whatever `origin` is sent. Should only reflect origins explicitly in `ALLOWED_ORIGINS`.
- **Fix:** `'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]`.
- **Status:** OPEN

## Issue 17: `colosseum-locks-fix.js` Silently Swallows All Errors
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-locks-fix.js`, line 23
- **Description:** The catch block `catch (e) { /* older browsers */ }` swallows all errors including unexpected ones.
- **Fix:** Add `console.warn` in the catch block.
- **Status:** OPEN

## Issue 18: Lock Mock `request()` Returns Undefined for Non-Function Callbacks
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-locks-fix.js`, lines 14-17
- **Description:** If both `optionsOrCb` and `maybeCb` are not functions, `cb` will be the options object and the function returns `undefined` silently.
- **Fix:** Handle the options-only case to match the real API behavior.
- **Status:** OPEN

## Issue 19: Multiple console.error/console.warn in Auth Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-auth.js`, lines 130, 182, 274, 439, 461, 616, 735, 749, 774, 777
- **Description:** Numerous `console.error` and `console.warn` calls expose internal implementation details to anyone with DevTools open.
- **Fix:** Replace with a conditional logging utility or reduce verbosity.
- **Status:** OPEN

## Issue 20: `submitReference` Does Not Validate URL Parameter
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 662-676
- **Description:** `submitReference` accepts a `url` parameter and passes it directly to the RPC. Malicious URLs (javascript:, data:) could create stored XSS.
- **Fix:** Validate that the URL starts with `https://` or `http://` and has a reasonable length.
- **Status:** OPEN

## Issue 21: `respondRival` Does Not Validate `rivalId` as UUID
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, line 482
- **Description:** `respondRival` takes `rivalId` without UUID validation before passing to `safeRpc`.
- **Fix:** Add UUID format validation.
- **Status:** OPEN

## Issue 22: `escapeHTML` Uses DOM-Based Approach — Fails in Non-Browser Contexts
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-config.js`, lines 130-135
- **Description:** `escapeHTML` creates a DOM element for escaping. Will throw in Node.js/serverless contexts.
- **Fix:** Use a string-replace approach instead of DOM manipulation.
- **Status:** OPEN

## Issue 23: Webhook Paths Checked with `includes()` — Overly Broad Match
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `middleware.js`, lines 91-93
- **Description:** `path.includes('telegram-webhook')` matches any path containing that substring, enabling CORS bypass via crafted paths.
- **Fix:** Use exact path matching or `path.startsWith('/api/telegram-webhook')`.
- **Status:** OPEN

## Issue 24: No Password Strength Validation in signUp or updatePassword
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 187, 300
- **Description:** Both functions accept passwords without client-side length or complexity validation.
- **Fix:** Add client-side password validation before calling Supabase auth methods.
- **Status:** OPEN

## Issue 25: `deleteAccount` Does Not Require Re-Authentication
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-auth.js`, lines 350-369
- **Description:** `deleteAccount` performs a soft delete without re-authentication. A stolen session token could delete the account.
- **Fix:** Require password re-entry or a confirmation token, enforced server-side.
- **Status:** OPEN

## Issue 26: XSS via Unvalidated user_id in onclick Attributes
- **Severity:** CRITICAL
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 164
- **Description:** `t.user_id` is interpolated directly into an `onclick` attribute without validation: `onclick="ColosseumAuth?.showUserProfile?.('${t.user_id}')"`. Same pattern at lines 349, 359 with `r.rival_id` and `r.id`.
- **Fix:** Validate as UUID before interpolation, or use `data-*` attributes with event delegation.
- **Status:** OPEN

## Issue 27: XSS via Unvalidated IDs in onclick Attributes (react/challenge/share)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-async.js`, lines 188, 195, 202
- **Description:** `t.id` interpolated into `onclick` handlers without validation. Single-quote breakout enables code injection.
- **Fix:** Validate `t.id` as UUID or switch to event delegation with `data-id` attributes.
- **Status:** OPEN

## Issue 28: XSS via Unescaped t.text in Share Button onclick
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 202
- **Description:** `encodeURIComponent(t.text)` inside a single-quoted JS string within an onclick attribute. Single quotes from encoded result break the attribute context.
- **Fix:** Use event delegation or `data-*` attributes.
- **Status:** OPEN

## Issue 29: Unvalidated debate_id in Prediction onclick
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-async.js`, lines 242, 251
- **Description:** `p.debate_id` interpolated directly into onclick attributes without UUID validation.
- **Fix:** Validate as UUID or use event delegation.
- **Status:** OPEN

## Issue 30: Unvalidated take.id in Challenge Modal Submit Button
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 454
- **Description:** `take.id` interpolated into inline onclick handler without validation.
- **Fix:** Validate as UUID or wire event listener programmatically.
- **Status:** OPEN

## Issue 31: Missing Numeric Cast for Reaction/Challenge Counts
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, lines 193, 200
- **Description:** `t.reactions` and `t.challenges` rendered in innerHTML without `Number()` casting.
- **Fix:** Wrap in `Number()`.
- **Status:** OPEN

## Issue 32: Missing Numeric Cast for Prediction Totals/Percentages
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, lines 236, 264-265
- **Description:** `p.total`, `p.pct_a`, `p.pct_b` rendered in innerHTML without `Number()` casting.
- **Fix:** Cast with `Number()`.
- **Status:** OPEN

## Issue 33: Missing Numeric Cast for ELO in Predictions
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, lines 248, 256
- **Description:** `p.p1_elo` and `p.p2_elo` rendered in innerHTML without `Number()` cast.
- **Fix:** Use `${Number(p.p1_elo)}`.
- **Status:** OPEN

## Issue 34: Missing Numeric Cast for Rival ELO and Win/Loss Counts
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 354
- **Description:** `r.rival_elo`, `r.rival_wins`, and `r.rival_losses` rendered in innerHTML without `Number()` casting.
- **Fix:** Cast each with `Number()`.
- **Status:** OPEN

## Issue 35: Missing Numeric Cast for Token Count in Hot Take Cards
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 181
- **Description:** `t.tokens || 0` rendered in innerHTML without `Number()` cast.
- **Fix:** Use `${Number(t.tokens || 0)}`.
- **Status:** OPEN

## Issue 36: Console Statements in Async Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-async.js`, lines 108, 136, 306, 314, 394, 406, 492, 503
- **Description:** Multiple `console.error` and `console.log` statements remain in production code.
- **Fix:** Remove or replace with conditional debug logging.
- **Status:** OPEN

## Issue 37: `_submitChallenge` Exposed on Public API — Bypasses Auth and Token Gate
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-async.js`, line 635
- **Description:** `_submitChallenge` is exposed on the public return object, callable directly to bypass auth and the 50-token gate from `challenge()`.
- **Fix:** Remove `_submitChallenge` from the return object. Wire onclick programmatically.
- **Status:** OPEN

## Issue 38: No Input Length Validation on Challenge Response Text
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-async.js`, line 468
- **Description:** Challenge response textarea has no `maxlength` attribute and no programmatic length check. Arbitrarily long text can be submitted.
- **Fix:** Add `maxlength` attribute and/or validate length before RPC call.
- **Status:** OPEN

## Issue 39: Missing Numeric Cast for Scores in Arena Feed Cards
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-arena.js`, lines 583, 598
- **Description:** `d.score_a` and `d.score_b` rendered in innerHTML without `Number()` casting.
- **Fix:** Use `${Number(d.score_a)}–${Number(d.score_b)}`.
- **Status:** OPEN

## Issue 40: Missing Numeric Cast for ELO and Token Values in Debate Room
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-arena.js`, lines 1088, 1091, 1099
- **Description:** `myElo`, `debate.opponentElo`, and `profile?.token_balance` rendered in innerHTML without `Number()` casting.
- **Fix:** Cast each with `Number()`.
- **Status:** OPEN

## Issue 41: Missing Numeric Cast for ELO Change and Scores in Post-Debate Screen
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-arena.js`, lines 1684, 1699-1704
- **Description:** `eloChangeMe`, `scoreA`, and `scoreB` rendered in innerHTML without `Number()` casting.
- **Fix:** Cast each with `Number()`.
- **Status:** OPEN

## Issue 42: Console Statements in Arena Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-arena.js`, lines 562, 691, 954, 959, 1041, 1232, 1289, 1334, 1663, 1757, 2004, 2013, 2112
- **Description:** Many `console.error`, `console.warn`, and `console.log` statements remain throughout.
- **Fix:** Remove or replace with conditional debug logging.
- **Status:** OPEN

## Issue 43: No destroy() Function Exposed for Arena Polling Intervals
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-arena.js`, lines 896, 942, 1392, 1505, 1884, 1936
- **Description:** Six `setInterval` calls (`queueElapsedTimer`, `queuePollTimer`, `roundTimer`, `vmTimer`, `_rulingCountdownTimer`, `referencePollTimer`) but no `destroy()` function exposed in the public API to clean them up on page navigation. Violates CLAUDE.md rule.
- **Fix:** Add a `destroy()` function to the public API that clears all active intervals.
- **Status:** OPEN

## Issue 44: vmTimer Not Cleared on Page Navigation
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-arena.js`, line 1505
- **Description:** `vmTimer` (voice memo recording timer) is not cleared by the popstate handler's room exit logic. Navigating away while recording leaves the timer running.
- **Fix:** Add `clearInterval(vmTimer)` to the popstate handler and include it in a `destroy()` function.
- **Status:** OPEN

## Issue 45: Race Condition in Auto-Allow Countdown for Mod Ruling
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-arena.js`, lines 1881-1892
- **Description:** When the ruling countdown reaches zero, the overlay is removed but no "allow" ruling RPC is called. The reference stays "pending" server-side despite UI suggesting auto-allow.
- **Fix:** Call `ColosseumAuth.ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timed out)')` when countdown expires.
- **Status:** OPEN

## Issue 46: MutationObserver Never Disconnects if #screen-arena Not Added
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-arena.js`, lines 2128-2134
- **Description:** If `#screen-arena` is never added to the DOM, the MutationObserver watches forever — small memory leak.
- **Fix:** Add a timeout or scope the observer to check if the page uses the arena.
- **Status:** OPEN

## Issue 47: No Validation on `data-link` Before Setting window.location.href
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-arena.js`, line 512
- **Description:** Event delegation sets `window.location.href = card.dataset.link` directly. A malicious `data-link` via DOM manipulation could navigate to a `javascript:` URL.
- **Fix:** Validate that `card.dataset.link` starts with an expected path prefix.
- **Status:** OPEN

## Issue 48: No CSRF/Rate-Limiting on Edge Function Calls
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-arena.js`, lines 1318, 1980
- **Description:** The `ai-sparring` and `ai-moderator` Edge Function calls use the anon key. No client-side rate limiting prevents spam. Anyone could call these endpoints directly.
- **Fix:** Implement server-side rate limiting in the Edge Functions and/or add client-side debouncing.
- **Status:** OPEN

## Issue 49: Unauthenticated User ID Sent as 'unknown' to Stripe Checkout
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-payments.js`, lines 58, 105
- **Description:** When user is not authenticated, the code falls back to `'unknown'` as userId and still creates a Stripe checkout session. Tokens/subscriptions go nowhere or could collide.
- **Fix:** Return early with an error toast if user is not authenticated. Never send `'unknown'` as userId.
- **Status:** OPEN

## Issue 50: No Validation of Stripe Checkout Response Before Redirect
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-payments.js`, lines 72-73, 119-120
- **Description:** After `res.json()`, `sessionId` is used without checking `res.ok` or if `sessionId` exists. If the edge function returns an error, `redirectToCheckout` throws unhelpfully.
- **Fix:** Check `res.ok` and validate `sessionId` is non-empty before calling `redirectToCheckout`.
- **Status:** OPEN

## Issue 51: XSS via title/body in Placeholder Modal innerHTML
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-payments.js`, lines 153-156
- **Description:** `_showPlaceholderModal` interpolates `title` and `body` into innerHTML without `escapeHTML()`. Currently from config, but violates project rules.
- **Fix:** Pass through `ColosseumConfig.escapeHTML()` before interpolation.
- **Status:** OPEN

## Issue 52: XSS via Paywall Variant Fields in innerHTML
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-paywall.js`, lines 82-121
- **Description:** `v.icon`, `v.title`, `v.subtitle`, `v.cta` interpolated directly into innerHTML from hardcoded `VARIANTS` object. Violates escapeHTML rule.
- **Fix:** Pass all values through `escapeHTML()` or use `textContent`.
- **Status:** OPEN

## Issue 53: Direct DB Mutations (INSERT/UPDATE) Instead of .rpc() in Stripe Webhook
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-stripe-functions.js`, lines 169-176, 179-186, 200-207, 218-221, 229-232, 250-257
- **Description:** The webhook uses direct `.from("profiles").update(...)` and `.from("payments").insert(...)` instead of RPC functions. Violates the Castle Defense architectural rule.
- **Fix:** Create server-side RPC functions for `update_subscription_tier`, `log_payment`, and use `.rpc()` calls.
- **Status:** OPEN

## Issue 54: Idempotency Flaw — Event Marked Processed Before Processing Completes
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-stripe-functions.js`, lines 136-149 vs 262-270
- **Description:** The webhook inserts the event ID into `stripe_processed_events` *before* processing. If processing fails, the event is permanently blocked from retry. A transient DB error causes permanent loss of a paid upgrade.
- **Fix:** Move idempotency insert to *after* successful processing, or use a two-phase approach with `status='processing'` then `status='completed'`.
- **Status:** OPEN

## Issue 55: Placeholder Stripe Price IDs in Production Code
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-stripe-functions.js`, lines 280-284
- **Description:** `mapPriceToTier()` contains placeholder strings like `"PASTE_STRIPE_PRICE_ID_CONTENDER_MONTHLY"`. All subscription checkouts silently map to `"free"` tier.
- **Fix:** Use environment variables or add a startup check that fails loudly on placeholder values.
- **Status:** OPEN

## Issue 56: Token Purchase Maps to 0 Tokens on Floating-Point Mismatch
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-stripe-functions.js`, lines 289-296
- **Description:** `mapPriceToTokens()` uses floating-point dollar amounts as keys. `session.amount_total / 100` can produce imprecise values (e.g., 3.9900000000000002), causing legitimate payments to yield 0 tokens.
- **Fix:** Use integer cents as keys and compare against `session.amount_total` directly. Add a fallback that logs an error rather than silently crediting 0.
- **Status:** OPEN

## Issue 57: CORS Fallback Returns First Allowed Origin for Unknown Origins
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-stripe-functions.js`, lines 34-36
- **Description:** `getCorsHeaders()` falls back to `ALLOWED_ORIGINS[0]` for unknown origins. Requests from malicious sites get a valid CORS header, enabling CSRF.
- **Fix:** Return no `Access-Control-Allow-Origin` header when origin is not in the allowlist.
- **Status:** OPEN

## Issue 58: `mode` Parameter from Client Not Validated in Checkout
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-stripe-functions.js`, lines 52, 64
- **Description:** `mode` parameter taken from client request body and passed directly to `stripe.checkout.sessions.create({ mode })`.
- **Fix:** Validate that `mode` is either `'subscription'` or `'payment'`.
- **Status:** OPEN

## Issue 59: Webhook Error Messages Leaked to Caller
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-stripe-functions.js`, lines 80-82, 270
- **Description:** Raw `err.message` returned in JSON responses. Could leak internal implementation details.
- **Fix:** Return generic error messages to client. Log details server-side only.
- **Status:** OPEN

## Issue 60: Paywall `gate()` Returns True When Profile Is Null
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-paywall.js`, line 43
- **Description:** When profile is null (auth not loaded, user logged out), `gate()` returns `true`, granting access to gated features. Any timing issue silently bypasses all paywalls.
- **Fix:** Return `false` when profile is unavailable, or defer until auth state resolves.
- **Status:** OPEN

## Issue 61: Console Statements in Tokens Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-tokens.js`, lines 219, 245, 260
- **Description:** `console.log` and `console.warn` calls leak token balances, streak counts to DevTools.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 62: Console Statements in Scoring Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-scoring.js`, lines 41, 59, 73, 88, 101, 129, 150, 171, 186
- **Description:** Nine `console.log('[PLACEHOLDER]...')` calls throughout scoring module.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 63: XSS in Milestone Toast via innerHTML
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-tokens.js`, lines 136-141
- **Description:** `_milestoneToast` interpolates `icon`, `label`, `rewardText` into innerHTML without `escapeHTML()`.
- **Fix:** Use `escapeHTML()` or build DOM elements with `textContent`.
- **Status:** OPEN

## Issue 64: `verified_gladiator` Milestone Triggers at Same Threshold as `profile_3_sections`
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-tokens.js`, lines 356-361
- **Description:** `verified_gladiator` fires at `completedCount >= 3`, identical to `profile_3_sections`. Name implies verification, not profile completion.
- **Fix:** Verify if this should have a different trigger condition (e.g., email verification).
- **Status:** OPEN

## Issue 65: Console Statements in Payments Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-payments.js`, lines 15, 23, 75, 122
- **Description:** `console.warn` and `console.error` calls left in production.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 66: Hardcoded Supabase Anon Key in Analytics File (Duplicated)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-analytics.js`, lines 12-13
- **Description:** Supabase URL and anon key hardcoded separately from `ColosseumConfig`. Must be updated in two places if credentials rotate.
- **Fix:** Import from `ColosseumConfig` instead.
- **Status:** OPEN

## Issue 67: User ID from localStorage Not UUID-Validated in Analytics
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-analytics.js`, lines 57-65
- **Description:** `getUserId()` parses Supabase auth token from localStorage and trusts `user.id` without UUID validation before passing to RPC.
- **Fix:** Add UUID format validation on extracted `user.id`.
- **Status:** OPEN

## Issue 68: AudioContext Resource Leak in `getAudioLevel`
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-webrtc.js`, lines 94-108
- **Description:** Creates a new `AudioContext` and `AnalyserNode` every call but never closes them. Browsers limit concurrent audio contexts (typically 6).
- **Fix:** Return a `{ getLevel, destroy }` object, or cache and reuse a single AudioContext.
- **Status:** OPEN

## Issue 69: AudioContext Resource Leak in `createWaveform`
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-webrtc.js`, lines 484-517
- **Description:** Creates an `AudioContext` and starts an infinite `requestAnimationFrame` loop. No stop condition or cancellation handle.
- **Fix:** Add a `stop()` function that cancels the animation frame and closes the audio context.
- **Status:** OPEN

## Issue 70: Console Statements in WebRTC Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-webrtc.js`, lines 119, 265, 347, 415, 475
- **Description:** Multiple `console.log` and `console.warn` calls remain.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 71: Console Statements in VoiceMemo Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-voicememo.js`, lines 106, 228, 244-246, 654
- **Description:** Several `console.error` and `console.log` calls in production.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 72: XSS via Unescaped context.replyTo and context.topic in innerHTML
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-voicememo.js`, lines 469-470
- **Description:** `context.replyTo` and `context.topic` interpolated directly into innerHTML without escaping. If username or topic contains HTML/script tags, this is XSS.
- **Fix:** Apply `escapeHTML()` to both values before innerHTML insertion.
- **Status:** OPEN

## Issue 73: XSS via Unescaped voiceUrl in renderPlayer innerHTML
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-voicememo.js`, lines 712, 723
- **Description:** `voiceUrl` interpolated into inline onclick handler and `<audio src>` tag without escaping. A crafted URL could break out of the attribute.
- **Fix:** HTML-escape `voiceUrl` before interpolation, or use `data-` attributes with `addEventListener`.
- **Status:** OPEN

## Issue 74: setInterval in Recording Timer Without Guaranteed Cleanup
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-voicememo.js`, line 94
- **Description:** `recordingTimer = setInterval(...)` starts before `mediaRecorder.start()`. If `start()` throws, the interval runs indefinitely.
- **Fix:** Move `setInterval` after `mediaRecorder.start()` succeeds, or wrap in try/catch.
- **Status:** OPEN

## Issue 75: Console Statements in Notifications Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-notifications.js`, lines 203, 219, 267
- **Description:** Three `console.error` calls remain in production.
- **Fix:** Remove or replace with silent error handler.
- **Status:** OPEN

## Issue 76: Console Statements in Leaderboard Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-leaderboard.js`, line 89
- **Description:** `console.warn('Leaderboard fetch failed:', e)` remains in production.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 77: Console Statements in Home Module (Production)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-home.js`, lines 242, 492
- **Description:** `console.log('[Prediction]', ...)` and `console.log('[ColosseumHome toast]', msg)` in production.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 78: WebRTC Module Not Assigned to `window` (Violates Convention)
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-webrtc.js`, line 8
- **Description:** Declared as `const ColosseumWebRTC` instead of `window.ColosseumWebRTC`. All other modules use `window.X`. May not be globally accessible.
- **Fix:** Change to `window.ColosseumWebRTC`.
- **Status:** OPEN

## Issue 79: ColosseumHome Module Not Assigned to `window` (Violates Convention)
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-home.js`, line 8
- **Description:** `const ColosseumHome` instead of `window.ColosseumHome`. Violates stated convention, fragile.
- **Fix:** Change to `window.ColosseumHome`.
- **Status:** OPEN

## Issue 80: Spectator Channel Never Unsubscribed in broadcastToSpectators
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-webrtc.js`, lines 442-456
- **Description:** Creates a new Supabase channel on every call but never subscribes or unsubscribes. Each call leaks a channel. Calling `.send()` on unsubscribed channel may silently fail.
- **Fix:** Cache the channel (create once, reuse), subscribe it, and clean up in `leaveDebate()`.
- **Status:** OPEN

## Issue 81: Missing destroy() on Leaderboard MutationObserver
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-leaderboard.js`, lines 354-366
- **Description:** MutationObserver created in `init()` but no `destroy()` method exposed to disconnect it. Violates project rules.
- **Fix:** Store observer reference and expose `destroy()` that calls `observer.disconnect()`.
- **Status:** OPEN

## Issue 82: `document.execCommand('copy')` Is Deprecated
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-share.js`, line 146
- **Description:** Clipboard fallback uses deprecated `document.execCommand('copy')`.
- **Fix:** Acceptable as last-resort fallback, but note it may stop working in future browsers.
- **Status:** OPEN

## Issue 83: Missing Error Handling in WebRTC createOffer and handleOffer
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-webrtc.js`, lines 235-253
- **Description:** Async WebRTC operations with no try/catch. Failures result in unhandled promise rejections.
- **Fix:** Wrap in try/catch that fires `fire('error', ...)`.
- **Status:** OPEN

## Issue 84: Time Filter Buttons Are Non-Functional Dead Code
- **Severity:** LOW
- **Category:** DEAD-CODE
- **File:** `colosseum-leaderboard.js`, lines 344-351
- **Description:** `setTime()` function and week/month filter buttons are rendered but confirmed non-functional. Users see buttons that do nothing.
- **Fix:** Implement time-bucketed filtering or hide/disable the buttons.
- **Status:** OPEN

## Issue 85: Referral Code Generation Uses Weak Randomness
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-share.js`, lines 152-156
- **Description:** `Math.random().toString(36).slice(2, 6)` gives only ~1.7 million possible values. Combined with userId prefix, still predictable.
- **Fix:** Use `crypto.getRandomValues()` for stronger codes.
- **Status:** OPEN

## Issue 86: `shareTake` Decodes URL-Encoded Text Without Try/Catch
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-share.js`, line 55
- **Description:** `decodeURIComponent(takeText)` can throw `URIError` on malformed percent sequences. No try/catch.
- **Fix:** Wrap in try/catch.
- **Status:** OPEN

## Issue 87: Hardcoded Discord Public Key Without process.env Fallback
- **Severity:** CRITICAL
- **Category:** SECURITY
- **File:** `discord.js`, line 12
- **Description:** `DISCORD_PUBLIC_KEY` hardcoded as placeholder with no `process.env` fallback. If real key pasted, it gets committed to repo.
- **Fix:** Change to `const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || 'PASTE_DISCORD_PUBLIC_KEY_HERE';`.
- **Status:** OPEN

## Issue 88: Hardcoded Telegram Bot Token Without process.env Fallback
- **Severity:** CRITICAL
- **Category:** SECURITY
- **File:** `telegram.js`, line 10
- **Description:** `TELEGRAM_BOT_TOKEN` hardcoded as placeholder with no `process.env` fallback. Once real token pasted, committed to source.
- **Fix:** Change to `const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'PASTE...';`.
- **Status:** OPEN

## Issue 89: Hardcoded Discord Credentials Without process.env Fallback
- **Severity:** CRITICAL
- **Category:** SECURITY
- **File:** `discord-register.js`, lines 10-11
- **Description:** `DISCORD_APP_ID` and `DISCORD_BOT_TOKEN` hardcoded as constants with no env var fallback.
- **Fix:** Change to `process.env.DISCORD_APP_ID || 'PASTE...'` pattern.
- **Status:** OPEN

## Issue 90: SUPABASE_URL Not in Required Validation List (bot-config)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `bot-config.js`, lines 166-170
- **Description:** Config validates `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `BOT_USER_ID` but not `SUPABASE_URL`. Bot starts but all Supabase calls fail silently.
- **Fix:** Add `['SUPABASE_URL', config.supabase.url]` to the `required` array.
- **Status:** OPEN

## Issue 91: Unbounded In-Memory Vote Storage (Discord Bot)
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-discord-bot.js`, line 37
- **Description:** `debates` Map grows without bound. Burst of `/settle` commands could exhaust memory.
- **Fix:** Add max size cap (e.g., evict oldest when exceeding 1000 entries).
- **Status:** OPEN

## Issue 92: Unbounded In-Memory Vote Storage (Telegram Bot)
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-telegram-bot.js`, line 39
- **Description:** `votes` object grows without bound with no cleanup mechanism.
- **Fix:** Add TTL-based cleanup for stale debate entries.
- **Status:** OPEN

## Issue 93: Hardcoded Fake Trending Data (Discord Bot)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-discord-bot.js`, lines 259-265
- **Description:** `/trending` command returns hardcoded fake vote counts presented as real data.
- **Fix:** Fetch real data from Supabase or label as demo.
- **Status:** OPEN

## Issue 94: Hardcoded Fake Trending Data (Telegram Bot)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-telegram-bot.js`, lines 228-234
- **Description:** Same — `/trending` returns hardcoded fake vote counts.
- **Fix:** Fetch real data or label as demo.
- **Status:** OPEN

## Issue 95: Hardcoded Static Trending Data (discord-interactions.js)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `discord-interactions.js`, lines 44-49
- **Description:** `TRENDING` array contains static debate topics that become stale.
- **Fix:** Fetch dynamically from Supabase.
- **Status:** OPEN

## Issue 96: Hardcoded Static Trending Data (telegram-webhook.js)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `telegram-webhook.js`, lines 18-23
- **Description:** Same stale trending data.
- **Fix:** Fetch from Supabase dynamically.
- **Status:** OPEN

## Issue 97: Typo in Config Property — `colosseumlUrl` (Extra l)
- **Severity:** HIGH
- **Category:** BUG
- **File:** `leg1-bluesky.js`, line 168; `setup-bluesky.js`, line 48
- **Description:** `config.bluesky.colosseumlUrl` has a typo (extra `l`). Both files have the same typo so they match, but the name is confusing and error-prone.
- **Fix:** Rename to `colosseumUrl` in both files.
- **Status:** OPEN

## Issue 98: No Input Sanitization on User-Supplied Topic (Discord Bot)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-discord-bot.js`, lines 178, 206
- **Description:** User-supplied `topic` and `take` strings embedded into Discord embeds without length limits or sanitization.
- **Fix:** Truncate to max 200 chars before embedding.
- **Status:** OPEN

## Issue 99: No Input Sanitization on User-Supplied Topic (Telegram Bot)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-telegram-bot.js`, line 73
- **Description:** User-supplied topic not length-limited before use.
- **Fix:** Truncate to max 300 chars.
- **Status:** OPEN

## Issue 100: Excessive Console.log Across All Bot Files
- **Severity:** LOW
- **Category:** QUALITY
- **File:** All 17 bot/integration files
- **Description:** All files contain numerous debug-level `console.log` and `console.error` statements in production.
- **Fix:** Use a proper log-level system across all bot files.
- **Status:** OPEN

## Issue 101: Duplicate LemmyClient Class Definition
- **Severity:** MEDIUM
- **Category:** DEAD-CODE
- **File:** `leg3-lemmy-poster.js`, lines 85-148; `leg2-lemmy-poster.js`, lines 35-110
- **Description:** `LemmyClient` is fully duplicated between both files. Header says "REUSE LEMMY CLIENT FROM LEG 2" but defines an entirely new copy.
- **Fix:** Extract to a shared `lemmy-client.js` module.
- **Status:** OPEN

## Issue 102: Telegram Webhook Has No Authentication (telegram-webhook.js)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `telegram-webhook.js`, lines 28-62
- **Description:** Webhook handler accepts any POST without verifying it came from Telegram. Anyone who discovers the URL can send fake updates.
- **Fix:** Set `secret_token` when registering the webhook and verify `X-Telegram-Bot-Api-Secret-Token` header.
- **Status:** OPEN

## Issue 103: Telegram Webhook Has No Authentication (telegram.js)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `telegram.js`, lines 217-242
- **Description:** Same — webhook handler accepts any POST without sender verification.
- **Fix:** Add secret token verification.
- **Status:** OPEN

## Issue 104: Telegram Webhook Has No Authentication (colosseum-telegram-bot.js)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-telegram-bot.js`, lines 295-305
- **Description:** Same — Express webhook route accepts any POST.
- **Fix:** Add secret token verification.
- **Status:** OPEN

## Issue 105: discord-setup.js Exposes Admin Actions Without Authentication
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `discord-setup.js`, lines 67-102
- **Description:** `action` query parameter controls sensitive operations (`clear`, `list`, `invite`). Any visitor can hit the URL to perform admin operations.
- **Fix:** Add auth check before executing admin actions.
- **Status:** OPEN

## Issue 106: telegram-setup.js Exposes Admin Actions Without Authentication
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `telegram-setup.js`, lines 27-42
- **Description:** `action=remove` lets any visitor deregister the Telegram webhook, taking the bot offline.
- **Fix:** Add auth check before processing admin actions.
- **Status:** OPEN

## Issue 107: Mixed Module Systems in telegram.js (ESM vs CommonJS)
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `telegram.js`, line 217
- **Description:** Uses `export default` (ESM) but other serverless files use `module.exports` (CommonJS). Will fail in standard Node.js without ESM config.
- **Fix:** Use `module.exports = handler` for consistency, or ensure Vercel config supports ESM.
- **Status:** OPEN

## Issue 108: Fabricated Disagreement Percentages in leg3-lemmy-poster.js
- **Severity:** MEDIUM
- **Category:** QUALITY
- **File:** `leg3-lemmy-poster.js`, line 47
- **Description:** When `autoDebate.winner_pct` is missing, generates a random fake percentage presented as real data.
- **Fix:** Only include statistics when real data is available.
- **Status:** OPEN

## Issue 109: Bluesky Config Block Missing from bot-config.js
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `bot-config.js`
- **Description:** No `bluesky` config block in the repo version, but `leg1-bluesky.js` and `leg2-bluesky-poster.js` reference `config.bluesky.*`. Will crash without `setup-bluesky.js` patch.
- **Fix:** Add the Bluesky config block directly to `bot-config.js`.
- **Status:** OPEN

## Issue 110: Bluesky Feature Flags Missing from bot-config.js
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `bot-config.js`, lines 117-130
- **Description:** `flags` object missing `leg1Bluesky`, `leg2Bluesky`, `leg3BlueskyPost` referenced by Bluesky leg files.
- **Fix:** Add Bluesky flags to the `flags` object.
- **Status:** OPEN

## Issue 111: Relative Import Path Inconsistency in Leg Files
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `leg1-bluesky.js`, line 9; `leg2-bluesky-poster.js`, line 9
- **Description:** Bluesky legs import `require('../bot-config')` (up one dir) while Lemmy legs import `require('./bot-config')` (same dir). Both at repo root.
- **Fix:** Standardize paths. Bluesky files are designed for `lib/` on VPS, but this means they can't run from repo root.
- **Status:** OPEN

## Issue 112: discord-register.js Only Registers `/settle`, Missing Other Commands
- **Severity:** LOW
- **Category:** BUG
- **File:** `discord-register.js`, lines 17-31
- **Description:** Registration script only registers `/settle`, but interaction handler handles `/settle`, `/debate`, `/trending`, `/help`. The `discord-setup.js` correctly registers all four.
- **Fix:** Add all commands or mark as deprecated in favor of `discord-setup.js`.
- **Status:** OPEN

## Issue 113: Duplicate Bot Implementations Per Platform
- **Severity:** MEDIUM
- **Category:** DEAD-CODE
- **File:** Multiple files
- **Description:** Three Discord bot implementations and three Telegram bot implementations, each implementing the same features differently. Creates maintenance burden and confusion.
- **Fix:** Consolidate to one implementation per platform. Archive or remove the others.
- **Status:** OPEN

## Issue 114: stripe-cors-patch.js Is Documentation, Not Executable Code
- **Severity:** LOW
- **Category:** DEAD-CODE
- **File:** `stripe-cors-patch.js`
- **Description:** Entirely a documentation/instruction file with unused code. Not imported or used anywhere.
- **Fix:** Move content to a markdown file or apply the patch and delete this file.
- **Status:** OPEN

## Issue 115: Missing Single-Quote Escape in escHtml (auto-debate page)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-auto-debate.html`, line 679
- **Description:** Local `escHtml()` only escapes 4 of 5 OWASP-mandated characters — omits single quote (`'`). Enables XSS in single-quoted attribute contexts.
- **Fix:** Add `.replace(/'/g, '&#x27;')` to match the 5-char mapping.
- **Status:** OPEN

## Issue 116: Duplicate Supabase Client Creation (auto-debate page)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-auto-debate.html`, lines 375-378
- **Description:** Page creates a second Supabase client instance despite loading `colosseum-config.js` and `colosseum-auth.js`. Wastes resources, can cause auth state desync.
- **Fix:** Use existing `ColosseumAuth.supabase` client.
- **Status:** OPEN

## Issue 117: Stripe Script Loaded Without SRI Hash
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `index.html`, line 12
- **Description:** `<script src="https://js.stripe.com/v3/">` loaded without `integrity` or `crossorigin` attributes. Supabase has SRI pinning but Stripe does not.
- **Fix:** Add SRI hash and `crossorigin="anonymous"`, or pin to a versioned URL.
- **Status:** OPEN

## Issue 118: Placeholder Strings in Public-Facing Terms of Service
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-terms.html`, lines 266, 297, 307, 353, 359, 386
- **Description:** Six placeholder strings visible to users: `PASTE_SUPPORT_EMAIL_HERE` (3x), `PASTE_JURISDICTION_HERE` (1x), `PASTE_PRIVACY_EMAIL_HERE` (1x). Legal documents look unfinished.
- **Fix:** Replace with actual values.
- **Status:** OPEN

## Issue 119: Hardcoded Personal Email in Legal-Snippets
- **Severity:** MEDIUM
- **Category:** PII
- **File:** `colosseum-legal-snippets.html`, lines 213-215
- **Description:** Personal email `wolfe8105@gmail.com` hardcoded in HTML comments. Exposes founder's personal email in public repo.
- **Fix:** Remove personal email from file or move to private document.
- **Status:** OPEN

## Issue 120: Inline onclick Handlers Throughout All Pages (CSP Blocker)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** Multiple HTML files (auto-debate, debate-landing, groups, terms, index)
- **Description:** Extensive use of inline `onclick` handlers prevents implementing strict CSP since `'unsafe-inline'` would be required.
- **Fix:** Migrate all inline handlers to `addEventListener()` calls.
- **Status:** OPEN

## Issue 121: No Content Security Policy on Any Page
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** All 11 HTML files
- **Description:** No `<meta http-equiv="Content-Security-Policy">` tag on any page. Privacy policy claims CSP exists but none is implemented. Without CSP, XSS attacks have no browser-level mitigation.
- **Fix:** Add CSP via Vercel response headers (`vercel.json`) or meta tags.
- **Status:** OPEN

## Issue 122: Debate Landing Page Votes Never Sent to Server
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-debate-landing.html`, line 503
- **Description:** Votes stored only in `localStorage`, never sent to server. No Supabase integration. All vote counts are hardcoded demo data. Comment says "PLACEHOLDER" — never implemented.
- **Fix:** Integrate Supabase to persist votes server-side, or mark as demo/placeholder.
- **Status:** OPEN

## Issue 123: Open Redirect — Login Page Missing Backslash Validation
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-login.html`, lines 509-513
- **Description:** Login page's `getReturnTo()` blocks `//` but NOT `\`. On Chrome/Firefox, `/\evil.com` normalizes to `//evil.com` — a protocol-relative redirect. The plinko page has the fix but login page does not.
- **Fix:** Add `&& !dest.includes('\\')` to the login page's `getReturnTo()` condition.
- **Status:** OPEN

## Issue 124: Legal-Snippets File Is Not a Functional Page (Dead Code)
- **Severity:** LOW
- **Category:** DEAD-CODE
- **File:** `colosseum-legal-snippets.html`
- **Description:** Instruction/paste guide document, not a renderable page. No `<!DOCTYPE html>`, no `<body>`, not linked from anywhere. Exposes internal implementation details.
- **Fix:** Move to private document or delete since snippets have been applied.
- **Status:** OPEN

## Issue 125: Privacy Policy Self-Links in Footer
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-privacy.html`, line 346
- **Description:** Privacy policy page links to itself in footer. Clicking reloads the same page.
- **Fix:** Conditionally style or disable the self-referencing link.
- **Status:** OPEN

## Issue 126: Terms Page Contains Duplicate Older Privacy Policy
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-terms.html`, lines 312-388
- **Description:** Embedded "Privacy Policy" tab (Feb 26) differs from standalone `colosseum-privacy.html` (March 5). Users may see conflicting policies.
- **Fix:** Remove embedded version and link to standalone page, or update to match.
- **Status:** OPEN

## Issue 127: Groups Page Does Not Validate URL Group ID as UUID
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-groups.html`, lines 910-912
- **Description:** `group` URL parameter passed directly to `openGroup()` → RPC without UUID format validation.
- **Fix:** Add UUID validation before calling `openGroup()`.
- **Status:** OPEN

## Issue 128: `renderEmpty()` in Groups Does Not Escape Parameters
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-groups.html`, lines 679-685
- **Description:** `icon`, `title`, `sub` injected into innerHTML without escaping. Currently only called with hardcoded strings, but any future call with user data = XSS.
- **Fix:** Apply `escapeHTML()` to all parameters.
- **Status:** OPEN

## Issue 129: Google Fonts Loaded via @import (Render-Blocking)
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-groups.html`, `colosseum-login.html`, `colosseum-plinko.html`, `colosseum-profile-depth.html`, `colosseum-settings.html`, `colosseum-terms.html`
- **Description:** Six pages use `@import url(...)` inside `<style>` blocks — render-blocking. Other pages correctly use `<link>` tags.
- **Fix:** Replace `@import` with `<link>` tags in `<head>`.
- **Status:** OPEN

## Issue 130: `javascript:history.back()` Used in href Attribute
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-terms.html`, line 204
- **Description:** `<a href="javascript:history.back()">` uses a `javascript:` URI — CSP violation pattern.
- **Fix:** Use a button with `addEventListener`.
- **Status:** OPEN

## Issue 131: Console Statements in Profile-Depth and Settings Inline Scripts
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-profile-depth.html`, lines 796, 798, 801; `colosseum-settings.html`, line 632
- **Description:** `console.error()` and `console.log()` in production inline scripts.
- **Fix:** Remove or gate behind debug flag.
- **Status:** OPEN

## Issue 132: `window.open` Without noopener/noreferrer (auto-debate)
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-auto-debate.html`, line 654
- **Description:** `window.open()` for Twitter share without `noopener,noreferrer` in window features. Debate-landing page correctly has it.
- **Fix:** Add `'noopener,noreferrer'` as third argument.
- **Status:** OPEN

## Issue 133: `window.event` Used in Share Handler (Deprecated, Non-Standard)
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-auto-debate.html`, line 646
- **Description:** `window.event` is a non-standard IE-era pattern. Not guaranteed in Firefox.
- **Fix:** Pass `event` explicitly from onclick handler or use `addEventListener`.
- **Status:** OPEN

## Issue 134: `user-scalable=no` Prevents Accessibility Zoom
- **Severity:** LOW
- **Category:** QUALITY
- **File:** All 11 HTML files
- **Description:** All pages include `user-scalable=no` in viewport meta. Prevents users with visual impairments from zooming. Violates WCAG 2.1 SC 1.4.4.
- **Fix:** Remove `user-scalable=no` and `maximum-scale=1.0`, at minimum from non-app pages.
- **Status:** OPEN

## Issue 135: Hardcoded Supabase Anon Key in api/profile.js
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `api/profile.js`, line 19
- **Description:** Supabase anon key hardcoded as fallback. Cannot be rotated without code change.
- **Fix:** Remove fallback. Require env vars; fail fast if missing.
- **Status:** OPEN

## Issue 136: Supabase Project Ref in Edge Function Deploy Comments
- **Severity:** LOW
- **Category:** PII
- **File:** `supabase/functions/ai-moderator/index.ts`, line 10
- **Description:** Deploy command comment contains Supabase project ref `faomczmipsccwbhpivmp`. Infrastructure detail in public repo.
- **Fix:** Replace with placeholder in comment.
- **Status:** OPEN

## Issue 137: CORS Fallback to First Allowed Origin (Edge Functions)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `supabase/functions/ai-moderator/index.ts`, line 21; `supabase/functions/ai-sparring/index.ts`, line 26
- **Description:** Unknown origins get a valid CORS header for the first allowed origin, weakening the allowlist.
- **Fix:** Do not include `Access-Control-Allow-Origin` for unknown origins.
- **Status:** OPEN

## Issue 138: No Authentication on Edge Functions (AI Moderator/Sparring)
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `supabase/functions/ai-moderator/index.ts`, line 37; `supabase/functions/ai-sparring/index.ts`, line 74
- **Description:** Neither Edge Function verifies JWT or API key. Any client can consume Groq API credits.
- **Fix:** Verify `Authorization` header contains valid Supabase JWT. Add rate limiting.
- **Status:** OPEN

## Issue 139: No Input Length Validation on AI Moderator
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `supabase/functions/ai-moderator/index.ts`, line 37
- **Description:** Input fields passed directly into Groq prompt without length limits. Megabytes of text could consume tokens.
- **Fix:** Add maximum length validation for each input field.
- **Status:** OPEN

## Issue 140: No Input Length Validation on AI Sparring
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `supabase/functions/ai-sparring/index.ts`, lines 74-75
- **Description:** `topic`, `userArg`, `messageHistory` have no size limits. Large arrays could exhaust Groq tokens.
- **Fix:** Cap `messageHistory` array length and individual message sizes.
- **Status:** OPEN

## Issue 141: CSP Allows unsafe-inline and unsafe-eval for Scripts
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `vercel.json`, line 27
- **Description:** CSP includes `'unsafe-inline' 'unsafe-eval'` in `script-src`. Significantly weakens XSS protection.
- **Fix:** Replace `unsafe-inline` with nonces or hashes. Remove `unsafe-eval` unless required by a specific dependency.
- **Status:** OPEN

## Issue 142: SECURITY DEFINER Functions Without `SET search_path` (50+ functions)
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** Multiple SQL files (all SECURITY DEFINER functions except `handle_new_user`)
- **Description:** Nearly all SECURITY DEFINER functions lack `SET search_path = public`. A malicious user who can create objects in a schema earlier in `search_path` could hijack function calls via schema poisoning. Affects 50+ functions across all SQL migrations.
- **Fix:** Add `SET search_path = public` to every SECURITY DEFINER function.
- **Status:** OPEN

## Issue 143: `finalize_debate` References Non-Existent Column `winner_id`
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-ring3-functions.sql`, line 363; `colosseum-wire-log-event.sql`, line 356
- **Description:** `debates` table has `winner` column but `finalize_debate` writes to `winner_id`. Column does not exist.
- **Fix:** Change `winner_id` to `winner` in the UPDATE statement.
- **Status:** OPEN

## Issue 144: `finalize_debate` Prediction Resolution References Non-Existent Columns
- **Severity:** HIGH
- **Category:** BUG
- **File:** `colosseum-ring3-functions.sql`, lines 417-426; `colosseum-wire-log-event.sql`, lines 413-424
- **Description:** Predictions table has `correct` and `tokens_wagered` columns, but `finalize_debate` writes to `result` and `amount` (non-existent).
- **Fix:** Use `correct` instead of `result`, and `tokens_wagered` instead of `amount`.
- **Status:** OPEN

## Issue 145: `place_prediction` Column Name Mismatch Across Migrations
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-ring3-functions.sql`, lines 509-512 vs `colosseum-wire-log-event.sql`, lines 265-268
- **Description:** Different versions reference `amount` vs `tokens_wagered`. Also references non-existent `reference_id` column.
- **Fix:** Ensure all versions use `tokens_wagered` consistently.
- **Status:** OPEN

## Issue 146: `debates` Table Missing `updated_at` Column
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-schema-production.sql`, lines 237-264
- **Description:** No `updated_at` column in `debates` table, but multiple functions (`join_debate`, `start_debate`, `advance_round`, `finalize_debate`, etc.) attempt `SET updated_at = now()`. Will fail at runtime.
- **Fix:** Add `updated_at TIMESTAMPTZ DEFAULT now()` to the `debates` table.
- **Status:** OPEN

## Issue 147: `create_hot_take` Regression — Wire-Log-Event Strips Sanitization/Rate Limiting
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-wire-log-event.sql`, lines 24-74
- **Description:** The latest migration's `create_hot_take` does NOT call `sanitize_text()` or `check_rate_limit()`. Since `CREATE OR REPLACE` means last-applied wins, this overwrites the hardened Move 3 version.
- **Fix:** Add `sanitize_text(p_content)` and `check_rate_limit()` calls to the wire-log-event version.
- **Status:** OPEN

## Issue 148: `follow_user` Regression — Wire-Log-Event Strips Rate Limiting
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-wire-log-event.sql`, lines 147-182
- **Description:** Wire-log-event version lacks `check_rate_limit()` and `deleted_at IS NULL` check. Overwrites hardened version.
- **Fix:** Add rate limiting and deleted user check.
- **Status:** OPEN

## Issue 149: `place_prediction` Regression — Wire-Log-Event Strips Rate Limiting
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-wire-log-event.sql`, lines 219-289
- **Description:** Wire-log-event version lacks `check_rate_limit()`. Move 3 had 20 predictions/hour limit.
- **Fix:** Add `check_rate_limit(v_user_id, 'prediction', 60, 20)`.
- **Status:** OPEN

## Issue 150: `declare_rival` Missing Rate Limiting and Input Sanitization
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-wire-log-event-rivals.sql`, lines 10-60
- **Description:** `p_message TEXT` accepted without `sanitize_text()` and no rate limiting. Users can spam rival declarations.
- **Fix:** Apply `sanitize_text()` and add `check_rate_limit()`.
- **Status:** OPEN

## Issue 151: `update_arena_debate` Allows Either Participant to Set Winner and Scores
- **Severity:** HIGH
- **Category:** SECURITY
- **File:** `colosseum-arena-schema.sql`, lines 277-307
- **Description:** Either debater can call this function to declare themselves the winner with any score. No server-side validation of who should determine the winner.
- **Fix:** Restrict to service_role only, or remove ability to set `winner`/scores from this function.
- **Status:** OPEN

## Issue 152: `finalize_async_debate` Has No Authorization Check
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-ring3-move2.sql`, lines 284-324
- **Description:** Declares `v_user_id` but never uses it. Any authenticated user can finalize any async debate.
- **Fix:** Add check that `v_user_id` is either challenger or defender.
- **Status:** OPEN

## Issue 153: `sanitize_text` Causes Double-Encoding with Client-Side escapeHTML
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-move3-sanitize-ratelimit.sql`, lines 59-62
- **Description:** DB function entity-encodes `& < >`, and client-side `escapeHTML()` encodes again. Result: `&amp;amp;` on display.
- **Fix:** Pick one encoding layer — either DB strips tags only (no entity encoding) or client-only (entity encoding).
- **Status:** OPEN

## Issue 154: `create_voice_take` Missing sanitize_url on Voice Memo URL
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-ring3-move2.sql`, lines 1000-1042
- **Description:** `p_voice_memo_url` not sanitized. A `javascript:` URL could be stored and rendered as audio source.
- **Fix:** Apply `sanitize_url(p_voice_memo_url)` before inserting.
- **Status:** OPEN

## Issue 155: `event_log` RLS Uses Unreliable current_setting('role') Check
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-analytics-migration.sql`, line 52
- **Description:** RLS policy checks `current_setting('role')` which may not behave as expected with PostgREST.
- **Fix:** Use `CREATE POLICY ... TO service_role, postgres` pattern instead.
- **Status:** OPEN

## Issue 156: Analytics Views Expose User PII Without Access Control
- **Severity:** MEDIUM
- **Category:** PII
- **File:** `colosseum-analytics-migration.sql`, lines 215-243, 254-295, 386-420
- **Description:** Views expose `user_id` and `username` with behavioral profiling data. Queryable by authenticated users.
- **Fix:** Restrict views to `service_role` only or anonymize data.
- **Status:** OPEN

## Issue 157: Missing RLS Hardening for Later Tables
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-rls-hardened.sql`
- **Description:** RLS hardening covers original 18 tables but not tables added later: `debate_queue`, `debate_messages`, `arena_debates`, `arena_votes`, `debate_references`, `moderator_scores`, `bot_activity`, `event_log`, `daily_snapshots`, `stripe_processed_events`, `rate_limits`.
- **Fix:** Add hardened RLS policies for all post-schema tables.
- **Status:** OPEN

## Issue 158: `moderator_scores` INSERT Policy Allows Non-Participant Scoring
- **Severity:** MEDIUM
- **Category:** SECURITY
- **File:** `colosseum-references-migration.sql`, lines 151-152
- **Description:** INSERT policy only checks `scorer_id = auth.uid()` but not participation. Direct inserts bypass the `score_moderator` RPC's participation check.
- **Fix:** Change INSERT policy to `WITH CHECK (false)` to force writes through the SECURITY DEFINER function.
- **Status:** OPEN

## Issue 159: `guard_profile_columns` Function Name Mismatch Between Migrations
- **Severity:** MEDIUM
- **Category:** BUG
- **File:** `colosseum-references-migration.sql`, lines 42-72 vs `colosseum-rls-hardened.sql`, lines 276-316
- **Description:** Two guard functions: `guard_profile_columns()` and `guard_profile_update()`. Trigger references one but function has different name. Also, `guard_profile_columns()` uses `current_setting('role')` without `missing_ok=true`.
- **Fix:** Consolidate to single function name. Use `current_setting('role', true)` consistently.
- **Status:** OPEN

## Issue 160: `auto_allow_expired_references` Return Type Mismatch Between Migrations
- **Severity:** LOW
- **Category:** BUG
- **File:** `colosseum-references-migration.sql` (returns INTEGER) vs `colosseum-wire-log-event.sql` (returns JSON)
- **Description:** `CREATE OR REPLACE` cannot change return type without dropping first. Wire-log-event version will fail to deploy if original was applied first.
- **Fix:** Add `DROP FUNCTION IF EXISTS` before `CREATE OR REPLACE` in wire-log-event migration.
- **Status:** OPEN

## Issue 161: No DELETE Policies on `hot_takes` After RLS Hardening
- **Severity:** LOW
- **Category:** SECURITY
- **File:** `colosseum-rls-hardened.sql`, lines 246-249
- **Description:** Original DELETE policy dropped during hardening. No SECURITY DEFINER function for deleting hot takes. Users can no longer delete own takes.
- **Fix:** Add `delete_hot_take()` SECURITY DEFINER function or restore DELETE policy.
- **Status:** OPEN

## Issue 162: `package.json` References Non-Existent Main File
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `package.json`, line 6
- **Description:** `main` field references `colosseum-telegram-bot.js` but this is a bot file (VPS only). Confusing for the main project.
- **Fix:** Clarify purpose or remove.
- **Status:** OPEN

## Issue 163: Hardcoded VPS Paths in setup-bluesky.js
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `setup-bluesky.js`, lines 11-13
- **Description:** `BOT_DIR`, `LIB_DIR`, `REPO_DIR` hardcoded to `/opt/colosseum/...`. If VPS layout changes, script breaks.
- **Fix:** Make paths configurable via env vars.
- **Status:** OPEN

## Issue 164: Hardcoded Placeholder BOT_USERNAME in telegram-webhook.js
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `telegram-webhook.js`, line 188
- **Description:** Falls back to `'PASTE_BOT_USERNAME_HERE'` which users would see in the help message.
- **Fix:** Use a friendlier fallback like `'ColosseumBot'`.
- **Status:** OPEN

## Issue 165: `get_arena_feed` Has Unbounded N+1 Subqueries
- **Severity:** LOW
- **Category:** QUALITY
- **File:** `colosseum-arena-schema.sql`, lines 362-363
- **Description:** `SELECT count(*)` subqueries for each row. N+1 pattern that degrades with scale.
- **Fix:** Use JOIN or lateral join instead of correlated subqueries.
- **Status:** OPEN

---

# Summary

## By Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 27 |
| MEDIUM | 72 |
| LOW | 63 |
| **TOTAL** | **165** |

## By Category

| Category | Count |
|----------|-------|
| SECURITY | 80 |
| BUG | 40 |
| QUALITY | 30 |
| PII | 8 |
| DEAD-CODE | 7 |
| **TOTAL** | **165** |

## Critical Issues (Fix Immediately)

1. **Issue 87:** Hardcoded Discord Public Key without env var fallback
2. **Issue 88:** Hardcoded Telegram Bot Token without env var fallback
3. **Issue 89:** Hardcoded Discord credentials without env var fallback

## High-Priority Issues (Fix This Sprint)

- Issues 6, 7: Missing UUID validation on auth module parameters
- Issue 9: `requireAuth` returns true for placeholder users (auth bypass)
- Issue 13: CORS bypass for requests without Origin header
- Issue 26: XSS via unvalidated user_id in onclick attributes
- Issues 27, 29, 30: XSS via unvalidated IDs in onclick/challenge/prediction
- Issue 37: `_submitChallenge` exposed publicly — bypasses auth + token gate
- Issue 43: No destroy() for arena polling intervals
- Issues 49, 53, 54, 56: Payment-critical bugs (unauth checkout, idempotency, float tokens, direct mutations)
- Issues 72, 73: XSS via unescaped voiceUrl/replyTo
- Issue 90: SUPABASE_URL not validated in bot config
- Issues 97, 102-106: Bot auth issues (webhook auth, admin endpoint auth, typo)
- Issue 115: Missing single-quote escape in escHtml
- Issue 118: Placeholder strings in public Terms of Service
- Issue 121: No CSP on any page
- Issue 135: Hardcoded Supabase key in api/profile.js
- Issue 142: 50+ SECURITY DEFINER functions without SET search_path
- Issues 143, 144: finalize_debate references non-existent columns
- Issue 147: create_hot_take regression strips sanitization/rate limiting
- Issue 151: update_arena_debate allows self-declared winner
