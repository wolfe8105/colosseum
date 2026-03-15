// =============================================================
// colosseum-tiers.js
// Token Staking Phase 1: Questionnaire Tier Lookup
// Session 117 — March 15, 2026
// =============================================================
// Tier is computed from questions_answered on the profile.
// Client-side is for DISPLAY ONLY — all RPCs enforce server-side.
// =============================================================

// Resolve HTML escape: pages use escapeHTML or escHtml
function _escTier(str) {
  if (typeof escapeHTML === 'function') return escapeHTML(str);
  if (typeof escHtml === 'function') return escHtml(str);
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

const TIER_THRESHOLDS = [
  { min: 100, tier: 5, name: 'Legend',     maxStake: Infinity, slots: 4 },
  { min: 75,  tier: 4, name: 'Champion',   maxStake: 100,     slots: 3 },
  { min: 50,  tier: 3, name: 'Gladiator',  maxStake: 50,      slots: 2 },
  { min: 25,  tier: 2, name: 'Contender',  maxStake: 25,      slots: 1 },
  { min: 10,  tier: 1, name: 'Spectator+', maxStake: 5,       slots: 0 },
  { min: 0,   tier: 0, name: 'Unranked',   maxStake: 0,       slots: 0 }
];

/**
 * Get tier info from questions_answered count.
 * @param {number} questionsAnswered
 * @returns {{ tier: number, name: string, maxStake: number, slots: number, questionsAnswered: number }}
 */
function getTier(questionsAnswered) {
  const qa = typeof questionsAnswered === 'number' ? questionsAnswered : 0;
  for (const t of TIER_THRESHOLDS) {
    if (qa >= t.min) {
      return { ...t, questionsAnswered: qa };
    }
  }
  // Fallback (should never hit — tier 0 has min: 0)
  return { tier: 0, name: 'Unranked', maxStake: 0, slots: 0, questionsAnswered: qa };
}

/**
 * Get the next tier info (what user is working toward).
 * Returns null if already at max tier.
 * @param {number} questionsAnswered
 * @returns {{ tier: number, name: string, questionsNeeded: number, totalRequired: number } | null}
 */
function getNextTier(questionsAnswered) {
  const qa = typeof questionsAnswered === 'number' ? questionsAnswered : 0;
  const current = getTier(qa);
  if (current.tier >= 5) return null; // Already Legend

  // Find the next tier up
  const next = TIER_THRESHOLDS.find(t => t.tier === current.tier + 1);
  if (!next) return null;

  return {
    tier: next.tier,
    name: next.name,
    questionsNeeded: next.min - qa,
    totalRequired: next.min
  };
}

/**
 * Render a tier badge as an HTML string.
 * @param {number} questionsAnswered
 * @returns {string} HTML span element
 */
function renderTierBadge(questionsAnswered) {
  const t = getTier(questionsAnswered);
  const colors = {
    0: '#6b7280', // gray
    1: '#9ca3af', // light gray
    2: '#3b82f6', // blue
    3: '#a855f7', // purple
    4: '#f59e0b', // gold
    5: '#ef4444'  // red
  };
  const color = colors[t.tier] || '#6b7280';
  return '<span class="tier-badge" style="color:' + color + '; font-weight:600;">' +
    _escTier(t.name) + '</span>';
}

/**
 * Render a progress bar toward next tier as HTML string.
 * @param {number} questionsAnswered
 * @returns {string} HTML for progress bar, or empty string if max tier
 */
function renderTierProgress(questionsAnswered) {
  const current = getTier(questionsAnswered);
  const next = getNextTier(questionsAnswered);
  if (!next) {
    return '<div class="tier-progress-complete">Legend — Max Tier</div>';
  }

  // Progress within current tier band
  const prevMin = TIER_THRESHOLDS.find(t => t.tier === current.tier).min;
  const filled = questionsAnswered - prevMin;
  const band = next.totalRequired - prevMin;
  const pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0;

  return '<div class="tier-progress">' +
    '<div class="tier-progress-label">' +
      _escTier(String(questionsAnswered)) + '/' + _escTier(String(next.totalRequired)) +
      ' — ' + _escTier(String(next.questionsNeeded)) + ' more to unlock ' +
      _escTier(next.name) +
    '</div>' +
    '<div class="tier-progress-bar">' +
      '<div class="tier-progress-fill" style="width:' + pct + '%"></div>' +
    '</div>' +
  '</div>';
}
