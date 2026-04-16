// ============================================================
// THE COLOSSEUM — SUPABASE CLIENT (TypeScript)
// Server-side Supabase connection using service role key.
// Bypasses RLS — this is trusted bot infrastructure.
// Creates debate/hot-take entries for Leg 2 auto-generated pages.
// Creates auto-debates for Leg 3 rage-click engine.
// Tracks all bot activity for analytics.
// Migrated to TypeScript: Session 131.
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../bot-config';
import logger from './logger';

let supabase: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(config.supabase.url!, config.supabase.serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

// ============================================================
// BOT ACTIVITY TRACKING
// ============================================================

export interface BotAction {
  leg: 1 | 2 | 3;
  platform: string;
  type: string;
  sourceUrl?: string | null;
  text?: string | null;
  debateId?: string | null;
  success?: boolean;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logBotAction(action: BotAction): Promise<void> {
  try {
    const db = getClient();
    const { error } = await db.from('bot_activity').insert({
      leg: action.leg,
      platform: action.platform,
      action_type: action.type,
      source_url: action.sourceUrl || null,
      generated_text: action.text || null,
      debate_id: action.debateId || null,
      success: action.success !== false,
      error_message: action.error || null,
      metadata: action.metadata || {},
    });

    if (error) {
      logger.error(`Failed to log bot action: ${error.message}`);
    }
  } catch (err) {
    // Logging failures should never crash the bot
    logger.error(`Bot activity logging exception: ${(err as Error).message}`);
  }
}

// ============================================================
// HOT TAKE CREATION (Leg 2)
// ============================================================

export interface CreateHotTakeParams {
  content: string;
  category?: string;
  sourceHeadline?: string | null;
  sourceUrl?: string | null;
}

export interface CreateResult {
  id: string;
  url: string;
}

const CATEGORY_TO_SLUG: Record<string, string> = {
  politics: 'politics',
  sports: 'sports',
  entertainment: 'entertainment',
  couples: 'couples-court',
  music: 'music',
  movies: 'movies',
  cars: 'cars',
  general: 'politics',
  trending: 'politics',
};

export async function createHotTake({ content, category, sourceHeadline, sourceUrl }: CreateHotTakeParams): Promise<CreateResult | null> {
  try {
    const db = getClient();
    const BOT_USER_ID = config.botUserId;

    if (!BOT_USER_ID) {
      logger.error('BOT_USER_ID not set — cannot create hot takes. Add it to .env');
      return null;
    }

    const { data, error } = await db.from('hot_takes').insert({
      user_id: BOT_USER_ID,
      content,
      section: category || 'trending',
      is_bot_generated: true,
      source_headline: sourceHeadline || null,
      source_url: sourceUrl || null,
    }).select('id').single();

    if (error) {
      logger.error(`Failed to create hot take: ${error.message}`);
      return null;
    }

    const takeId = data.id as string;
    // SESSION 94: Leg 2 links to category page so users land in relevant content.
    const mirrorUrl = config.app.mirrorUrl || 'https://colosseum-f30.pages.dev';
    const slug = CATEGORY_TO_SLUG[category || ''] || 'politics';
    const takeUrl = `${mirrorUrl}/category/${slug}.html`;

    logger.leg2('supabase', `Created hot take ${takeId}`, { category, url: takeUrl });

    await logBotAction({
      leg: 2,
      platform: 'supabase',
      type: 'debate_created',
      text: content,
      debateId: takeId,
      sourceUrl,
      success: true,
    });

    return { id: takeId, url: takeUrl };
  } catch (err) {
    logger.error(`Hot take creation exception: ${(err as Error).message}`);
    return null;
  }
}

// ============================================================
// AUTO-DEBATE CREATION (Leg 3)
// ============================================================

export interface AutoDebateRound {
  sideA: string;
  sideB: string;
}

export interface CreateAutoDebateParams {
  topic: string;
  category?: string;
  sideALabel: string;
  sideBLabel: string;
  description?: string;
  rounds: AutoDebateRound[];
  totalRounds: number;
  scoreA: number;
  scoreB: number;
  winner: string;
  judgeReasoning: string;
  margin?: string;
  shareHook?: string;
  sourceHeadline?: string | null;
  sourceUrl?: string | null;
}

export async function createAutoDebate({
  topic, category, sideALabel, sideBLabel, description,
  rounds, totalRounds, scoreA, scoreB, winner, judgeReasoning,
  margin, shareHook, sourceHeadline, sourceUrl,
}: CreateAutoDebateParams): Promise<CreateResult | null> {
  try {
    const db = getClient();

    const { data, error } = await db.from('auto_debates').insert({
      topic,
      category: category || 'general',
      side_a_label: sideALabel,
      side_b_label: sideBLabel,
      description,
      rounds: JSON.stringify(rounds),
      total_rounds: totalRounds,
      score_a: scoreA,
      score_b: scoreB,
      winner,
      judge_reasoning: judgeReasoning,
      margin,
      share_hook: shareHook,
      source_headline: sourceHeadline || null,
      source_url: sourceUrl || null,
      is_bot_generated: true,
      status: 'active',
    }).select('id').single();

    if (error) {
      logger.error(`Failed to create auto-debate: ${error.message}`);
      return null;
    }

    const debateId = data.id as string;
    // All bot links → mirror. Mirror debate pages at /debate/{id}.html
    const mirrorUrl = config.app.mirrorUrl || 'https://colosseum-f30.pages.dev';
    const debateUrl = `${mirrorUrl}/debate/${debateId}.html`;

    logger.leg3('supabase', `Created auto-debate ${debateId}`, { topic, url: debateUrl });

    return { id: debateId, url: debateUrl };
  } catch (err) {
    logger.error(`Auto-debate creation exception: ${(err as Error).message}`);
    return null;
  }
}

// ============================================================
// DEDUP + STATS
// ============================================================

export async function isHeadlineProcessed(headline: string): Promise<boolean> {
  try {
    const db = getClient();

    // Check both Leg 2 (hot takes) and Leg 3 (auto-debates)
    const { data: legData, error: legError } = await db
      .from('bot_activity')
      .select('id')
      .in('action_type', ['debate_created', 'auto_debate_created'])
      .ilike('generated_text', `%${headline.substring(0, 50)}%`)
      .limit(1);

    if (legError) return false;
    if (legData && legData.length > 0) return true;

    // Also check auto_debates table directly by source_headline
    const { data: adData, error: adError } = await db
      .from('auto_debates')
      .select('id')
      .ilike('source_headline', `%${headline.substring(0, 50)}%`)
      .limit(1);

    if (adError) return false;
    return !!(adData && adData.length > 0);
  } catch {
    return false;
  }
}

export interface BotStats {
  total: number;
  leg1: number;
  leg2: number;
  leg3: number;
  successes: number;
  failures: number;
  autoDebates: number;
  byPlatform: Record<string, number>;
}

export async function getBotStats(hours: number = 24): Promise<BotStats | null> {
  try {
    const db = getClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from('bot_activity')
      .select('leg, platform, action_type, success')
      .gte('created_at', since);

    if (error || !data) return null;

    const stats: BotStats = {
      total: data.length,
      leg1: data.filter(r => r.leg === 1).length,
      leg2: data.filter(r => r.leg === 2).length,
      leg3: data.filter(r => r.leg === 3).length,
      successes: data.filter(r => r.success).length,
      failures: data.filter(r => !r.success).length,
      autoDebates: data.filter(r => r.action_type === 'auto_debate_created' && r.success).length,
      byPlatform: {},
    };

    for (const row of data) {
      const key = row.platform as string;
      if (!stats.byPlatform[key]) stats.byPlatform[key] = 0;
      stats.byPlatform[key]++;
    }

    return stats;
  } catch (err) {
    logger.error(`Failed to get bot stats: ${(err as Error).message}`);
    return null;
  }
}
