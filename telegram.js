// ============================================================
// THE COLOSSEUM — Telegram Bot (Vercel Serverless Function)
// ============================================================
// Endpoint: /api/telegram (set as Telegram webhook URL)
// Command: /debate Is Mahomes better than Josh Allen?
// Result: Inline vote buttons + link to full Colosseum debate
// ============================================================

// ── PASTE HERE ──────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = 'PASTE_TELEGRAM_BOT_TOKEN_HERE';
// Get this from @BotFather on Telegram (see SETUP-BOTS.md)
// ─────────────────────────────────────────────────────────────

const COLOSSEUM_URL = 'https://colosseum-six.vercel.app';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// In-memory vote storage (resets on cold start — fine for MVP)
// For persistence, wire to Supabase later
const votes = {};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function buildDebateMessage(topic, slug, voteA = 0, voteB = 0) {
  const total = voteA + voteB;
  const pctA = total > 0 ? Math.round((voteA / total) * 100) : 50;
  const pctB = total > 0 ? Math.round((voteB / total) * 100) : 50;

  const barLen = 20;
  const filledA = Math.round((pctA / 100) * barLen);
  const barA = '█'.repeat(filledA) + '░'.repeat(barLen - filledA);

  const text = [
    `⚔️ *THE COLOSSEUM*`,
    ``,
    `*${topic}*`,
    ``,
    `YES ${pctA}% ${barA} ${pctB}% NO`,
    total > 0 ? `_${total} vote${total !== 1 ? 's' : ''} cast_` : `_Be the first to vote_`,
    ``,
    `🗳 Pick a side below 👇`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `👍 YES (${voteA})`, callback_data: `vote_yes_${slug}` },
        { text: `👎 NO (${voteB})`, callback_data: `vote_no_${slug}` },
      ],
      [
        { text: '⚔️ Full Debate → The Colosseum', url: `${COLOSSEUM_URL}/debate?topic=${slug}` },
      ],
    ],
  };

  return { text, keyboard };
}

async function sendTelegram(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  // /debate command
  if (text.startsWith('/debate')) {
    const topic = text.replace(/^\/debate\s*/i, '').trim();

    if (!topic) {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚔️ Usage: `/debate Is Mahomes better than Josh Allen?`',
        parse_mode: 'Markdown',
      });
      return;
    }

    const slug = slugify(topic);
    votes[slug] = votes[slug] || { yes: 0, no: 0, voters: {} };

    const { text: msgText, keyboard } = buildDebateMessage(
      topic, slug, votes[slug].yes, votes[slug].no
    );

    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: msgText,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    return;
  }

  // /start command
  if (text.startsWith('/start')) {
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: [
        '⚔️ *Welcome to The Colosseum*',
        '',
        'Settle any debate in seconds.',
        '',
        '👉 `/debate Is LeBron the GOAT?`',
        '👉 `/debate Should college athletes get paid?`',
        '👉 `/debate Is a hot dog a sandwich?`',
        '',
        'Drop one in any group chat and let the people decide.',
        '',
        `🏛 Full experience → ${COLOSSEUM_URL}`,
      ].join('\n'),
      parse_mode: 'Markdown',
    });
    return;
  }

  // /help command
  if (text.startsWith('/help')) {
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: [
        '⚔️ *Colosseum Bot Commands*',
        '',
        '`/debate [topic]` — Start a debate',
        '`/start` — Welcome message',
        '`/help` — This message',
        '',
        'Works in group chats too! Just add me to a group.',
      ].join('\n'),
      parse_mode: 'Markdown',
    });
    return;
  }
}

async function handleCallbackQuery(callback) {
  const data = callback.data || '';
  const userId = callback.from.id;
  const message = callback.message;

  // Parse vote callback: vote_yes_slug or vote_no_slug
  const voteMatch = data.match(/^vote_(yes|no)_(.+)$/);
  if (!voteMatch) {
    await sendTelegram('answerCallbackQuery', {
      callback_query_id: callback.id,
      text: 'Unknown action',
    });
    return;
  }

  const side = voteMatch[1];
  const slug = voteMatch[2];

  if (!votes[slug]) {
    votes[slug] = { yes: 0, no: 0, voters: {} };
  }

  // Check if already voted
  if (votes[slug].voters[userId]) {
    const prevSide = votes[slug].voters[userId];
    if (prevSide === side) {
      await sendTelegram('answerCallbackQuery', {
        callback_query_id: callback.id,
        text: `You already voted ${side.toUpperCase()}!`,
        show_alert: false,
      });
      return;
    }
    // Switch vote
    votes[slug][prevSide]--;
    votes[slug][side]++;
    votes[slug].voters[userId] = side;
  } else {
    // New vote
    votes[slug][side]++;
    votes[slug].voters[userId] = side;
  }

  await sendTelegram('answerCallbackQuery', {
    callback_query_id: callback.id,
    text: `✅ Voted ${side.toUpperCase()}!`,
    show_alert: false,
  });

  // Extract original topic from the message text (line 3, between * markers)
  const lines = (message.text || '').split('\n');
  const topicLine = lines.find(l => l && !l.includes('COLOSSEUM') && !l.includes('YES') && !l.includes('vote') && !l.includes('Pick') && l.trim() !== '');
  const topic = topicLine || slug.replace(/-/g, ' ');

  const { text: msgText, keyboard } = buildDebateMessage(
    topic, slug, votes[slug].yes, votes[slug].no
  );

  // Update the original message with new vote counts
  await sendTelegram('editMessageText', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text: msgText,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// ── Vercel Serverless Handler ───────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Colosseum Telegram Bot active' });
  }

  // Placeholder check
  if (TELEGRAM_BOT_TOKEN === 'PASTE_TELEGRAM_BOT_TOKEN_HERE') {
    console.log('[Colosseum Telegram] Bot token not configured — ignoring webhook');
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Colosseum Telegram] Error:', err);
    return res.status(200).json({ ok: true }); // Always 200 to Telegram
  }
}
