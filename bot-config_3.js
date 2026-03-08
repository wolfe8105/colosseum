// ============================================================
// THE COLOSSEUM — BOT CONFIG
// Loads .env, validates all required values, exports config.
// Bot refuses to start if any PASTE_YOUR placeholder remains.
// Updated Session 27: BOT_USER_ID added, leg 3 fixes.
// ============================================================
require('dotenv').config();

const config = {
  // --- Supabase ---
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // --- Bot Identity ---
  botUserId: process.env.BOT_USER_ID || null,

  // --- AI (Groq) ---
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',  // updated Session 42/43 — old model decommissioned
    maxTokens: 280,                       // tweet-length outputs
  },

  // --- Reddit ---
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    userAgent: process.env.REDDIT_USER_AGENT,
    // Subreddits to monitor — start with argument-heavy ones
    subreddits: [
      'unpopularopinion', 'changemyview', 'AmItheAsshole',
      'TrueOffMyChest', 'nba', 'nfl', 'politics',
      'entertainment', 'movies', 'music',
      'relationship_advice', 'sports', 'MMA',
    ],
    postsPerScan: 10,
    minScore: 5,
    maxRepliesPerCycle: 8,
    replyCooldownMs: 120_000,
  },

  // --- Twitter / X ---
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
    maxPostsPerDay: 8,
    peakHoursEST: [7, 8, 9, 12, 13, 17, 18, 19, 20, 21],
  },

  // --- Discord ---
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN,
    argumentKeywords: [
      'you\'re wrong', 'that\'s bs', 'no way', 'fight me',
      'hot take', 'unpopular opinion', 'worst take', 'terrible take',
      'disagree', 'overrated', 'underrated', 'mid',
      'cap', 'ratio', 'L take', 'W take', 'delusional',
    ],
    channelCooldownMs: 600_000,
  },

  // --- Lemmy ---
  // Bot account must be marked as a bot in account settings.
  // Bio must include owner contact info (lemmy.world requirement).
  // Start with DRY_RUN=true, verify logs look correct, then set LEG2_LEMMY_ENABLED=true.
  lemmy: {
    enabled: process.env.LEG2_LEMMY_ENABLED === 'true' || process.env.LEG3_LEMMY_POST_ENABLED === 'true',
    instance: process.env.LEMMY_INSTANCE || 'lemmy.world',   // just the domain, no https://
    username: process.env.LEMMY_USERNAME,
    password: process.env.LEMMY_PASSWORD,
    // Max posts per community per day — stay under 2 to avoid spam flags
    maxPostsPerCommunityPerDay: parseInt(process.env.LEMMY_MAX_POSTS_PER_COMMUNITY, 10) || 2,
    // Total posts across all communities per day
    maxPostsPerDay: parseInt(process.env.LEMMY_MAX_POSTS_PER_DAY, 10) || 4,
  },

  // --- Proxy ---
  proxy: {
    url: process.env.PROXY_URL === 'NONE' ? null : process.env.PROXY_URL,
  },

  // --- App ---
  app: {
    baseUrl: process.env.APP_BASE_URL || 'https://colosseum-six.vercel.app',
    debateLandingPath: null, // SESSION 52: debate-landing.html is dead code (Session 28+). Bot links go to mirror. Nulled to prevent accidental use.
    autoDebatePath: process.env.AUTO_DEBATE_PATH || '/colosseum-auto-debate.html',
  },

  // --- Auto-Debate Settings (Leg 3 — Session 20) ---
  autoDebate: {
    rounds: parseInt(process.env.AUTO_DEBATE_ROUNDS, 10) || 3,
    maxPerCycle: parseInt(process.env.AUTO_DEBATE_MAX_PER_CYCLE, 10) || 2,
    // How many auto-debates per day max (AI calls cost nothing but don't flood the feed)
    maxPerDay: parseInt(process.env.AUTO_DEBATE_MAX_PER_DAY, 10) || 6,
  },

  // --- Warmup / Jitter (Node 1 — Session A security hardening) ---
  // WARMUP_MODE=true: first 7 days after Reddit approval. No link drops. Read/upvote/gentle comments only.
  // Jitter: cron jobs wait a random 1-8 min before firing. Prevents exact-interval bot signature.
  warmup: {
    enabled: process.env.WARMUP_MODE === 'true',
    noLinkDrops: process.env.WARMUP_MODE === 'true',
    // Min/max jitter in ms applied before each cron action fires
    jitterMinMs: parseInt(process.env.JITTER_MIN_MS, 10) || 60_000,      // 1 min
    jitterMaxMs: parseInt(process.env.JITTER_MAX_MS, 10) || 480_000,     // 8 min
    // Human-like delay between individual API calls within a single run
    actionDelayMinMs: parseInt(process.env.ACTION_DELAY_MIN_MS, 10) || 2_000,
    actionDelayMaxMs: parseInt(process.env.ACTION_DELAY_MAX_MS, 10) || 8_000,
  },

  // --- Feature Flags ---
  flags: {
    leg1Reddit: process.env.LEG1_REDDIT_ENABLED === 'true',
    leg1Twitter: process.env.LEG1_TWITTER_ENABLED === 'true',
    leg1Discord: process.env.LEG1_DISCORD_ENABLED === 'true',
    leg2News: process.env.LEG2_NEWS_ENABLED === 'true',
    leg2Twitter: process.env.LEG2_TWITTER_ENABLED === 'true',
    leg2DebateCreator: process.env.LEG2_DEBATE_CREATOR_ENABLED === 'true',
    leg3AutoDebate: process.env.LEG3_AUTO_DEBATE_ENABLED === 'true',
    leg3RedditPost: process.env.LEG3_REDDIT_POST_ENABLED === 'true',
    leg3TwitterPost: process.env.LEG3_TWITTER_POST_ENABLED === 'true',
    leg2Lemmy: process.env.LEG2_LEMMY_ENABLED === 'true',
    leg3LemmyPost: process.env.LEG3_LEMMY_POST_ENABLED === 'true',
  },

  // --- Operational ---
  logLevel: process.env.LOG_LEVEL || 'info',
  dryRun: process.env.DRY_RUN === 'true',

  // --- News Sources (shared by Leg 2 + Leg 3) ---
  newsSources: [
    { name: 'Google News - Top',      url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Sports',    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Politics',  url: 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4ZERBU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Entertainment', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' },
    { name: 'ESPN - Top',             url: 'https://www.espn.com/espn/rss/news' },
    { name: 'ESPN - NBA',             url: 'https://www.espn.com/espn/rss/nba/news' },
    { name: 'ESPN - NFL',             url: 'https://www.espn.com/espn/rss/nfl/news' },
  ],

  // --- Topic Categories (maps to app sections) ---
  topicCategories: {
    politics: { label: 'Politics', tier: 1 },
    sports:   { label: 'Sports',   tier: 1 },
    entertainment: { label: 'Entertainment', tier: 2 },
    couples:  { label: 'Couples Court', tier: 2 },
    music:    { label: 'Music',    tier: 3 },
    movies:   { label: 'Movies/TV', tier: 3 },
  },
};

// ============================================================
// STARTUP VALIDATION
// ============================================================
function validateConfig() {
  const errors = [];
  const warnings = [];

  // Always required
  const required = [
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
    ['GROQ_API_KEY', config.groq.apiKey],
    ['BOT_USER_ID', config.botUserId],
  ];

  // Conditionally required based on enabled flags
  if (config.flags.leg1Reddit) {
    required.push(
      ['REDDIT_CLIENT_ID', config.reddit.clientId],
      ['REDDIT_CLIENT_SECRET', config.reddit.clientSecret],
      ['REDDIT_USERNAME', config.reddit.username],
      ['REDDIT_PASSWORD', config.reddit.password],
    );
  }

  if (config.flags.leg2Twitter || config.flags.leg1Twitter || config.flags.leg3TwitterPost) {
    required.push(
      ['TWITTER_API_KEY', config.twitter.apiKey],
      ['TWITTER_API_SECRET', config.twitter.apiSecret],
      ['TWITTER_ACCESS_TOKEN', config.twitter.accessToken],
      ['TWITTER_ACCESS_SECRET', config.twitter.accessSecret],
    );
  }

  if (config.flags.leg1Discord) {
    required.push(['DISCORD_BOT_TOKEN', config.discord.botToken]);
  }

  // Lemmy credentials required if either Lemmy leg is enabled
  if (config.flags.leg2Lemmy || config.flags.leg3LemmyPost) {
    required.push(
      ['LEMMY_USERNAME', config.lemmy.username],
      ['LEMMY_PASSWORD', config.lemmy.password],
    );
  }

  // Leg 3 needs Reddit creds if posting auto-debates to Reddit
  if (config.flags.leg3RedditPost) {
    required.push(
      ['REDDIT_CLIENT_ID', config.reddit.clientId],
      ['REDDIT_CLIENT_SECRET', config.reddit.clientSecret],
      ['REDDIT_USERNAME', config.reddit.username],
      ['REDDIT_PASSWORD', config.reddit.password],
    );
  }

  for (const [name, value] of required) {
    if (!value || value.includes('PASTE_YOUR')) {
      errors.push(`❌ ${name} is missing or still a placeholder`);
    }
  }

  // Warnings (non-fatal)
  if (config.flags.leg1Twitter) {
    warnings.push('⚠️  Leg 1 Twitter (scanning) requires Basic API ($100/mo). Free tier is write-only.');
  }

  if (!config.proxy.url && (config.flags.leg1Reddit || config.flags.leg1Twitter)) {
    warnings.push('⚠️  No proxy configured — IP bans more likely on Reddit/X');
  }

  if (config.dryRun) {
    warnings.push('🧪 DRY_RUN is ON — bot will log actions but not post anything');
  }

  if (config.flags.leg3AutoDebate) {
    warnings.push(`🏟️  Leg 3 Auto-Debate enabled: ${config.autoDebate.rounds} rounds, max ${config.autoDebate.maxPerDay}/day`);
  }

  return { errors, warnings };
}

module.exports = { config, validateConfig };
