// ============================================================
// THE COLOSSEUM — LEG 2: TWITTER/X POSTER
// Posts hot takes to the @TheColosseum brand account.
// Each post links to an auto-created debate/vote page.
// Times posts to peak engagement hours.
// Works on FREE API tier (write-only, 1,500 tweets/month).
// ============================================================
const { TwitterApi } = require('twitter-api-v2');
const { config } = require('../bot-config');
const logger = require('./logger');
const { logBotAction } = require('./supabase-client');

let twitterClient = null;

// Track posts today (resets on restart — PM2 handles restarts)
let postsToday = 0;
let lastPostDate = new Date().toDateString();

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

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastPostDate) {
    postsToday = 0;
    lastPostDate = today;
  }
}

function isInPeakHour() {
  // Get current hour in EST
  const now = new Date();
  const estHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
  return config.twitter.peakHoursEST.includes(estHour);
}

// ============================================================
// POST A HOT TAKE
// ============================================================

/**
 * Post a hot take to the brand Twitter/X account.
 * @param {Object} debate - From debate creator { hotTakeText, url, category }
 * @returns {Object|null} - Tweet data or null on failure
 */
async function postHotTake(debate) {
  if (!config.flags.leg2Twitter) {
    logger.debug('Leg 2 Twitter posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  // Rate limiting: max posts per day
  if (postsToday >= config.twitter.maxPostsPerDay) {
    logger.leg2('twitter', `Daily post limit reached (${config.twitter.maxPostsPerDay})`);
    return null;
  }

  // Prefer peak hours but don't hard-block off-peak for breaking news
  if (!isInPeakHour()) {
    logger.debug('Not in peak hour — skipping non-urgent post');
    // Allow if score is very high (breaking news)
    // The caller can bypass this by passing { urgent: true }
    if (!debate.urgent) return null;
  }

  try {
    // Compose tweet: hot take + link
    // Twitter counts URLs as 23 chars regardless of length
    const maxTakeLength = 280 - 24 - 2;  // 23 for URL + newline buffer
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
    logger.error(`Twitter post failed: ${err.message}`);

    // Handle specific Twitter errors
    if (err.code === 429) {
      logger.error('Twitter rate limit hit — backing off');
    } else if (err.code === 403) {
      logger.error('Twitter 403 — check API permissions');
    }

    await logBotAction({
      leg: 2, platform: 'twitter', type: 'post',
      success: false, error: err.message,
    });

    return null;
  }
}

/**
 * Get posting status
 */
function getStatus() {
  resetDailyCounterIfNeeded();
  return {
    postsToday,
    maxPostsPerDay: config.twitter.maxPostsPerDay,
    isInPeakHour: isInPeakHour(),
    remaining: config.twitter.maxPostsPerDay - postsToday,
  };
}

module.exports = { postHotTake, getStatus };
