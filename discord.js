// ============================================================
// THE COLOSSEUM — Discord Bot (Vercel Edge Function)
// ============================================================
// Endpoint: /api/discord (set as Discord Interactions URL)
// Command: /settle topic:Is Tua elite?
// Result: Rich embed with vote buttons + link to Colosseum
// ============================================================

export const config = { runtime: 'edge' };

// ── PASTE HERE ──────────────────────────────────────────────
const DISCORD_PUBLIC_KEY = 'PASTE_DISCORD_PUBLIC_KEY_HERE';
// Get from Discord Developer Portal → Application → General Information → Public Key
// ─────────────────────────────────────────────────────────────

const COLOSSEUM_URL = 'https://colosseum-six.vercel.app';

// In-memory vote storage (resets on cold start — fine for MVP)
const votes = {};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function verifySignature(rawBody, signature, timestamp) {
  if (DISCORD_PUBLIC_KEY === 'PASTE_DISCORD_PUBLIC_KEY_HERE') return false;
  try {
    const publicKeyBytes = hexToBytes(DISCORD_PUBLIC_KEY);
    const key = await crypto.subtle.importKey(
      'raw', publicKeyBytes, { name: 'Ed25519' }, false, ['verify']
    );
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + rawBody);
    const sig = hexToBytes(signature);
    return await crypto.subtle.verify('Ed25519', key, sig, message);
  } catch (err) {
    console.error('[Discord] Sig verify error:', err);
    return false;
  }
}

function buildDebateEmbed(topic, slug, voteYes = 0, voteNo = 0) {
  const total = voteYes + voteNo;
  const pctYes = total > 0 ? Math.round((voteYes / total) * 100) : 50;
  const pctNo = total > 0 ? Math.round((voteNo / total) * 100) : 50;
  const barLen = 16;
  const filled = Math.round((pctYes / 100) * barLen);
  const bar = '🟢'.repeat(Math.max(filled, 0)) + '🔴'.repeat(Math.max(barLen - filled, 0));

  return {
    embeds: [{
      title: `⚔️ ${topic}`,
      description: [
        bar, '',
        `**YES** ${pctYes}% (${voteYes}) — **NO** ${pctNo}% (${voteNo})`,
        total > 0 ? `*${total} vote${total !== 1 ? 's' : ''} cast*` : '*Be the first to vote*',
        '',
        `[⚔️ Full Debate → The Colosseum](${COLOSSEUM_URL}/debate?topic=${slug})`,
      ].join('\n'),
      color: 0x1a2d4a,
      footer: { text: '⚔️ Settle YOUR debate → thecolosseum.app' },
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: `👍 YES (${voteYes})`, custom_id: `vote_yes_${slug}` },
        { type: 2, style: 4, label: `👎 NO (${voteNo})`, custom_id: `vote_no_${slug}` },
        { type: 2, style: 5, label: '⚔️ Full Debate', url: `${COLOSSEUM_URL}/debate?topic=${slug}` },
      ],
    }],
  };
}

const INTERACTION = { PING: 1, COMMAND: 2, COMPONENT: 3 };
const RESPONSE = { PONG: 1, MESSAGE: 4, UPDATE: 7 };

function handleSettle(interaction) {
  const options = interaction.data.options || [];
  const topicOpt = options.find(o => o.name === 'topic');
  const topic = topicOpt ? topicOpt.value.trim() : '';

  if (!topic) {
    return json({
      type: RESPONSE.MESSAGE,
      data: { content: '⚔️ Usage: `/settle topic:Is Mahomes better than Josh Allen?`', flags: 64 },
    });
  }

  const slug = slugify(topic);
  votes[slug] = votes[slug] || { yes: 0, no: 0, voters: {} };
  const embed = buildDebateEmbed(topic, slug, 0, 0);

  return json({ type: RESPONSE.MESSAGE, data: { ...embed } });
}

function handleVote(interaction) {
  const customId = interaction.data.custom_id || '';
  const userId = interaction.member?.user?.id || interaction.user?.id || 'anon';
  const voteMatch = customId.match(/^vote_(yes|no)_(.+)$/);

  if (!voteMatch) return json({ type: RESPONSE.UPDATE, data: {} });

  const side = voteMatch[1];
  const slug = voteMatch[2];

  if (!votes[slug]) votes[slug] = { yes: 0, no: 0, voters: {} };

  if (votes[slug].voters[userId] === side) {
    return json({
      type: RESPONSE.MESSAGE,
      data: { content: `You already voted **${side.toUpperCase()}**!`, flags: 64 },
    });
  }

  if (votes[slug].voters[userId]) {
    votes[slug][votes[slug].voters[userId]]--;
  }
  votes[slug][side]++;
  votes[slug].voters[userId] = side;

  const embed = interaction.message?.embeds?.[0];
  const topic = embed?.title?.replace(/^⚔️\s*/, '') || slug.replace(/-/g, ' ');
  const updated = buildDebateEmbed(topic, slug, votes[slug].yes, votes[slug].no);

  return json({ type: RESPONSE.UPDATE, data: { ...updated } });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Edge Function Handler ───────────────────────────────────
export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ ok: true, message: 'Colosseum Discord Bot active' });
  }

  if (DISCORD_PUBLIC_KEY === 'PASTE_DISCORD_PUBLIC_KEY_HERE') {
    return json({ error: 'Bot not configured' }, 200);
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  const isValid = await verifySignature(rawBody, signature, timestamp);
  if (!isValid) {
    return json({ error: 'Invalid signature' }, 401);
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === INTERACTION.PING) {
    return json({ type: RESPONSE.PONG });
  }

  if (interaction.type === INTERACTION.COMMAND) {
    return handleSettle(interaction);
  }

  if (interaction.type === INTERACTION.COMPONENT) {
    return handleVote(interaction);
  }

  return json({ type: RESPONSE.PONG });
}
