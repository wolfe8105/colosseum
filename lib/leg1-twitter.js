// ============================================================
// THE COLOSSEUM — LEG 1: TWITTER/X REPLY BOT
//
// ⚠️  IMPORTANT LIMITATION:
// Twitter Free tier = WRITE-ONLY (post + delete tweets).
// You CANNOT search or read tweets on Free tier.
// Leg 1 Twitter scanning requires Basic API ($100/mo).
//
// This module is DISABLED by default (LEG1_TWITTER_ENABLED=false).
// Enable it only after upgrading to Basic API tier.
//
// Leg 2 Twitter POSTING works fine on Free tier — see
// leg2-twitter-poster.js for that.
// ============================================================
const { TwitterApi } = require('twitter-api-v2');
const { config } = require('../bot-config');
const logger = require('./logger');
const { generateReply } = require('./ai-generator');
const { logBotAction } = require('./supabase-client');

let twitterClient = null;
const repliedTo = new Set();

function getClient() {
  if (!twitterClient) {
    twitterClient = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });
  }
  return twitterClient;
}

// Search queries to find arguments on Twitter
const SEARCH_QUERIES = [
  '"hot take" -is:retweet lang:en',
  '"terrible take" -is:retweet lang:en',
  '"overrated" OR "underrated" -is:retweet lang:en',
  '"you\'re wrong" -is:retweet lang:en',
  '"unpopular opinion" (sports OR politics OR NBA OR NFL) -is:retweet lang:en',
];

// ============================================================
// MAIN SCAN + REPLY CYCLE
// ============================================================

async function scanAndReply() {
  if (!config.flags.leg1Twitter) {
    logger.debug('Leg 1 Twitter is disabled (needs Basic API tier)');
    return;
  }

  logger.leg1('twitter', 'Starting scan cycle');

  try {
    const client = getClient();
    const readClient = client.readOnly;

    // Pick a random search query each cycle to diversify
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

      // Skip low-engagement tweets
      const metrics = tweet.public_metrics || {};
      if ((metrics.like_count || 0) < 3) continue;

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

        // Delay between replies
        await sleep(30_000 + Math.random() * 60_000);
      } catch (replyErr) {
        logger.error(`Failed to reply to tweet ${tweet.id}: ${replyErr.message}`);
        await logBotAction({
          leg: 1, platform: 'twitter', type: 'reply',
          success: false, error: replyErr.message,
        });
      }
    }

    logger.leg1('twitter', `Scan cycle complete — ${replies} replies`);
  } catch (err) {
    if (err.code === 403 || err.message?.includes('forbidden')) {
      logger.error('Twitter Leg 1 scan failed — likely Free tier (no read access). Upgrade to Basic ($100/mo) or disable LEG1_TWITTER_ENABLED.');
    } else {
      logger.error(`Twitter Leg 1 scan failed: ${err.message}`);
    }

    await logBotAction({
      leg: 1, platform: 'twitter', type: 'scan',
      success: false, error: err.message,
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scanAndReply };
