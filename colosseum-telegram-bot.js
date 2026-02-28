// ============================================================
// COLOSSEUM TELEGRAM BOT — "Settle It" (Item 16.6.1)
// Intercepts arguments in Telegram group chats.
// /debate command → inline poll + link back to Colosseum.
// PASTE HERE markers = human action required.
//
// DEPLOYMENT: Railway (free) or Render (free)
// See DEPLOYMENT section at bottom of file.
// ============================================================

const { Bot, InlineKeyboard, webhookCallback } = require('grammy');

// ========== CONFIGURATION ==========
// Human: Go to Telegram → @BotFather → /newbot → copy token
// Option A: Set as environment variable BOT_TOKEN in Railway/Render (recommended)
// Option B: PASTE your bot token below:
const BOT_TOKEN = process.env.BOT_TOKEN || 'PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE';

// Your Colosseum landing page base URL
const COLOSSEUM_URL = process.env.COLOSSEUM_URL || 'https://colosseum-six.vercel.app';

// ========== BOT INSTANCE ==========
const bot = new Bot(BOT_TOKEN);

// ========== HELPERS ==========

// Slugify a topic for URL
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
}

// Track votes in memory (resets on restart — real votes happen on Colosseum)
const votes = {};

// ========== /start COMMAND ==========
bot.command('start', async (ctx) => {
  await ctx.reply(
    `⚔️ *Welcome to The Colosseum*\n\n` +
    `I settle arguments. Drop a hot take in any group chat and I'll make it official.\n\n` +
    `*Commands:*\n` +
    `/debate Is Mahomes better than Allen? — Start a debate\n` +
    `/hottake The Lakers are frauds — Post a hot take\n` +
    `/trending — See what's being debated now\n\n` +
    `Add me to any group chat. When an argument breaks out, type /debate and let the people decide.\n\n` +
    `🏛️ Full arena: ${COLOSSEUM_URL}`,
    { parse_mode: 'Markdown' }
  );
});

// ========== /help COMMAND ==========
bot.command('help', async (ctx) => {
  await ctx.reply(
    `⚔️ *The Colosseum — Commands*\n\n` +
    `/debate [topic] — Start a poll\n` +
    `Example: /debate Is Caleb Downs worth a top 10 pick?\n\n` +
    `/hottake [take] — Drop a hot take\n` +
    `Example: /hottake The Cowboys are the most overrated franchise in sports\n\n` +
    `/trending — See trending debates\n\n` +
    `*Works in group chats and DMs.*\n` +
    `Add me to a group → arguments get settled.`,
    { parse_mode: 'Markdown' }
  );
});

// ========== /debate COMMAND ==========
bot.command('debate', async (ctx) => {
  const topic = ctx.message.text.replace(/^\/debate\s*/i, '').trim();

  if (!topic) {
    await ctx.reply(
      `⚔️ Usage: /debate [your topic]\n\n` +
      `Example:\n` +
      `/debate Is Mahomes the GOAT?\n` +
      `/debate Should the US ban TikTok?\n` +
      `/debate Lebron or Jordan?`
    );
    return;
  }

  const slug = slugify(topic);
  const debateId = `${ctx.chat.id}_${Date.now()}`;
  const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=telegram`;

  // Initialize vote tracking
  votes[debateId] = { yes: 0, no: 0, voters: new Set() };

  const keyboard = new InlineKeyboard()
    .text(`🟢 YES (0)`, `vote_yes_${debateId}`)
    .text(`🔴 NO (0)`, `vote_no_${debateId}`)
    .row()
    .url('⚔️ Full Debate on The Colosseum', debateUrl);

  await ctx.reply(
    `⚔️ *DEBATE*\n\n` +
    `📢 *${topic}*\n\n` +
    `Cast your vote below 👇\n` +
    `────────────────────\n` +
    `🟢 YES: ░░░░░░░░░░ 0%\n` +
    `🔴 NO:  ░░░░░░░░░░ 0%\n` +
    `────────────────────\n` +
    `Votes: 0 | Started by @${ctx.from.username || ctx.from.first_name}\n\n` +
    `_Think you can defend your side? Take it to The Colosseum._`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// ========== VOTE HANDLER ==========
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  // Parse vote
  const yesMatch = data.match(/^vote_yes_(.+)$/);
  const noMatch = data.match(/^vote_no_(.+)$/);

  if (!yesMatch && !noMatch) return;

  const debateId = yesMatch ? yesMatch[1] : noMatch[1];
  const side = yesMatch ? 'yes' : 'no';

  // Initialize if needed (bot may have restarted)
  if (!votes[debateId]) {
    votes[debateId] = { yes: 0, no: 0, voters: new Set() };
  }

  const debate = votes[debateId];

  // Check if already voted
  if (debate.voters.has(userId)) {
    await ctx.answerCallbackQuery({ text: '⚔️ You already voted! One vote per gladiator.', show_alert: false });
    return;
  }

  // Record vote
  debate.voters.add(userId);
  debate[side]++;

  const total = debate.yes + debate.no;
  const yesPct = total > 0 ? Math.round((debate.yes / total) * 100) : 0;
  const noPct = total > 0 ? Math.round((debate.no / total) * 100) : 0;

  // Build vote bars (10 blocks)
  const yesBlocks = Math.round(yesPct / 10);
  const noBlocks = Math.round(noPct / 10);
  const yesBar = '█'.repeat(yesBlocks) + '░'.repeat(10 - yesBlocks);
  const noBar = '█'.repeat(noBlocks) + '░'.repeat(10 - noBlocks);

  // Extract topic from original message
  const originalText = ctx.callbackQuery.message?.text || '';
  const topicMatch = originalText.match(/📢 \*?(.+?)\*?\n/);
  const topic = topicMatch ? topicMatch[1] : 'This debate';
  const slug = slugify(topic);
  const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=telegram`;

  // Update keyboard with new counts
  const keyboard = new InlineKeyboard()
    .text(`🟢 YES (${debate.yes})`, `vote_yes_${debateId}`)
    .text(`🔴 NO (${debate.no})`, `vote_no_${debateId}`)
    .row()
    .url('⚔️ Full Debate on The Colosseum', debateUrl);

  // Update message
  try {
    await ctx.editMessageText(
      `⚔️ *DEBATE*\n\n` +
      `📢 *${topic}*\n\n` +
      `Cast your vote below 👇\n` +
      `────────────────────\n` +
      `🟢 YES: ${yesBar} ${yesPct}%\n` +
      `🔴 NO:  ${noBar} ${noPct}%\n` +
      `────────────────────\n` +
      `Votes: ${total}\n\n` +
      `_Think you can defend your side? Take it to The Colosseum._`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch (e) {
    // Message unchanged — ignore
  }

  await ctx.answerCallbackQuery({
    text: `⚔️ Voted ${side.toUpperCase()}! ${yesPct}% YES / ${noPct}% NO`,
    show_alert: false
  });
});

// ========== /hottake COMMAND ==========
bot.command('hottake', async (ctx) => {
  const take = ctx.message.text.replace(/^\/hottake\s*/i, '').trim();

  if (!take) {
    await ctx.reply(
      `🔥 Usage: /hottake [your take]\n\n` +
      `Example: /hottake The Cowboys are the most overrated franchise in sports`
    );
    return;
  }

  const slug = slugify(take);
  const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=telegram`;

  const keyboard = new InlineKeyboard()
    .text('🔥 FIRE', `react_fire_${Date.now()}`)
    .text('🗑️ TRASH', `react_trash_${Date.now()}`)
    .text('⚔️ BET.', `react_bet_${Date.now()}`)
    .row()
    .url('Debate this on The Colosseum', debateUrl);

  const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  await ctx.reply(
    `🔥 *HOT TAKE*\n\n` +
    `"${take}"\n` +
    `— ${username}\n\n` +
    `React below 👇`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// ========== /trending COMMAND ==========
bot.command('trending', async (ctx) => {
  // Placeholder trending data — will pull from Supabase when real debates exist
  const trending = [
    { topic: 'Is Mahomes better than Josh Allen?', votes: 2847, pct: '62/38' },
    { topic: 'Should college athletes get paid more?', votes: 1923, pct: '71/29' },
    { topic: 'Are the Lakers a real contender?', votes: 1456, pct: '44/56' },
    { topic: 'Trump tariffs: good or bad for economy?', votes: 3102, pct: '48/52' },
    { topic: 'Is Beyoncé the greatest performer ever?', votes: 2234, pct: '67/33' },
  ];

  let msg = `📊 *TRENDING ON THE COLOSSEUM*\n\n`;

  trending.forEach((d, i) => {
    const slug = slugify(d.topic);
    msg += `${i + 1}. *${d.topic}*\n   ${d.votes.toLocaleString()} votes — ${d.pct} split\n\n`;
  });

  msg += `\n⚔️ Vote now: ${COLOSSEUM_URL}`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ========== INLINE QUERY (share debates anywhere) ==========
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();

  if (!query) {
    await ctx.answerInlineQuery([{
      type: 'article',
      id: 'help',
      title: '⚔️ Start a debate',
      description: 'Type a topic to create a shareable debate',
      input_message_content: {
        message_text: `⚔️ *The Colosseum* — Where opinions fight.\n\nDrop a hot take and let the people decide.\n\n🏛️ ${COLOSSEUM_URL}`,
        parse_mode: 'Markdown'
      }
    }]);
    return;
  }

  const slug = slugify(query);
  const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=telegram-inline`;

  await ctx.answerInlineQuery([{
    type: 'article',
    id: `debate_${Date.now()}`,
    title: `⚔️ ${query}`,
    description: 'Tap to share this debate in any chat',
    input_message_content: {
      message_text:
        `⚔️ *DEBATE: ${query}*\n\n` +
        `What do you think? Vote now 👇\n\n` +
        `🏛️ ${debateUrl}\n\n` +
        `_Settle YOUR debate → thecolosseum.app_`,
      parse_mode: 'Markdown'
    }
  }]);
});

// ========== ERROR HANDLER ==========
bot.catch((err) => {
  console.error('Bot error:', err);
});

// ========== START BOT ==========
// Two modes: polling (dev) or webhook (production)
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Set in Railway/Render env vars

if (WEBHOOK_URL) {
  // Production: webhook mode (recommended for Railway/Render)
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.post('/webhook', webhookCallback(bot, 'express'));
  app.get('/', (req, res) => res.send('⚔️ Colosseum Telegram Bot is running'));
  app.listen(PORT, async () => {
    await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`);
    console.log(`⚔️ Colosseum Telegram Bot running on port ${PORT} (webhook mode)`);
  });
} else {
  // Development: long polling
  bot.start({
    onStart: () => console.log('⚔️ Colosseum Telegram Bot running (polling mode)'),
  });
}


// ============================================================
// DEPLOYMENT INSTRUCTIONS
// ============================================================
//
// STEP 1: CREATE YOUR BOT
// ────────────────────────
// 1. Open Telegram, search for @BotFather
// 2. Send /newbot
// 3. Name: "The Colosseum" (or "Colosseum Debate Bot")
// 4. Username: ColosseumdebateBot (or similar — must end in "bot")
// 5. BotFather gives you a token like: 7123456789:AAH...
// 6. PASTE that token into BOT_TOKEN above (line 18)
//
// STEP 2: CONFIGURE YOUR BOT
// ────────────────────────
// Send these to @BotFather:
//   /setdescription → "⚔️ Settle arguments in any group chat. Drop a topic, vote, debate."
//   /setabouttext → "The Colosseum — Where opinions fight. thecolosseum.app"
//   /setcommands → paste this:
//     debate - Start a debate on any topic
//     hottake - Drop a hot take for reactions
//     trending - See trending debates
//     help - How to use this bot
//   /setinline → Enable inline mode (lets users share debates in any chat via @YourBotName)
//   /setinlinefeedback → Enable (optional, for analytics)
//   /setuserpic → Upload your Colosseum logo
//
// STEP 3: DEPLOY TO RAILWAY (FREE)
// ────────────────────────
// 1. Go to railway.com → sign up free (GitHub login)
// 2. New Project → Deploy from GitHub repo (or "Empty Project" → add files)
// 3. Upload these 2 files:
//    - colosseum-telegram-bot.js
//    - package.json (see below)
// 4. Set environment variables in Railway dashboard:
//    - BOT_TOKEN = your token from BotFather
//    - WEBHOOK_URL = https://your-app.up.railway.app (Railway gives you this)
// 5. Deploy. Bot is live.
//
// ALTERNATIVE: Render (free)
// 1. Go to render.com → New Web Service → connect GitHub or upload
// 2. Build Command: npm install
// 3. Start Command: node colosseum-telegram-bot.js
// 4. Set same env vars as above
//
// STEP 4: TEST
// ────────────────────────
// 1. Open Telegram, search for your bot name
// 2. Send /start — should get welcome message
// 3. Send /debate Is Mahomes the GOAT? — should get poll
// 4. Add bot to a group chat → test /debate in group
// 5. Type @YourBotName in any chat to test inline mode
//
// package.json for this bot:
// {
//   "name": "colosseum-telegram-bot",
//   "version": "1.0.0",
//   "main": "colosseum-telegram-bot.js",
//   "scripts": {
//     "start": "node colosseum-telegram-bot.js"
//   },
//   "dependencies": {
//     "grammy": "^1.21.1",
//     "express": "^4.18.2"
//   }
// }
// ============================================================
