// ============================================================
// THE COLOSSEUM — LEG 2 LEMMY POSTER
// Proactively posts debate hooks to relevant Lemmy communities.
// Posts ONLY to communities that have given explicit permission
// (or are open-submission communities that allow discussion posts).
//
// Lemmy API v3 — Bearer token auth (0.19+).
// JWT persisted in memory per session — re-login only on expiry.
// DRY_RUN mode: logs what would be posted, no API calls.
//
// Anti-detection: jitter delays, human-like post frequency,
// persistent JWT (not re-login per action), 2-4 posts/day max.
//
// SETUP REQUIRED:
//   1. Create a Lemmy account (e.g. lemmy.world or beehaw.org)
//   2. Mark account as a bot in account settings
//   3. Set LEMMY_USERNAME, LEMMY_PASSWORD, LEMMY_INSTANCE in .env
//   4. Set LEG2_LEMMY_ENABLED=true in .env when ready
//
// LM NOTE: Lemmy.world bot rules require:
//   - Account marked as bot
//   - Owner + contact info in bio
//   - No advertising, no spamming
//   - Post in communities with explicit permission OR open communities
//   - Max 2-3 posts/day per community
// ============================================================

const { config } = require('./bot-config');

// ============================================================
// LEMMY CLIENT — raw fetch wrapper (no library dependency)
// Matches existing bot army pattern
// ============================================================

class LemmyClient {
  constructor(instance, dryRun = false) {
    this.instance = instance; // e.g. 'lemmy.world'
    this.baseUrl = `https://${instance}/api/v3`;
    this.jwt = null;
    this.jwtExpiresAt = null;
    this.dryRun = dryRun;
  }

  async _request(method, path, body = null, requiresAuth = false) {
    const url = `${this.baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (requiresAuth && this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
    }

    if (this.dryRun && method !== 'GET') {
      console.log(`[LEMMY][DRY_RUN] ${method} ${path}`, body ? JSON.stringify(body).substring(0, 200) : '');
      return { success: true, dry_run: true };
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lemmy API ${method} ${path} → ${res.status}: ${text.substring(0, 300)}`);
    }

    return res.json();
  }

  // Login and persist JWT. Lemmy admin guidance: don't re-login per action.
  async login(username, password) {
    console.log(`[LEMMY] Logging in as ${username}@${this.instance}...`);
    const data = await this._request('POST', '/user/login', {
      username_or_email: username,
      password,
    });
    this.jwt = data.jwt;
    // JWTs are typically valid for weeks — refresh after 7 days to be safe
    this.jwtExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    console.log(`[LEMMY] ✅ Logged in. JWT acquired.`);
    return this.jwt;
  }

  // Re-login only if JWT is expired or missing
  async ensureAuth(username, password) {
    if (!this.jwt || Date.now() > this.jwtExpiresAt) {
      await this.login(username, password);
    }
  }

  // Get community ID by name (e.g. 'politics' or 'politics@lemmy.world')
  async getCommunityId(communityName) {
    const data = await this._request('GET', `/community?name=${encodeURIComponent(communityName)}`);
    return data.community_view?.community?.id ?? null;
  }

  // Create a post. Returns post_id.
  async createPost({ communityId, title, body = null, url = null }) {
    const payload = {
      community_id: communityId,
      name: title,      // Lemmy calls the title "name"
    };
    if (body) payload.body = body;
    if (url) payload.url = url;

    const data = await this._request('POST', '/post', payload, true);
    if (this.dryRun) return null;
    return data.post_view?.post?.id ?? null;
  }
}

// ============================================================
// DEBATE HOOK TEMPLATES
// Framed as genuine discussion starters, not ads.
// Link to mirror (colosseum-f30.pages.dev) per LM-041.
// ============================================================

function buildLeg2Post(debate, mirrorUrl) {
  const hooks = [
    {
      title: `${debate.topic} — settle this`,
      body: `This one's been going around all week and nobody can agree.\n\n**${debate.topic}**\n\n${debate.hookLine}\n\n[What do you think? Vote + see the full debate breakdown →](${mirrorUrl})`,
    },
    {
      title: `Hot take: ${debate.topic}`,
      body: `People have strong opinions on this.\n\n> ${debate.hookLine}\n\nI've been seeing this debated everywhere. [Full breakdown here](${mirrorUrl}) — curious what this community thinks.`,
    },
    {
      title: `Can we settle ${debate.topic} once and for all?`,
      body: `${debate.hookLine}\n\nThis keeps coming up and I want to see where people actually stand. [Structured debate + results →](${mirrorUrl})`,
    },
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

// ============================================================
// COMMUNITY TARGET LIST
// Only communities that:
//   (a) are explicitly open to discussion/debate posts, OR
//   (b) have been granted permission by moderators
//
// Format: { name: 'community@instance', category: 'politics'|'sports'|etc }
// Start with a small list — add more after accounts are established.
// ============================================================

const LEMMY_COMMUNITIES = [
  // Open discussion communities
  { name: 'asklemmy@lemmy.ml',            category: 'general' },
  { name: 'nostupidquestions@lemmy.world', category: 'general' },
  { name: 'ask@lemmy.world',              category: 'general' },

  // Debate/opinion focused
  { name: 'changemyview@lemmy.ml',        category: 'politics' },
  { name: 'unpopularopinion@lemmy.world', category: 'general' },

  // Sports — open discussion
  { name: 'sports@lemmy.world',           category: 'sports' },
  { name: 'nba@lemmy.world',              category: 'sports' },
  { name: 'nfl@lemmy.world',              category: 'sports' },

  // Entertainment
  { name: 'movies@lemmy.world',           category: 'movies' },
  { name: 'music@lemmy.world',            category: 'music' },
];

// ============================================================
// MAIN EXPORT
// ============================================================

class Leg2LemmyPoster {
  constructor() {
    this.cfg = config.lemmy;
    this.client = new LemmyClient(this.cfg.instance, config.dryRun);
    // Cache community IDs to avoid re-fetching
    this._communityIdCache = {};
    // Track how many posts we've made today per community (in-memory)
    this._postCountToday = {};
    this._postCountDate = new Date().toDateString();
  }

  _resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this._postCountDate) {
      this._postCountToday = {};
      this._postCountDate = today;
    }
  }

  async _getCommunityId(communityName) {
    if (this._communityIdCache[communityName]) {
      return this._communityIdCache[communityName];
    }
    try {
      const id = await this.client.getCommunityId(communityName);
      if (id) this._communityIdCache[communityName] = id;
      return id;
    } catch (err) {
      console.error(`[LEMMY][LEG2] Failed to resolve community "${communityName}": ${err.message}`);
      return null;
    }
  }

  // Jitter: human-like delay between actions (LM-134 fix for Lemmy)
  async _jitter() {
    const delayMs = config.warmup.actionDelayMinMs +
      Math.random() * (config.warmup.actionDelayMaxMs - config.warmup.actionDelayMinMs);
    await new Promise(r => setTimeout(r, delayMs));
  }

  // Post a single debate hook. Returns true if posted.
  async postHotTake(debate) {
    if (!this.cfg?.enabled) {
      console.log('[LEMMY][LEG2] Disabled — set LEG2_LEMMY_ENABLED=true to activate');
      return false;
    }

    this._resetDailyCountIfNeeded();

    // Pick a community that matches the debate category
    const matchingCommunities = LEMMY_COMMUNITIES.filter(
      c => c.category === debate.category || c.category === 'general'
    );

    if (matchingCommunities.length === 0) {
      console.log(`[LEMMY][LEG2] No matching community for category: ${debate.category}`);
      return false;
    }

    // Pick one that hasn't hit the daily post limit
    const eligible = matchingCommunities.filter(
      c => (this._postCountToday[c.name] || 0) < this.cfg.maxPostsPerCommunityPerDay
    );

    if (eligible.length === 0) {
      console.log('[LEMMY][LEG2] All matching communities at daily post limit');
      return false;
    }

    const target = eligible[Math.floor(Math.random() * eligible.length)];

    try {
      await this.client.ensureAuth(this.cfg.username, this.cfg.password);

      const communityId = await this._getCommunityId(target.name);
      if (!communityId) {
        console.error(`[LEMMY][LEG2] Community not found: ${target.name}`);
        return false;
      }

      const mirrorUrl = `${config.app.baseUrl}${config.app.autoDebatePath}`;
      const { title, body } = buildLeg2Post(debate, mirrorUrl);

      await this._jitter();

      console.log(`[LEMMY][LEG2] Posting to !${target.name}: "${title}"`);
      const postId = await this.client.createPost({ communityId, title, body });

      this._postCountToday[target.name] = (this._postCountToday[target.name] || 0) + 1;

      if (config.dryRun) {
        console.log('[LEMMY][LEG2] DRY_RUN — no post sent');
      } else {
        console.log(`[LEMMY][LEG2] ✅ Posted to !${target.name} — post ID: ${postId}`);
      }

      return true;
    } catch (err) {
      console.error(`[LEMMY][LEG2] ❌ Post failed for !${target.name}: ${err.message}`);
      return false;
    }
  }
}

module.exports = new Leg2LemmyPoster();
