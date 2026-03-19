// ============================================================
// THE COLOSSEUM — BOT ENGINE
// Main orchestrator. Runs on cron schedules.
// Ties Leg 1 (Reactive) + Leg 2 (Proactive) + Leg 3 (Auto-Debate) together.
// Start with: pm2 start ecosystem.config.js
// Updated Session 20: Leg 3 auto-debate pipeline added.
// Updated Session 59: Lemmy un-nested from Bluesky conditionals + formatFlags Lemmy entries.
// ============================================================
const cron = require('node-cron');
const { config, validateConfig } = require('./bot-config');
const logger = require('./lib/logger');

// Leg 1 modules
const leg1Reddit = require('./lib/leg1-reddit');
const leg1Twitter = require('./lib/leg1-twitter');
const leg1Discord = require('./lib/leg1-discord');
const leg1Bluesky = require('./lib/leg1-bluesky');

// Leg 2 modules
const leg2NewsScanner = require('./lib/leg2-news-scanner');
const leg2DebateCreator = require('./lib/leg2-debate-creator');
const leg2TwitterPoster = require('./lib/leg2-twitter-poster');
const leg2BlueskyPoster = require('./lib/leg2-bluesky-poster');
//const leg2LemmyPoster = require('./leg2-lemmy-poster');
//const leg3LemmyPoster = require('./leg3-lemmy-poster');

// Leg 3 modules (Session 20)
const leg3AutoDebate = require('./lib/leg3-auto-debate');

// Stats
const { getBotStats } = require('./lib/supabase-client');

// Track daily auto-debate count
let autoDebatesToday = 0;
let lastAutoDebateReset = new Date().toDateString();

// ============================================================
// STARTUP
// ============================================================

async function boot() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🏛️  THE COLOSSEUM — BOT ARMY v2.0     ║
  ║   Fully Automated Growth Engine          ║
  ║   + Rage-Click Auto-Debate Engine        ║
  ╚══════════════════════════════════════════╝
  `);

  // Validate config
  const { errors, warnings } = validateConfig();

  for (const w of warnings) {
    logger.warn(w);
  }

  if (errors.length > 0) {
    for (const e of errors) {
      logger.error(e);
    }
    logger.error('❌ Fix the above errors in .env and restart.');
    process.exit(1);
  }

  logger.info('✅ Config validated');
  logger.info(`Mode: ${config.dryRun ? '🧪 DRY RUN (no real posts)' : '🔴 LIVE'}`);
  logger.info(`Features: ${formatFlags()}`);

  // Start persistent connections
  await startPersistentBots();

  // Schedule cron jobs
  scheduleCronJobs();

  // Log stats every 6 hours
  scheduleStatsReport();

  logger.info('🚀 Bot army is operational');
}

function formatFlags() {
  const flags = [];
  if (config.flags.leg1Reddit) flags.push('L1-Reddit');
  if (config.flags.leg1Twitter) flags.push('L1-Twitter');
  if (config.flags.leg1Discord) flags.push('L1-Discord');
  if (config.flags.leg2News) flags.push('L2-News');
  if (config.flags.leg2Twitter) flags.push('L2-Twitter');
  if (config.flags.leg2DebateCreator) flags.push('L2-Debates');
  if (config.flags.leg3AutoDebate) flags.push('L3-AutoDebate');
  if (config.flags.leg3RedditPost) flags.push('L3-Reddit');
  if (config.flags.leg3TwitterPost) flags.push('L3-Twitter');
  if (config.flags.leg1Bluesky) flags.push('L1-Bluesky');
  if (config.flags.leg2Bluesky) flags.push('L2-Bluesky');
  if (config.flags.leg3BlueskyPost) flags.push('L3-Bluesky');
  if (config.flags.leg2Lemmy) flags.push('L2-Lemmy');
  if (config.flags.leg3LemmyPost) flags.push('L3-Lemmy');
  return flags.join(', ') || 'NONE (all disabled)';
}

// ============================================================
// PERSISTENT BOTS
// ============================================================

async function startPersistentBots() {
  if (config.flags.leg1Discord) {
    try {
      await leg1Discord.start();
    } catch (err) {
      logger.error(`Discord bot failed to start: ${err.message}`);
    }
  }
}

// ============================================================
// CRON SCHEDULES
// ============================================================

function jitteredRun(fn, label) {
  const jitter = Math.floor(Math.random() * 8 * 60 * 1000);
  setTimeout(async () => {
    try { await fn(); }
    catch (err) { logger.error(label + ' failed: ' + err.message); }
  }, jitter);
}

function scheduleCronJobs() {
  // ----------------------------------------
  // LEG 1: REACTIVE
  // ----------------------------------------

  if (config.flags.leg1Reddit) {
    cron.schedule('*/20 * * * *', () => jitteredRun(async () => {
      try {
        await leg1Reddit.scanAndReply();
      } catch (err) {
        logger.error(`Leg 1 Reddit cron failed: ${err.message}`);
      }
    }, 'L1-Reddit'));
  }

  // Bluesky Leg 1 — every 30 min (conservative)
  if (config.flags.leg1Bluesky) {
    cron.schedule('*/30 * * * *', () => jitteredRun(async () => {
      try {
        await leg1Bluesky.scanAndReply();
      } catch (err) {
        logger.error(`Leg 1 Bluesky cron failed: ${err.message}`);
      }
    }, 'L1-Bluesky'));
    logger.info('📅 Scheduled: Leg 1 Reddit — every 20 min');
  }

  if (config.flags.leg1Twitter) {
    cron.schedule('*/30 * * * *', () => jitteredRun(async () => {
      try {
        await leg1Twitter.scanAndReply();
      } catch (err) {
        logger.error(`Leg 1 Twitter cron failed: ${err.message}`);
      }
    }, 'L1-Twitter'));
    logger.info('📅 Scheduled: Leg 1 Twitter — every 30 min');
  }

  // ----------------------------------------
  // LEG 2: PROACTIVE — hot takes + brand posts
  // ----------------------------------------

  if (config.flags.leg2News) {
    cron.schedule('*/15 * * * *', () => jitteredRun(async () => {
      try {
        await runLeg2Pipeline();
      } catch (err) {
        logger.error(`Leg 2 pipeline cron failed: ${err.message}`);
      }
    }, 'L2-News'));
    logger.info('📅 Scheduled: Leg 2 Pipeline — every 15 min');
  }

  // ----------------------------------------
  // LEG 3: AUTO-DEBATE — rage-click engine (Session 20)
  // ----------------------------------------

  if (config.flags.leg3AutoDebate) {
    // Run every 45 minutes — fewer but higher-quality content pieces
    cron.schedule('5 */1 * * *', () => jitteredRun(async () => {
      try {
        await runLeg3Pipeline();
      } catch (err) {
        logger.error(`Leg 3 auto-debate cron failed: ${err.message}`);
      }
    }, 'L3-AutoDebate'));
    logger.info('📅 Scheduled: Leg 3 Auto-Debate — every hour at :05');
  }
}

// ============================================================
// LEG 2 PIPELINE
// ============================================================

async function runLeg2Pipeline() {
  logger.leg2('pipeline', 'Starting Leg 2 pipeline');

  const headlines = await leg2NewsScanner.scanNews(3);

  if (headlines.length === 0) {
    logger.leg2('pipeline', 'No fresh debate-worthy headlines found');
    return;
  }

  for (const headline of headlines) {
    try {
      const debate = await leg2DebateCreator.createDebateFromHeadline(headline);

      if (!debate) {
        logger.leg2('pipeline', `Skipped headline (creation failed): "${headline.title.substring(0, 50)}..."`);
        continue;
      }

      if (config.flags.leg2Twitter) {
        debate.urgent = headline.score >= 8;
        await leg2TwitterPoster.postHotTake(debate);
      }

      if (config.flags.leg2Bluesky) {
        await leg2BlueskyPoster.postHotTake(debate);
      }

      if (config.flags.leg2Lemmy) {
        //await leg2LemmyPoster.postHotTake(debate);
      }

      await sleep(15_000 + Math.random() * 30_000);
    } catch (err) {
      logger.error(`Leg 2 pipeline failed for headline: ${err.message}`);
    }
  }

  logger.leg2('pipeline', 'Leg 2 pipeline cycle complete');
}

// ============================================================
// LEG 3 PIPELINE — AUTO-DEBATE (Session 20)
// ============================================================

async function runLeg3Pipeline() {
  // Reset daily counter at midnight
  const today = new Date().toDateString();
  if (today !== lastAutoDebateReset) {
    autoDebatesToday = 0;
    lastAutoDebateReset = today;
  }

  // Check daily limit
  if (autoDebatesToday >= config.autoDebate.maxPerDay) {
    logger.leg3('pipeline', `Daily limit reached (${autoDebatesToday}/${config.autoDebate.maxPerDay}). Skipping.`);
    return;
  }

  logger.leg3('pipeline', `Starting Leg 3 pipeline (${autoDebatesToday}/${config.autoDebate.maxPerDay} today)`);

  // Use the same news scanner as Leg 2 — pick the most debate-worthy headlines
  const headlines = await leg2NewsScanner.scanNews(config.autoDebate.maxPerCycle);

  if (headlines.length === 0) {
    logger.leg3('pipeline', 'No fresh headlines for auto-debate');
    return;
  }

  for (const headline of headlines) {
    // Recheck daily limit inside loop
    if (autoDebatesToday >= config.autoDebate.maxPerDay) break;

    try {
      const autoDebate = await leg3AutoDebate.createAutoDebateFromHeadline(headline);

      if (!autoDebate) {
        logger.leg3('pipeline', `Skipped: "${headline.title.substring(0, 50)}..."`);
        continue;
      }

      autoDebatesToday++;

      // Post the auto-debate to Twitter with the rage-bait hook
      if (config.flags.leg3TwitterPost) {
        await leg2TwitterPoster.postHotTake({
          hotTakeText: autoDebate.shareHook,
          url: autoDebate.url,
          urgent: autoDebate.margin === 'landslide',
        });
      }

      // Post to Bluesky as an auto-debate
      if (config.flags.leg3BlueskyPost) {
        await leg2BlueskyPoster.postAutoDebate(autoDebate);
      }

      // Post to Lemmy as an auto-debate
      if (config.flags.leg3LemmyPost) {
        //await leg3LemmyPoster.postAutoDebate(autoDebate);
      }

      // Post to Reddit as a new thread (uses the share hook as title)
      if (config.flags.leg3RedditPost) {
        await postAutoDebateToReddit(autoDebate);
      }

      // Stagger between auto-debates — they're heavy (5+ AI calls each)
      await sleep(30_000 + Math.random() * 60_000);
    } catch (err) {
      logger.error(`Leg 3 pipeline failed for headline: ${err.message}`);
    }
  }

  logger.leg3('pipeline', `Leg 3 cycle complete. ${autoDebatesToday}/${config.autoDebate.maxPerDay} today.`);
}

/**
 * Post an auto-debate link to relevant subreddits as a new thread
 */
async function postAutoDebateToReddit(autoDebate) {
  try {
    // Map categories to relevant subreddits
    const subredditMap = {
      sports: ['sports', 'nba', 'nfl', 'unpopularopinion'],
      politics: ['politics', 'changemyview', 'unpopularopinion'],
      entertainment: ['entertainment', 'movies', 'unpopularopinion'],
      couples: ['relationship_advice', 'AmItheAsshole'],
      general: ['unpopularopinion', 'changemyview'],
    };

    const subs = subredditMap[autoDebate.category] || subredditMap.general;
    // Pick one random subreddit to avoid cross-posting spam
    const targetSub = subs[Math.floor(Math.random() * subs.length)];

    if (config.dryRun) {
      logger.leg3('reddit', `DRY RUN: Would post to r/${targetSub}: "${autoDebate.shareHook}"`);
      return;
    }

    // Use the existing Reddit leg1 module's API client to post
    // This is a link post, not a comment
    const snoowrap = require('snoowrap');
    const reddit = new snoowrap({
      userAgent: config.reddit.userAgent,
      clientId: config.reddit.clientId,
      clientSecret: config.reddit.clientSecret,
      username: config.reddit.username,
      password: config.reddit.password,
    });

    await reddit.getSubreddit(targetSub).submitLink({
      title: autoDebate.shareHook,
      url: autoDebate.url,
    });

    logger.leg3('reddit', `✅ Posted to r/${targetSub}: "${autoDebate.shareHook.substring(0, 50)}..."`);

    const { logBotAction } = require('./lib/supabase-client');
    await logBotAction({
      leg: 3,
      platform: 'reddit',
      type: 'auto_debate_posted',
      text: autoDebate.shareHook,
      debateId: autoDebate.id,
      success: true,
      metadata: { subreddit: targetSub, url: autoDebate.url },
    });
  } catch (err) {
    logger.error(`Leg 3 Reddit post failed: ${err.message}`);
    const { logBotAction } = require('./lib/supabase-client');
    await logBotAction({
      leg: 3,
      platform: 'reddit',
      type: 'auto_debate_posted',
      success: false,
      error: err.message,
    });
  }
}

// ============================================================
// STATS REPORT
// ============================================================

function scheduleStatsReport() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const stats = await getBotStats(24);
      if (stats) {
        logger.info('📊 24h Bot Stats:');
        logger.info(`   Total actions: ${stats.total}`);
        logger.info(`   Leg 1: ${stats.leg1} | Leg 2: ${stats.leg2} | Leg 3: ${stats.leg3}`);
        logger.info(`   Auto-debates created: ${stats.autoDebates}`);
        logger.info(`   Success: ${stats.successes} | Failures: ${stats.failures}`);
        logger.info(`   By platform: ${JSON.stringify(stats.byPlatform)}`);
      }
    } catch (err) {
      logger.error(`Stats report failed: ${err.message}`);
    }
  });

  setTimeout(async () => {
    const stats = await getBotStats(24);
    if (stats && stats.total > 0) {
      logger.info(`📊 Last 24h: ${stats.total} actions (${stats.leg1} L1, ${stats.leg2} L2, ${stats.leg3} L3, ${stats.autoDebates} auto-debates)`);
    }
  }, 5000);
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);

  try {
    await leg1Discord.stop();
  } catch (e) { /* ignore */ }

  await sleep(2000);

  logger.info('👋 Bot army shut down cleanly');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  logger.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// GO
// ============================================================
boot().catch(err => {
  logger.error(`Boot failed: ${err.message}`);
  process.exit(1);
});
