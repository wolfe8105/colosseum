# THE COLOSSEUM — Deployment Guide

All steps are copy-paste. No coding required.

---

## YOUR FILES (23 total)

### Deploy to Vercel (web files):
```
colosseum/
├── index.html                        ← main app shell
├── colosseum-config.js                ← ALL credentials go here (8 PASTE spots)
├── colosseum-auth.js                  ← Supabase auth module
├── colosseum-payments.js              ← Stripe checkout client
├── colosseum-notifications.js         ← notification center
├── colosseum-paywall.js               ← paywall modals
├── colosseum-async.js                 ← hot takes feed
├── colosseum-share.js                 ← share/invite/viral loop
├── colosseum-leaderboard.js           ← leaderboard UI
├── colosseum-scoring.js               ← server-side scoring client
├── colosseum-webrtc.js                ← live audio debates
├── colosseum-voicememo.js             ← async voice debates
├── colosseum-home.js                  ← home screen sections/banners
├── colosseum-arena.js                 ← live debate experience
├── colosseum-login.html               ← login/signup page
├── colosseum-settings.html            ← settings page
├── colosseum-profile-depth.html       ← 12-section profile questionnaire
├── colosseum-terms.html               ← terms of service
└── vercel.json                       ← Vercel routing/headers
```

### Paste into Supabase SQL Editor (run in order):
```
1. colosseum-schema-production.sql     ← 18 tables, RLS, triggers, seed data
2. colosseum-ring3-functions.sql       ← Elo, voting, predictions, tokens
3. colosseum-migration-voicememo.sql   ← voice memo columns + storage bucket
```

### Deploy to Supabase Edge Functions:
```
colosseum-stripe-functions.js          ← checkout + webhook (copy into Edge Functions)
```

---

## STEP 1: Create Supabase Project (2 min)

1. Go to https://supabase.com → Sign up / Log in
2. Click "New Project"
3. Name: `colosseum`
4. Set a database password (save it somewhere)
5. Region: pick closest to you
6. Click "Create new project" — wait ~2 min

### Get your credentials:
1. Go to **Settings → API**
2. Copy **Project URL** → paste into `colosseum-config.js` line 13 replacing `PASTE_YOUR_SUPABASE_URL_HERE`
3. Copy **anon/public key** → paste into `colosseum-config.js` line 14 replacing `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`

### Run the schema (3 steps, in order):
1. Go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Paste the ENTIRE contents of `colosseum-schema-production.sql` → Click **Run**
4. New query → Paste ENTIRE contents of `colosseum-ring3-functions.sql` → Click **Run**
5. New query → Paste ENTIRE contents of `colosseum-migration-voicememo.sql` → Click **Run**

### Create storage bucket:
1. Go to **Storage** (left sidebar)
2. Click "New Bucket"
3. Name: `debate-audio`
4. Toggle **Public** ON
5. Click "Create bucket"

---

## STEP 2: Enable Auth Providers (2 min)

1. In Supabase → **Authentication → Providers**
2. **Email**: already enabled by default ✅
3. **Google** (optional for now):
   - Toggle on
   - You'll need a Google Cloud OAuth client ID later
   - Skip for now, flip feature flag when ready
4. **Apple** (optional for now):
   - Same — skip for now

---

## STEP 3: Create Stripe Account (5 min)

1. Go to https://dashboard.stripe.com → Sign up
2. Stay in **Test Mode** (toggle in top right)
3. Go to **Developers → API keys**
4. Copy **Publishable key** (pk_test_...) → paste into `colosseum-config.js` line 19 replacing `PASTE_YOUR_STRIPE_PUBLISHABLE_KEY_HERE`
5. ⚠️ DO NOT put Secret key in any client file

### Create Products:
1. Go to **Products → Add product**
2. Create these 7 products:

| Product | Price | Type |
|---------|-------|------|
| Contender | $9.99/mo | Recurring |
| Champion | $19.99/mo | Recurring |
| Creator | $29.99/mo | Recurring |
| 50 Tokens | $0.99 | One-time |
| 250 Tokens | $3.99 | One-time |
| 600 Tokens | $7.99 | One-time |
| 1800 Tokens | $19.99 | One-time |

3. After creating each, copy the **Price ID** (price_...)
4. Paste each into `colosseum-config.js` lines 24-30 replacing the `PASTE_STRIPE_PRICE_ID_*` values

### Also update Stripe functions:
5. Open `colosseum-stripe-functions.js`
6. In FUNCTION 2 (webhook), find `mapPriceToTier` near the bottom
7. Replace the 3 `PASTE_STRIPE_PRICE_ID_*` values with your actual price IDs

---

## STEP 4: Deploy to Vercel (3 min)

### Option A: GitHub (recommended)
1. Push your 19 web files to a GitHub repo
2. Go to https://vercel.com → Sign up with GitHub
3. Import the repo → Deploy

### Option B: CLI
1. Install: `npm i -g vercel`
2. In your project folder: `vercel`
3. Follow prompts (defaults are fine)

### After deploy:
1. Copy your Vercel URL (e.g. `colosseum-abc123.vercel.app`)
2. Paste into `colosseum-config.js` line 59 replacing `PASTE_YOUR_DEPLOYED_URL_HERE`
3. Also update the two `PASTE_YOUR_DEPLOYED_URL_HERE` values in `colosseum-stripe-functions.js` (FUNCTION 1, the success/cancel URLs)
4. Re-deploy: `vercel --prod`

---

## STEP 5: Deploy Stripe Edge Functions (5 min)

1. Install Supabase CLI: `npm i -g supabase`
2. Link your project: `supabase link --project-ref YOUR-PROJECT-ID`
3. Create functions:
   ```
   supabase functions new create-checkout-session
   supabase functions new stripe-webhook
   ```
4. Open `colosseum-stripe-functions.js`:
   - Copy FUNCTION 1 code → paste into `supabase/functions/create-checkout-session/index.ts`
   - Copy FUNCTION 2 code → paste into `supabase/functions/stripe-webhook/index.ts`
   - **Remove the comment wrappers** (`/* ... */`) when pasting
5. Set secrets:
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR-KEY-HERE
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR-SECRET
   ```
6. Deploy:
   ```
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook
   ```
7. Copy the Edge Function URL → paste into `colosseum-config.js` line 34 replacing `PASTE_YOUR_STRIPE_FUNCTION_URL_HERE`

### Set up Stripe webhooks:
1. In Stripe Dashboard → **Developers → Webhooks**
2. Add endpoint:
   - URL: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy the **Signing secret** (whsec_...)
4. Run: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR-SECRET`

---

## STEP 6: Add CORS Domain

1. In Supabase → **Settings → API**
2. Under "Additional allowed origins", add your Vercel URL

---

## STEP 7: Send Link to 10 People

That's it. Item 14.11.3.11.

---

## QUICK REFERENCE: All PASTE Spots

| File | Line | Value |
|------|------|-------|
| colosseum-config.js | 13 | Supabase URL |
| colosseum-config.js | 14 | Supabase anon key |
| colosseum-config.js | 19 | Stripe publishable key |
| colosseum-config.js | 24 | Stripe price: Contender monthly |
| colosseum-config.js | 25 | Stripe price: Champion monthly |
| colosseum-config.js | 26 | Stripe price: Creator monthly |
| colosseum-config.js | 27 | Stripe price: 50 tokens |
| colosseum-config.js | 28 | Stripe price: 250 tokens |
| colosseum-config.js | 29 | Stripe price: 600 tokens |
| colosseum-config.js | 30 | Stripe price: 1800 tokens |
| colosseum-config.js | 34 | Stripe Edge Function URL |
| colosseum-config.js | 52 | Deepgram API key (optional) |
| colosseum-config.js | 59 | Your deployed URL |
| colosseum-stripe-functions.js | FUNC 1 | success/cancel URLs (2 spots) |
| colosseum-stripe-functions.js | FUNC 2 | Price ID → tier mapping (3 spots) |

---

## TROUBLESHOOTING

**"Placeholder mode" in console**: Credentials not pasted yet. App still works — just with demo data.

**Login not working**: Check Supabase → Authentication → Users to see if signups appear.

**Payments not processing**: Make sure Stripe is in Test Mode. Use card `4242 4242 4242 4242`, any future expiry, any CVC.

**CORS errors**: Add your Vercel domain in Supabase → Settings → API → allowed origins.

**Voice memos not uploading**: Make sure you created the `debate-audio` storage bucket in Step 1.
