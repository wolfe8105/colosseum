// ============================================================
// THE COLOSSEUM — BOT CONFIG VALIDATION TESTS
// Tests validateConfig() — env validation logic.
// Manipulates the exported config object directly since
// validateConfig() reads from config, not process.env.
// Session 132.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { config, validateConfig } from '../bot-config';
import type { BotConfig, ValidationResult } from '../bot-config';

// Save originals so we can restore after each test
let originalServiceRoleKey: string | undefined;
let originalGroqApiKey: string | undefined;
let originalBotUserId: string | null;
let originalFlags: typeof config.flags;
let originalDryRun: boolean;
let originalProxyUrl: string | null;
let originalBlueskyHandle: string | undefined;
let originalBlueskyPassword: string | undefined;
let originalRedditClientId: string | undefined;
let originalRedditClientSecret: string | undefined;
let originalRedditUsername: string | undefined;
let originalRedditPassword: string | undefined;
let originalTwitterApiKey: string | undefined;
let originalTwitterApiSecret: string | undefined;
let originalTwitterAccessToken: string | undefined;
let originalTwitterAccessSecret: string | undefined;
let originalDiscordBotToken: string | undefined;

beforeEach(() => {
  // Snapshot
  originalServiceRoleKey = config.supabase.serviceRoleKey;
  originalGroqApiKey = config.groq.apiKey;
  originalBotUserId = config.botUserId;
  originalFlags = { ...config.flags };
  originalDryRun = config.dryRun;
  originalProxyUrl = config.proxy.url;
  originalBlueskyHandle = config.bluesky.handle;
  originalBlueskyPassword = config.bluesky.appPassword;
  originalRedditClientId = config.reddit.clientId;
  originalRedditClientSecret = config.reddit.clientSecret;
  originalRedditUsername = config.reddit.username;
  originalRedditPassword = config.reddit.password;
  originalTwitterApiKey = config.twitter.apiKey;
  originalTwitterApiSecret = config.twitter.apiSecret;
  originalTwitterAccessToken = config.twitter.accessToken;
  originalTwitterAccessSecret = config.twitter.accessSecret;
  originalDiscordBotToken = config.discord.botToken;

  // Set baseline: all required fields populated, all flags off
  config.supabase.serviceRoleKey = 'test-service-role-key';
  config.groq.apiKey = 'test-groq-key';
  config.botUserId = 'test-bot-user-id';
  config.dryRun = false;
  config.proxy.url = null;
  config.flags = {
    leg1Reddit: false,
    leg1Twitter: false,
    leg1Discord: false,
    leg2News: false,
    leg2Twitter: false,
    leg2DebateCreator: false,
    leg3AutoDebate: false,
    leg3RedditPost: false,
    leg3TwitterPost: false,
    leg1Bluesky: false,
    leg2Bluesky: false,
    leg3BlueskyPost: false,
  };

  return () => {
    // Restore
    config.supabase.serviceRoleKey = originalServiceRoleKey;
    config.groq.apiKey = originalGroqApiKey;
    config.botUserId = originalBotUserId;
    config.flags = originalFlags;
    config.dryRun = originalDryRun;
    config.proxy.url = originalProxyUrl;
    config.bluesky.handle = originalBlueskyHandle;
    config.bluesky.appPassword = originalBlueskyPassword;
    config.reddit.clientId = originalRedditClientId;
    config.reddit.clientSecret = originalRedditClientSecret;
    config.reddit.username = originalRedditUsername;
    config.reddit.password = originalRedditPassword;
    config.twitter.apiKey = originalTwitterApiKey;
    config.twitter.apiSecret = originalTwitterApiSecret;
    config.twitter.accessToken = originalTwitterAccessToken;
    config.twitter.accessSecret = originalTwitterAccessSecret;
    config.discord.botToken = originalDiscordBotToken;
  };
});

// ── Core required fields ─────────────────────────────────────

describe('validateConfig — core required fields', () => {
  it('passes with all required fields set and no flags enabled', () => {
    const result = validateConfig();
    expect(result.errors).toHaveLength(0);
  });

  it('errors when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    config.supabase.serviceRoleKey = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true);
  });

  it('errors when GROQ_API_KEY is missing', () => {
    config.groq.apiKey = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('GROQ_API_KEY'))).toBe(true);
  });

  it('errors when BOT_USER_ID is missing', () => {
    config.botUserId = null;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('BOT_USER_ID'))).toBe(true);
  });

  it('errors when value is a PASTE_YOUR placeholder', () => {
    config.supabase.serviceRoleKey = 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE';
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true);
  });

  it('reports multiple missing fields', () => {
    config.supabase.serviceRoleKey = undefined;
    config.groq.apiKey = undefined;
    config.botUserId = null;
    const result = validateConfig();
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Conditional: Bluesky flags ───────────────────────────────

describe('validateConfig — Bluesky flag checks', () => {
  it('requires Bluesky creds when leg1Bluesky enabled', () => {
    config.flags.leg1Bluesky = true;
    config.bluesky.handle = undefined;
    config.bluesky.appPassword = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('BLUESKY_HANDLE'))).toBe(true);
    expect(result.errors.some(e => e.includes('BLUESKY_APP_PASSWORD'))).toBe(true);
  });

  it('requires Bluesky creds when leg2Bluesky enabled', () => {
    config.flags.leg2Bluesky = true;
    config.bluesky.handle = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('BLUESKY_HANDLE'))).toBe(true);
  });

  it('requires Bluesky creds when leg3BlueskyPost enabled', () => {
    config.flags.leg3BlueskyPost = true;
    config.bluesky.appPassword = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('BLUESKY_APP_PASSWORD'))).toBe(true);
  });

  it('no Bluesky errors when Bluesky flags are off', () => {
    config.bluesky.handle = undefined;
    config.bluesky.appPassword = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('BLUESKY'))).toBe(false);
  });
});

// ── Conditional: Reddit flags ────────────────────────────────

describe('validateConfig — Reddit flag checks', () => {
    it('requires Reddit creds when leg1Reddit enabled', () => {
    config.flags.leg1Reddit = true;
    config.reddit.clientId = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('REDDIT_CLIENT_ID'))).toBe(true);
  });

  it('requires Reddit creds when leg3RedditPost enabled', () => {
    config.flags.leg3RedditPost = true;
    config.reddit.username = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('REDDIT_USERNAME'))).toBe(true);
  });

  it('no Reddit errors when Reddit flags are off', () => {
    config.reddit.clientId = undefined;
    config.reddit.clientSecret = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('REDDIT'))).toBe(false);
  });
});

// ── Conditional: Twitter flags ───────────────────────────────

describe('validateConfig — Twitter flag checks', () => {
  it('requires Twitter creds when leg1Twitter enabled', () => {
    config.flags.leg1Twitter = true;
    config.twitter.apiKey = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('TWITTER_API_KEY'))).toBe(true);
  });

  it('requires Twitter creds when leg2Twitter enabled', () => {
    config.flags.leg2Twitter = true;
    config.twitter.accessToken = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('TWITTER_ACCESS_TOKEN'))).toBe(true);
  });

  it('requires Twitter creds when leg3TwitterPost enabled', () => {
    config.flags.leg3TwitterPost = true;
    config.twitter.apiSecret = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('TWITTER_API_SECRET'))).toBe(true);
  });
});

// ── Conditional: Discord flags ───────────────────────────────

describe('validateConfig — Discord flag checks', () => {
  it('requires Discord token when leg1Discord enabled', () => {
    config.flags.leg1Discord = true;
    config.discord.botToken = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('DISCORD_BOT_TOKEN'))).toBe(true);
  });

  it('no Discord errors when flag is off', () => {
    config.discord.botToken = undefined;
    const result = validateConfig();
    expect(result.errors.some(e => e.includes('DISCORD'))).toBe(false);
  });
});

// ── Warnings ─────────────────────────────────────────────────

describe('validateConfig — warnings', () => {
  it('warns about Twitter Basic API cost when leg1Twitter on', () => {
    config.flags.leg1Twitter = true;
    config.twitter.apiKey = 'test';
    config.twitter.apiSecret = 'test';
    config.twitter.accessToken = 'test';
    config.twitter.accessSecret = 'test';
    const result = validateConfig();
    expect(result.warnings.some(w => w.includes('Basic API'))).toBe(true);
  });

  it('warns about missing proxy when Reddit or Twitter scanning', () => {
    config.flags.leg1Reddit = true;
    config.reddit.clientId = 'test';
    config.reddit.clientSecret = 'test';
    config.reddit.username = 'test';
    config.reddit.password = 'test';
    config.proxy.url = null;
    const result = validateConfig();
    expect(result.warnings.some(w => w.includes('No proxy'))).toBe(true);
  });

  it('warns when DRY_RUN is on', () => {
    config.dryRun = true;
    const result = validateConfig();
    expect(result.warnings.some(w => w.includes('DRY_RUN'))).toBe(true);
  });

  it('warns when leg3AutoDebate is enabled', () => {
    config.flags.leg3AutoDebate = true;
    const result = validateConfig();
    expect(result.warnings.some(w => w.includes('Auto-Debate enabled'))).toBe(true);
  });

  it('no proxy warning when proxy is configured', () => {
    config.flags.leg1Reddit = true;
    config.reddit.clientId = 'test';
    config.reddit.clientSecret = 'test';
    config.reddit.username = 'test';
    config.reddit.password = 'test';
    config.proxy.url = 'http://proxy.example.com';
    const result = validateConfig();
    expect(result.warnings.some(w => w.includes('No proxy'))).toBe(false);
  });
});

// ── Config structure ─────────────────────────────────────────

describe('config object — structure', () => {
  it('has 7 news sources', () => {
    expect(config.newsSources).toHaveLength(7);
  });

  it('has 6 topic categories', () => {
    expect(Object.keys(config.topicCategories)).toHaveLength(6);
  });

  it('groq model is llama-3.3-70b-versatile', () => {
    expect(config.groq.model).toBe('llama-3.3-70b-versatile');
  });

  it('autoDebate defaults to 3 rounds', () => {
    expect(config.autoDebate.rounds).toBe(3);
  });

  it('reddit has 13 subreddits', () => {
    expect(config.reddit.subreddits).toHaveLength(13);
  });

  it('bluesky maxRepliesPerDay is 10', () => {
    expect(config.bluesky.maxRepliesPerDay).toBe(10);
  });
});
