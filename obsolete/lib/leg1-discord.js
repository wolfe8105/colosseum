// ============================================================
// THE COLOSSEUM — LEG 1: DISCORD BOT
// Joins argument-heavy servers via invite link.
// Listens for heated messages, drops contextual replies.
// Always-on (not cron-based — runs as persistent connection).
// ============================================================
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { config } = require('../bot-config');
const logger = require('./logger');
const { generateReply } = require('./ai-generator');
const { logBotAction } = require('./supabase-client');

let client = null;
let isReady = false;

// Cooldown tracking per channel
const channelCooldowns = new Map();

// ============================================================
// ARGUMENT DETECTION
// ============================================================

function isArgumentMessage(content) {
  if (!content || content.length < 15) return false;

  const lower = content.toLowerCase();
  return config.discord.argumentKeywords.some(kw => lower.includes(kw.toLowerCase()));
}

function isOnCooldown(channelId) {
  const last = channelCooldowns.get(channelId);
  if (!last) return false;
  return (Date.now() - last) < config.discord.channelCooldownMs;
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

async function handleMessage(message) {
  // Ignore bots (including ourselves), DMs, very short messages
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.length < 20) return;

  // Check if this looks like an argument
  if (!isArgumentMessage(message.content)) return;

  // Check cooldown for this channel
  if (isOnCooldown(message.channel.id)) return;

  try {
    const replyText = await generateReply(message.content, 'discord');
    const fullReply = `${replyText}\n\n🏛️ ${config.app.baseUrl}`;

    if (config.dryRun) {
      logger.leg1('discord', `[DRY RUN] Would reply in #${message.channel.name} (${message.guild.name}): "${message.content.substring(0, 50)}..."`);
      logger.debug(`Reply: ${fullReply}`);
    } else {
      await message.reply({
        content: fullReply,
        allowedMentions: { repliedUser: false },  // Don't ping them
      });
      logger.leg1('discord', `Replied in #${message.channel.name} (${message.guild.name})`);
    }

    // Set cooldown
    channelCooldowns.set(message.channel.id, Date.now());

    await logBotAction({
      leg: 1,
      platform: 'discord',
      type: 'reply',
      text: replyText,
      success: true,
      metadata: {
        guild: message.guild.name,
        channel: message.channel.name,
      },
    });
  } catch (err) {
    logger.error(`Discord reply failed in ${message.guild?.name}: ${err.message}`);
    await logBotAction({
      leg: 1, platform: 'discord', type: 'reply',
      success: false, error: err.message,
    });
  }
}

// ============================================================
// START / STOP
// ============================================================

async function start() {
  if (!config.flags.leg1Discord) {
    logger.debug('Leg 1 Discord is disabled');
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on(Events.ClientReady, () => {
    isReady = true;
    const guilds = client.guilds.cache.map(g => g.name).join(', ');
    logger.leg1('discord', `Bot online — connected to ${client.guilds.cache.size} servers: ${guilds}`);
  });

  client.on(Events.MessageCreate, handleMessage);

  client.on(Events.Error, (err) => {
    logger.error(`Discord client error: ${err.message}`);
  });

  try {
    await client.login(config.discord.botToken);
    logger.leg1('discord', 'Logging in...');
  } catch (err) {
    logger.error(`Discord login failed: ${err.message}`);
  }
}

async function stop() {
  if (client) {
    await client.destroy();
    isReady = false;
    logger.leg1('discord', 'Bot disconnected');
  }
}

function getStatus() {
  return {
    connected: isReady,
    guilds: client ? client.guilds.cache.size : 0,
    guildNames: client ? client.guilds.cache.map(g => g.name) : [],
  };
}

module.exports = { start, stop, getStatus };
