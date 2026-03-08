// ============================================================
// THE COLOSSEUM — LEG 3 LEMMY POSTER
// Posts AI auto-debate results to Lemmy as rage-click hooks.
// "AI scored this debate and people DISAGREE with the result"
// → click → colosseum-f30.pages.dev/colosseum-auto-debate.html
//
// Same pattern as leg3-twitter-post.js but for Lemmy.
// Posts to open discussion communities only.
// DRY_RUN mode: logs what would be posted, no API calls.
//
// LM-041: Links ALWAYS point to mirror (colosseum-f30.pages.dev),
// never the Vercel app directly.
// ============================================================

const { config } = require('./bot-config');

// ============================================================
// RAGE-CLICK HOOK TEMPLATES
// Controversial AI scoring is the marketing (NT 4.18).
// Templates are intentionally provocative but not dishonest.
// ============================================================

const RAGE_TEMPLATES = [
  (topic, winner, score) =>
    `AI judged this debate on "${topic}" and gave the win to ${winner} (${score}% — majority disagrees)\n\n` +
    `Watch the full breakdown and see if you agree with the AI verdict ↓`,

  (topic, winner, score) =>
    `"${topic}" — AI scored it ${winner} wins. The comments are NOT happy (${score}% disagree).\n\n` +
    `Controversial AI verdict here ↓`,

  (topic, winner, score) =>
    `This debate on "${topic}" has people fired up.\n\n` +
    `AI gave the win to ${winner} with a ${score}% disagreement rate from voters.\n\n` +
    `Is the AI right? Full debate ↓`,

  (topic, winner, score) =>
    `Hot debate: "${topic}"\n\n` +
    `AI ruling: ${winner} wins — but ${score}% of readers think the AI got it wrong.\n\n` +
    `[See why people are arguing about this ↓]`,
];

function buildLeg3Post(autoDebate, mirrorUrl) {
  const topic = autoDebate.topic;
  const winner = autoDebate.ai_winner_label || 'Side A';
  // Lopsided score is the hook (NT 4.17) — show the minority winner percentage
  const winnerPct = autoDebate.winner_pct || Math.floor(25 + Math.random() * 15); // 25-40%
  const disagreePct = 100 - winnerPct;

  const template = RAGE_TEMPLATES[Math.floor(Math.random() * RAGE_TEMPLATES.length)];
  const body = template(topic, winner, disagreePct);

  // Title: short, punchy, clickable
  const titleOptions = [
    `AI judged "${topic.substring(0, 60)}" — controversial ruling`,
    `Debate result: "${topic.substring(0, 55)}" (AI verdict inside)`,
    `"${topic.substring(0, 65)}" — AI scored this one`,
  ];
  const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];

  return { title, body, url: mirrorUrl };
}

// ============================================================
// COMMUNITY LIST FOR LEG 3
// Communities that accept link posts + discussion.
// Lemmy is more permissive about link posts than Bluesky.
// ============================================================

const LEG3_COMMUNITIES = [
  { name: 'asklemmy@lemmy.ml',            category: 'general' },
  { name: 'nostupidquestions@lemmy.world', category: 'general' },
  { name: 'unpopularopinion@lemmy.world', category: 'general' },
  { name: 'sports@lemmy.world',           category: 'sports' },
  { name: 'movies@lemmy.world',           category: 'movies' },
  { name: 'music@lemmy.world',            category: 'music' },
];

// ============================================================
// REUSE LEMMY CLIENT FROM LEG 2
// One shared client instance = one shared JWT session.
// ============================================================

// Minimal inline client (avoids circular dependency on leg2)
class LemmyClient {
  constructor(instance, dryRun = false) {
    this.instance = instance;
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

  async login(username, password) {
    console.log(`[LEMMY] Logging in as ${username}@${this.instance}...`);
    const data = await this._request('POST', '/user/login', { username_or_email: username, password });
    this.jwt = data.jwt;
    this.jwtExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    console.log('[LEMMY] ✅ Logged in.');
    return this.jwt;
  }

  async ensureAuth(username, password) {
    if (!this.jwt || Date.now() > this.jwtExpiresAt) {
      await this.login(username, password);
    }
  }

  async getCommunityId(communityName) {
    const data = await this._request('GET', `/community?name=${encodeURIComponent(communityName)}`);
    return data.community_view?.community?.id ?? null;
  }

  async createPost({ communityId, title, body, url }) {
    const payload = { community_id: communityId, name: title };
    if (body) payload.body = body;
    if (url) payload.url = url;
    const data = await this._request('POST', '/post', payload, true);
    if (this.dryRun) return null;
    return data.post_view?.post?.id ?? null;
  }
}

// ============================================================
// MAIN EXPORT
// ============================================================

class Leg3LemmyPoster {
  constructor() {
    this.cfg = config.lemmy;
    this.client = new LemmyClient(this.cfg?.instance || 'lemmy.world', config.dryRun);
    this._communityIdCache = {};
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
      console.error(`[LEMMY][LEG3] Failed to resolve community "${communityName}": ${err.message}`);
      return null;
    }
  }

  async _jitter() {
    const delayMs = config.warmup.actionDelayMinMs +
      Math.random() * (config.warmup.actionDelayMaxMs - config.warmup.actionDelayMinMs);
    await new Promise(r => setTimeout(r, delayMs));
  }

  // Posts an auto-debate result as a rage-click hook.
  async postAutoDebate(autoDebate) {
    if (!config.flags.leg3LemmyPost) {
      console.log('[LEMMY][LEG3] Disabled — set LEG3_LEMMY_POST_ENABLED=true to activate');
      return false;
    }

    if (!this.cfg?.enabled) {
      console.log('[LEMMY][LEG3] Lemmy credentials not configured');
      return false;
    }

    this._resetDailyCountIfNeeded();

    // Match community to debate category
    const category = autoDebate.category || 'general';
    const matchingCommunities = LEG3_COMMUNITIES.filter(
      c => c.category === category || c.category === 'general'
    );

    const eligible = matchingCommunities.filter(
      c => (this._postCountToday[c.name] || 0) < (this.cfg.maxPostsPerCommunityPerDay || 2)
    );

    if (eligible.length === 0) {
      console.log('[LEMMY][LEG3] All communities at daily limit');
      return false;
    }

    const target = eligible[Math.floor(Math.random() * eligible.length)];

    try {
      await this.client.ensureAuth(this.cfg.username, this.cfg.password);

      const communityId = await this._getCommunityId(target.name);
      if (!communityId) {
        console.error(`[LEMMY][LEG3] Community not found: ${target.name}`);
        return false;
      }

      const mirrorBaseUrl = process.env.COLOSSEUM_URL || 'https://colosseum-f30.pages.dev';
      const mirrorUrl = `${mirrorBaseUrl}/colosseum-auto-debate.html?id=${autoDebate.id}`;

      const { title, body, url } = buildLeg3Post(autoDebate, mirrorUrl);

      await this._jitter();

      console.log(`[LEMMY][LEG3] Posting to !${target.name}: "${title}"`);
      const postId = await this.client.createPost({ communityId, title, body, url });

      this._postCountToday[target.name] = (this._postCountToday[target.name] || 0) + 1;

      if (config.dryRun) {
        console.log('[LEMMY][LEG3] DRY_RUN — no post sent');
      } else {
        console.log(`[LEMMY][LEG3] ✅ Posted to !${target.name} — post ID: ${postId}`);
      }

      return true;
    } catch (err) {
      console.error(`[LEMMY][LEG3] ❌ Failed for !${target.name}: ${err.message}`);
      return false;
    }
  }
}

module.exports = new Leg3LemmyPoster();
