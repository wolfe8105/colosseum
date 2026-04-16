// ============================================================
// THE MODERATOR — CATEGORY CLASSIFIER (TypeScript)
// Keyword-based headline → category router.
// Keywords loaded from Supabase classifier_keywords table.
// Falls back to hardcoded arrays if DB is unavailable.
// Cache TTL: 60 minutes (no restart needed for keyword updates).
// Session 195.
// ============================================================

import { getClient } from './supabase-client';
import logger from './logger';

export type Category = 'politics' | 'sports' | 'entertainment' | 'couples' | 'music' | 'movies' | 'general';

// ============================================================
// FALLBACK KEYWORD ARRAYS (used if Supabase fetch fails)
// ============================================================

const FALLBACK: Record<string, string[]> = {
  sports: ['nfl','nba','nhl','mlb','mls','wnba','ncaa','pga','ufc','wwe','epl','premier league','champions league','la liga','serie a','bundesliga','world cup','olympics','world series','super bowl','stanley cup','world baseball classic','wbc','march madness','formula 1','nascar','cowboys','eagles','patriots','chiefs','ravens','raiders','49ers','packers','steelers','giants','bears','jets','dolphins','bills','broncos','rams','chargers','bengals','lions','vikings','saints','falcons','buccaneers','cardinals','seahawks','commanders','texans','titans','jaguars','colts','browns','lakers','celtics','warriors','knicks','nets','heat','thunder','nuggets','bucks','sixers','76ers','suns','mavericks','timberwolves','cavaliers','yankees','dodgers','mets','red sox','astros','braves','phillies','cubs','oilers','maple leafs','bruins','penguins','avalanche','trade deadline','draft pick','free agent','free agency','playoff','playoffs','touchdown','quarterback','wide receiver','running back','tight end','linebacker','mock draft','comp pick','first-round pick','home run','strikeout','batting average','slam dunk','three-pointer','triple-double','hat trick','power play','goaltender','pit stop','pole position','lebron','mahomes','lamar jackson','josh allen','joe burrow','jalen hurts','giannis','jokic','adebayo','wembanyama','doncic','ohtani','soto','mcdavid','ovechkin','messi','ronaldo','haaland','verstappen','espn','bleacher report','the athletic','sports illustrated','pro bowl','all-star game','wrestling championship'],
  politics: ['trump','biden','congress','senate','house of representatives','democrat','republican','gop','election','primary election','caucus','midterm','president','governor','senator','legislation','executive order','veto','supreme court','scotus','amendment','tariff','sanctions','trade war','foreign policy','diplomacy','immigration','border wall','asylum','deportation','shutdown','filibuster','impeach','indictment','subpoena','pentagon','state department','white house','oval office','nato','united nations','iran war','israel','palestine','houthi','hezbollah','putin','zelensky','ukraine','xi jinping','kim jong','attorney general','special counsel','classified documents','gerrymandering','redistricting','voter suppression','politico','pelosi','mcconnell','schumer'],
  entertainment: ['oscar','academy award','golden globe','emmy','grammy','tony award','best picture','best actor','best actress','best director','nominee','box office','blockbuster','sequel','reboot','prequel','franchise','netflix','hulu','disney+','amazon prime','apple tv','paramount','warner bros','sony pictures','lionsgate','hollywood','bollywood','sundance','cannes','celebrity','red carpet','paparazzi','divorce','breakup','kardashian','taylor swift','beyonce','rihanna','reality tv','bachelor','bachelorette','love is blind','survivor','anime','manga','k-pop','k-drama','enhypen','broadway','concert tour','streaming','season finale','premiere','variety','deadline','hollywood reporter','indiewire','playbill','billboard','rolling stone','drama series','limited series','docuseries','video game','gaming','playstation','xbox','nintendo','nicole kidman','virgin river','baywatch','sinners','daniel radcliffe'],
  couples: ['relationship advice','marriage counseling','couples therapy','cheating spouse','infidelity','dating app','tinder','bumble','hinge','toxic relationship','situationship'],
  music: ['new album','debut album','single release','spotify','apple music','hip hop','hip-hop','country music','rock music','record label','platinum record','music video','music festival','coachella','lollapalooza'],
  movies: ['film review','movie review','rotten tomatoes','opening weekend','trilogy','horror film','rom-com','action movie','documentary film','marvel','star wars','pixar','dreamworks','imax','theatrical release'],
};

// ============================================================
// CACHE
// ============================================================

interface KeywordCache {
  matchers: Record<string, RegExp[]>;
  loadedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
let cache: KeywordCache | null = null;

// ============================================================
// HELPERS
// ============================================================

function buildMatchers(keywords: string[]): RegExp[] {
  return keywords.map(kw =>
    new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
  );
}

function countMatches(text: string, matchers: RegExp[]): number {
  let score = 0;
  for (const m of matchers) {
    if (m.test(text)) score++;
  }
  return score;
}

function buildFromMap(map: Record<string, string[]>): Record<string, RegExp[]> {
  const result: Record<string, RegExp[]> = {};
  for (const [cat, keywords] of Object.entries(map)) {
    result[cat] = buildMatchers(keywords);
  }
  return result;
}

// ============================================================
// KEYWORD LOADER
// ============================================================

async function loadKeywords(): Promise<Record<string, RegExp[]>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.matchers;
  }

  try {
    const db = getClient();
    const { data, error } = await db
      .from('classifier_keywords')
      .select('category, keywords');

    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Empty result');
    }

    const map: Record<string, string[]> = {};
    for (const row of data) {
      map[row.category as string] = row.keywords as string[];
    }

    const matchers = buildFromMap(map);
    cache = { matchers, loadedAt: now };
    return matchers;

  } catch (err) {
    logger.warn(`[classifier] DB load failed, using fallback: ${(err as Error).message}`);
    // Don't cache the fallback — retry DB next call
    return buildFromMap(FALLBACK);
  }
}

// ============================================================
// FEED MAP (hardcoded — not keyword data)
// ============================================================

const FEED_MAP: Record<string, Category> = {
  'sports': 'sports',
  'politics': 'politics',
  'entertainment': 'entertainment',
  'couples': 'couples',
  'music': 'music',
  'movies': 'movies',
  'google news - sports': 'sports',
  'google news - politics': 'politics',
  'google news - entertainment': 'entertainment',
};

// ============================================================
// MAIN EXPORT
// ============================================================

export async function classifyCategory(headline: string, feedLabel?: string): Promise<Category> {
  if (feedLabel) {
    const normalized = feedLabel.toLowerCase().trim();
    if (FEED_MAP[normalized]) return FEED_MAP[normalized];
  }

  const matchers = await loadKeywords();
  const lower = (headline || '').toLowerCase();

  const scores: Record<string, number> = {};
  for (const [cat, regs] of Object.entries(matchers)) {
    scores[cat] = countMatches(lower, regs);
  }

  let best: Category = 'general';
  let bestScore = 0;
  for (const [cat, val] of Object.entries(scores)) {
    if (val > bestScore) {
      bestScore = val;
      best = cat as Category;
    }
  }

  return bestScore >= 1 ? best : 'general';
}
