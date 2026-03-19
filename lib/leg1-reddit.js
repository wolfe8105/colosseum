// ============================================================
// THE COLOSSEUM — LEG 1: REDDIT BOT
// Scans argument-heavy subreddits for hot posts/comments.
// Generates contextual replies with natural Colosseum mentions.
// Respects rate limits, rotates cooldowns, avoids detection.
// ============================================================
const Snoowrap = require('snoowrap');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { config } = require('../bot-config');
const logger = require('./logger');
const { generateReply } = require('./ai-generator');
const { logBotAction } = require('./supabase-client');

let reddit = null;

// Track what we've replied to (in-memory, resets on restart — that's fine)
const repliedTo = new Set();
// Track last reply time per subreddit
const lastReplyTime = {};

function getClient() {
  if (!reddit) {
    const opts = {
      userAgent: config.reddit.userAgent,
      clientId: config.reddit.clientId,
      clientSecret: config.reddit.clientSecret,
      username: config.reddit.username,
      password: config.reddit.password,
      requestDelay: 1100,  // Reddit rate limit: ~60 req/min
      continueAfterRatelimitError: true,
    };

    // Add proxy if configured
    if (config.proxy.url) {
      opts.requestOptions = {
        agent: new HttpsProxyAgent(config.proxy.url),
      };
    }

    reddit = new Snoowrap(opts);
  }
  return reddit;
}

// ============================================================
// ARGUMENT DETECTION
// ============================================================

// Posts/comments containing these patterns are likely arguments
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
  /no way.{0,20}(better|worse|goat|best)/i,
  /not even close/i,
  /delusional/i,
  /clown take/i,
  /disagree/i,
  /dead wrong/i,
];

function isArgument(text) {
  if (!text || text.length < 20) return false;
  return ARGUMENT_SIGNALS.some(pattern => pattern.test(text));
}

function isGoodTarget(post) {
  // Skip: pinned, locked, removed, NSFW, our own posts, already replied
  if (post.stickied || post.locked || post.removed || post.over_18) return false;
  if (post.author?.name === config.reddit.username) return false;
  if (repliedTo.has(post.id)) return false;

  // Must have some engagement (not dead threads)
  const score = post.score || post.ups || 0;
  if (score < config.reddit.minScore) return false;

  return true;
}

// ============================================================
// MAIN SCAN + REPLY CYCLE
// ============================================================

async function scanAndReply() {
  if (!config.flags.leg1Reddit) return;

  logger.leg1('reddit', 'Starting scan cycle');
  let totalReplies = 0;

  for (const sub of config.reddit.subreddits) {
    try {
      // Respect cooldown per subreddit
      const now = Date.now();
      if (lastReplyTime[sub] && (now - lastReplyTime[sub]) < config.reddit.replyCooldownMs) {
        logger.debug(`Skipping r/${sub} — cooldown active`);
        continue;
      }

      if (totalReplies >= config.reddit.maxRepliesPerCycle) {
        logger.leg1('reddit', `Hit max replies (${config.reddit.maxRepliesPerCycle}), stopping cycle`);
        break;
      }

      const r = getClient();
      const posts = await r.getSubreddit(sub).getHot({ limit: config.reddit.postsPerScan });

      for (const post of posts) {
        if (totalReplies >= config.reddit.maxRepliesPerCycle) break;
        if (!isGoodTarget(post)) continue;

        // Check if the post title itself is an argument
        if (isArgument(post.title) || isArgument(post.selftext)) {
          await replyToPost(post, sub);
          totalReplies++;
          lastReplyTime[sub] = Date.now();
          break;  // One reply per subreddit per cycle
        }

        // Scan top comments for arguments
        try {
          const comments = await post.comments.fetchMore({ amount: 15 });
          for (const comment of comments) {
            if (totalReplies >= config.reddit.maxRepliesPerCycle) break;
            if (!comment.body || comment.body.length < 30) continue;
            if (repliedTo.has(comment.id)) continue;
            if (comment.author?.name === config.reddit.username) continue;

            if (isArgument(comment.body) && (comment.score || 0) >= config.reddit.minScore) {
              await replyToComment(comment, sub);
              totalReplies++;
              lastReplyTime[sub] = Date.now();
              break;  // One reply per subreddit per cycle
            }
          }
        } catch (commentErr) {
          logger.debug(`Failed to fetch comments for post ${post.id}: ${commentErr.message}`);
        }
      }
    } catch (err) {
      logger.error(`Reddit scan failed for r/${sub}: ${err.message}`);
      await logBotAction({
        leg: 1, platform: 'reddit', type: 'scan',
        success: false, error: err.message,
        metadata: { subreddit: sub },
      });
    }
  }

  logger.leg1('reddit', `Scan cycle complete — ${totalReplies} replies posted`);
}

// ============================================================
// REPLY FUNCTIONS
// ============================================================

async function replyToPost(post, subreddit) {
  const contextText = `${post.title}\n${(post.selftext || '').substring(0, 300)}`;

  try {
    const replyText = await generateReply(contextText, 'reddit');
    const fullReply = `${replyText}\n\n${config.app.baseUrl}`;

    if (config.dryRun) {
      logger.leg1('reddit', `[DRY RUN] Would reply to post in r/${subreddit}: "${post.title.substring(0, 50)}..."`);
      logger.debug(`Reply text: ${fullReply}`);
    } else {
      await post.reply(fullReply);
      logger.leg1('reddit', `Replied to post in r/${subreddit}: "${post.title.substring(0, 50)}..."`);
    }

    repliedTo.add(post.id);

    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      sourceUrl: `https://reddit.com${post.permalink}`,
      text: replyText,
      success: true,
      metadata: { subreddit, postTitle: post.title },
    });
  } catch (err) {
    logger.error(`Failed to reply to post in r/${subreddit}: ${err.message}`);
    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      success: false, error: err.message,
      metadata: { subreddit, postId: post.id },
    });
  }
}

async function replyToComment(comment, subreddit) {
  try {
    const replyText = await generateReply(comment.body, 'reddit');
    const fullReply = `${replyText}\n\n${config.app.baseUrl}`;

    if (config.dryRun) {
      logger.leg1('reddit', `[DRY RUN] Would reply to comment in r/${subreddit}: "${comment.body.substring(0, 50)}..."`);
      logger.debug(`Reply text: ${fullReply}`);
    } else {
      await comment.reply(fullReply);
      logger.leg1('reddit', `Replied to comment in r/${subreddit}`);
    }

    repliedTo.add(comment.id);

    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      text: replyText,
      success: true,
      metadata: { subreddit },
    });
  } catch (err) {
    logger.error(`Failed to reply to comment in r/${subreddit}: ${err.message}`);
    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      success: false, error: err.message,
      metadata: { subreddit },
    });
  }
}

// ============================================================
// TEST
// ============================================================
async function testScan() {
  console.log('\n--- Testing Reddit Scanner ---');
  console.log('Config:', {
    subreddits: config.reddit.subreddits.length,
    username: config.reddit.username?.substring(0, 3) + '***',
    dryRun: config.dryRun,
  });

  // Test argument detection
  console.log('\nArgument detection tests:');
  console.log('  "LeBron is overrated" →', isArgument('LeBron is overrated'));
  console.log('  "Nice weather today" →', isArgument('Nice weather today'));
  console.log('  "You\'re wrong and here\'s why" →', isArgument("You're wrong and here's why"));
  console.log('  "" →', isArgument(''));

  console.log('\nStarting scan (dry run)...');
  const origDryRun = config.dryRun;
  config.dryRun = true;
  await scanAndReply();
  config.dryRun = origDryRun;
}

module.exports = { scanAndReply, testScan };
