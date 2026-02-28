# SETUP-BOTS.md — Telegram + Discord Bot Setup

Both bots are Vercel serverless functions. They deploy automatically when you push to GitHub. You just need to create the bot accounts and paste the credentials.

---

## TELEGRAM BOT (15 minutes)

### Step 1: Create the bot (5 min)
1. Open Telegram, search for `@BotFather`
2. Send: `/newbot`
3. Name it: `The Colosseum`
4. Username it: `TheColosseumBot` (or `ColosseumDebateBot` if taken)
5. BotFather gives you a token like: `7123456789:AAH...long-string...`
6. **Copy that token**

### Step 2: Paste the token (1 min)
1. Open `api/telegram.js`
2. Line 11 — find:
   ```
   const TELEGRAM_BOT_TOKEN = 'PASTE_TELEGRAM_BOT_TOKEN_HERE';
   ```
3. Replace `PASTE_TELEGRAM_BOT_TOKEN_HERE` with your token

### Step 3: Push to GitHub (2 min)
```bash
git add api/telegram.js
git commit -m "Add Telegram bot token"
git push
```
Vercel auto-deploys. Wait 60 seconds.

### Step 4: Set the webhook (2 min)
Open this URL in your browser (replace YOUR_TOKEN with the real token):
```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://colosseum-six.vercel.app/api/telegram
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

### Step 5: Configure bot commands (2 min)
1. Go back to @BotFather
2. Send: `/setcommands`
3. Select your bot
4. Send this exact text:
```
debate - Start a debate on any topic
help - Show available commands
```

### Step 6: Test it
1. Open your bot in Telegram
2. Send: `/debate Is a hot dog a sandwich?`
3. You should see the vote buttons and Colosseum link

### Step 7: Make it work in groups
1. Go to @BotFather
2. Send: `/setjoingroups`
3. Select your bot → Enable
4. Send: `/setprivacy`
5. Select your bot → Disable (so bot can see /commands in groups)
6. Add the bot to any group chat — it now responds to /debate in groups

---

## DISCORD BOT (20 minutes)

### Step 1: Create the application (5 min)
1. Go to https://discord.com/developers/applications
2. Click **New Application**
3. Name: `The Colosseum`
4. Click **Create**
5. On the General Information page, copy the **PUBLIC KEY** — you need this
6. Also copy the **APPLICATION ID** — you need this too

### Step 2: Create the bot user (3 min)
1. Left sidebar → **Bot**
2. Click **Reset Token** → **Yes, do it!**
3. **Copy the bot token** — you only see it once
4. Scroll down to **Privileged Gateway Intents** — leave all OFF (not needed)

### Step 3: Paste credentials (2 min)

**File 1: `api/discord.js`** — Line 12, find:
```
const DISCORD_PUBLIC_KEY = 'PASTE_DISCORD_PUBLIC_KEY_HERE';
```
Replace `PASTE_DISCORD_PUBLIC_KEY_HERE` with your Public Key.

**File 2: `discord-register.js`** — Lines 10-11, find:
```
const DISCORD_APP_ID = 'PASTE_DISCORD_APPLICATION_ID_HERE';
const DISCORD_BOT_TOKEN = 'PASTE_DISCORD_BOT_TOKEN_HERE';
```
Replace both with your Application ID and Bot Token.

### Step 4: Push to GitHub (2 min)
```bash
git add api/discord.js discord-register.js
git commit -m "Add Discord bot credentials"
git push
```
Vercel auto-deploys. Wait 60 seconds.

### Step 5: Set Interactions URL (2 min)
1. Back in Discord Developer Portal → Your App → **General Information**
2. Find **INTERACTIONS ENDPOINT URL**
3. Paste: `https://colosseum-six.vercel.app/api/discord`
4. Click **Save Changes**
5. Discord will send a PING to verify — if it saves successfully, it's working

### Step 6: Register the /settle command (2 min)
Run this on your computer (requires Node.js):
```bash
node discord-register.js
```
You should see: `✅ /settle — registered`

### Step 7: Invite bot to a server (3 min)
1. Left sidebar → **OAuth2**
2. Under **OAuth2 URL Generator**, check these scopes:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, check:
   - Send Messages
   - Embed Links
   - Use Slash Commands
4. Copy the generated URL at the bottom
5. Open it in your browser → select a server → Authorize

### Step 8: Test it
1. Go to the Discord server you added the bot to
2. Type: `/settle topic:Is Tua elite?`
3. You should see the embed with vote buttons and Colosseum link

---

## WHAT EACH BOT DOES

### Telegram: `/debate [topic]`
- Creates inline message with YES/NO vote buttons
- Vote counts update live in the message
- Prevents double-voting (can switch sides)
- Links to full Colosseum debate page
- Works in groups — anyone in the chat can vote
- Watermark: every message carries Colosseum branding

### Discord: `/settle topic:[topic]`
- Creates rich embed with green YES / red NO buttons
- Vote counts update on the embed
- Prevents double-voting (can switch sides)
- "Full Debate" button links to Colosseum
- Works in any channel the bot has access to
- Watermark: footer carries Colosseum branding

---

## LIMITATIONS (MVP)

- **Votes are in-memory** — they reset when Vercel cold-starts the function (usually after ~5-15 min of inactivity). This is fine for MVP. To persist votes, wire to Supabase later.
- **Telegram bot token is in the code** — for production, move to Vercel environment variables (Settings → Environment Variables → `TELEGRAM_BOT_TOKEN`). Same for Discord keys.
- **No topic deduplication** — `/debate Is Mahomes better?` and `/debate Is Mahomes the best?` create separate vote pools. Wire to Supabase to unify.

---

## FILES ADDED (4 new files)

| File | What | Where |
|------|------|-------|
| `api/telegram.js` | Telegram webhook handler | Push to GitHub |
| `api/discord.js` | Discord interactions handler (Edge Function) | Push to GitHub |
| `discord-register.js` | One-time slash command registration | Run locally, then push |
| `SETUP-BOTS.md` | This file | Push to GitHub |

File count: 28 → 32

---

## AFTER SETUP — WHAT TO DO WITH THEM

1. **Telegram**: Add the bot to sports/politics group chats you're in. Drop `/debate` commands during live games and trending topics.
2. **Discord**: Get the bot into 5-10 sports Discord servers. Request adds by DMing server admins: "Built a free debate bot for sports arguments — /settle creates instant polls with live voting. Want it in your server?"
3. **Both**: Every vote, every debate link, every result card funnels back to colosseum-six.vercel.app. The bots are free billboards.
