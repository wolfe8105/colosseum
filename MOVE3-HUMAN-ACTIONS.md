# MOVE 3 — Human Action Checklist
## Rate Limiting + CORS + Input Sanitization

5 steps. Copy-paste only. No coding.

---

### STEP 1: Paste SQL into Supabase
**Where:** Supabase Dashboard → SQL Editor
**File:** `colosseum-move3-sanitize-ratelimit.sql`
**Action:** Paste entire file → Click Run
**What it does:** Adds `sanitize_text()`, `sanitize_url()`, rate limit table + checker, and patches all Move 2 functions to use them.

---

### STEP 2: Replace vercel.json in your repo
**Where:** GitHub repo root → `vercel.json`
**File:** `vercel.json` (the new one from this session)
**Action:** Open vercel.json in GitHub → Edit → Select All → Paste new content → Commit
**What it does:** Adds Content-Security-Policy, HSTS, and 7 other security headers. Locks down what scripts/styles/connections the browser allows.

---

### STEP 3: Add middleware.js to your repo
**Where:** GitHub repo root (same level as index.html and vercel.json)
**File:** `middleware.js`
**Action:** In GitHub, click Add File → Create New File → name it `middleware.js` → Paste content → Commit
**What it does:** Rate limits all /api/* routes to 30 requests/minute per IP. Blocks requests from non-Colosseum origins. Blocks oversized payloads.

---

### STEP 4: Lock down Supabase CORS
**Where:** Supabase Dashboard → Project Settings → API → Scroll to "API Settings"
**Action:** Under "Additional CORS allowed origins", add:
```
https://colosseum-six.vercel.app
```
(And your custom domain later when you get one)

**IMPORTANT:** Make sure ONLY your domain is listed. If there's a wildcard `*` anywhere, remove it. This prevents other websites from calling your Supabase API.

---

### STEP 5: Patch Stripe Edge Function CORS
**Where:** Your Supabase Edge Function source code for `create-checkout-session`
**File:** `stripe-cors-patch.js` (reference — shows what to find and replace)
**Action:** 

In your `create-checkout-session/index.ts`, find:
```
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ...
};
```

Replace the `"*"` with:
```
const ALLOWED_ORIGINS = [
  "https://colosseum-six.vercel.app",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
```

Then replace every `corsHeaders` usage with `getCorsHeaders(req)`.

Redeploy via Supabase CLI:
```
supabase functions deploy create-checkout-session
```

---

## WHAT YOU NOW HAVE AFTER ALL 3 MOVES

| Layer | Protection | Move |
|-------|-----------|------|
| Database (RLS) | Users can't read/write what they shouldn't | Move 1 |
| Database (Functions) | All writes go through validated server functions | Move 2 |
| Database (Sanitization) | XSS stripped from every text input before storage | Move 3 |
| Database (Rate Limits) | Per-user action limits on sensitive operations | Move 3 |
| Edge (Middleware) | Per-IP rate limiting on all API routes | Move 3 |
| Edge (CORS) | Only your domain can call API routes | Move 3 |
| Edge (Stripe CORS) | Only your domain can create checkout sessions | Move 3 |
| Browser (CSP) | Browser blocks unauthorized scripts/connections | Move 3 |
| Browser (Headers) | HSTS, X-Frame-Options, nosniff, etc. | Move 3 |
| Browser (Supabase CORS) | Supabase rejects requests from other origins | Move 3 |

---

## RATE LIMITS SUMMARY

| Operation | Limit | Where |
|-----------|-------|-------|
| All API routes | 30/min per IP | Vercel middleware |
| Hot takes | 10/hour per user | DB function |
| Debate creation | 5/hour per user | DB function |
| Voting | 60/hour per user | DB function |
| Predictions | 20/hour per user | DB function |
| Profile updates | 20/hour per user | DB function |
| Follow/unfollow | 50/hour per user | DB function |
| Reports | 5/hour per user | DB function |
| Login attempts | 5 per 60s (existing) | Client-side |
| Daily tokens | 1/day per user | DB function |
| Token earning | Capped per reason per day | DB function |
