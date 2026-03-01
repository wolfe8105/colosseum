# THE COLOSSEUM — BOT ARMY SETUP GUIDE
## From Zero to Running in One Session

---

## OVERVIEW

You're setting up a fully automated growth machine that runs 24/7.
Once it's running, you never touch it. It scans, generates, posts, and tracks — all on its own.

**What you'll do:**
1. Buy a VPS ($6/month)
2. Create accounts (Reddit, X/Twitter, Discord)
3. Get API keys for each
4. Paste everything into a config file
5. Run one deploy script
6. Walk away

**Time estimate:** 60-90 minutes (one-time setup)

---

## STEP 1: BUY A VPS

### DigitalOcean (Recommended)
1. Go to **digitalocean.com** → Sign Up
2. Create a Droplet:
   - **Image:** Ubuntu 24.04 LTS
   - **Plan:** Basic → Regular → **$6/mo** (1 vCPU, 1 GB RAM, 25 GB SSD)
   - **Region:** New York (NYC1) — closest to your users
   - **Authentication:** Password (simpler) or SSH key (more secure)
3. Note your droplet's **IP address** (e.g., `164.92.xxx.xxx`)

### Alternative: Hetzner (Cheaper)
1. Go to **hetzner.com/cloud** → Sign Up
2. Create server: **CX22** (€3.29/mo ≈ $4), Ubuntu 24.04, Ashburn VA
3. Note your server's IP address

---

## STEP 2: SET UP THE VPS

SSH into your VPS from your computer's terminal:

```bash
ssh root@YOUR_IP_ADDRESS
```

Then run these commands (copy-paste the whole block):

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager — keeps bot alive)
npm install -g pm2

# Install Git
apt install -y git

# Create bot directory
mkdir -p /opt/colosseum-bots
cd /opt/colosseum-bots

# Verify installations
echo "Node: $(node -v)"
echo "npm: $(npm -v)"
echo "PM2: $(pm2 -v)"
```

You should see version numbers for all three. If not, something failed — re-run the failed command.

---

## STEP 3: UPLOAD BOT FILES

**Option A: From your computer (easiest)**

On your LOCAL computer (not the VPS), open a new terminal:

```bash
# Replace YOUR_IP with your VPS IP
scp -r /path/to/colosseum-bot-army/* root@YOUR_IP:/opt/colosseum-bots/
```

**Option B: From GitHub**

If you push the bot-army folder to your repo:

```bash
cd /opt/colosseum-bots
git clone https://github.com/wolfe8105/colosseum.git temp
cp -r temp/colosseum-bot-army/* .
rm -rf temp
```

---

## STEP 4: INSTALL DEPENDENCIES

On the VPS:

```bash
cd /opt/colosseum-bots
npm install
```

This takes 1-2 minutes. You should see no errors (warnings are fine).

---

## STEP 5: CREATE ACCOUNTS + GET API KEYS

### 5A. Groq (Free AI — Required)
1. Go to **console.groq.com**
2. Sign up with Google or email
3. Click **API Keys** in left sidebar
4. Click **Create API Key**
5. Copy the key — it starts with `gsk_`

**Paste into .env as:** `GROQ_API_KEY`

### 5B. Reddit Account + API
1. Go to **reddit.com** → Sign Up (new account for the bot)
   - Username: something neutral, not obviously a brand (e.g., `debate_enjoyer_42`)
   - Note the username and password
2. Go to **reddit.com/prefs/apps** (while logged in)
3. Scroll to bottom → Click **"create another app..."**
4. Fill in:
   - **Name:** ColosseumBot (anything)
   - **Type:** Select **script**
   - **Redirect URI:** `http://localhost`
5. Click **Create app**
6. Copy two things:
   - **Client ID:** the string under your app name (looks like: `a1b2c3d4e5f6g7`)
   - **Client Secret:** the string labeled "secret"

**Paste into .env:**
- `REDDIT_CLIENT_ID` = the client ID
- `REDDIT_CLIENT_SECRET` = the secret
- `REDDIT_USERNAME` = your bot account username
- `REDDIT_PASSWORD` = your bot account password
- Update the `REDDIT_USER_AGENT` to include your username

### 5C. X/Twitter Account + API
1. Go to **x.com** → Sign Up (this is @TheColosseum brand account)
   - Use a fresh email
   - Handle: `@TheColosseum` or `@ColosseumDebate` or similar
2. Go to **developer.x.com/en/portal/dashboard**
3. Sign up for a **Free** developer account
4. Create a **Project** → then create an **App** inside it
5. Go to your app → **Keys and Tokens** tab
6. Under "Consumer Keys": click **Regenerate** → copy **API Key** and **API Secret**
7. Under "Authentication Tokens": click **Generate** → copy **Access Token** and **Access Token Secret**

**⚠️ IMPORTANT:** Under your app settings, set **App permissions** to **Read and Write**

**Paste into .env:**
- `TWITTER_API_KEY` = API Key (Consumer Key)
- `TWITTER_API_SECRET` = API Secret (Consumer Secret)
- `TWITTER_ACCESS_TOKEN` = Access Token
- `TWITTER_ACCESS_SECRET` = Access Token Secret

### 5D. Discord Bot
1. Go to **discord.com/developers/applications**
2. Click **New Application** → Name: "The Colosseum"
3. Go to **Bot** tab in left sidebar
4. Click **Reset Token** → Copy the token
5. Scroll down → Enable **MESSAGE CONTENT INTENT** (toggle ON)
6. Go to **OAuth2** → **URL Generator**
7. Check scopes: **bot**
8. Check bot permissions: **Send Messages**, **Read Messages/View Channels**, **Read Message History**
9. Copy the generated URL at the bottom
10. Open that URL in your browser → Select a Discord server to add the bot to

**Repeat step 10** for each argument-heavy server you want the bot in. Good targets:
- Sports debate servers
- Politics discussion servers
- General "hot takes" or opinion servers
- Any server with active arguments

**Paste into .env:** `DISCORD_BOT_TOKEN`

### 5E. Proxy (Optional but Recommended)
1. Go to **webshare.io** (cheapest option, ~$5-10/mo)
2. Sign up → Buy a residential proxy plan
3. Get your proxy URL (format: `http://user:pass@host:port`)

**Paste into .env:** `PROXY_URL` (or leave as `NONE` to skip)

---

## STEP 6: CONFIGURE THE .ENV FILE

On the VPS:

```bash
cd /opt/colosseum-bots
cp .env.example .env
nano .env
```

Replace every `PASTE_YOUR_*_HERE` with the real values from Step 5.

**Important settings:**
- `DRY_RUN=true` — START WITH THIS. Lets you verify everything works before posting for real.
- `LEG1_TWITTER_ENABLED=false` — Keep disabled. Free API can't scan, only post.
- Everything else: `true`

Save: `Ctrl+O` then `Enter` then `Ctrl+X`

---

## STEP 7: PASTE THE DATABASE SQL

1. Go to your **Supabase dashboard** → SQL Editor
2. Open the file `colosseum-bot-army-schema.sql`
3. Copy the entire contents
4. Paste into SQL Editor → Click **Run**
5. Should see "Success" — this creates the `bot_activity` table and adds columns to `hot_takes`

---

## STEP 8: TEST (DRY RUN)

On the VPS:

```bash
cd /opt/colosseum-bots

# Test AI generation
npm run test-ai

# Test news scanner
npm run test-leg2

# Test Reddit scanner (dry run)
npm run test-leg1

# If all tests pass, start the full engine in dry run mode
node bot-engine.js
```

Watch the console. You should see:
- Config validation passing
- Scheduled cron jobs listed
- Discord bot connecting (if enabled)
- News scans finding headlines
- "DRY RUN" messages showing what it WOULD post

Let it run for 15-20 minutes. Check the logs:

```bash
cat logs/bot-$(date +%Y-%m-%d).log
```

---

## STEP 9: GO LIVE

Once you're satisfied with dry run:

```bash
# Edit .env and change DRY_RUN to false
nano .env
# Change: DRY_RUN=false
# Save: Ctrl+O, Enter, Ctrl+X

# Start with PM2 (keeps it alive forever)
pm2 start ecosystem.config.js

# Save PM2 config (survives VPS reboots)
pm2 save
pm2 startup
# Run the command it tells you to run

# Verify it's running
pm2 status
```

---

## STEP 10: MONITORING (Your ~1 Minute/Day)

```bash
# SSH in
ssh root@YOUR_IP

# Check status
pm2 status

# See recent logs
pm2 logs colosseum-bots --lines 50

# See stats from Supabase
# Go to Supabase Dashboard → SQL Editor → run:
# SELECT * FROM bot_stats_24h;
```

---

## TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Bot won't start | Check `pm2 logs` for errors. Usually a missing .env value. |
| Reddit: 401 error | Wrong client ID/secret. Regenerate at reddit.com/prefs/apps |
| Reddit: 429 error | Rate limited. Bot auto-retries. Reduce `postsPerScan` in config if persistent. |
| Twitter: 403 error | App permissions not set to Read+Write. Fix in developer portal. |
| Twitter: 429 error | Hit daily limit. Wait 24h. Reduce `maxPostsPerDay`. |
| Discord: not responding | Make sure MESSAGE CONTENT INTENT is enabled in developer portal. |
| Groq: 429 error | Free tier limit hit. Wait 1 minute. Reduce scan frequency. |
| No debate pages appearing | Check Supabase logs. Make sure `hot_takes` table has the new columns. |
| PM2 keeps restarting | Memory issue. Check `pm2 monit`. May need bigger VPS. |

---

## MONTHLY COST BREAKDOWN

| Item | Cost |
|------|------|
| VPS (DigitalOcean Basic) | $6/mo |
| Groq AI (free tier) | $0 |
| Reddit API (free) | $0 |
| Twitter/X API (free tier) | $0 |
| Discord API (free) | $0 |
| Proxy (optional) | $5-10/mo |
| **Total** | **$6-16/mo** |

You're under budget. The remaining $84-94 can go toward scaling later (more proxy IPs, paid Twitter API, etc).

---

## FILE MANIFEST

| File | What It Does |
|------|-------------|
| `bot-engine.js` | Main orchestrator — starts everything, runs cron schedules |
| `bot-config.js` | Loads .env, validates all settings |
| `ecosystem.config.js` | PM2 config — keeps bot alive, auto-restarts |
| `.env.example` | Template for all credentials (copy to `.env`) |
| `colosseum-bot-army-schema.sql` | Database support — paste into Supabase |
| `lib/logger.js` | Logging with daily file rotation |
| `lib/ai-generator.js` | Groq AI — generates hot takes + contextual replies |
| `lib/supabase-client.js` | Creates debate pages + tracks bot activity |
| `lib/leg1-reddit.js` | Leg 1: scans Reddit, replies to arguments |
| `lib/leg1-twitter.js` | Leg 1: scans Twitter (needs Basic API $100/mo) |
| `lib/leg1-discord.js` | Leg 1: detects arguments in Discord servers |
| `lib/leg2-news-scanner.js` | Leg 2: scans Google News + ESPN RSS feeds |
| `lib/leg2-debate-creator.js` | Leg 2: creates debate pages in Supabase |
| `lib/leg2-twitter-poster.js` | Leg 2: posts hot takes to @TheColosseum |
