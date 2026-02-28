// ============================================================
// THE COLOSSEUM — Telegram Bot Webhook
// Vercel Serverless Function
// Bible ref: 16.6.1
// ============================================================
// HUMAN ACTION REQUIRED:
//   1. Talk to @BotFather on Telegram → /newbot → get token
//   2. Add TELEGRAM_BOT_TOKEN to Vercel → Settings → Environment Variables
//   3. After deploy, register webhook by visiting:
//      https://colosseum-six.vercel.app/api/telegram-setup
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'PASTE_TELEGRAM_BOT_TOKEN_HERE';
const SITE_URL = process.env.SITE_URL || 'https://colosseum-six.vercel.app';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Trending debates (mirrors landing page demos — update when Supabase has real data) ---
const TRENDING = [
  { slug: 'mahomes-vs-allen', topic: 'Is Patrick Mahomes better than Josh Allen?', icon: '🏈' },
  { slug: 'caleb-downs-combine', topic: 'Is Caleb Downs worth a top 10 pick?', icon: '🏈' },
  { slug: 'trump-tariffs', topic: "Will Trump's tariffs help or hurt Americans?", icon: '🏛️' },
  { slug: 'beyonce-overrated', topic: 'Is Beyoncé overrated?', icon: '🎤' },
];

// ============================================================
// WEBHOOK HANDLER
// ============================================================
module.exports = async function handler(req, res) {
  // GET = health check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, bot: 'Colosseum Telegram Bot', status: 'active' });
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;

    // Regular messages (commands)
    if (update.message && update.message.text) {
      await handleMessage(update.message);
    }

    // Inline queries (@ColosseumBot topic in any chat)
    if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
    }

    // Callback queries (button presses — future use)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Always 200 so Telegram doesn't retry failed updates
    return res.status(200).json({ ok: true });
  }
};

// ============================================================
// MESSAGE HANDLER
// ============================================================
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const firstName = msg.from.first_name || 'Gladiator';

  // In groups, commands may have @botname suffix — strip it
  const command = text.split('@')[0].split(' ')[0].toLowerCase();
  const args = text.replace(/^\/\w+(@\w+)?\s*/, '').trim();

  switch (command) {
    case '/start':
      return sendWelcome(chatId, firstName);
    case '/debate':
    case '/settle':
      return args ? createDebate(chatId, args, firstName) : sendNeedTopic(chatId);
    case '/trending':
    case '/hot':
      return sendTrending(chatId);
    case '/help':
      return sendHelp(chatId);
    default:
      // In private chat only — don't spam groups
      if (!isGroup && text.startsWith('/')) {
        return sendHelp(chatId);
      }
  }
}

// ============================================================
// /debate [topic] — THE CORE FEATURE
// ============================================================
async function createDebate(chatId, topic, firstName) {
  const slug = slugify(topic);
  const debateUrl = `${SITE_URL}/debate?topic=${slug}&title=${encodeURIComponent(topic)}&src=telegram`;

  // 1. Send branded message with Colosseum link
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text:
      `⚔️ *DEBATE STARTED*\n\n` +
      `"${escapeMd(topic)}"\n\n` +
      `Started by *${escapeMd(firstName)}* — vote below, then settle it for real\\.\n\n` +
      `👇 Tap to vote in the poll\\. Tap the link to join the arena\\.`,
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ Full Debate on The Colosseum', url: debateUrl }],
        [
          { text: '📊 Share this debate', switch_inline_query: topic },
        ],
      ],
    },
  });

  // 2. Send native Telegram poll (handles voting automatically, no state needed)
  const question = topic.length > 300 ? topic.slice(0, 297) + '...' : topic;
  await callTelegram('sendPoll', {
    chat_id: chatId,
    question: question,
    options: JSON.stringify(['🔴 YES', '🔵 NO', '🤷 Not sure']),
    is_anonymous: false,
    allows_multiple_answers: false,
  });
}

// ============================================================
// /start — WELCOME
// ============================================================
async function sendWelcome(chatId, firstName) {
  const msg =
    `⚔️ *Welcome to The Colosseum, ${escapeMd(firstName)}\\!*\n\n` +
    `The arena where debates are settled\\.\n\n` +
    `🗣️ */debate* \\[topic\\] — Start a debate\n` +
    `🔥 */trending* — Today's hottest debates\n` +
    `❓ */help* — How it works\n\n` +
    `_Drop a hot take\\. See who agrees\\. Settle it for real\\._\n\n` +
    `Try it now: \`/debate Is Mahomes better than Josh Allen?\``;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏟️ Open The Colosseum', url: SITE_URL }],
      ],
    },
  });
}

// ============================================================
// /trending — HOT DEBATES
// ============================================================
async function sendTrending(chatId) {
  let msg = `🔥 *TRENDING DEBATES*\n\n`;
  TRENDING.forEach((d, i) => {
    const url = `${SITE_URL}/debate?topic=${d.slug}`;
    msg += `${d.icon} [${escapeMd(d.topic)}](${url})\n\n`;
  });
  msg += `_Vote free — no signup required\\._`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  });
}

// ============================================================
// /help
// ============================================================
async function sendHelp(chatId) {
  const msg =
    `⚔️ *THE COLOSSEUM BOT*\n\n` +
    `*Commands:*\n` +
    `🗣️ \`/debate Is pineapple on pizza valid?\`\n` +
    `Creates a poll \\+ Colosseum link for any topic\n\n` +
    `🔥 \`/trending\` — Today's hottest debates\n\n` +
    `*In any chat \\(inline mode\\):*\n` +
    `Type \`@${escapeMd(process.env.TELEGRAM_BOT_USERNAME || 'PASTE_BOT_USERNAME_HERE')} topic\` to share a debate without adding the bot to the group\n\n` +
    `*How it works:*\n` +
    `1\\. Someone drops a hot take\n` +
    `2\\. People vote in the Telegram poll\n` +
    `3\\. Want to go deeper? Tap the link for the full arena experience\n\n` +
    `_Every debate is free\\. Every vote counts\\._`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'MarkdownV2',
  });
}

// ============================================================
// PROMPT — no topic provided
// ============================================================
async function sendNeedTopic(chatId) {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text:
      `⚔️ Give me a topic to debate\\!\n\n` +
      `Example:\n` +
      `\`/debate Is LeBron the GOAT?\`\n` +
      `\`/debate Should college athletes get paid?\`\n` +
      `\`/settle Best fast food chain?\``,
    parse_mode: 'MarkdownV2',
  });
}

// ============================================================
// INLINE QUERY — @BotName topic (works in ANY chat)
// ============================================================
async function handleInlineQuery(query) {
  const text = (query.query || '').trim();
  const results = [];

  if (text.length >= 3) {
    // User typed a custom topic
    const slug = slugify(text);
    const debateUrl = `${SITE_URL}/debate?topic=${slug}&title=${encodeURIComponent(text)}&src=telegram-inline`;

    results.push({
      type: 'article',
      id: 'custom-' + slug.slice(0, 40),
      title: `⚔️ Debate: "${text}"`,
      description: 'Create a debate poll + Colosseum link',
      thumb_url: `${SITE_URL}/og-card-default.png`,
      input_message_content: {
        message_text:
          `⚔️ *SETTLE THIS*\n\n"${escapeMd(text)}"\n\n` +
          `🗳 What do you think? Vote and settle it for real:`,
        parse_mode: 'MarkdownV2',
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚔️ Vote on The Colosseum', url: debateUrl }],
        ],
      },
    });
  }

  // Always show trending debates
  TRENDING.forEach((d, i) => {
    const url = `${SITE_URL}/debate?topic=${d.slug}&src=telegram-inline`;
    results.push({
      type: 'article',
      id: 'trending-' + d.slug,
      title: `${d.icon} ${d.topic}`,
      description: 'Trending debate — tap to share',
      thumb_url: `${SITE_URL}/og-card-default.png`,
      input_message_content: {
        message_text:
          `⚔️ *TRENDING ON THE COLOSSEUM*\n\n` +
          `${d.icon} "${escapeMd(d.topic)}"\n\n` +
          `Cast your vote — no signup required:`,
        parse_mode: 'MarkdownV2',
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗳 Vote Now', url: url }],
        ],
      },
    });
  });

  await callTelegram('answerInlineQuery', {
    inline_query_id: query.id,
    results: JSON.stringify(results),
    cache_time: 60,
    is_personal: false,
  });
}

// ============================================================
// CALLBACK QUERY — future button presses
// ============================================================
async function handleCallback(callback) {
  await callTelegram('answerCallbackQuery', {
    callback_query_id: callback.id,
  });
}

// ============================================================
// TELEGRAM API HELPER
// ============================================================
async function callTelegram(method, body) {
  const resp = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, data.description);
  }
  return data;
}

// ============================================================
// UTILS
// ============================================================
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// Escape special chars for MarkdownV2
function escapeMd(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
