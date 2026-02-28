// ============================================================
// THE COLOSSEUM — Discord Bot Setup
// One-time endpoint: visit /api/discord-setup to register slash commands
// ============================================================

const DISCORD_APP_ID = process.env.DISCORD_APP_ID || 'PASTE_DISCORD_APP_ID_HERE';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'PASTE_DISCORD_BOT_TOKEN_HERE';
const DISCORD_API = 'https://discord.com/api/v10';
const SITE_URL = process.env.SITE_URL || 'https://colosseum-six.vercel.app';

const COMMANDS = [
  {
    name: 'settle',
    description: 'Start a debate — settle an argument right here',
    options: [
      {
        name: 'topic',
        description: 'What are we debating? e.g. "Is Mahomes better than Allen?"',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'debate',
    description: 'Same as /settle — start a debate on any topic',
    options: [
      {
        name: 'topic',
        description: 'The debate topic',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'trending',
    description: "Today's hottest debates on The Colosseum",
  },
  {
    name: 'help',
    description: 'How to use The Colosseum bot',
  },
];

module.exports = async function handler(req, res) {
  // Check config
  if (!DISCORD_APP_ID || DISCORD_APP_ID === 'PASTE_DISCORD_APP_ID_HERE' ||
      !DISCORD_BOT_TOKEN || DISCORD_BOT_TOKEN === 'PASTE_DISCORD_BOT_TOKEN_HERE') {
    return res.status(200).json({
      ok: false,
      error: 'Discord env vars not set',
      instructions: [
        '1. Go to discord.com/developers/applications → New Application',
        '2. Copy Application ID from General Information',
        '3. Copy Public Key from General Information',
        '4. Go to Bot tab → Reset Token → copy Bot Token',
        '5. Add to Vercel → Settings → Environment Variables:',
        '   DISCORD_APP_ID = your-application-id',
        '   DISCORD_PUBLIC_KEY = your-public-key',
        '   DISCORD_BOT_TOKEN = your-bot-token',
        '6. Redeploy, then visit this URL again',
      ],
    });
  }

  const action = req.query.action || 'register';

  if (action === 'list') {
    // List currently registered commands
    const resp = await fetch(`${DISCORD_API}/applications/${DISCORD_APP_ID}/commands`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const data = await resp.json();
    return res.status(200).json({ action: 'list', commands: data });
  }

  if (action === 'clear') {
    // Remove all global commands
    const resp = await fetch(`${DISCORD_API}/applications/${DISCORD_APP_ID}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    });
    const data = await resp.json();
    return res.status(200).json({ action: 'clear', result: data });
  }

  if (action === 'invite') {
    // Generate bot invite link
    const permissions = 2147485696; // Send Messages + Embed Links + Use Slash Commands
    const scopes = 'bot%20applications.commands';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APP_ID}&permissions=${permissions}&scope=${scopes}`;
    return res.status(200).json({
      action: 'invite',
      invite_url: url,
      instructions: 'Open this URL in your browser to add the bot to a server',
    });
  }

  // Default: register global commands
  const resp = await fetch(`${DISCORD_API}/applications/${DISCORD_APP_ID}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  const data = await resp.json();
  const success = Array.isArray(data);

  return res.status(200).json({
    action: 'register',
    ok: success,
    commands_registered: success ? data.map(c => `/${c.name}`) : null,
    error: success ? null : data,
    next_steps: success ? [
      '✅ Slash commands registered globally (may take up to 1 hour to propagate)',
      '',
      'NOW DO THESE TWO THINGS:',
      '',
      '1. Set Interactions Endpoint URL in Discord Developer Portal:',
      `   → discord.com/developers/applications/${DISCORD_APP_ID}/information`,
      `   → Interactions Endpoint URL: ${SITE_URL}/api/discord-interactions`,
      '   → Click Save Changes',
      '   (Discord will PING the endpoint to verify — this should succeed)',
      '',
      '2. Add bot to a server:',
      `   → Visit: ${SITE_URL}/api/discord-setup?action=invite`,
      '   → Open the invite URL → pick a server → authorize',
      '',
      'Other endpoints:',
      `  ${SITE_URL}/api/discord-setup?action=list    — list registered commands`,
      `  ${SITE_URL}/api/discord-setup?action=clear   — remove all commands`,
      `  ${SITE_URL}/api/discord-setup?action=invite  — generate invite link`,
    ] : [
      'Command registration failed. Check your DISCORD_APP_ID and DISCORD_BOT_TOKEN.',
    ],
  });
};
