/**
 * colosseum-tiers.js
 * Session 109 — Questionnaire Tier System
 *
 * Provides tier lookup, badge rendering, and progress calculation
 * based on questions_answered count from profiles table.
 *
 * Load order: after colosseum-auth.js, before colosseum-arena.js
 * Used by: profile UI, arena (stake caps), staking screen (future),
 *          power-up shop (future)
 */

const ColoseumTiers = (() => {
  'use strict';

  // ── Tier definitions ──────────────────────────────────────
  // Ordered lowest to highest. Each tier gates staking and power-ups.
  const TIERS = [
    {
      name: 'Rookie',
      minQuestions: 0,
      stakeCap: 0,
      powerUpSlots: 0,
      icon: '🥚',
      color: '#8a879a',
      label: 'Answer 10 questions to unlock staking'
    },
    {
      name: 'Spectator+',
      minQuestions: 10,
      stakeCap: 25,
      powerUpSlots: 1,
      icon: '👁️',
      color: '#16a34a',
      label: 'Staking unlocked'
    },
    {
      name: 'Gladiator',
      minQuestions: 25,
      stakeCap: 100,
      powerUpSlots: 2,
      icon: '⚔️',
      color: '#2563eb',
      label: '2 power-up slots'
    },
    {
      name: 'Veteran',
      minQuestions: 50,
      stakeCap: 250,
      powerUpSlots: 3,
      icon: '🛡️',
      color: '#7c3aed',
      label: '3 power-up slots'
    },
    {
      name: 'Champion',
      minQuestions: 75,
      stakeCap: 500,
      powerUpSlots: 4,
      icon: '👑',
      color: '#b8860b',
      label: '4 power-up slots'
    },
    {
      name: 'Legend',
      minQuestions: 100,
      stakeCap: 1000,
      powerUpSlots: 4,
      icon: '🔱',
      color: '#b8860b',
      label: 'Max tier + crafting unlocked'
    }
  ];

  /**
   * Get the tier object for a given questions_answered count.
   * @param {number} questionsAnswered
   * @returns {object} Tier object with name, stakeCap, powerUpSlots, etc.
   */
  function getTier(questionsAnswered) {
    const count = Math.max(0, questionsAnswered || 0);
    let tier = TIERS[0];
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (count >= TIERS[i].minQuestions) {
        tier = TIERS[i];
        break;
      }
    }
    return { ...tier };
  }

  /**
   * Get the next tier above the current one, or null if at max.
   * @param {number} questionsAnswered
   * @returns {object|null}
   */
  function getNextTier(questionsAnswered) {
    const count = Math.max(0, questionsAnswered || 0);
    for (let i = 0; i < TIERS.length; i++) {
      if (count < TIERS[i].minQuestions) {
        return { ...TIERS[i] };
      }
    }
    return null; // Already at Legend
  }

  /**
   * Get progress toward next tier as 0-100 percentage.
   * @param {number} questionsAnswered
   * @returns {object} { percent, current, needed, remaining }
   */
  function getProgress(questionsAnswered) {
    const count = Math.max(0, questionsAnswered || 0);
    const currentTier = getTier(count);
    const nextTier = getNextTier(count);

    if (!nextTier) {
      // At Legend — full bar
      return {
        percent: 100,
        current: count,
        needed: currentTier.minQuestions,
        remaining: 0
      };
    }

    const rangeStart = currentTier.minQuestions;
    const rangeEnd = nextTier.minQuestions;
    const progressInRange = count - rangeStart;
    const rangeSize = rangeEnd - rangeStart;
    const percent = Math.min(100, Math.round((progressInRange / rangeSize) * 100));

    return {
      percent,
      current: count,
      needed: rangeEnd,
      remaining: rangeEnd - count
    };
  }

  /**
   * Get the max stake amount for a given questions_answered count.
   * @param {number} questionsAnswered
   * @returns {number}
   */
  function getStakeCap(questionsAnswered) {
    return getTier(questionsAnswered).stakeCap;
  }

  /**
   * Get available power-up slots for a given questions_answered count.
   * @param {number} questionsAnswered
   * @returns {number}
   */
  function getPowerUpSlots(questionsAnswered) {
    return getTier(questionsAnswered).powerUpSlots;
  }

  /**
   * Check if staking is unlocked (Spectator+ or above).
   * @param {number} questionsAnswered
   * @returns {boolean}
   */
  function canStake(questionsAnswered) {
    return getTier(questionsAnswered).stakeCap > 0;
  }

  /**
   * Render a tier badge as an HTML string.
   * Safe for innerHTML — no user data, all from TIERS constant.
   * @param {number} questionsAnswered
   * @param {string} size - 'sm' | 'md' | 'lg'
   * @returns {string} HTML string
   */
  function renderBadge(questionsAnswered, size = 'md') {
    const tier = getTier(questionsAnswered);
    const sizes = {
      sm: { fontSize: '11px', padding: '2px 6px', iconSize: '12px' },
      md: { fontSize: '13px', padding: '3px 10px', iconSize: '16px' },
      lg: { fontSize: '16px', padding: '5px 14px', iconSize: '20px' }
    };
    const s = sizes[size] || sizes.md;

    return `<span class="tier-badge" style="
      display:inline-flex;align-items:center;gap:4px;
      background:${tier.color}22;
      border:1px solid ${tier.color}66;
      border-radius:12px;
      padding:${s.padding};
      font-family:'Barlow Condensed',sans-serif;
      font-size:${s.fontSize};
      font-weight:600;
      color:${tier.color};
      letter-spacing:0.5px;
      text-transform:uppercase;
      white-space:nowrap;
    "><span style="font-size:${s.iconSize}">${tier.icon}</span> ${tier.name}</span>`;
  }

  /**
   * Render a progress bar toward next tier as an HTML string.
   * Safe for innerHTML — no user data in output.
   * @param {number} questionsAnswered
   * @returns {string} HTML string
   */
  function renderProgressBar(questionsAnswered) {
    const tier = getTier(questionsAnswered);
    const next = getNextTier(questionsAnswered);
    const prog = getProgress(questionsAnswered);

    const barColor = next ? next.color : tier.color;
    const labelText = next
      ? `${prog.remaining} more question${prog.remaining !== 1 ? 's' : ''} to ${next.icon} ${next.name}`
      : `${tier.icon} ${tier.name} — Max tier reached`;

    return `<div class="tier-progress" style="width:100%;margin:8px 0;">
      <div style="
        display:flex;justify-content:space-between;align-items:center;
        font-family:'Barlow',sans-serif;font-size:12px;color:#999;
        margin-bottom:4px;
      ">
        <span>${labelText}</span>
        <span style="font-weight:600;color:${barColor}">${prog.current}/${prog.needed}</span>
      </div>
      <div style="
        width:100%;height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden;
      ">
        <div style="
          width:${prog.percent}%;height:100%;
          background:linear-gradient(90deg,${barColor}88,${barColor});
          border-radius:3px;
          transition:width 0.4s ease;
        "></div>
      </div>
    </div>`;
  }

  /**
   * Get all tier definitions (for rendering tier tables, tooltips, etc.)
   * @returns {array}
   */
  function getAllTiers() {
    return TIERS.map(t => ({ ...t }));
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getTier,
    getNextTier,
    getProgress,
    getStakeCap,
    getPowerUpSlots,
    canStake,
    renderBadge,
    renderProgressBar,
    getAllTiers,
    TIERS
  };
})();

// Make available globally
window.ColosseumTiers = ColoseumTiers;
