// ============================================================
// THE COLOSSEUM — BOT CONFIG (TypeScript)
// Loads .env, validates all required values, exports typed config.
// Bot refuses to start if any PASTE_YOUR placeholder remains.
// Migrated to TypeScript: Session 131.
// ============================================================
import 'dotenv/config';

// --- Type Definitions ---

export interface SupabaseConfig {
  url: string | undefined;
  serviceRoleKey: string | undefined;
}

export interface GroqConfig {
  apiKey: string | undefined;
  model: string;
  maxTokens: number;
}

export interface RedditConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  username: string | undefined;
  password: string | undefined;
  userAgent: string | undefined;
  subreddits: string[];
  postsPerScan: number;
  minScore: number;
  maxRepliesPerCycle: number;
  replyCooldownMs: number;
}

export interface TwitterConfig {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  accessToken: string | undefined;
  accessSecret: string | undefined;
  maxPostsPerDay: number;
  peakHoursEST: number[];
}

export interface DiscordConfig {
  botToken: string | undefined;
  argumentKeywords: string[];
  channelCooldownMs: number;
}

export interface ProxyConfig {
  url: string | null;
}

export interface BlueskyConfig {
  handle: string | undefined;
  appPassword: string | undefined;
  colosseumlUrl: string;
  maxRepliesPerCycle: number;
  maxRepliesPerDay: number;
  maxPostsPerDay: number;
}

export interface AppConfig {
  baseUrl: string;
  mirrorUrl: string;
  debateLandingPath: null;
  autoDebatePath: string;
}

export interface AutoDebateConfig {
  rounds: number;
  maxPerCycle: number;
  maxPerDay: number;
}

export interface WarmupConfig {
  enabled: boolean;
  noLinkDrops: boolean;
  jitterMinMs: number;
  jitterMaxMs: number;
  actionDelayMinMs: number;
  actionDelayMaxMs: number;
}

export interface FeatureFlags {
  leg1Reddit: boolean;
  leg1Twitter: boolean;
  leg1Discord: boolean;
  leg2News: boolean;
  leg2Twitter: boolean;
  leg2DebateCreator: boolean;
  leg3AutoDebate: boolean;
  leg3RedditPost: boolean;
  leg3TwitterPost: boolean;
  leg1Bluesky: boolean;
  leg2Bluesky: boolean;
  leg3BlueskyPost: boolean;
}

export interface NewsSource {
  name: string;
  url: string;
}

export interface TopicCategoryInfo {
  label: string;
  tier: number;
}

export interface TopicCategories {
  politics: TopicCategoryInfo;
  sports: TopicCategoryInfo;
  entertainment: TopicCategoryInfo;
  couples: TopicCategoryInfo;
  music: TopicCategoryInfo;
  movies: TopicCategoryInfo;
  [key: string]: TopicCategoryInfo;
}

export interface BotConfig {
  supabase: SupabaseConfig;
  botUserId: string | null;
  groq: GroqConfig;
  reddit: RedditConfig;
  twitter: TwitterConfig;
  discord: DiscordConfig;
  proxy: ProxyConfig;
  bluesky: BlueskyConfig;
  app: AppConfig;
  autoDebate: AutoDebateConfig;
  warmup: WarmupConfig;
  flags: FeatureFlags;
  logLevel: string;
  dryRun: boolean;
  newsSources: NewsSource[];
  topicCategories: TopicCategories;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// --- Config Object ---

export const config: BotConfig = {
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
    model: 'llama-3.3-70b-versatile',
    maxTokens: 280,
  },

  // --- Reddit ---
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    userAgent: process.env.REDDIT_USER_AGENT,
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

  // --- Proxy ---
  proxy: {
    url: process.env.PROXY_URL === 'NONE' ? null : (process.env.PROXY_URL ?? null),
  },

  // --- Bluesky (Session 42/95) ---
  bluesky: {
    handle: process.env.BLUESKY_HANDLE,
    appPassword: process.env.BLUESKY_APP_PASSWORD,
    colosseumlUrl: process.env.COLOSSEUM_URL || 'https://colosseum-f30.pages.dev',
    maxRepliesPerCycle: 3,
    maxRepliesPerDay: 10,
    maxPostsPerDay: 12,
  },

  // --- App ---
  app: {
    baseUrl: process.env.APP_BASE_URL || 'https://themoderator.app',
    mirrorUrl: process.env.MIRROR_URL || 'https://colosseum-f30.pages.dev',
    debateLandingPath: null,
    autoDebatePath: process.env.AUTO_DEBATE_PATH || '/colosseum-auto-debate.html',
  },

  // --- Auto-Debate Settings (Leg 3) ---
  autoDebate: {
    rounds: parseInt(process.env.AUTO_DEBATE_ROUNDS ?? '', 10) || 3,
    maxPerCycle: parseInt(process.env.AUTO_DEBATE_MAX_PER_CYCLE ?? '', 10) || 2,
    maxPerDay: parseInt(process.env.AUTO_DEBATE_MAX_PER_DAY ?? '', 10) || 3,
  },

  // --- Warmup / Jitter ---
  warmup: {
    enabled: process.env.WARMUP_MODE === 'true',
    noLinkDrops: process.env.WARMUP_MODE === 'true',
    jitterMinMs: parseInt(process.env.JITTER_MIN_MS ?? '', 10) || 60_000,
    jitterMaxMs: parseInt(process.env.JITTER_MAX_MS ?? '', 10) || 480_000,
    actionDelayMinMs: parseInt(process.env.ACTION_DELAY_MIN_MS ?? '', 10) || 2_000,
    actionDelayMaxMs: parseInt(process.env.ACTION_DELAY_MAX_MS ?? '', 10) || 8_000,
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
    leg1Bluesky: process.env.LEG1_BLUESKY_ENABLED === 'true',
    leg2Bluesky: process.env.LEG2_BLUESKY_ENABLED === 'true',
    leg3BlueskyPost: process.env.LEG3_BLUESKY_POST_ENABLED === 'true',
  },

  // --- Operational ---
  logLevel: process.env.LOG_LEVEL || 'info',
  dryRun: process.env.DRY_RUN === 'true',

  // --- News Sources (shared by Leg 2 + Leg 3) ---
  newsSources: [
    { name: 'Google News - Top',           url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Sports',        url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Politics',      url: 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4ZERBU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Google News - Entertainment', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' },
    { name: 'ESPN - Top',                  url: 'https://www.espn.com/espn/rss/news' },
    { name: 'ESPN - NBA',                  url: 'https://www.espn.com/espn/rss/nba/news' },
    { name: 'ESPN - NFL',                  url: 'https://www.espn.com/espn/rss/nfl/news' },
  ],

  // --- Topic Categories (maps to app sections) ---
  topicCategories: {
    politics:      { label: 'Politics',      tier: 1 },
    sports:        { label: 'Sports',        tier: 1 },
    entertainment: { label: 'Entertainment', tier: 2 },
    couples:       { label: 'Couples Court', tier: 2 },
    music:         { label: 'Music',         tier: 3 },
    movies:        { label: 'Movies/TV',     tier: 3 },
  },
};

// ============================================================
// STARTUP VALIDATION
// ============================================================
export function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Always required
  const required: [string, string | undefined | null][] = [
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

  if (config.flags.leg1Bluesky || config.flags.leg2Bluesky || config.flags.leg3BlueskyPost) {
    required.push(
      ['BLUESKY_HANDLE', config.bluesky.handle],
      ['BLUESKY_APP_PASSWORD', config.bluesky.appPassword],
    );
  }

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
