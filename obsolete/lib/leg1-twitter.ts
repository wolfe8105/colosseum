// ============================================================
// THE COLOSSEUM — LEG 1: TWITTER/X REPLY BOT (TypeScript)
//
// ⚠️  IMPORTANT LIMITATION:
// Twitter Free tier = WRITE-ONLY (post + delete tweets).
// You CANNOT search or read tweets on Free tier.
// Leg 1 Twitter scanning requires Basic API ($100/mo).
//
// This module is DISABLED by default (LEG1_TWITTER_ENABLED=false).
// Enable it only after upgrading to Basic API tier.
// Migrated to TypeScript: Session 131.
// ============================================================
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../bot-config';
import logger from './logger';
import { generateReply } from './ai-generator';
import { logBotAction } from './supabase-client';

let twitterClient: TwitterApi | null = null;
const repliedTo = new Set<string>();

function getClient(): TwitterApi {
  if (!twitterClient) {
    twitterClient = new TwitterApi({
      appKey: config.twitter.apiKey!,
      appSecret: config.twitter.apiSecret!,
      accessToken: config.twitter.accessToken!,
      accessSecret: config.twitter.accessSecret!,
    });
  }
  return twitterClient;
}

const SEARCH_QUERIES: string[] = [
  '"hot take" -is:retweet lang:en',
  '"terrible take" -is:retweet lang:en',
  '"overrated" OR "underrated" -is:retweet lang:en',
  '"you\'re wrong" -is:retweet lang:en',
  '"unpopular opinion" (sports OR politics OR NBA OR NFL) -is:retweet lang:en',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scanAndReply(): Promise<void> {
  if (!config.flags.leg1Twitter) {
    logger.debug('Leg 1 Twitter is disabled (needs Basic API tier)');
    return;
  }

  logger.leg1('twitter', 'Starting scan cycle');

  try {
    const client = getClient();
    const readClient = client.readOnly;

    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

    const results = await readClient.v2.search(query, {
      max_results: 10,
      'tweet.fields': ['author_id', 'public_metrics', 'conversation_id'],
      sort_order: 'relevancy',
    });

    let replies = 0;
    const maxRepliesPerCycle = 3;

    for await (const tweet of results) {
      if (replies >= maxRepliesPerCycle) break;
      if (repliedTo.has(tweet.id)) continue;

      const metrics = tweet.public_metrics || {} as Record<string, number>;
      if (((metrics as any).like_count || 0) < 3) continue;

      try {
        const replyText = await generateReply(tweet.text, 'twitter');
        const fullReply = `${replyText}\n\n${config.app.baseUrl}`;

        if (config.dryRun) {
          logger.leg1('twitter', `[DRY RUN] Would reply to: "${tweet.text.substring(0, 50)}..."`);
        } else {
          await client.v2.reply(fullReply, tweet.id);
          logger.leg1('twitter', `Replied to tweet ${tweet.id}`);
        }

        repliedTo.add(tweet.id);
        replies++;

        await logBotAction({
          leg: 1, platform: 'twitter', type: 'reply',
          sourceUrl: `https://x.com/i/status/${tweet.id}`,
          text: replyText,
          success: true,
        });

        await sleep(30_000 + Math.random() * 60_000);
      } catch (replyErr) {
        logger.error(`Failed to reply to tweet ${tweet.id}: ${(replyErr as Error).message}`);
        await logBotAction({
          leg: 1, platform: 'twitter', type: 'reply',
          success: false, error: (replyErr as Error).message,
        });
      }
    }

    logger.leg1('twitter', `Scan cycle complete — ${replies} replies`);
  } catch (err) {
    const error = err as Error & { code?: number };
    if (error.code === 403 || error.message?.includes('forbidden')) {
      logger.error('Twitter Leg 1 scan failed — likely Free tier (no read access). Upgrade to Basic ($100/mo) or disable LEG1_TWITTER_ENABLED.');
    } else {
      logger.error(`Twitter Leg 1 scan failed: ${error.message}`);
    }

    await logBotAction({
      leg: 1, platform: 'twitter', type: 'scan',
      success: false, error: error.message,
    });
  }
}
