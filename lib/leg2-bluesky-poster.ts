// ============================================================
// THE COLOSSEUM — LEG 2/3: BLUESKY POSTER (TypeScript)
// Posts hot takes (Leg 2) and auto-debate rage bait (Leg 3)
// to the brand Bluesky account.
// Free API, no approval needed, 300 char post limit.
// Session 42. Session 99: content filter safety net added.
// Migrated to TypeScript: Session 131.
// ============================================================
import { BskyAgent, RichText } from '@atproto/api';
import { config } from '../bot-config';
import logger from './logger';
import { logBotAction } from './supabase-client';
import { filterContent } from './content-filter';

let agent: BskyAgent | null = null;
let postsToday = 0;
let lastPostDate = new Date().toDateString();

export interface HotTakePost {
  id?: string;
  hotTakeText: string;
  url: string;
  category?: string;
}

export interface AutoDebatePost {
  id?: string;
  shareHook: string;
  url: string;
}

export interface PostStatus {
  postsToday: number;
  maxPostsPerDay: number;
  remaining: number;
}

async function getAgent(): Promise<BskyAgent> {
  if (!agent) {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: config.bluesky.handle!,
      password: config.bluesky.appPassword!,
    });
  }
  return agent;
}

function resetDailyCounterIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== lastPostDate) {
    postsToday = 0;
    lastPostDate = today;
  }
}

// ============================================================
// LEG 2: POST A HOT TAKE
// ============================================================
export async function postHotTake(debate: HotTakePost): Promise<unknown | null> {
  if (!config.flags.leg2Bluesky) {
    logger.debug('Leg 2 Bluesky posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  if (postsToday >= config.bluesky.maxPostsPerDay) {
    logger.leg2('bluesky', `Daily post limit reached (${config.bluesky.maxPostsPerDay})`);
    return null;
  }

  // --- Content filter safety net (Session 99) ---
  const check = filterContent(debate.hotTakeText);
  if (!check.pass) {
    logger.warn(`[LEG2][BLUESKY] Post blocked by content filter: ${check.reason}`);
    await logBotAction({
      leg: 2, platform: 'bluesky', type: 'post_blocked',
      text: debate.hotTakeText?.substring(0, 100),
      success: false, error: `Content filter: ${check.reason}`,
    });
    return null;
  }

  try {
    const maxTakeLength = 300 - 50;
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
    const msg = (err as Error).message;
    if (msg?.includes('ExpiredToken') || msg?.includes('InvalidToken')) {
      agent = null;
    }
    logger.error(`Bluesky post failed: ${msg}`);
    await logBotAction({
      leg: 2, platform: 'bluesky', type: 'post',
      success: false, error: msg,
    });
    return null;
  }
}

// ============================================================
// LEG 3: POST AUTO-DEBATE RAGE BAIT
// ============================================================
export async function postAutoDebate(autoDebate: AutoDebatePost): Promise<unknown | null> {
  if (!config.flags.leg3BlueskyPost) {
    logger.debug('Leg 3 Bluesky posting is disabled');
    return null;
  }

  resetDailyCounterIfNeeded();

  if (postsToday >= config.bluesky.maxPostsPerDay) {
    logger.leg2('bluesky', `Daily post limit reached (${config.bluesky.maxPostsPerDay})`);
    return null;
  }

  // --- Content filter safety net (Session 99) ---
  const check = filterContent(autoDebate.shareHook);
  if (!check.pass) {
    logger.warn(`[LEG3][BLUESKY] Post blocked by content filter: ${check.reason}`);
    await logBotAction({
      leg: 3, platform: 'bluesky', type: 'auto_debate_blocked',
      text: autoDebate.shareHook?.substring(0, 100),
      success: false, error: `Content filter: ${check.reason}`,
    });
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
    const msg = (err as Error).message;
    if (msg?.includes('ExpiredToken') || msg?.includes('InvalidToken')) {
      agent = null;
    }
    logger.error(`Bluesky auto-debate post failed: ${msg}`);
    await logBotAction({
      leg: 3, platform: 'bluesky', type: 'auto_debate_posted',
      success: false, error: msg,
    });
    return null;
  }
}

// ============================================================
// STATUS
// ============================================================
export function getStatus(): PostStatus {
  resetDailyCounterIfNeeded();
  return {
    postsToday,
    maxPostsPerDay: config.bluesky.maxPostsPerDay,
    remaining: config.bluesky.maxPostsPerDay - postsToday,
  };
}
