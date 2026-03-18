// ============================================================
// THE COLOSSEUM — LEG 2: TWITTER/X POSTER (TypeScript)
// Posts hot takes to the brand Twitter/X account.
// Each post links to an auto-created debate/vote page.
// Times posts to peak engagement hours.
// Works on FREE API tier (write-only, 1,500 tweets/month).
// Migrated to TypeScript: Session 131.
// ============================================================
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../bot-config';
import logger from './logger';
import { logBotAction } from './supabase-client';

let twitterClient: TwitterApi | null = null;

let postsToday = 0;
let lastPostDate = new Date().toDateString();

export interface TwitterDebatePost {
  id?: string;
  hotTakeText: string;
  url: string;
  category?: string;
  urgent?: boolean;
}

export interface TwitterPostStatus {
  postsToday: number;
  maxPostsPerDay: number;
  isInPeakHour: boolean;
  remaining: number;
}

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

function resetDailyCounterIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== lastPostDate) {
    postsToday = 0;
    lastPostDate = today;
  }
}

function isInPeakHour(): boolean {
  const now = new Date();
  const estHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
  return config.twitter.peakHoursEST.includes(estHour);
}

export async function postHotTake(debate: TwitterDebatePost): Promise<unknown | null> {
  if (!config.flags.leg2Twitter) {
    logger.debug('Leg 2 Twitter posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  if (postsToday >= config.twitter.maxPostsPerDay) {
    logger.leg2('twitter', `Daily post limit reached (${config.twitter.maxPostsPerDay})`);
    return null;
  }

  if (!isInPeakHour() && !debate.urgent) {
    logger.debug('Not in peak hour — skipping non-urgent post');
    return null;
  }

  try {
    const maxTakeLength = 280 - 24 - 2;
    let tweetText = debate.hotTakeText;

    if (tweetText.length > maxTakeLength) {
      tweetText = tweetText.substring(0, maxTakeLength - 1) + '…';
    }

    const fullTweet = `${tweetText}\n\n${debate.url}`;

    if (config.dryRun) {
      logger.leg2('twitter', `[DRY RUN] Would post: "${fullTweet.substring(0, 80)}..."`);
      postsToday++;
      return { dry: true, text: fullTweet };
    }

    const client = getClient();
    const result = await client.v2.tweet(fullTweet);

    postsToday++;
    logger.leg2('twitter', `✅ Posted tweet ${result.data.id} — ${postsToday}/${config.twitter.maxPostsPerDay} today`);

    await logBotAction({
      leg: 2,
      platform: 'twitter',
      type: 'post',
      text: tweetText,
      debateId: debate.id,
      success: true,
      metadata: {
        tweetId: result.data.id,
        category: debate.category,
        postsToday,
      },
    });

    return result.data;
  } catch (err) {
    const error = err as Error & { code?: number };
    logger.error(`Twitter post failed: ${error.message}`);

    if (error.code === 429) {
      logger.error('Twitter rate limit hit — backing off');
    } else if (error.code === 403) {
      logger.error('Twitter 403 — check API permissions');
    }

    await logBotAction({
      leg: 2, platform: 'twitter', type: 'post',
      success: false, error: error.message,
    });

    return null;
  }
}

export function getStatus(): TwitterPostStatus {
  resetDailyCounterIfNeeded();
  return {
    postsToday,
    maxPostsPerDay: config.twitter.maxPostsPerDay,
    isInPeakHour: isInPeakHour(),
    remaining: config.twitter.maxPostsPerDay - postsToday,
  };
}
