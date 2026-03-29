// ============================================================
// THE COLOSSEUM — LEG 2: NEWS SCANNER (TypeScript)
// Scans Google News + ESPN RSS feeds for debate-worthy stories.
// Deduplicates against already-processed headlines.
// Feeds results into the hot take generator + debate creator.
// Migrated to TypeScript: Session 131.
// Session 195: replaced inline categorizeHeadline() with
//   classifyCategory() from category-classifier.ts.
// ============================================================

import Parser from 'rss-parser';
import { config } from '../bot-config';
import logger from './logger';
import { isHeadlineProcessed } from './supabase-client';
import { classifyCategory } from './category-classifier';

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ColosseumBot/1.0)',
  },
});

// ============================================================
// DEBATE-WORTHINESS SCORING
// ============================================================

const HIGH_DEBATE_KEYWORDS: string[] = [
  // Sports
  'goat', 'trade', 'fired', 'suspended', 'overrated', 'underrated', 'mvp',
  'rankings', 'upset', 'controversial', 'record', 'draft', 'free agent',
  'rivalry', 'comeback', 'choke', 'dynasty',
  // Politics
  'bill passed', 'executive order', 'supreme court', 'election',
  'approval rating', 'scandal', 'investigation', 'resign', 'ban', 'mandate',
  'protest', 'ruling', 'immigration',
  // Entertainment
  'box office', 'cancelled', 'remake', 'reboot', 'sequel', 'award', 'grammy',
  'oscar', 'emmy', 'breakup', 'feud', 'comeback', 'retirement', 'controversy',
  'response',
  // General engagement
  'shocked', 'outrage', 'backlash', 'surprising', 'unexpected',
  'breaks silence', 'responds to', 'calls out', 'claps back',
];

const SKIP_KEYWORDS: string[] = [
  'death', 'dies', 'killed', 'shooting', 'mass shooting', 'suicide', 'cancer',
  'funeral', 'obituary', 'tragedy', 'child abuse', 'sexual assault',
  'terror attack',
];

export interface ScoredHeadline {
  title: string;
  link: string;
  source: string;
  pubDate: string | null;
  score: number;
  category: string;
}

export function scoreHeadline(headline: string): number {
  const lower = headline.toLowerCase();
  if (SKIP_KEYWORDS.some(kw => lower.includes(kw))) return -1;

  let score = 0;
  for (const kw of HIGH_DEBATE_KEYWORDS) {
    if (lower.includes(kw)) score += 2;
  }
  if (headline.includes('?')) score += 3;
  if (lower.includes(' vs ') || lower.includes(' versus ') || lower.includes(' or ')) score += 2;
  if (/!/.test(headline)) score += 1;
  return score;
}

// ============================================================
// MAIN SCAN FUNCTION
// ============================================================

export async function scanNews(maxResults: number = 5): Promise<ScoredHeadline[]> {
  if (!config.flags.leg2News) {
    logger.debug('Leg 2 News scanning is disabled');
    return [];
  }

  logger.leg2('news', `Scanning ${config.newsSources.length} RSS feeds...`);
  const allHeadlines: Omit<ScoredHeadline, 'category'>[] = [];

  for (const source of config.newsSources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of (feed.items || []).slice(0, 15)) {
        const title = item.title?.trim();
        if (!title) continue;
        const score = scoreHeadline(title);
        if (score < 0) continue;
        allHeadlines.push({
          title,
          link: item.link || '',
          source: source.name,
          pubDate: item.pubDate || item.isoDate || null,
          score,
        });
      }
    } catch (err) {
      logger.error(`Failed to parse RSS feed "${source.name}": ${(err as Error).message}`);
    }
  }

  allHeadlines.sort((a, b) => b.score - a.score);

  const fresh: ScoredHeadline[] = [];
  for (const item of allHeadlines) {
    if (fresh.length >= maxResults) break;
    const alreadyDone = await isHeadlineProcessed(item.title);
    if (alreadyDone) {
      logger.debug(`Skipping already-processed: "${item.title.substring(0, 50)}..."`);
      continue;
    }
    // Classify after dedup check — avoids unnecessary DB calls for skipped items
    const category = await classifyCategory(item.title, item.source);
    fresh.push({ ...item, category });
  }

  logger.leg2('news', `Found ${allHeadlines.length} total, ${fresh.length} fresh debate-worthy headlines`);
  return fresh;
}

// ============================================================
// TEST
// ============================================================

export async function testScan(): Promise<void> {
  console.log('\n--- Testing News Scanner ---\n');
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
