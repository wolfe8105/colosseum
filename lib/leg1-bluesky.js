// ============================================================
// THE COLOSSEUM — LEG 1: BLUESKY BOT
// Searches Bluesky for argument-heavy posts.
// Generates contextual replies with natural Colosseum mentions.
// CONSERVATIVE by default — Bluesky flags spam bots aggressively.
// Session 42.
// ============================================================
const { BskyAgent, RichText } = require('@atproto/api');
const { config } = require('../bot-config');
const logger = require('./logger');
const { generateReply } = require('./ai-generator');
const { logBotAction } = require('./supabase-client');

let agent = null;

// Track what we've replied to (in-memory, resets on restart)
const repliedTo = new Set();
let repliesToday = 0;
let lastResetDate = new Date().toDateString();

async function getAgent() {
  if (!agent) {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.appPassword,
    });
    logger.leg1('bluesky', `Logged in as ${config.bluesky.handle}`);
  }
  return agent;
}

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    repliesToday = 0;
    lastResetDate = today;
  }
}

// ============================================================
// ARGUMENT DETECTION (same signals as Reddit leg)
// ============================================================
const ARGUMENT_SIGNALS = [
  /you('re| are) wrong/i,
  /terrible take/i,
  /worst take/i,
  /hot take/i,
  /unpopular opinion/i,
  /change my (mind|view)/i,
  /fight me/i,
  /overrated/i,
  /underrated/i,
  /not even close/i,
  /delusional/i,
  /disagree/i,
  /dead wrong/i,
  /L take/i,
  /ratio/i,
];

function isArgument(text) {
  if (!text || text.length < 20) return false;
  return ARGUMENT_SIGNALS.some(pattern => pattern.test(text));
}

// ============================================================
// SEARCH QUERIES — rotate through argument-generating topics
// ============================================================
const SEARCH_QUERIES = [
  'overrated',
  'worst take',
  'hot take',
  'unpopular opinion',
  'you\'re wrong',
  'fight me',
  'not even close',
  'terrible take',
  'change my mind',
  'delusional',
];

// ============================================================
// MAIN SCAN + REPLY CYCLE
// ============================================================
async function scanAndReply() {
  if (!config.flags.leg1Bluesky) return;

  resetDailyCounterIfNeeded();

  // Very conservative daily limit — Bluesky bans spam
  if (repliesToday >= config.bluesky.maxRepliesPerDay) {
    logger.leg1('bluesky', `Daily reply limit reached (${config.bluesky.maxRepliesPerDay})`);
    return;
  }

  logger.leg1('bluesky', 'Starting scan cycle');
  let totalReplies = 0;

  try {
    const bsky = await getAgent();

    // Pick a random search query
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    logger.leg1('bluesky', `Searching: "${query}"`);

    const searchResult = await bsky.app.bsky.feed.searchPosts({
      q: query,
      limit: 15,
      sort: 'latest',
    });

    if (!searchResult.data?.posts?.length) {
      logger.leg1('bluesky', 'No posts found');
      return;
    }

    for (const post of searchResult.data.posts) {
      if (totalReplies >= config.bluesky.maxRepliesPerCycle) break;
      if (repliesToday >= config.bluesky.maxRepliesPerDay) break;

      const text = post.record?.text || '';
      const postUri = post.uri;
      const postCid = post.cid;
      const authorDid = post.author?.did;

      // Skip our own posts
      if (post.author?.handle === config.bluesky.handle) continue;
      // Skip already replied
      if (repliedTo.has(postUri)) continue;
      // Skip very short posts
      if (text.length < 30) continue;
      // Must match argument signals
      if (!isArgument(text)) continue;
      // Skip posts with low engagement (< 2 likes)
      if ((post.likeCount || 0) < 2) continue;

      await replyToPost(bsky, post, text, postUri, postCid);
      totalReplies++;
      repliesToday++;
      repliedTo.add(postUri);

      // Wait between replies to avoid rate limits
      await sleep(5000);
    }
  } catch (err) {
    // Re-auth on session expiry
    if (err.message?.includes('ExpiredToken') || err.message?.includes('InvalidToken')) {
      logger.leg1('bluesky', 'Session expired, re-authenticating...');
      agent = null;
    }
    logger.error(`Bluesky scan failed: ${err.message}`);
    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'scan',
      success: false, error: err.message,
    });
  }

  logger.leg1('bluesky', `Scan cycle complete — ${totalReplies} replies`);
}

// ============================================================
// REPLY FUNCTION
// ============================================================
async function replyToPost(bsky, post, text, postUri, postCid) {
  try {
    const replyText = await generateReply(text, 'bluesky');
    const fullText = `${replyText}\n\n${config.bluesky.colosseumlUrl}`;

    if (config.dryRun) {
      logger.leg1('bluesky', `[DRY RUN] Would reply to @${post.author?.handle}: "${text.substring(0, 50)}..."`);
      logger.debug(`Reply: ${fullText}`);
    } else {
      // Build rich text for link detection
      const rt = new RichText({ text: fullText });
      await rt.detectFacets(bsky);

      await bsky.post({
        text: rt.text,
        facets: rt.facets,
        reply: {
          root: { uri: postUri, cid: postCid },
          parent: { uri: postUri, cid: postCid },
        },
      });
      logger.leg1('bluesky', `Replied to @${post.author?.handle}`);
    }

    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'reply',
      text: replyText,
      success: true,
      metadata: { author: post.author?.handle },
    });
  } catch (err) {
    logger.error(`Bluesky reply failed: ${err.message}`);
    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'reply',
      success: false, error: err.message,
    });
  }
}

// ============================================================
// HELPERS
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scanAndReply };
