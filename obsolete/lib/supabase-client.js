// ============================================================
// THE COLOSSEUM — SUPABASE CLIENT
// Server-side Supabase connection using service role key.
// Bypasses RLS — this is trusted bot infrastructure.
// Creates debate/hot-take entries for Leg 2 auto-generated pages.
// Creates auto-debates for Leg 3 rage-click engine (Session 20).
// Tracks all bot activity for analytics.
// Fixed Session 27: hot_takes column name (section not category),
//   botUserId from config.
// Fixed Session 94: Leg 2 URLs now link to category pages, not homepage.
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const { config } = require('../bot-config');
const logger = require('./logger');

let supabase = null;

function getClient() {
  if (!supabase) {
    supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

// ============================================================
// BOT ACTIVITY TRACKING
// ============================================================

/**
 * Log a bot action to the database for analytics
 */
async function logBotAction(action) {
  try {
    const db = getClient();
    const { error } = await db.from('bot_activity').insert({
      leg: action.leg,               // 1, 2, or 3
      platform: action.platform,     // 'reddit', 'twitter', 'discord', 'news', 'supabase'
      action_type: action.type,      // 'reply', 'post', 'scan', 'debate_created', 'auto_debate_created'
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
    logger.error(`Bot activity logging exception: ${err.message}`);
  }
}

// ============================================================
// HOT TAKE CREATION (Leg 2)
// ============================================================

/**
 * Create a hot take entry in the database.
 * Returns the hot_take ID for constructing the shareable URL.
 */
async function createHotTake({ content, category, sourceHeadline, sourceUrl }) {
  try {
    const db = getClient();

    // Bot user ID from .env — must be a real Supabase user UUID
    const BOT_USER_ID = config.botUserId;

    if (!BOT_USER_ID) {
      logger.error('BOT_USER_ID not set — cannot create hot takes. Add it to .env');
      return null;
    }

    const { data, error } = await db.from('hot_takes').insert({
      user_id: BOT_USER_ID,
      content: content,
      section: category || 'trending',
      is_bot_generated: true,
      source_headline: sourceHeadline || null,
      source_url: sourceUrl || null,
    }).select('id').single();

    if (error) {
      logger.error(`Failed to create hot take: ${error.message}`);
      return null;
    }

    const takeId = data.id;
    // SESSION 94: Leg 2 links to category page so users land in relevant content.
    // Map bot categories → mirror slugs (mirror uses couples-court, bot uses couples).
    const CATEGORY_TO_SLUG = {
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
    const mirrorUrl = config.app.mirrorUrl || 'https://colosseum-f30.pages.dev';
    const slug = CATEGORY_TO_SLUG[category] || 'politics';
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
    logger.error(`Hot take creation exception: ${err.message}`);
    return null;
  }
}

// ============================================================
// AUTO-DEBATE CREATION (Leg 3 — Session 20)
// ============================================================

/**
 * Create a full auto-debate entry in the database.
 * This is a complete AI vs AI debate with rounds, scores, and judge reasoning.
 * Returns the auto_debate ID + shareable URL.
 */
async function createAutoDebate({
  topic, category, sideALabel, sideBLabel, description,
  rounds, totalRounds, scoreA, scoreB, winner, judgeReasoning,
  margin, shareHook, sourceHeadline, sourceUrl,
}) {
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

    const debateId = data.id;
    // SESSION 75: All bot links → mirror (NT rule). Mirror debate pages at /debate/{id}.html
    const mirrorUrl = config.app.mirrorUrl || 'https://colosseum-f30.pages.dev';
    const debateUrl = `${mirrorUrl}/debate/${debateId}.html`;

    logger.leg3('supabase', `Created auto-debate ${debateId}`, { topic, url: debateUrl });

    return { id: debateId, url: debateUrl };
  } catch (err) {
    logger.error(`Auto-debate creation exception: ${err.message}`);
    return null;
  }
}

// ============================================================
// DEDUP + STATS
// ============================================================

/**
 * Check if a headline has already been processed (dedup)
 */
async function isHeadlineProcessed(headline) {
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
    return adData && adData.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get bot stats for monitoring
 */
async function getBotStats(hours = 24) {
  try {
    const db = getClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from('bot_activity')
      .select('leg, platform, action_type, success')
      .gte('created_at', since);

    if (error || !data) return null;

    const stats = {
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
      const key = row.platform;
      if (!stats.byPlatform[key]) stats.byPlatform[key] = 0;
      stats.byPlatform[key]++;
    }

    return stats;
  } catch (err) {
    logger.error(`Failed to get bot stats: ${err.message}`);
    return null;
  }
}

module.exports = {
  getClient,
  logBotAction,
  createHotTake,
  createAutoDebate,
  isHeadlineProcessed,
  getBotStats,
};
