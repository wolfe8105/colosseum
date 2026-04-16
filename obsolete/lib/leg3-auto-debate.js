// ============================================================
// THE COLOSSEUM — LEG 3: AUTO-DEBATE ENGINE
// Session 20: The Rage-Click Engine
//
// Takes a headline from the news scanner.
// Generates a FULL AI vs AI debate (3 rounds).
// Scores it LOPSIDED to trigger outrage.
// Saves to Supabase with a shareable URL.
// Returns a rage-bait share hook for Reddit/Twitter posts.
//
// Pipeline: headline → setup → 3 rounds → lopsided score → save → URL
// The debate page EXISTS before anyone clicks the link.
// ============================================================
const { config } = require('../bot-config');
const logger = require('./logger');
const {
  generateAutoDebateSetup,
  generateAutoDebateRound,
  generateAutoDebateScore,
  generateShareHook,
} = require('./ai-generator');
const { createAutoDebate, logBotAction, isHeadlineProcessed } = require('./supabase-client');

// Margin selection — weighted toward "clear" and "landslide" for max rage
const MARGIN_WEIGHTS = [
  { margin: 'close', weight: 15 },      // 15% — still controversial but less click-worthy
  { margin: 'clear', weight: 45 },      // 45% — the sweet spot
  { margin: 'landslide', weight: 40 },  // 40% — maximum rage potential
];

function pickMargin() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const { margin, weight } of MARGIN_WEIGHTS) {
    cumulative += weight;
    if (roll <= cumulative) return margin;
  }
  return 'clear';
}

/**
 * Full auto-debate pipeline: headline → complete debate → Supabase → URL
 *
 * @param {Object} headline - From news scanner { title, link, source, category }
 * @returns {Object|null} - { id, url, shareHook, topic, winner, margin } or null
 */
async function createAutoDebateFromHeadline(headline) {
  if (!config.flags.leg3AutoDebate) {
    logger.debug('Leg 3 Auto-Debate is disabled');
    return null;
  }

  try {
    logger.leg3('pipeline', `Starting auto-debate for: "${headline.title.substring(0, 60)}..."`);

    // Dedup check — don't create duplicate debates for the same headline
    const alreadyDone = await isHeadlineProcessed(headline.title);
    if (alreadyDone) {
      logger.leg3('pipeline', `Skipping (already processed): "${headline.title.substring(0, 50)}..."`);
      return null;
    }

    // ---- STEP 1: Generate debate setup ----
    const setup = await generateAutoDebateSetup(headline.title, headline.category);
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
    const rounds = [];
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
      rounds: rounds,
      totalRounds: totalRounds,
      scoreA: scoring.totalA,
      scoreB: scoring.totalB,
      winner: winningSide,
      judgeReasoning: scoring.judgeTake,
      margin: margin,
      shareHook: shareHook,
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

    // Log success
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
        margin: margin,
        scoreA: scoring.totalA,
        scoreB: scoring.totalB,
      },
    });

    return {
      id: result.id,
      url: result.url,
      shareHook: shareHook,
      topic: setup.topic,
      category: setup.category || headline.category,
      winner: winningSide,
      winnerLabel: winningSide === 'a' ? setup.sideA.label : setup.sideB.label,
      loserLabel: winningSide === 'a' ? setup.sideB.label : setup.sideA.label,
      margin: margin,
      scoreA: scoring.totalA,
      scoreB: scoring.totalB,
    };
  } catch (err) {
    logger.error(`Auto-debate pipeline failed: ${err.message}`);
    await logBotAction({
      leg: 3,
      platform: 'supabase',
      type: 'auto_debate_created',
      success: false,
      error: err.message,
      metadata: { headline: headline.title },
    });
    return null;
  }
}

/**
 * Get recent auto-debates for the Reddit poster to use
 * Returns debates created in the last N hours that haven't been posted to Reddit yet
 */
async function getUnpostedAutoDebates(hours = 6) {
  try {
    const { getClient } = require('./supabase-client');
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

    return (data || []).map(d => ({
      id: d.id,
      url: `${config.app.mirrorUrl || 'https://colosseum-f30.pages.dev'}/debate/${d.id}.html`,
      shareHook: d.share_hook,
      topic: d.topic,
      category: d.category,
      winner: d.winner,
      winnerLabel: d.winner === 'a' ? d.side_a_label : d.side_b_label,
      margin: d.margin,
      scoreA: d.score_a,
      scoreB: d.score_b,
    }));
  } catch (err) {
    logger.error(`getUnpostedAutoDebates failed: ${err.message}`);
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createAutoDebateFromHeadline, getUnpostedAutoDebates };
