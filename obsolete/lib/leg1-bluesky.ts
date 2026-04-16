// ============================================================
// THE COLOSSEUM — LEG 1: BLUESKY BOT (TypeScript)
// Searches Bluesky for argument-heavy posts.
// Generates contextual replies with natural Colosseum mentions.
// CONSERVATIVE by default — Bluesky flags spam bots aggressively.
// Session 42. Migrated to TypeScript: Session 131.
// ============================================================
import { BskyAgent, RichText } from '@atproto/api';
import { config } from '../bot-config';
import logger from './logger';
import { generateReply } from './ai-generator';
import { logBotAction } from './supabase-client';

let agent: BskyAgent | null = null;

const repliedTo = new Set<string>();
let repliesToday = 0;
let lastResetDate = new Date().toDateString();

async function getAgent(): Promise<BskyAgent> {
  if (!agent) {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: config.bluesky.handle!,
      password: config.bluesky.appPassword!,
    });
    logger.leg1('bluesky', `Logged in as ${config.bluesky.handle}`);
  }
  return agent;
}

function resetDailyCounterIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    repliesToday = 0;
    lastResetDate = today;
  }
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
  /not even close/i,
  /delusional/i,
  /disagree/i,
  /dead wrong/i,
  /L take/i,
  /ratio/i,
];

function isArgument(text: string): boolean {
  if (!text || text.length < 20) return false;
  return ARGUMENT_SIGNALS.some(pattern => pattern.test(text));
}

const SEARCH_QUERIES: string[] = [
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// MAIN SCAN + REPLY CYCLE
// ============================================================
export async function scanAndReply(): Promise<void> {
  if (!config.flags.leg1Bluesky) return;

  resetDailyCounterIfNeeded();

  if (repliesToday >= config.bluesky.maxRepliesPerDay) {
    logger.leg1('bluesky', `Daily reply limit reached (${config.bluesky.maxRepliesPerDay})`);
    return;
  }

  logger.leg1('bluesky', 'Starting scan cycle');
  let totalReplies = 0;

  try {
    const bsky = await getAgent();

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

      const text = (post.record as Record<string, unknown>)?.text as string || '';
      const postUri = post.uri;
      const postCid = post.cid;

      if (post.author?.handle === config.bluesky.handle) continue;
      if (repliedTo.has(postUri)) continue;
      if (text.length < 30) continue;
      if (!isArgument(text)) continue;
      if ((post.likeCount || 0) < 2) continue;

      await replyToPost(bsky, post, text, postUri, postCid);
      totalReplies++;
      repliesToday++;
      repliedTo.add(postUri);

      await sleep(5000);
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg?.includes('ExpiredToken') || msg?.includes('InvalidToken')) {
      logger.leg1('bluesky', 'Session expired, re-authenticating...');
      agent = null;
    }
    logger.error(`Bluesky scan failed: ${msg}`);
    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'scan',
      success: false, error: msg,
    });
  }

  logger.leg1('bluesky', `Scan cycle complete — ${totalReplies} replies`);
}

async function replyToPost(
  bsky: BskyAgent,
  post: any,
  text: string,
  postUri: string,
  postCid: string,
): Promise<void> {
  try {
    const replyText = await generateReply(text, 'bluesky');
    const fullText = `${replyText}\n\n${config.bluesky.colosseumlUrl}`;

    const author = post.author as Record<string, unknown> | undefined;
    const handle = author?.handle as string || 'unknown';

    if (config.dryRun) {
      logger.leg1('bluesky', `[DRY RUN] Would reply to @${handle}: "${text.substring(0, 50)}..."`);
      logger.debug(`Reply: ${fullText}`);
    } else {
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
      logger.leg1('bluesky', `Replied to @${handle}`);
    }

    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'reply',
      text: replyText,
      success: true,
      metadata: { author: handle },
    });
  } catch (err) {
    logger.error(`Bluesky reply failed: ${(err as Error).message}`);
    await logBotAction({
      leg: 1, platform: 'bluesky', type: 'reply',
      success: false, error: (err as Error).message,
    });
  }
}
