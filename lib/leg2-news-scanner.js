// ============================================================
// THE COLOSSEUM — LEG 2: NEWS SCANNER
// Scans Google News + ESPN RSS feeds for debate-worthy stories.
// Deduplicates against already-processed headlines.
// Feeds results into the hot take generator + debate creator.
// ============================================================
const Parser = require('rss-parser');
const { config } = require('../bot-config');
const logger = require('./logger');
const { isHeadlineProcessed } = require('./supabase-client');

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ColosseumBot/1.0)',
  },
});

// ============================================================
// DEBATE-WORTHINESS SCORING
// ============================================================

// Topics that generate arguments
const HIGH_DEBATE_KEYWORDS = [
  // Sports
  'goat', 'trade', 'fired', 'suspended', 'overrated', 'underrated',
  'mvp', 'rankings', 'upset', 'controversial', 'record', 'draft',
  'free agent', 'rivalry', 'comeback', 'choke', 'dynasty',
  // Politics
  'bill passed', 'executive order', 'supreme court', 'election',
  'approval rating', 'scandal', 'investigation', 'resign',
  'ban', 'mandate', 'protest', 'ruling', 'immigration',
  // Entertainment
  'box office', 'cancelled', 'remake', 'reboot', 'sequel',
  'award', 'grammy', 'oscar', 'emmy', 'breakup', 'feud',
  'comeback', 'retirement', 'controversy', 'response',
  // General engagement
  'shocked', 'outrage', 'backlash', 'surprising', 'unexpected',
  'breaks silence', 'responds to', 'calls out', 'claps back',
];

// Topics to AVOID (not debate-worthy or too sensitive)
const SKIP_KEYWORDS = [
  'death', 'dies', 'killed', 'shooting', 'mass shooting',
  'suicide', 'cancer', 'funeral', 'obituary', 'tragedy',
  'child abuse', 'sexual assault', 'terror attack',
];

function scoreHeadline(headline) {
  const lower = headline.toLowerCase();

  // Hard skip on sensitive topics
  if (SKIP_KEYWORDS.some(kw => lower.includes(kw))) {
    return -1;
  }

  let score = 0;

  // High-debate keywords
  for (const kw of HIGH_DEBATE_KEYWORDS) {
    if (lower.includes(kw)) score += 2;
  }

  // Questions are inherently debate-worthy
  if (headline.includes('?')) score += 3;

  // VS / comparisons
  if (lower.includes(' vs ') || lower.includes(' versus ') || lower.includes(' or ')) score += 2;

  // Strong language signals engagement
  if (/!/.test(headline)) score += 1;

  return score;
}

function categorizeHeadline(headline, sourceName) {
  const lower = headline.toLowerCase();
  const src = sourceName.toLowerCase();

  if (src.includes('espn') || src.includes('sport')) return 'sports';
  if (src.includes('politic')) return 'politics';
  if (src.includes('entertain')) return 'entertainment';

  // Keyword-based fallback
  if (/nba|nfl|mlb|nhl|espn|game|player|coach|trade|draft|season|playoff/i.test(lower)) return 'sports';
  if (/congress|president|senate|democrat|republican|election|vote|law|bill/i.test(lower)) return 'politics';
  if (/movie|film|album|song|actor|actress|grammy|oscar|netflix|spotify/i.test(lower)) return 'entertainment';

  return 'general';
}

// ============================================================
// MAIN SCAN FUNCTION
// ============================================================

/**
 * Scan all configured RSS feeds.
 * Returns top N debate-worthy headlines that haven't been processed yet.
 */
async function scanNews(maxResults = 5) {
  if (!config.flags.leg2News) {
    logger.debug('Leg 2 News scanning is disabled');
    return [];
  }

  logger.leg2('news', `Scanning ${config.newsSources.length} RSS feeds...`);

  const allHeadlines = [];

  for (const source of config.newsSources) {
    try {
      const feed = await parser.parseURL(source.url);

      for (const item of (feed.items || []).slice(0, 15)) {
        const title = item.title?.trim();
        if (!title) continue;

        const score = scoreHeadline(title);
        if (score < 0) continue;  // Skip sensitive

        allHeadlines.push({
          title,
          link: item.link || '',
          source: source.name,
          pubDate: item.pubDate || item.isoDate || null,
          score,
          category: categorizeHeadline(title, source.name),
        });
      }
    } catch (err) {
      logger.error(`Failed to parse RSS feed "${source.name}": ${err.message}`);
    }
  }

  // Sort by debate score (highest first)
  allHeadlines.sort((a, b) => b.score - a.score);

  // Deduplicate against already-processed headlines
  const fresh = [];
  for (const item of allHeadlines) {
    if (fresh.length >= maxResults) break;

    const alreadyDone = await isHeadlineProcessed(item.title);
    if (alreadyDone) {
      logger.debug(`Skipping already-processed: "${item.title.substring(0, 50)}..."`);
      continue;
    }

    fresh.push(item);
  }

  logger.leg2('news', `Found ${allHeadlines.length} total, ${fresh.length} fresh debate-worthy headlines`);
  return fresh;
}

// ============================================================
// TEST
// ============================================================
async function testScan() {
  console.log('\n--- Testing News Scanner ---\n');

  // Test scoring
  const testHeadlines = [
    'LeBron James trade rumors heat up as Lakers explore options',
    'Congress passes controversial immigration bill',
    'Local weather update: sunny skies expected',
    'Is the new Marvel movie the worst in the franchise?',
    'Mass shooting at local mall leaves 5 dead',
    'Tom Brady responds to overrated claims',
  ];

  console.log('Headline scoring:');
  for (const h of testHeadlines) {
    console.log(`  Score ${scoreHeadline(h).toString().padStart(2)}: "${h}"`);
  }

  console.log('\nScanning live RSS feeds...\n');
  const results = await scanNews(5);
  for (const r of results) {
    console.log(`  [${r.category}] Score ${r.score}: "${r.title.substring(0, 70)}..."`);
  }
}

module.exports = { scanNews, testScan, scoreHeadline };
