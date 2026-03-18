// ============================================================
// THE COLOSSEUM — LEG 3: AUTO-DEBATE ENGINE (TypeScript)
// The Rage-Click Engine.
//
// Takes a headline from the news scanner.
// Generates a FULL AI vs AI debate (3 rounds).
// Scores it LOPSIDED to trigger outrage.
// Saves to Supabase with a shareable URL.
// Returns a rage-bait share hook for social posts.
//
// Pipeline: headline → setup → 3 rounds → lopsided score → save → URL
// The debate page EXISTS before anyone clicks the link.
// Migrated to TypeScript: Session 131.
// ============================================================
import { config } from '../bot-config';
import logger from './logger';
import {
  generateAutoDebateSetup,
  generateAutoDebateRound,
  generateAutoDebateScore,
  generateShareHook,
  AutoDebateRoundResult,
} from './ai-generator';
import { createAutoDebate, logBotAction, isHeadlineProcessed, getClient } from './supabase-client';

// --- Type Definitions ---

export interface HeadlineInput {
  title: string;
  link: string;
  source: string;
  category?: string;
}

export interface AutoDebateResult {
  id: string;
  url: string;
  shareHook: string;
  topic: string;
  category: string;
  winner: string;
  winnerLabel: string;
  loserLabel: string;
  margin: string;
  scoreA: number;
  scoreB: number;
}

export interface UnpostedDebate {
  id: string;
  url: string;
  shareHook: string;
  topic: string;
  category: string;
  winner: string;
  winnerLabel: string;
  margin: string;
  scoreA: number;
  scoreB: number;
}

// Margin selection — weighted toward "clear" and "landslide" for max rage
interface MarginWeight {
  margin: string;
  weight: number;
}

const MARGIN_WEIGHTS: MarginWeight[] = [
  { margin: 'close', weight: 15 },
  { margin: 'clear', weight: 45 },
  { margin: 'landslide', weight: 40 },
];

function pickMargin(): string {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const { margin, weight } of MARGIN_WEIGHTS) {
    cumulative += weight;
    if (roll <= cumulative) return margin;
  }
  return 'clear';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Full auto-debate pipeline: headline → complete debate → Supabase → URL
 */
export async function createAutoDebateFromHeadline(headline: HeadlineInput): Promise<AutoDebateResult | null> {
  if (!config.flags.leg3AutoDebate) {
    logger.debug('Leg 3 Auto-Debate is disabled');
    return null;
  }

  try {
    logger.leg3('pipeline', `Starting auto-debate for: "${headline.title.substring(0, 60)}..."`);

    // Dedup check
    const alreadyDone = await isHeadlineProcessed(headline.title);
    if (alreadyDone) {
      logger.leg3('pipeline', `Skipping (already processed): "${headline.title.substring(0, 50)}..."`);
      return null;
    }

    // ---- STEP 1: Generate debate setup ----
    const setup = await generateAutoDebateSetup(headline.title, headline.category || 'general');
    if (!setup || !setup.topic) {
      logger.error('Auto-debate setup generation returned nothing');
      return null;
    }

    // ---- STEP 2: Determine the controversial winner + margin ----
    const winningSide = setup.controversialSide || (Math.random() > 0.5 ? 'a' : 'b');
    const margin = pickMargin();
    const totalRounds = config.autoDebate?.rounds || 3;

    logger.leg3('pipeline', `Setup: "${setup.topic}" | Winner: Side ${winningSide.toUpperCase()} | Margin: ${margin}`);

    // ---- STEP 3: Generate rounds ----
    const rounds: AutoDebateRoundResult[] = [];
    for (let i = 1; i <= totalRounds; i++) {
      const round = await generateAutoDebateRound(setup, i, totalRounds, rounds, winningSide);
      rounds.push(round);

      // Brief pause between AI calls to respect rate limits
      await sleep(1500);
    }

    if (rounds.length === 0) {
      logger.error('Failed to generate any debate rounds');
      return null;
    }

    // ---- STEP 4: Score the debate (lopsided) ----
    const scoring = await generateAutoDebateScore(setup, rounds, winningSide, margin);

    // ---- STEP 5: Generate the rage-bait share hook ----
    const shareHook = await generateShareHook(setup, winningSide, margin);

    // ---- STEP 6: Save to Supabase ----
    const result = await createAutoDebate({
      topic: setup.topic,
      category: setup.category || headline.category || 'general',
      sideALabel: setup.sideA.label,
      sideBLabel: setup.sideB.label,
      description: setup.description,
      rounds,
      totalRounds,
      scoreA: scoring.totalA,
      scoreB: scoring.totalB,
      winner: winningSide,
      judgeReasoning: scoring.judgeTake,
      margin,
      shareHook,
      sourceHeadline: headline.title,
      sourceUrl: headline.link,
    });

    if (!result) {
      logger.error('Failed to save auto-debate to Supabase');
      return null;
    }

    logger.leg3('pipeline', `✅ Auto-debate created: ${result.url}`);
    logger.leg3('pipeline', `   Topic: "${setup.topic}"`);
    logger.leg3('pipeline', `   Score: ${scoring.totalA}-${scoring.totalB} (${margin})`);
    logger.leg3('pipeline', `   Hook: "${shareHook.substring(0, 60)}..."`);

    await logBotAction({
      leg: 3,
      platform: 'supabase',
      type: 'auto_debate_created',
      text: shareHook,
      debateId: result.id,
      sourceUrl: headline.link,
      success: true,
      metadata: {
        topic: setup.topic,
        winner: winningSide,
        margin,
        scoreA: scoring.totalA,
        scoreB: scoring.totalB,
      },
    });

    return {
      id: result.id,
      url: result.url,
      shareHook,
      topic: setup.topic,
      category: setup.category || headline.category || 'general',
      winner: winningSide,
      winnerLabel: winningSide === 'a' ? setup.sideA.label : setup.sideB.label,
      loserLabel: winningSide === 'a' ? setup.sideB.label : setup.sideA.label,
      margin,
      scoreA: scoring.totalA,
      scoreB: scoring.totalB,
    };
  } catch (err) {
    logger.error(`Auto-debate pipeline failed: ${(err as Error).message}`);
    await logBotAction({
      leg: 3,
      platform: 'supabase',
      type: 'auto_debate_created',
      success: false,
      error: (err as Error).message,
      metadata: { headline: headline.title },
    });
    return null;
  }
}

/**
 * Get recent auto-debates that haven't been posted yet.
 * Returns debates created in the last N hours.
 */
export async function getUnpostedAutoDebates(hours: number = 6): Promise<UnpostedDebate[]> {
  try {
    const db = getClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from('auto_debates')
      .select('id, topic, category, share_hook, winner, margin, score_a, score_b, side_a_label, side_b_label')
      .eq('status', 'active')
      .eq('is_bot_generated', true)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error(`Failed to fetch unposted auto-debates: ${error.message}`);
      return [];
    }

    const mirrorUrl = (config.app as Record<string, unknown>).mirrorUrl as string || 'https://colosseum-f30.pages.dev';

    return (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      url: `${mirrorUrl}/debate/${d.id}.html`,
      shareHook: d.share_hook as string,
      topic: d.topic as string,
      category: d.category as string,
      winner: d.winner as string,
      winnerLabel: d.winner === 'a' ? d.side_a_label as string : d.side_b_label as string,
      margin: d.margin as string,
      scoreA: d.score_a as number,
      scoreB: d.score_b as number,
    }));
  } catch (err) {
    logger.error(`getUnpostedAutoDebates failed: ${(err as Error).message}`);
    return [];
  }
}
