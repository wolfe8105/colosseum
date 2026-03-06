// ============================================================
// THE COLOSSEUM — LEG 2/3: BLUESKY POSTER
// Posts hot takes (Leg 2) and auto-debate rage bait (Leg 3)
// to the brand Bluesky account.
// Free API, no approval needed, 300 char post limit.
// Session 42.
// ============================================================
const { BskyAgent, RichText } = require('@atproto/api');
const { config } = require('../bot-config');
const logger = require('./logger');
const { logBotAction } = require('./supabase-client');

let agent = null;

// Track posts today (resets on restart — PM2 handles restarts)
let postsToday = 0;
let lastPostDate = new Date().toDateString();

async function getAgent() {
  if (!agent) {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.appPassword,
    });
  }
  return agent;
}

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastPostDate) {
    postsToday = 0;
    lastPostDate = today;
  }
}

// ============================================================
// LEG 2: POST A HOT TAKE
// ============================================================

/**
 * Post a hot take to the brand Bluesky account.
 * @param {Object} debate - From debate creator { hotTakeText, url, category }
 * @returns {Object|null} - Post data or null on failure
 */
async function postHotTake(debate) {
  if (!config.flags.leg2Bluesky) {
    logger.debug('Leg 2 Bluesky posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  if (postsToday >= config.bluesky.maxPostsPerDay) {
    logger.leg2('bluesky', `Daily post limit reached (${config.bluesky.maxPostsPerDay})`);
    return null;
  }

  try {
    // Bluesky max is 300 chars. Leave room for URL + newlines.
    const maxTakeLength = 300 - 50; // URL + buffer
    let postText = debate.hotTakeText;
    if (postText.length > maxTakeLength) {
      postText = postText.substring(0, maxTakeLength - 1) + '…';
    }

    const fullText = `${postText}\n\n${debate.url}`;

    if (config.dryRun) {
      logger.leg2('bluesky', `[DRY RUN] Would post: "${fullText.substring(0, 80)}..."`);
      postsToday++;
      return { dry: true, text: fullText };
    }

    const bsky = await getAgent();

    // Build rich text for automatic link + mention detection
    const rt = new RichText({ text: fullText });
    await rt.detectFacets(bsky);

    const result = await bsky.post({
      text: rt.text,
      facets: rt.facets,
    });

    postsToday++;
    logger.leg2('bluesky', `✅ Posted — ${postsToday}/${config.bluesky.maxPostsPerDay} today`);

    await logBotAction({
      leg: 2, platform: 'bluesky', type: 'post',
      text: postText,
      debateId: debate.id,
      success: true,
      metadata: { category: debate.category, postsToday },
    });

    return result;
  } catch (err) {
    // Re-auth on session expiry
    if (err.message?.includes('ExpiredToken') || err.message?.includes('InvalidToken')) {
      agent = null;
    }
    logger.error(`Bluesky post failed: ${err.message}`);
    await logBotAction({
      leg: 2, platform: 'bluesky', type: 'post',
      success: false, error: err.message,
    });
    return null;
  }
}

// ============================================================
// LEG 3: POST AUTO-DEBATE RAGE BAIT
// ============================================================

/**
 * Post an auto-debate link to the brand Bluesky account.
 * @param {Object} autoDebate - { id, shareHook, url }
 * @returns {Object|null}
 */
async function postAutoDebate(autoDebate) {
  if (!config.flags.leg3BlueskyPost) {
    logger.debug('Leg 3 Bluesky posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  if (postsToday >= config.bluesky.maxPostsPerDay) {
    logger.leg2('bluesky', `Daily post limit reached (${config.bluesky.maxPostsPerDay})`);
    return null;
  }

  try {
    const fullText = `${autoDebate.shareHook}\n\n${autoDebate.url}`;

    if (config.dryRun) {
      logger.leg3('bluesky', `[DRY RUN] Would post auto-debate: "${autoDebate.shareHook.substring(0, 60)}..."`);
      postsToday++;
      return { dry: true };
    }

    const bsky = await getAgent();

    const rt = new RichText({ text: fullText });
    await rt.detectFacets(bsky);

    const result = await bsky.post({
      text: rt.text,
      facets: rt.facets,
    });

    postsToday++;
    logger.leg3('bluesky', `✅ Posted auto-debate: "${autoDebate.shareHook.substring(0, 50)}..."`);

    await logBotAction({
      leg: 3, platform: 'bluesky', type: 'auto_debate_posted',
      text: autoDebate.shareHook,
      debateId: autoDebate.id,
      success: true,
      metadata: { url: autoDebate.url },
    });

    return result;
  } catch (err) {
    if (err.message?.includes('ExpiredToken') || err.message?.includes('InvalidToken')) {
      agent = null;
    }
    logger.error(`Bluesky auto-debate post failed: ${err.message}`);
    await logBotAction({
      leg: 3, platform: 'bluesky', type: 'auto_debate_posted',
      success: false, error: err.message,
    });
    return null;
  }
}

// ============================================================
// STATUS
// ============================================================
function getStatus() {
  resetDailyCounterIfNeeded();
  return {
    postsToday,
    maxPostsPerDay: config.bluesky.maxPostsPerDay,
    remaining: config.bluesky.maxPostsPerDay - postsToday,
  };
}

module.exports = { postHotTake, postAutoDebate, getStatus };
