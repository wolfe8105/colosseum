// ============================================================
// THE COLOSSEUM — LEG 1: REDDIT BOT (TypeScript)
// Scans argument-heavy subreddits for hot posts/comments.
// Generates contextual replies with natural Colosseum mentions.
// Respects rate limits, rotates cooldowns, avoids detection.
// STATUS: DISABLED — pending Reddit API approval since March 4.
// Migrated to TypeScript: Session 131.
// ============================================================
import Snoowrap from 'snoowrap';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '../bot-config';
import logger from './logger';
import { generateReply } from './ai-generator';
import { logBotAction } from './supabase-client';

let reddit: Snoowrap | null = null;

const repliedTo = new Set<string>();
const lastReplyTime: Record<string, number> = {};

function getClient(): Snoowrap {
  if (!reddit) {
    const opts: Record<string, unknown> = {
      userAgent: config.reddit.userAgent,
      clientId: config.reddit.clientId,
      clientSecret: config.reddit.clientSecret,
      username: config.reddit.username,
      password: config.reddit.password,
      requestDelay: 1100,
      continueAfterRatelimitError: true,
    };

    if (config.proxy.url) {
      opts.requestOptions = {
        agent: new HttpsProxyAgent(config.proxy.url),
      };
    }

    reddit = new Snoowrap(opts as any);
  }
  return reddit;
}

const ARGUMENT_SIGNALS: RegExp[] = [
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

function isArgument(text: string): boolean {
  if (!text || text.length < 20) return false;
  return ARGUMENT_SIGNALS.some(pattern => pattern.test(text));
}

function isGoodTarget(post: any): boolean {
  if (post.stickied || post.locked || post.removed || post.over_18) return false;
  if (post.author?.name === config.reddit.username) return false;
  if (repliedTo.has(post.id)) return false;

  const score = post.score || post.ups || 0;
  if (score < config.reddit.minScore) return false;

  return true;
}

export async function scanAndReply(): Promise<void> {
  if (!config.flags.leg1Reddit) return;

  logger.leg1('reddit', 'Starting scan cycle');
  let totalReplies = 0;

  for (const sub of config.reddit.subreddits) {
    try {
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
      const posts = await (r.getSubreddit(sub) as any).getHot({ limit: config.reddit.postsPerScan });

      for (const post of posts) {
        if (totalReplies >= config.reddit.maxRepliesPerCycle) break;
        if (!isGoodTarget(post)) continue;

        if (isArgument(post.title) || isArgument(post.selftext)) {
          await replyToPost(post, sub);
          totalReplies++;
          lastReplyTime[sub] = Date.now();
          break;
        }

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
              break;
            }
          }
        } catch (commentErr) {
          logger.debug(`Failed to fetch comments for post ${post.id}: ${(commentErr as Error).message}`);
        }
      }
    } catch (err) {
      logger.error(`Reddit scan failed for r/${sub}: ${(err as Error).message}`);
      await logBotAction({
        leg: 1, platform: 'reddit', type: 'scan',
        success: false, error: (err as Error).message,
        metadata: { subreddit: sub },
      });
    }
  }

  logger.leg1('reddit', `Scan cycle complete — ${totalReplies} replies posted`);
}

async function replyToPost(post: any, subreddit: string): Promise<void> {
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
    logger.error(`Failed to reply to post in r/${subreddit}: ${(err as Error).message}`);
    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      success: false, error: (err as Error).message,
      metadata: { subreddit, postId: post.id },
    });
  }
}

async function replyToComment(comment: any, subreddit: string): Promise<void> {
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
    logger.error(`Failed to reply to comment in r/${subreddit}: ${(err as Error).message}`);
    await logBotAction({
      leg: 1, platform: 'reddit', type: 'reply',
      success: false, error: (err as Error).message,
      metadata: { subreddit },
    });
  }
}

export async function testScan(): Promise<void> {
  console.log('\n--- Testing Reddit Scanner ---');
  console.log('Config:', {
    subreddits: config.reddit.subreddits.length,
    username: config.reddit.username?.substring(0, 3) + '***',
    dryRun: config.dryRun,
  });

  console.log('\nArgument detection tests:');
  console.log('  "LeBron is overrated" →', isArgument('LeBron is overrated'));
  console.log('  "Nice weather today" →', isArgument('Nice weather today'));
  console.log('  "You\'re wrong and here\'s why" →', isArgument("You're wrong and here's why"));
  console.log('  "" →', isArgument(''));

  console.log('\nStarting scan (dry run)...');
  const origDryRun = config.dryRun;
  (config as any).dryRun = true;
  await scanAndReply();
  (config as any).dryRun = origDryRun;
}
