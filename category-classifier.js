// ============================================================
// THE COLOSSEUM — CATEGORY CLASSIFIER
// Session 98: Fixes 60% of auto-debates landing in "general"
// 
// Usage in ai-generator.js:
//   const { classifyCategory } = require('./category-classifier');
//   const category = classifyCategory(headline, feedLabel);
// ============================================================

function buildMatchers(keywords) {
  return keywords.map(kw => {
    if (kw.length <= 4 || /^[a-z]{2,4}$/.test(kw)) {
      return new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    }
    return kw;
  });
}

function countMatches(text, matchers) {
  let score = 0;
  for (const m of matchers) {
    if (typeof m === 'string') {
      if (text.includes(m)) score++;
    } else {
      if (m.test(text)) score++;
    }
  }
  return score;
}

const SPORTS_MATCHERS = buildMatchers([
  'nfl', 'nba', 'nhl', 'mlb', 'mls', 'wnba', 'ncaa', 'pga', 'ufc', 'wwe',
  'epl', 'premier league', 'champions league', 'la liga', 'serie a', 'bundesliga',
  'world cup', 'olympics', 'world series', 'super bowl', 'stanley cup',
  'world baseball classic', 'wbc', 'march madness', 'formula 1', 'nascar',
  'cowboys', 'eagles', 'patriots', 'chiefs', 'ravens', 'raiders', '49ers', 'packers',
  'steelers', 'giants', 'bears', 'jets', 'dolphins', 'bills', 'broncos', 'rams',
  'chargers', 'bengals', 'lions', 'vikings', 'saints', 'falcons', 'buccaneers',
  'cardinals', 'seahawks', 'commanders', 'texans', 'titans', 'jaguars', 'colts', 'browns',
  'lakers', 'celtics', 'warriors', 'knicks', 'nets', 'heat', 'thunder', 'nuggets',
  'bucks', 'sixers', '76ers', 'suns', 'mavericks', 'timberwolves', 'cavaliers',
  'yankees', 'dodgers', 'mets', 'red sox', 'astros', 'braves', 'phillies', 'cubs',
  'oilers', 'maple leafs', 'bruins', 'penguins', 'avalanche',
  'trade deadline', 'draft pick', 'free agent', 'free agency', 'playoff', 'playoffs',
  'touchdown', 'quarterback', 'wide receiver', 'running back', 'tight end', 'linebacker',
  'mock draft', 'comp pick', 'first-round pick',
  'home run', 'strikeout', 'batting average',
  'slam dunk', 'three-pointer', 'triple-double',
  'hat trick', 'power play', 'goaltender',
  'pit stop', 'pole position',
  'lebron', 'mahomes', 'lamar jackson', 'josh allen', 'joe burrow', 'jalen hurts',
  'giannis', 'jokic', 'adebayo', 'wembanyama', 'doncic',
  'ohtani', 'soto',
  'mcdavid', 'ovechkin', 'messi', 'ronaldo', 'haaland',
  'verstappen',
  'espn', 'bleacher report', 'the athletic', 'sports illustrated',
  'pro bowl', 'all-star game',
  'wrestling championship',
]);

const POLITICS_MATCHERS = buildMatchers([
  'trump', 'biden', 'congress', 'senate', 'house of representatives',
  'democrat', 'republican', 'gop',
  'election', 'primary election', 'caucus', 'midterm',
  'president', 'governor', 'senator',
  'legislation', 'executive order', 'veto',
  'supreme court', 'scotus', 'amendment',
  'tariff', 'sanctions', 'trade war', 'foreign policy', 'diplomacy',
  'immigration', 'border wall', 'asylum', 'deportation',
  'shutdown', 'filibuster', 'impeach', 'indictment', 'subpoena',
  'pentagon', 'state department', 'white house', 'oval office',
  'nato', 'united nations',
  'iran war', 'israel', 'palestine', 'houthi', 'hezbollah',
  'putin', 'zelensky', 'ukraine',
  'xi jinping', 'kim jong',
  'attorney general', 'special counsel',
  'classified documents',
  'gerrymandering', 'redistricting', 'voter suppression',
  'politico',
  'pelosi', 'mcconnell', 'schumer',
]);

const ENTERTAINMENT_MATCHERS = buildMatchers([
  'oscar', 'academy award', 'golden globe', 'emmy', 'grammy', 'tony award',
  'best picture', 'best actor', 'best actress', 'best director', 'nominee',
  'box office', 'blockbuster', 'sequel', 'reboot', 'prequel', 'franchise',
  'netflix', 'hulu', 'disney+', 'amazon prime', 'apple tv',
  'paramount', 'warner bros', 'sony pictures', 'lionsgate',
  'hollywood', 'bollywood', 'sundance', 'cannes',
  'celebrity', 'red carpet', 'paparazzi',
  'divorce', 'breakup',
  'kardashian', 'taylor swift', 'beyonce', 'rihanna',
  'reality tv', 'bachelor', 'bachelorette', 'love is blind', 'survivor',
  'anime', 'manga', 'k-pop', 'k-drama', 'enhypen',
  'broadway', 'concert tour',
  'streaming', 'season finale', 'premiere',
  'variety', 'deadline', 'hollywood reporter', 'indiewire', 'playbill',
  'billboard', 'rolling stone',
  'drama series', 'limited series', 'docuseries',
  'video game', 'gaming', 'playstation', 'xbox', 'nintendo',
  'nicole kidman', 'virgin river', 'baywatch', 'sinners',
  'conan o\'brien', 'daniel radcliffe',
]);

const COUPLES_MATCHERS = buildMatchers([
  'relationship advice', 'marriage counseling', 'couples therapy',
  'cheating spouse', 'infidelity',
  'dating app', 'tinder', 'bumble', 'hinge',
  'toxic relationship', 'situationship',
]);

const MUSIC_MATCHERS = buildMatchers([
  'new album', 'debut album', 'single release',
  'spotify', 'apple music',
  'hip hop', 'hip-hop', 'country music', 'rock music',
  'record label', 'platinum record',
  'music video', 'music festival', 'coachella', 'lollapalooza',
]);

const MOVIES_MATCHERS = buildMatchers([
  'film review', 'movie review', 'rotten tomatoes',
  'opening weekend', 'trilogy',
  'horror film', 'rom-com', 'action movie', 'documentary film',
  'marvel', 'star wars', 'pixar', 'dreamworks',
  'imax', 'theatrical release',
]);

const FEED_LABEL_MAP = {
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

function classifyCategory(headline, feedLabel) {
  if (feedLabel) {
    const normalized = feedLabel.toLowerCase().trim();
    if (FEED_LABEL_MAP[normalized]) {
      return FEED_LABEL_MAP[normalized];
    }
  }

  const lower = (headline || '').toLowerCase();

  const scores = {
    sports:        countMatches(lower, SPORTS_MATCHERS),
    politics:      countMatches(lower, POLITICS_MATCHERS),
    entertainment: countMatches(lower, ENTERTAINMENT_MATCHERS),
    couples:       countMatches(lower, COUPLES_MATCHERS),
    music:         countMatches(lower, MUSIC_MATCHERS),
    movies:        countMatches(lower, MOVIES_MATCHERS),
  };

  let best = 'general';
  let bestScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return bestScore >= 1 ? best : 'general';
}

module.exports = { classifyCategory };
