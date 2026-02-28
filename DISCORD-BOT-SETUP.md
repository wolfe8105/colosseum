# DISCORD BOT SETUP — The Colosseum
### Bible ref: 16.6.2 | Session 15

---

## FILES TO PUSH TO GITHUB

```
api/discord-interactions.js    ← NEW (slash command handler)
api/discord-setup.js           ← NEW (one-time command registration)
```

Zero npm dependencies — uses native Node.js Ed25519 for Discord signature verification.
Vercel auto-routes `/api/*` to serverless functions. No vercel.json changes needed.

---

## HUMAN STEPS (10 minutes)

### Step 1: Create Discord Application
1. Go to: https://discord.com/developers/applications
2. Click **New Application** → name it `The Colosseum` → Create
3. On the **General Information** page, copy these two values:
   - **Application ID** (top of page)
   - **Public Key** (below Application ID)

### Step 2: Create the Bot
1. Click **Bot** in left sidebar
2. Click **Reset Token** → Yes → copy the **Bot Token**
3. Under **Privileged Gateway Intents**: leave everything OFF (not needed for slash commands)

### Step 3: Add environment variables to Vercel
1. Go to: https://vercel.com → your Colosseum project → Settings → Environment Variables
2. Add these three:

| Key | Value |
|-----|-------|
| `DISCORD_APP_ID` | `PASTE_APPLICATION_ID_HERE` |
| `DISCORD_PUBLIC_KEY` | `PASTE_PUBLIC_KEY_HERE` |
| `DISCORD_BOT_TOKEN` | `PASTE_BOT_TOKEN_HERE` |

3. Click Save

### Step 4: Push files to GitHub
```
Push these to your repo:
  api/discord-interactions.js
  api/discord-setup.js
```
Vercel auto-deploys on push. Wait for deploy to finish.

### Step 5: Register slash commands
Visit this URL in your browser:
```
https://colosseum-six.vercel.app/api/discord-setup
```
You should see: `"ok": true` with a list of registered commands (`/settle`, `/debate`, `/trending`, `/help`).

> ⚠️ Global commands can take **up to 1 hour** to propagate to all servers. For instant testing, you can register guild-specific commands instead (not set up here, but Discord docs explain how).

### Step 6: Set Interactions Endpoint URL
1. Go back to: https://discord.com/developers/applications → your app → **General Information**
2. Find **Interactions Endpoint URL**
3. Paste:
```
https://colosseum-six.vercel.app/api/discord-interactions
```
4. Click **Save Changes**
5. Discord will PING the endpoint to verify — it should succeed (you'll see "Save" work without error)

### Step 7: Add bot to a server
Visit this URL in your browser:
```
https://colosseum-six.vercel.app/api/discord-setup?action=invite
```
Copy the `invite_url` from the response → open it → pick a server → authorize.

### Step 8: Test
1. In the server, type `/settle Is Mahomes better than Josh Allen?`
2. You should see: gold embed + YES/NO buttons + "Full Debate" link
3. Try `/trending` for hot debates
4. Click YES or NO — you'll get an ephemeral response with a Colosseum link

---

## WHAT THE BOT DOES

| Command | What happens |
|---------|-------------|
| `/settle [topic]` | Gold embed + YES/NO vote buttons + Colosseum link |
| `/debate [topic]` | Same as /settle (alias) |
| `/trending` | Shows 4 hot debates with clickable links |
| `/help` | Usage guide (ephemeral — only you see it) |

**Vote buttons:** When someone clicks YES or NO, they get a private message with their vote + a link to the full debate on The Colosseum. Other users just see the embed + buttons.

---

## HOW IT WORKS (TECHNICAL)

- **Zero npm dependencies** — Discord signature verification uses Node.js native Ed25519 (`crypto` module)
- **Vercel serverless** — no persistent server, scales to zero when idle
- Body parser disabled (`module.exports.config = { api: { bodyParser: false } }`) so raw body is available for signature verification
- Handles Discord's PING handshake for endpoint verification
- Vote button clicks link back to the landing page with `?topic=slug&title=...&src=discord`
- Landing page (patched in Telegram session) already handles custom topics from the `title` param

---

## MANAGEMENT ENDPOINTS

| URL | What it does |
|-----|-------------|
| `/api/discord-setup` | Register slash commands |
| `/api/discord-setup?action=list` | List registered commands |
| `/api/discord-setup?action=clear` | Remove all commands |
| `/api/discord-setup?action=invite` | Generate bot invite link |
| `/api/discord-interactions` (GET) | Health check |

---

## GETTING INTO SPORTS SERVERS

Bible says (16.6.2.6): *"Get the bot into 5-10 sports Discord servers to start."*

Strategy:
1. Search Discord for servers: NFL, NBA, Fantasy Football, Sports Debate
2. Join them first as a user — participate genuinely for a few days
3. Then ask a mod if you can add a debate bot — frame it as a tool for the server, not self-promotion
4. Alternative: post in r/Discord or server listing sites offering the bot

---

## FILE COUNT
Repo goes from 30 → 32 files (+ api/discord-interactions.js, api/discord-setup.js).
