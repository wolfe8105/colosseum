// ============================================================
// THE COLOSSEUM — Telegram Bot Setup
// One-time endpoint: visit /api/telegram-setup to register webhook
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'PASTE_TELEGRAM_BOT_TOKEN_HERE';
const SITE_URL = process.env.SITE_URL || 'https://colosseum-six.vercel.app';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SITE_URL}/api/telegram-webhook`;

module.exports = async function handler(req, res) {
  // Check if token is configured
  if (!BOT_TOKEN || BOT_TOKEN === 'PASTE_TELEGRAM_BOT_TOKEN_HERE') {
    return res.status(200).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN not set',
      instructions: [
        '1. Talk to @BotFather on Telegram → /newbot → copy the token',
        '2. Go to Vercel → Settings → Environment Variables',
        '3. Add TELEGRAM_BOT_TOKEN = your-token-here',
        '4. Redeploy (Vercel → Deployments → Redeploy)',
        '5. Visit this URL again',
      ],
    });
  }

  const action = req.query.action || 'set';

  if (action === 'remove') {
    // Deregister webhook
    const resp = await fetch(`${TELEGRAM_API}/deleteWebhook`);
    const data = await resp.json();
    return res.status(200).json({ action: 'deleteWebhook', ...data });
  }

  if (action === 'info') {
    // Check current webhook status
    const resp = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await resp.json();
    return res.status(200).json({ action: 'getWebhookInfo', ...data });
  }

  // Default: register webhook
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'inline_query', 'callback_query'],
      drop_pending_updates: true,
    }),
  });
  const data = await resp.json();

  // Also enable inline mode by setting bot commands
  await fetch(`${TELEGRAM_API}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'debate', description: 'Start a debate — /debate Is LeBron the GOAT?' },
        { command: 'settle', description: 'Same as /debate — settle an argument' },
        { command: 'trending', description: "Today's hottest debates" },
        { command: 'help', description: 'How to use The Colosseum bot' },
      ],
    }),
  });

  return res.status(200).json({
    action: 'setWebhook',
    webhook_url: WEBHOOK_URL,
    ...data,
    next_steps: [
      'Webhook registered! Bot is live.',
      'Test: open Telegram, find your bot, send /start',
      'Add bot to a group chat, type /debate Is Mahomes better than Allen?',
      'Inline mode: type @YourBotUsername topic in any chat',
      '',
      'Other endpoints:',
      `  ${SITE_URL}/api/telegram-setup?action=info  — check webhook status`,
      `  ${SITE_URL}/api/telegram-setup?action=remove — remove webhook`,
    ],
  });
};
