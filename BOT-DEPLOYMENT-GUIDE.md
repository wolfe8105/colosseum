# COLOSSEUM BOTS — DEPLOYMENT GUIDE
### Telegram /debate + Discord /settle — Session 15 Build
### Master Priority Items #7 and #8 (Section 16.12)

---

## WHAT YOU'RE DEPLOYING

| Bot | Command | What It Does |
|-----|---------|-------------|
| Telegram | `/debate Is Mahomes the GOAT?` | Creates inline poll in group chat + link to Colosseum |
| Discord | `/settle Is Mahomes the GOAT?` | Creates rich embed poll with vote buttons + link to Colosseum |

Both bots: vote tracking, hot takes, trending placeholder, branding/watermark on every output, link to `colosseum-six.vercel.app/debate` on every interaction.

---

## FILES

```
telegram-bot/
  ├── colosseum-telegram-bot.js    (main bot — 1 file)
  └── package.json

discord-bot/
  ├── colosseum-discord-bot.js     (main bot — 1 file)
  └── package.json
```

These are SEPARATE deployments. Each gets its own Railway/Render project.

---

## PART 1: TELEGRAM BOT

### Step 1 — Create Your Bot (2 minutes)
1. Open Telegram on your phone
2. Search for `@BotFather`
3. Send `/newbot`
4. When asked for a name, type: `The Colosseum`
5. When asked for a username, type: `ColosseumDebateBot` (must end in "bot" — if taken, try `ColosseumSettleBot` or `TheColosseumBot`)
6. BotFather sends you a **token** — looks like `7123456789:AAH_some_long_string`
7. **SAVE THIS TOKEN** — you'll need it in Step 3

### Step 2 — Configure Your Bot (1 minute)
Still in the BotFather chat, send these one at a time:

```
/setdescription
```
Then paste:
```
⚔️ Settle arguments in any group chat. Drop a topic, vote, debate. thecolosseum.app
```

```
/setabouttext
```
Then paste:
```
The Colosseum — Where opinions fight. /debate to start. thecolosseum.app
```

```
/setcommands
```
Then paste:
```
debate - Start a debate on any topic
hottake - Drop a hot take for reactions
trending - See trending debates
help - How to use this bot
```

```
/setinline
```
Then paste:
```
Type a debate topic...
```

### Step 3 — Deploy to Railway (5 minutes)
1. Go to [railway.com](https://railway.com) → sign up with GitHub (free)
2. Click **"New Project"** → **"Empty Project"**
3. Click **"New Service"** → **"Empty Service"**
4. Go to **Settings** tab → **Service** → **Source** → connect your GitHub OR:
   - Click the service → **Settings** → **Deploy** → change to **"Upload"**
   - Upload the 2 files from the `telegram-bot/` folder
5. Go to **Variables** tab, add these:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | `PASTE_THE_TOKEN_FROM_STEP_1_HERE` |
| `WEBHOOK_URL` | (skip for now — Railway gives you a URL after first deploy) |

6. Go to **Settings** → **Networking** → **Generate Domain** → copy the URL (like `colosseum-telegram-bot-production.up.railway.app`)
7. Now go back to **Variables** and add:

| Variable | Value |
|----------|-------|
| `WEBHOOK_URL` | `https://YOUR-RAILWAY-URL-HERE` |

8. Railway auto-deploys. Check the **Deployments** tab for green checkmark.

### Step 4 — Test
1. Open Telegram, search for your bot name
2. Send `/start` — should get welcome message with commands
3. Send `/debate Is Mahomes the GOAT?` — should get poll with YES/NO buttons
4. Click YES or NO — vote counts should update
5. Click "⚔️ Full Debate on The Colosseum" — should open your landing page
6. Add bot to a test group chat → test `/debate` in the group
7. In any chat, type `@YourBotUsername` + a topic to test inline sharing

---

## PART 2: DISCORD BOT

### Step 1 — Create Your Application (3 minutes)
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"** → name it `The Colosseum`
3. On the **General Information** tab:
   - Copy the **APPLICATION ID** — save it
   - Set Description: `⚔️ Settle arguments. /settle to start a debate.`
   - Upload your Colosseum logo
4. Go to **Bot** tab:
   - Click **"Reset Token"** → copy the **TOKEN** — save it
   - Turn ON: **Public Bot**
   - Under Privileged Gateway Intents: leave defaults (you don't need Message Content)
5. Go to **OAuth2** tab → **URL Generator**:
   - Check scopes: `bot`, `applications.commands`
   - Check bot permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`
   - Copy the generated **INVITE URL** at the bottom — save it

### Step 2 — Deploy to Railway (5 minutes)
1. On [railway.com](https://railway.com), click **"New Project"** → **"Empty Project"**
2. Add a new service → upload the 2 files from the `discord-bot/` folder
3. Go to **Variables** tab, add these:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | `PASTE_YOUR_DISCORD_BOT_TOKEN_HERE` |
| `APPLICATION_ID` | `PASTE_YOUR_APPLICATION_ID_HERE` |

4. Deploy. Check logs — should see:
```
⚔️ Colosseum Discord Bot logged in as The Colosseum#1234
⚔️ Slash commands registered globally
```

Note: Slash commands can take up to 1 hour to appear globally in Discord. For instant testing, the bot registers them on startup.

### Step 3 — Invite Bot to Servers
1. Open the **INVITE URL** from Step 1.5 in your browser
2. Select your test server → Authorize
3. Bot joins the server. Slash commands may take a few minutes to appear.
4. Test: type `/settle` in any channel

### Step 4 — Test
1. Type `/settle` → fill in topic: `Is Mahomes the GOAT?`
2. Should see rich embed with navy background, vote bars, YES/NO buttons
3. Click YES → embed updates with vote count
4. Click "⚔️ Full Debate on The Colosseum" → opens your landing page
5. Test `/hottake The Lakers are frauds` → should get reaction buttons
6. Test `/trending` → should show placeholder trending debates
7. Test `/colosseum` → should show info embed

### Step 5 — Get Into Real Servers
1. Find sports Discord servers (search "NFL Discord", "NBA Discord", "Fantasy Football Discord")
2. Message server admins/mods:
   > "Hey, I built a free debate bot for sports arguments. /settle creates instant polls in the channel. No spam, no ads, just a fun way to settle arguments. Want to try it? Here's the invite link: [URL]"
3. Target: 5-10 servers with 500+ members
4. Track: how many servers, how many /settle commands per day

---

## ENVIRONMENT VARIABLES REFERENCE

### Telegram Bot
| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | ✅ | Token from @BotFather |
| `WEBHOOK_URL` | ✅ prod | Your Railway/Render URL (not needed for local dev) |
| `COLOSSEUM_URL` | ❌ | Override base URL (defaults to colosseum-six.vercel.app) |
| `PORT` | ❌ | Server port (defaults to 3000, Railway sets automatically) |

### Discord Bot
| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | ✅ | Token from Discord Developer Portal |
| `APPLICATION_ID` | ✅ | Application ID from Discord Developer Portal |
| `COLOSSEUM_URL` | ❌ | Override base URL (defaults to colosseum-six.vercel.app) |

---

## LOCAL DEVELOPMENT (optional)

If you want to test locally before deploying:

```bash
# Telegram (polling mode — no WEBHOOK_URL needed)
cd telegram-bot
npm install
BOT_TOKEN=your_token_here node colosseum-telegram-bot.js

# Discord
cd discord-bot
npm install
BOT_TOKEN=your_token APPLICATION_ID=your_id node colosseum-discord-bot.js
```

---

## WHAT THESE BOTS DO

### Telegram Commands
| Command | What Happens |
|---------|-------------|
| `/debate [topic]` | Creates YES/NO poll with live updating vote bars + Colosseum link |
| `/hottake [take]` | Posts hot take with 🔥 FIRE / 🗑️ TRASH / ⚔️ BET. reactions |
| `/trending` | Shows trending debates (placeholder data until Supabase wired) |
| `/start` | Welcome message with all commands |
| `/help` | Command reference |
| `@BotName [topic]` | Inline mode — share debates in ANY chat without adding the bot |

### Discord Commands
| Command | What Happens |
|---------|-------------|
| `/settle [topic]` | Rich embed with vote buttons, live counts, Colosseum link |
| `/hottake [take]` | Hot take embed with reaction buttons |
| `/trending` | Trending debates embed (placeholder data) |
| `/colosseum` | Info embed explaining the platform |

### Both Bots Include
- ⚔️ Colosseum branding on every message
- `thecolosseum.app` watermark in every footer
- Direct links to `/debate?topic=slug&ref=telegram` or `&ref=discord`
- In-chat voting (in-memory, resets on restart — real votes on Colosseum)
- 24-hour auto-cleanup of old polls

---

## FUTURE UPGRADES (not needed now)

- Wire trending to Supabase (fetch real debate data instead of placeholder)
- Persist votes to Supabase (currently in-memory)
- Telegram mini app wrapper (load full Colosseum web app inside Telegram)
- Discord Activity (embedded web app inside Discord voice channels)
- Analytics: track ref=telegram and ref=discord in your landing page

---

*Session 15 build. Items #7 + #8 from Master Priority List (16.12).*
