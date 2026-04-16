// ============================================================
// THE COLOSSEUM — BOT ENGINE (TypeScript)
// Main orchestrator. Runs on cron schedules.
// Ties Leg 1 (Reactive) + Leg 2 (Proactive) + Leg 3 (Auto-Debate) together.
// Start with: pm2 start ecosystem.config.js
// Migrated to TypeScript: Session 131.
// ============================================================
import cron from 'node-cron';
import Snoowrap from 'snoowrap';
import { config, validateConfig } from './bot-config';
import logger from './lib/logger';

// Leg 1 modules
import * as leg1Reddit from './lib/leg1-reddit';
import * as leg1Twitter from './lib/leg1-twitter';
import * as leg1Discord from './lib/leg1-discord';
import * as leg1Bluesky from './lib/leg1-bluesky';

// Leg 2 modules
import * as leg2NewsScanner from './lib/leg2-news-scanner';
import * as leg2DebateCreator from './lib/leg2-debate-creator';
import * as leg2TwitterPoster from './lib/leg2-twitter-poster';
import * as leg2BlueskyPoster from './lib/leg2-bluesky-poster';

// Leg 3 modules
import * as leg3AutoDebate from './lib/leg3-auto-debate';

// Stats
import { getBotStats, logBotAction } from './lib/supabase-client';

// Track daily auto-debate count
let autoDebatesToday = 0;
let lastAutoDebateReset = new Date().toDateString();

// ============================================================
// STARTUP
// ============================================================

async function boot(): Promise<void> {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🏛️  THE COLOSSEUM — BOT ARMY v2.0     ║
  ║   Fully Automated Growth Engine          ║
  ║   + Rage-Click Auto-Debate Engine        ║
  ╚══════════════════════════════════════════╝
  `);

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

  await startPersistentBots();
  scheduleCronJobs();
  scheduleStatsReport();

  logger.info('🚀 Bot army is operational');
}

function formatFlags(): string {
  const flags: string[] = [];
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
  return flags.join(', ') || 'NONE (all disabled)';
}

// ============================================================
// PERSISTENT BOTS
// ============================================================

async function startPersistentBots(): Promise<void> {
  if (config.flags.leg1Discord) {
    try {
      await leg1Discord.start();
    } catch (err) {
      logger.error(`Discord bot failed to start: ${(err as Error).message}`);
    }
  }
}

// ============================================================
// CRON SCHEDULES
// ============================================================

function jitteredRun(fn: () => Promise<void>, label: string): void {
  const jitter = Math.floor(Math.random() * 8 * 60 * 1000);
  setTimeout(async () => {
    try { await fn(); }
    catch (err) { logger.error(label + ' failed: ' + (err as Error).message); }
  }, jitter);
}

function scheduleCronJobs(): void {
  // LEG 1: REACTIVE

  if (config.flags.leg1Reddit) {
    cron.schedule('*/20 * * * *', () => jitteredRun(async () => {
      await leg1Reddit.scanAndReply();
    }, 'L1-Reddit'));
    logger.info('📅 Scheduled: Leg 1 Reddit — every 20 min');
  }

  if (config.flags.leg1Bluesky) {
    cron.schedule('*/30 * * * *', () => jitteredRun(async () => {
      await leg1Bluesky.scanAndReply();
    }, 'L1-Bluesky'));
    logger.info('📅 Scheduled: Leg 1 Bluesky — every 30 min');
  }

  if (config.flags.leg1Twitter) {
    cron.schedule('*/30 * * * *', () => jitteredRun(async () => {
      await leg1Twitter.scanAndReply();
    }, 'L1-Twitter'));
    logger.info('📅 Scheduled: Leg 1 Twitter — every 30 min');
  }

  // LEG 2: PROACTIVE

  if (config.flags.leg2News) {
    cron.schedule('*/15 * * * *', () => jitteredRun(async () => {
      await runLeg2Pipeline();
    }, 'L2-News'));
    logger.info('📅 Scheduled: Leg 2 Pipeline — every 15 min');
  }

  // LEG 3: AUTO-DEBATE

  if (config.flags.leg3AutoDebate) {
    cron.schedule('5 */1 * * *', () => jitteredRun(async () => {
      await runLeg3Pipeline();
    }, 'L3-AutoDebate'));
    logger.info('📅 Scheduled: Leg 3 Auto-Debate — every hour at :05');
  }
}

// ============================================================
// LEG 2 PIPELINE
// ============================================================

async function runLeg2Pipeline(): Promise<void> {
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
        await leg2TwitterPoster.postHotTake({
          ...debate,
          urgent: headline.score >= 8,
        });
      }

      if (config.flags.leg2Bluesky) {
        await leg2BlueskyPoster.postHotTake(debate);
      }

      await sleep(15_000 + Math.random() * 30_000);
    } catch (err) {
      logger.error(`Leg 2 pipeline failed for headline: ${(err as Error).message}`);
    }
  }

  logger.leg2('pipeline', 'Leg 2 pipeline cycle complete');
}

// ============================================================
// LEG 3 PIPELINE
// ============================================================

async function runLeg3Pipeline(): Promise<void> {
  const today = new Date().toDateString();
  if (today !== lastAutoDebateReset) {
    autoDebatesToday = 0;
    lastAutoDebateReset = today;
  }

  if (autoDebatesToday >= config.autoDebate.maxPerDay) {
    logger.leg3('pipeline', `Daily limit reached (${autoDebatesToday}/${config.autoDebate.maxPerDay}). Skipping.`);
    return;
  }

  logger.leg3('pipeline', `Starting Leg 3 pipeline (${autoDebatesToday}/${config.autoDebate.maxPerDay} today)`);

  const headlines = await leg2NewsScanner.scanNews(config.autoDebate.maxPerCycle);

  if (headlines.length === 0) {
    logger.leg3('pipeline', 'No fresh headlines for auto-debate');
    return;
  }

  for (const headline of headlines) {
    if (autoDebatesToday >= config.autoDebate.maxPerDay) break;

    try {
      const autoDebate = await leg3AutoDebate.createAutoDebateFromHeadline(headline);

      if (!autoDebate) {
        logger.leg3('pipeline', `Skipped: "${headline.title.substring(0, 50)}..."`);
        continue;
      }

      autoDebatesToday++;

      if (config.flags.leg3TwitterPost) {
        await leg2TwitterPoster.postHotTake({
          hotTakeText: autoDebate.shareHook,
          url: autoDebate.url,
          urgent: autoDebate.margin === 'landslide',
        });
      }

      if (config.flags.leg3BlueskyPost) {
        await leg2BlueskyPoster.postAutoDebate(autoDebate);
      }

      if (config.flags.leg3RedditPost) {
        await postAutoDebateToReddit(autoDebate);
      }

      await sleep(30_000 + Math.random() * 60_000);
    } catch (err) {
      logger.error(`Leg 3 pipeline failed for headline: ${(err as Error).message}`);
    }
  }

  logger.leg3('pipeline', `Leg 3 cycle complete. ${autoDebatesToday}/${config.autoDebate.maxPerDay} today.`);
}

async function postAutoDebateToReddit(autoDebate: any): Promise<void> {
  try {
    const subredditMap: Record<string, string[]> = {
      sports: ['sports', 'nba', 'nfl', 'unpopularopinion'],
      politics: ['politics', 'changemyview', 'unpopularopinion'],
      entertainment: ['entertainment', 'movies', 'unpopularopinion'],
      couples: ['relationship_advice', 'AmItheAsshole'],
      general: ['unpopularopinion', 'changemyview'],
    };

    const category = autoDebate.category as string || 'general';
    const subs = subredditMap[category] || subredditMap.general;
    const targetSub = subs[Math.floor(Math.random() * subs.length)];

    if (config.dryRun) {
      logger.leg3('reddit', `DRY RUN: Would post to r/${targetSub}: "${autoDebate.shareHook}"`);
      return;
    }

    const reddit = new Snoowrap({
      userAgent: config.reddit.userAgent!,
      clientId: config.reddit.clientId!,
      clientSecret: config.reddit.clientSecret!,
      username: config.reddit.username!,
      password: config.reddit.password!,
    } as any);

    await (reddit.getSubreddit(targetSub) as any).submitLink({
      title: autoDebate.shareHook as string,
      url: autoDebate.url as string,
    });

    logger.leg3('reddit', `✅ Posted to r/${targetSub}: "${(autoDebate.shareHook as string).substring(0, 50)}..."`);

    await logBotAction({
      leg: 3,
      platform: 'reddit',
      type: 'auto_debate_posted',
      text: autoDebate.shareHook as string,
      debateId: autoDebate.id as string,
      success: true,
      metadata: { subreddit: targetSub, url: autoDebate.url },
    });
  } catch (err) {
    logger.error(`Leg 3 Reddit post failed: ${(err as Error).message}`);
    await logBotAction({
      leg: 3,
      platform: 'reddit',
      type: 'auto_debate_posted',
      success: false,
      error: (err as Error).message,
    });
  }
}

// ============================================================
// STATS REPORT
// ============================================================

function scheduleStatsReport(): void {
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
      logger.error(`Stats report failed: ${(err as Error).message}`);
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

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully...`);

  try {
    await leg1Discord.stop();
  } catch { /* ignore */ }

  await sleep(2000);

  logger.info('👋 Bot army shut down cleanly');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught exception: ${err.message}`);
  logger.error(err.stack || '');
});
process.on('unhandledRejection', (reason: unknown) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// ============================================================
// HELPERS
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// GO
// ============================================================
boot().catch(err => {
  logger.error(`Boot failed: ${(err as Error).message}`);
  process.exit(1);
});
