// ============================================================
// THE COLOSSEUM — Discord Interactions Webhook
// Vercel Serverless Function
// Bible ref: 16.6.2
// ============================================================
// HUMAN ACTION REQUIRED:
//   1. Create app at discord.com/developers/applications
//   2. Add DISCORD_APP_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN to Vercel env vars
//   3. Push to GitHub → Vercel auto-deploys
//   4. Visit /api/discord-setup to register slash commands
//   5. In Discord Dev Portal → set Interactions Endpoint URL to:
//      https://colosseum-six.vercel.app/api/discord-interactions
//   6. Generate invite link → add bot to server
// ============================================================

const crypto = require('crypto');

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || 'PASTE_DISCORD_PUBLIC_KEY_HERE';
const SITE_URL = process.env.SITE_URL || 'https://colosseum-six.vercel.app';

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
const MESSAGE_COMPONENT = 3;

// Discord response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_CHANNEL_MESSAGE = 5;
const UPDATE_MESSAGE = 7;

// Discord component types
const ACTION_ROW = 1;
const BUTTON = 2;

// Discord button styles
const BUTTON_PRIMARY = 1;   // blurple
const BUTTON_SECONDARY = 2; // grey
const BUTTON_SUCCESS = 3;   // green
const BUTTON_DANGER = 4;    // red
const BUTTON_LINK = 5;      // grey, opens URL

// --- Trending debates (mirrors landing page + Telegram bot) ---
const TRENDING = [
  { slug: 'mahomes-vs-allen', topic: 'Is Patrick Mahomes better than Josh Allen?', icon: '🏈', cat: 'Sports' },
  { slug: 'caleb-downs-combine', topic: 'Is Caleb Downs worth a top 10 pick?', icon: '🏈', cat: 'Sports' },
  { slug: 'trump-tariffs', topic: "Will Trump's tariffs help or hurt Americans?", icon: '🏛️', cat: 'Politics' },
  { slug: 'beyonce-overrated', topic: 'Is Beyoncé overrated?', icon: '🎤', cat: 'Entertainment' },
];

// Colosseum brand colors
const COLOR_GOLD = 0xD4A843;
const COLOR_NAVY = 0x1A2D4A;
const COLOR_RED = 0xCC2936;

// ============================================================
// WEBHOOK HANDLER
// ============================================================
module.exports = async function handler(req, res) {
  // GET = health check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, bot: 'Colosseum Discord Bot', status: 'active' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  // --- Read raw body (bodyParser disabled — required for signature verification) ---
  const rawBody = await getRawBody(req);

  // --- Verify Discord signature (required) ---
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature headers' });
  }

  if (!verifySignature(DISCORD_PUBLIC_KEY, signature, timestamp, rawBody)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const interaction = JSON.parse(rawBody);

  // --- PING (Discord verification handshake) ---
  if (interaction.type === PING) {
    return res.status(200).json({ type: PONG });
  }

  // --- SLASH COMMANDS ---
  if (interaction.type === APPLICATION_COMMAND) {
    const { name } = interaction.data;
    const options = interaction.data.options || [];

    switch (name) {
      case 'settle':
      case 'debate': {
        const topicOpt = options.find(o => o.name === 'topic');
        if (!topicOpt || !topicOpt.value.trim()) {
          return res.status(200).json(ephemeral('⚔️ Give me a topic! Example: `/settle Is LeBron the GOAT?`'));
        }
        return res.status(200).json(createDebateResponse(topicOpt.value.trim(), interaction.member || interaction.user));
      }
      case 'trending':
        return res.status(200).json(trendingResponse());
      case 'help':
        return res.status(200).json(helpResponse());
      default:
        return res.status(200).json(ephemeral('Unknown command.'));
    }
  }

  // --- BUTTON PRESSES (vote buttons) ---
  if (interaction.type === MESSAGE_COMPONENT) {
    const customId = interaction.data.custom_id;
    const user = interaction.member?.user || interaction.user;
    const displayName = user?.global_name || user?.username || 'Gladiator';

    if (customId.startsWith('vote_yes_') || customId.startsWith('vote_no_')) {
      const side = customId.startsWith('vote_yes_') ? 'YES 🔴' : 'NO 🔵';
      const slug = customId.replace(/^vote_(yes|no)_/, '');
      const debateUrl = `${SITE_URL}/debate?topic=${slug}&src=discord`;

      // Ephemeral response only the voter sees
      return res.status(200).json({
        type: CHANNEL_MESSAGE,
        data: {
          flags: 64, // ephemeral
          embeds: [{
            title: `You voted ${side}`,
            description: `Thanks, ${displayName}! Head to The Colosseum for live results, hot takes, and the full debate experience.`,
            color: side.includes('YES') ? COLOR_RED : 0x3498DB,
            footer: { text: '⚔️ The Colosseum — Where debates are settled' },
          }],
          components: [{
            type: ACTION_ROW,
            components: [{
              type: BUTTON,
              style: BUTTON_LINK,
              label: '⚔️ See Results on The Colosseum',
              url: debateUrl,
            }],
          }],
        },
      });
    }

    return res.status(200).json(ephemeral('👍'));
  }

  return res.status(200).json({ type: PONG });
};

// ============================================================
// /settle [topic] — THE CORE FEATURE
// ============================================================
function createDebateResponse(topic, memberOrUser) {
  const user = memberOrUser?.user || memberOrUser;
  const displayName = user?.global_name || user?.username || 'Someone';
  const slug = slugify(topic);
  const debateUrl = `${SITE_URL}/debate?topic=${slug}&title=${encodeURIComponent(topic)}&cat=trending&src=discord`;

  return {
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: '⚔️  SETTLE THIS',
        description: `**"${topic}"**\n\nStarted by **${displayName}** — pick a side below.\nVote here, then settle it for real on The Colosseum.`,
        color: COLOR_GOLD,
        thumbnail: { url: `${SITE_URL}/og-card-default.png` },
        footer: {
          text: '⚔️ The Colosseum — Where debates are settled',
        },
        timestamp: new Date().toISOString(),
      }],
      components: [
        {
          type: ACTION_ROW,
          components: [
            {
              type: BUTTON,
              style: BUTTON_DANGER,
              label: '🔴 YES',
              custom_id: `vote_yes_${slug}`,
            },
            {
              type: BUTTON,
              style: BUTTON_PRIMARY,
              label: '🔵 NO',
              custom_id: `vote_no_${slug}`,
            },
          ],
        },
        {
          type: ACTION_ROW,
          components: [
            {
              type: BUTTON,
              style: BUTTON_LINK,
              label: '⚔️ Full Debate on The Colosseum',
              url: debateUrl,
            },
          ],
        },
      ],
    },
  };
}

// ============================================================
// /trending
// ============================================================
function trendingResponse() {
  const lines = TRENDING.map(d => {
    const url = `${SITE_URL}/debate?topic=${d.slug}&src=discord`;
    return `${d.icon} **[${d.topic}](${url})**\n_${d.cat}_`;
  });

  return {
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: '🔥  TRENDING DEBATES',
        description: lines.join('\n\n'),
        color: COLOR_RED,
        footer: { text: '⚔️ Vote free — no signup required' },
        thumbnail: { url: `${SITE_URL}/og-card-default.png` },
      }],
      components: [{
        type: ACTION_ROW,
        components: [{
          type: BUTTON,
          style: BUTTON_LINK,
          label: '🏟️ Open The Colosseum',
          url: SITE_URL,
        }],
      }],
    },
  };
}

// ============================================================
// /help
// ============================================================
function helpResponse() {
  return {
    type: CHANNEL_MESSAGE,
    data: {
      flags: 64, // ephemeral — only requester sees
      embeds: [{
        title: '⚔️  THE COLOSSEUM BOT',
        description:
          '**Commands:**\n' +
          '`/settle Is pineapple on pizza valid?` — Start a debate\n' +
          '`/debate` — Same thing, different name\n' +
          '`/trending` — Today\'s hottest debates\n' +
          '`/help` — You\'re looking at it\n\n' +
          '**How it works:**\n' +
          '1. Someone drops a hot take\n' +
          '2. People vote YES or NO right here in Discord\n' +
          '3. Want to go deeper? Tap the link for the full arena\n\n' +
          '_Every debate is free. Every vote counts._',
        color: COLOR_NAVY,
        footer: { text: '⚔️ The Colosseum — Where debates are settled' },
      }],
    },
  };
}

// ============================================================
// HELPERS
// ============================================================

function ephemeral(text) {
  return {
    type: CHANNEL_MESSAGE,
    data: { content: text, flags: 64 },
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ============================================================
// DISCORD SIGNATURE VERIFICATION (zero npm dependencies)
// Uses Node.js native Ed25519 support (Node 18+)
// ============================================================
function verifySignature(publicKeyHex, signatureHex, timestamp, body) {
  try {
    // Ed25519 DER-encoded SPKI prefix (constant for all Ed25519 keys)
    const DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
    const derKey = Buffer.concat([DER_PREFIX, publicKeyBuffer]);

    const key = crypto.createPublicKey({
      key: derKey,
      format: 'der',
      type: 'spki',
    });

    const message = Buffer.from(timestamp + body);
    const sig = Buffer.from(signatureHex, 'hex');

    return crypto.verify(null, message, key, sig);
  } catch (err) {
    console.error('Signature verification error:', err.message);
    return false;
  }
}

// Read raw body from request stream (bodyParser is disabled)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    // If Vercel already parsed it (fallback), stringify it back
    if (req.body && typeof req.body === 'object') {
      return resolve(JSON.stringify(req.body));
    }
    if (typeof req.body === 'string') {
      return resolve(req.body);
    }
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Disable Vercel body parser — required for Discord signature verification
module.exports.config = {
  api: { bodyParser: false },
};
