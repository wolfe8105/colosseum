#!/usr/bin/env node
// ============================================================
// THE COLOSSEUM — BLUESKY BOT SETUP
// Run on VPS: node /opt/colosseum/setup-bluesky.js
// Session 42
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOT_DIR = '/opt/colosseum/bot-army/colosseum-bot-army';
const LIB_DIR = path.join(BOT_DIR, 'lib');
const REPO_DIR = '/opt/colosseum';

console.log('🔵 Setting up Bluesky bot...\n');

// ── 1. Install @atproto/api ──────────────────────────────────
console.log('[1/5] Installing @atproto/api...');
try {
  execSync('npm install @atproto/api', { cwd: BOT_DIR, stdio: 'inherit' });
} catch (e) {
  console.error('npm install failed:', e.message);
  process.exit(1);
}

// ── 2. Copy leg files ────────────────────────────────────────
console.log('\n[2/5] Copying Bluesky leg files...');
fs.copyFileSync(path.join(REPO_DIR, 'leg1-bluesky.js'), path.join(LIB_DIR, 'leg1-bluesky.js'));
fs.copyFileSync(path.join(REPO_DIR, 'leg2-bluesky-poster.js'), path.join(LIB_DIR, 'leg2-bluesky-poster.js'));
console.log('  ✅ leg1-bluesky.js → lib/');
console.log('  ✅ leg2-bluesky-poster.js → lib/');

// ── 3. Patch bot-config.js ───────────────────────────────────
console.log('\n[3/5] Patching bot-config.js...');
const configPath = path.join(BOT_DIR, 'bot-config.js');
let configSrc = fs.readFileSync(configPath, 'utf-8');

if (configSrc.includes('bluesky:')) {
  console.log('  Already patched — skipping');
} else {
  // Add bluesky config block after proxy block
  configSrc = configSrc.replace(
    /\/\/ --- App ---/,
    `// --- Bluesky (Session 42) ---
  bluesky: {
    handle: process.env.BLUESKY_HANDLE,
    appPassword: process.env.BLUESKY_APP_PASSWORD,
    colosseumlUrl: process.env.COLOSSEUM_URL || 'https://colosseum-f30.pages.dev',
    maxRepliesPerCycle: 3,
    maxRepliesPerDay: 10,
    maxPostsPerDay: 12,
  },

  // --- App ---`
  );

  // Add Bluesky flags
  configSrc = configSrc.replace(
    /leg3TwitterPost: process\.env\.LEG3_TWITTER_POST_ENABLED === 'true',/,
    `leg3TwitterPost: process.env.LEG3_TWITTER_POST_ENABLED === 'true',
    leg1Bluesky: process.env.LEG1_BLUESKY_ENABLED === 'true',
    leg2Bluesky: process.env.LEG2_BLUESKY_ENABLED === 'true',
    leg3BlueskyPost: process.env.LEG3_BLUESKY_POST_ENABLED === 'true',`
  );

  // Add Bluesky validation
  configSrc = configSrc.replace(
    /if \(config\.flags\.leg1Discord\)/,
    `if (config.flags.leg1Bluesky || config.flags.leg2Bluesky || config.flags.leg3BlueskyPost) {
    required.push(
      ['BLUESKY_HANDLE', config.bluesky.handle],
      ['BLUESKY_APP_PASSWORD', config.bluesky.appPassword],
    );
  }

  if (config.flags.leg1Discord)`
  );

  fs.writeFileSync(configPath, configSrc);
  console.log('  ✅ bot-config.js patched');
}

// ── 4. Patch bot-engine.js ───────────────────────────────────
console.log('\n[4/5] Patching bot-engine.js...');
const enginePath = path.join(BOT_DIR, 'bot-engine.js');
let engineSrc = fs.readFileSync(enginePath, 'utf-8');

if (engineSrc.includes('leg1-bluesky')) {
  console.log('  Already patched — skipping');
} else {
  // Add requires
  engineSrc = engineSrc.replace(
    "const leg1Discord = require('./lib/leg1-discord');",
    `const leg1Discord = require('./lib/leg1-discord');
const leg1Bluesky = require('./lib/leg1-bluesky');`
  );

  engineSrc = engineSrc.replace(
    "const leg2TwitterPoster = require('./lib/leg2-twitter-poster');",
    `const leg2TwitterPoster = require('./lib/leg2-twitter-poster');
const leg2BlueskyPoster = require('./lib/leg2-bluesky-poster');`
  );

  // Add to formatFlags
  engineSrc = engineSrc.replace(
    "if (config.flags.leg3TwitterPost) flags.push('L3-Twitter');",
    `if (config.flags.leg3TwitterPost) flags.push('L3-Twitter');
  if (config.flags.leg1Bluesky) flags.push('L1-Bluesky');
  if (config.flags.leg2Bluesky) flags.push('L2-Bluesky');
  if (config.flags.leg3BlueskyPost) flags.push('L3-Bluesky');`
  );

  // Add Bluesky Leg 1 cron schedule — find the end of the Reddit cron block
  // and insert Bluesky cron after it
  engineSrc = engineSrc.replace(
    "if (config.flags.leg1Reddit) {\n    cron.schedule('*/20 * * * *', async () => {\n      try {\n        await leg1Reddit.scanAndReply();\n      } catch (err) {\n        logger.error(`Leg 1 Reddit cron failed: ${err.message}`);\n      }\n    });",
    `if (config.flags.leg1Reddit) {
    cron.schedule('*/20 * * * *', async () => {
      try {
        await leg1Reddit.scanAndReply();
      } catch (err) {
        logger.error(\`Leg 1 Reddit cron failed: \${err.message}\`);
      }
    });
  }

  // Bluesky Leg 1 — every 30 min (conservative)
  if (config.flags.leg1Bluesky) {
    cron.schedule('*/30 * * * *', async () => {
      try {
        await leg1Bluesky.scanAndReply();
      } catch (err) {
        logger.error(\`Leg 1 Bluesky cron failed: \${err.message}\`);
      }
    });`
  );

  fs.writeFileSync(enginePath, engineSrc);
  console.log('  ✅ bot-engine.js patched');
}

// ── 5. Add env vars to .env ──────────────────────────────────
console.log('\n[5/5] Adding Bluesky env vars...');
const envPath = path.join(BOT_DIR, '.env');
let envSrc = fs.readFileSync(envPath, 'utf-8');

if (envSrc.includes('BLUESKY_HANDLE')) {
  console.log('  Already present — skipping');
} else {
  envSrc += `

# --- BLUESKY (Session 42 — Priority 1 bot expansion) ---
# 1. Create a Bluesky account at bsky.app
# 2. Go to Settings > App Passwords > Add App Password
# 3. Paste handle and app password below
BLUESKY_HANDLE=PASTE_YOUR_BLUESKY_HANDLE_HERE
BLUESKY_APP_PASSWORD=PASTE_YOUR_BLUESKY_APP_PASSWORD_HERE

# Bluesky legs — all disabled until credentials are set
LEG1_BLUESKY_ENABLED=false
LEG2_BLUESKY_ENABLED=false
LEG3_BLUESKY_POST_ENABLED=false
`;
  fs.writeFileSync(envPath, envSrc);
  console.log('  ✅ .env updated with Bluesky placeholders');
}

// ── Done ─────────────────────────────────────────────────────
console.log(`
✅ Bluesky bot setup complete!

NEXT STEPS:
  1. Create a Bluesky account at bsky.app
  2. Go to Settings → App Passwords → Add App Password
  3. Edit .env:  nano ${BOT_DIR}/.env
     Set BLUESKY_HANDLE=yourhandle.bsky.social
     Set BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
     Set LEG2_BLUESKY_ENABLED=true (safest to start)
  4. Restart: pm2 restart all
  5. Check: pm2 logs colosseum-bots
`);
