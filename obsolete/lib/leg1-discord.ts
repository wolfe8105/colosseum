// ============================================================
// THE COLOSSEUM — LEG 1: DISCORD BOT (TypeScript)
// Joins argument-heavy servers via invite link.
// Listens for heated messages, drops contextual replies.
// Always-on (not cron-based — runs as persistent connection).
// STATUS: DISABLED — hardcoded false in bot-config.js (Session 111).
// Migrated to TypeScript: Session 131.
// ============================================================
import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { config } from '../bot-config';
import logger from './logger';
import { generateReply } from './ai-generator';
import { logBotAction } from './supabase-client';

let client: Client | null = null;
let isReady = false;

const channelCooldowns = new Map<string, number>();

function isArgumentMessage(content: string): boolean {
  if (!content || content.length < 15) return false;
  const lower = content.toLowerCase();
  return config.discord.argumentKeywords.some(kw => lower.includes(kw.toLowerCase()));
}

function isOnCooldown(channelId: string): boolean {
  const last = channelCooldowns.get(channelId);
  if (!last) return false;
  return (Date.now() - last) < config.discord.channelCooldownMs;
}

async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.length < 20) return;
  if (!isArgumentMessage(message.content)) return;
  if (isOnCooldown(message.channel.id)) return;

  try {
    const replyText = await generateReply(message.content, 'discord');
    const fullReply = `${replyText}\n\n🏛️ ${config.app.baseUrl}`;

    if (config.dryRun) {
      logger.leg1('discord', `[DRY RUN] Would reply in #${(message.channel as any).name} (${message.guild.name}): "${message.content.substring(0, 50)}..."`);
      logger.debug(`Reply: ${fullReply}`);
    } else {
      await message.reply({
        content: fullReply,
        allowedMentions: { repliedUser: false },
      });
      logger.leg1('discord', `Replied in #${(message.channel as any).name} (${message.guild.name})`);
    }

    channelCooldowns.set(message.channel.id, Date.now());

    await logBotAction({
      leg: 1,
      platform: 'discord',
      type: 'reply',
      text: replyText,
      success: true,
      metadata: {
        guild: message.guild.name,
        channel: (message.channel as any).name,
      },
    });
  } catch (err) {
    logger.error(`Discord reply failed in ${message.guild?.name}: ${(err as Error).message}`);
    await logBotAction({
      leg: 1, platform: 'discord', type: 'reply',
      success: false, error: (err as Error).message,
    });
  }
}

export async function start(): Promise<void> {
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
    const guilds = client!.guilds.cache.map(g => g.name).join(', ');
    logger.leg1('discord', `Bot online — connected to ${client!.guilds.cache.size} servers: ${guilds}`);
  });

  client.on(Events.MessageCreate, handleMessage);

  client.on(Events.Error, (err: Error) => {
    logger.error(`Discord client error: ${err.message}`);
  });

  try {
    await client.login(config.discord.botToken);
    logger.leg1('discord', 'Logging in...');
  } catch (err) {
    logger.error(`Discord login failed: ${(err as Error).message}`);
  }
}

export async function stop(): Promise<void> {
  if (client) {
    await client.destroy();
    isReady = false;
    logger.leg1('discord', 'Bot disconnected');
  }
}

export interface DiscordStatus {
  connected: boolean;
  guilds: number;
  guildNames: string[];
}

export function getStatus(): DiscordStatus {
  return {
    connected: isReady,
    guilds: client ? client.guilds.cache.size : 0,
    guildNames: client ? client.guilds.cache.map(g => g.name) : [],
  };
}
