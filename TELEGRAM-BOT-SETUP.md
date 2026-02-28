# TELEGRAM BOT SETUP — The Colosseum
### Bible ref: 16.6.1 | Session 15

---

## FILES TO PUSH TO GITHUB

```
api/telegram-webhook.js    ← NEW (Vercel serverless function)
api/telegram-setup.js      ← NEW (one-time webhook registration)
colosseum-debate-landing.html  ← UPDATED (custom topic support for Telegram links)
```

Vercel auto-routes `/api/*` to serverless functions. No vercel.json changes needed.

---

## HUMAN STEPS (5 minutes)

### Step 1: Create the bot
1. Open Telegram → search for `@BotFather` → start chat
2. Send: `/newbot`
3. Name it: `The Colosseum` (display name)
4. Username: something like `ColosseumDebateBot` (must end in `bot`)
5. BotFather gives you a **token** like: `7123456789:AAHxyz...` — copy it
6. Copy the **username** too (without the @)

### Step 2: Enable inline mode
1. Still in BotFather chat, send: `/setinline`
2. Pick your bot
3. Set placeholder text: `Type a debate topic...`

### Step 3: Add environment variables to Vercel
1. Go to: https://vercel.com → your Colosseum project → Settings → Environment Variables
2. Add these two:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | `PASTE_TOKEN_FROM_BOTFATHER_HERE` |
| `TELEGRAM_BOT_USERNAME` | `PASTE_USERNAME_HERE` (no @) |

3. Click Save
4. Go to Deployments → click ⋯ on latest → **Redeploy**

### Step 4: Push files to GitHub
```
Push these to your repo:
  api/telegram-webhook.js
  api/telegram-setup.js
  colosseum-debate-landing.html  (replaces existing)
```
Vercel auto-deploys on push.

### Step 5: Register the webhook
After Vercel finishes deploying, visit this URL in your browser:
```
https://colosseum-six.vercel.app/api/telegram-setup
```
You should see: `{ "ok": true, "result": true, "description": "Webhook was set" }`

### Step 6: Test
1. Open Telegram → find your bot → send `/start`
2. Send `/debate Is Mahomes better than Josh Allen?`
3. You should see: branded message + native poll + Colosseum link
4. Add bot to a group chat → type `/debate [any topic]`
5. Try inline mode: in any chat, type `@YourBotUsername Is LeBron the GOAT?`

---

## WHAT THE BOT DOES

| Command | What happens |
|---------|-------------|
| `/debate [topic]` | Creates poll + Colosseum link in chat |
| `/settle [topic]` | Same as /debate (alias) |
| `/trending` | Shows 4 hot debates with links |
| `/start` | Welcome message |
| `/help` | Usage guide |
| `@BotName [topic]` | Inline mode — share debate in ANY chat without adding bot |

---

## WHAT WAS PATCHED

**colosseum-debate-landing.html** — added custom topic support (lines 268-287):
- When someone clicks a Telegram link with `?topic=custom-slug&title=URL+encoded+topic`, the landing page now creates a debate card on the fly instead of defaulting to Mahomes vs Allen
- Detects `src=telegram` param and shows "This debate was started from Telegram" as the first hot take
- Supports `cat=sports|politics|entertainment|music` for category tagging

---

## TROUBLESHOOTING

**Bot doesn't respond:**
- Check env var is set: visit `/api/telegram-setup?action=info`
- If webhook URL is empty, visit `/api/telegram-setup` again

**"TELEGRAM_BOT_TOKEN not set" error:**
- Redeploy after adding env vars (Vercel caches old builds)

**Inline mode doesn't work:**
- Must enable via BotFather: `/setinline` → pick bot → set placeholder

**Remove webhook:**
- Visit: `/api/telegram-setup?action=remove`

---

## FILE COUNT
Repo goes from 28 → 30 files (+ api/telegram-webhook.js, api/telegram-setup.js).
Landing page is updated in place.
