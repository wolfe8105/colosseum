// ============================================================
// colosseum-tokens.js — Token Earn System (Session 72)
//
// Phase 1+2: Daily login, action claims, token gates, balance display
// Phase 3: Milestones, streak freeze, gold coin animation
//
// DEPENDENCIES: colosseum-config.js, colosseum-auth.js
// LOAD ORDER: After colosseum-auth.js
// ============================================================

window.ColosseumTokens = (function () {
  'use strict';

  let lastKnownBalance = null;
  let milestoneClaimed = new Set();

  // ========== MILESTONE DEFINITIONS ==========
  const MILESTONES = {
    first_hot_take:     { tokens: 25,  label: 'First Hot Take',      icon: '🔥' },
    first_debate:       { tokens: 50,  label: 'First Debate',        icon: '⚔️' },
    first_vote:         { tokens: 10,  label: 'First Vote',          icon: '🗳️' },
    first_reaction:     { tokens: 5,   label: 'First Reaction',      icon: '👊' },
    first_ai_sparring:  { tokens: 15,  label: 'First AI Sparring',   icon: '🤖' },
    first_prediction:   { tokens: 10,  label: 'First Prediction',    icon: '🎯' },
    profile_3_sections: { tokens: 30,  label: '3 Profile Sections',  icon: '📝' },
    profile_6_sections: { tokens: 75,  label: '6 Profile Sections',  icon: '📋' },
    profile_12_sections:{ tokens: 150, label: 'All 12 Sections',     icon: '🏆' },
    verified_gladiator: { tokens: 100, label: 'Verified Gladiator',  icon: '🛡️' },
    streak_7:           { tokens: 0,   label: '7-Day Streak',        icon: '❄️', freezes: 1 },
    streak_30:          { tokens: 0,   label: '30-Day Streak',       icon: '❄️', freezes: 3 },
    streak_100:         { tokens: 0,   label: '100-Day Streak',      icon: '❄️', freezes: 5 },
  };

  // ========== INJECT CSS ONCE ==========
  let cssInjected = false;
  function _injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes tokenFlyUp {
        0% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        60% { opacity:1; transform:translateX(-50%) translateY(-60px) scale(1.2); }
        100% { opacity:0; transform:translateX(-50%) translateY(-100px) scale(0.8); }
      }
      @keyframes tokenFlash {
        0% { box-shadow:0 0 0 0 rgba(212,168,67,0); }
        30% { box-shadow:0 0 20px 8px rgba(212,168,67,0.4); }
        100% { box-shadow:0 0 0 0 rgba(212,168,67,0); }
      }
      @keyframes milestoneSlide {
        0% { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.9); }
        20% { opacity:1; transform:translateX(-50%) translateY(0) scale(1.05); }
        30% { transform:translateX(-50%) translateY(0) scale(1); }
        80% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        100% { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.95); }
      }
      .token-fly-coin {
        position:fixed; left:50%; z-index:100000;
        font-size:28px; pointer-events:none;
        animation: tokenFlyUp 0.9s ease-out forwards;
      }
      .token-earn-toast {
        position:fixed; top:20px; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg, #D4A843 0%, #b8942e 100%);
        color:#0A0A1A; font-family:"Cinzel",serif; font-weight:700;
        padding:10px 20px; border-radius:8px; z-index:99999;
        font-size:15px; white-space:nowrap;
        animation: tokenFlash 0.6s ease-out;
        box-shadow: 0 4px 12px rgba(212,168,67,0.3);
      }
      .milestone-toast {
        position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg, #1a2d4a 0%, #2d5a8e 100%);
        border:2px solid #D4A843; color:#f0f0f0;
        font-family:"Barlow Condensed",sans-serif; font-weight:600;
        padding:14px 24px; border-radius:12px; z-index:99999;
        font-size:15px; text-align:center; max-width:320px;
        animation: milestoneSlide 3.5s ease-in-out forwards;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .milestone-toast .mt-icon { font-size:28px; display:block; margin-bottom:4px; }
      .milestone-toast .mt-label { color:#D4A843; font-family:"Cinzel",serif; font-size:14px; letter-spacing:1px; }
      .milestone-toast .mt-reward { font-size:13px; margin-top:4px; color:#a0a8b8; }
    `;
    document.head.appendChild(style);
  }

  // ========== GOLD COIN FLY-UP ANIMATION ==========
  function _coinFlyUp() {
    _injectCSS();
    const coin = document.createElement('div');
    coin.className = 'token-fly-coin';
    coin.textContent = '🪙';
    const bar = document.getElementById('token-display');
    if (bar) {
      const rect = bar.getBoundingClientRect();
      coin.style.left = rect.left + rect.width / 2 + 'px';
      coin.style.top = rect.bottom + 'px';
    } else {
      coin.style.top = '60px';
    }
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 1000);
  }

  // ========== TOKEN EARN TOAST (gold flash + coin) ==========
  function _tokenToast(tokens, label) {
    if (!tokens || tokens <= 0) return;
    _injectCSS();
    _coinFlyUp();

    const msg = `+${tokens} 🪙 ${label}`;
    if (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.showToast) {
      ColosseumConfig.showToast(msg, 'success');
    } else {
      const el = document.createElement('div');
      el.className = 'token-earn-toast';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  // ========== MILESTONE TOAST (big reveal) ==========
  function _milestoneToast(icon, label, tokens, freezes) {
    _injectCSS();
    const el = document.createElement('div');
    el.className = 'milestone-toast';

    let rewardText = '';
    if (tokens > 0) rewardText = `+${tokens} 🪙 tokens`;
    if (freezes > 0) rewardText = `+${freezes} ❄️ streak freeze${freezes > 1 ? 's' : ''}`;
    if (tokens > 0 && freezes > 0) rewardText = `+${tokens} 🪙 + ${freezes} ❄️`;

    el.innerHTML = `
      <span class="mt-icon">${icon || '🏆'}</span>
      <span class="mt-label">MILESTONE UNLOCKED</span>
      <div style="font-size:16px;margin-top:2px;color:#f0f0f0;">${label}</div>
      <div class="mt-reward">${rewardText}</div>
    `;
    document.body.appendChild(el);
    if (tokens > 0) _coinFlyUp();
    setTimeout(() => el.remove(), 3600);
  }

  // ========== UPDATE BALANCE DISPLAY ==========
  function _updateBalanceDisplay(newBalance) {
    if (newBalance == null) return;
    lastKnownBalance = newBalance;

    document.querySelectorAll('[data-token-balance]').forEach(el => {
      el.textContent = newBalance.toLocaleString();
    });

    const el = document.getElementById('token-balance');
    if (el) el.textContent = newBalance.toLocaleString();

    const countEl = document.getElementById('token-count');
    if (countEl) countEl.textContent = newBalance.toLocaleString();

    const bar = document.getElementById('token-display');
    if (bar) {
      bar.style.animation = 'tokenFlash 0.6s ease-out';
      setTimeout(() => { bar.style.animation = ''; }, 700);
    }
  }

  // ========== SAFE RPC HELPER ==========
  async function _rpc(fnName, args = {}) {
    if (typeof ColosseumAuth === 'undefined') return null;
    if (ColosseumAuth.isPlaceholderMode) return null;
    if (!ColosseumAuth.currentUser) return null;

    try {
      const { data, error } = await ColosseumAuth.safeRpc(fnName, args);
      if (error) {
        console.warn(`[Tokens] ${fnName} error:`, error.message || error);
        return null;
      }
      return data;
    } catch (e) {
      console.warn(`[Tokens] ${fnName} exception:`, e);
      return null;
    }
  }

  // ========== TOKEN GATE ==========
  function requireTokens(amount, actionLabel) {
    const profile = typeof ColosseumAuth !== 'undefined' ? ColosseumAuth.currentProfile : null;
    if (!profile) return true;

    const balance = profile.token_balance || 0;
    if (balance >= amount) return true;

    const deficit = amount - balance;
    const msg = `Need ${amount} tokens to ${actionLabel || 'do that'} (${deficit} more to go)`;
    if (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.showToast) {
      ColosseumConfig.showToast(msg, 'error');
    }
    return false;
  }

  // ========== MILESTONE CLAIM ==========
  async function claimMilestone(key) {
    if (milestoneClaimed.has(key)) return null;
    const def = MILESTONES[key];
    if (!def) return null;

    const result = await _rpc('claim_milestone', { p_milestone_key: key });
    if (!result || !result.success) {
      if (result?.error === 'Already claimed') milestoneClaimed.add(key);
      return null;
    }

    milestoneClaimed.add(key);
    if (result.new_balance) _updateBalanceDisplay(result.new_balance);
    _milestoneToast(def.icon, def.label, result.tokens_earned, result.freezes_earned || 0);
    console.log(`[Tokens] Milestone: ${key} → +${result.tokens_earned} tokens, +${result.freezes_earned || 0} freezes`);
    return result;
  }

  async function _loadMilestones() {
    const result = await _rpc('get_my_milestones');
    if (!result || !result.success) return;
    if (result.claimed && Array.isArray(result.claimed)) {
      result.claimed.forEach(k => milestoneClaimed.add(k));
    }
  }

  function _checkStreakMilestones(streak) {
    if (!streak) return;
    if (streak >= 7) claimMilestone('streak_7');
    if (streak >= 30) claimMilestone('streak_30');
    if (streak >= 100) claimMilestone('streak_100');
  }

  // ========== PUBLIC CLAIM FUNCTIONS ==========

  async function claimDailyLogin() {
    const result = await _rpc('claim_daily_login');
    if (!result) return null;
    if (!result.success) {
      if (result.error !== 'Already claimed today') {
        console.warn('[Tokens] Daily login:', result.error);
      }
      return null;
    }

    _updateBalanceDisplay(result.new_balance);

    let label = 'Daily login';
    if (result.freeze_used) {
      label = 'Daily login (❄️ freeze saved your streak!)';
    } else if (result.streak_bonus > 0) {
      label = `Daily login + ${result.login_streak}-day streak!`;
    }
    _tokenToast(result.tokens_earned, label);

    console.log(`[Tokens] Daily login: +${result.tokens_earned} (streak: ${result.login_streak}, freeze used: ${result.freeze_used})`);
    _checkStreakMilestones(result.login_streak);

    return result;
  }

  async function claimHotTake(hotTakeId) {
    if (!hotTakeId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'hot_take',
      p_reference_id: hotTakeId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Hot take');
    claimMilestone('first_hot_take');
    return result;
  }

  async function claimReaction(hotTakeId) {
    if (!hotTakeId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'reaction',
      p_reference_id: hotTakeId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Reaction');
    claimMilestone('first_reaction');
    return result;
  }

  async function claimVote(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'vote',
      p_reference_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Vote');
    claimMilestone('first_vote');
    return result;
  }

  async function claimDebate(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_debate_tokens', {
      p_debate_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);

    let label = 'Debate complete';
    if (result.is_winner) {
      label = 'Debate win!';
      if (result.upset_bonus > 0) label = 'Upset victory!';
    }
    _tokenToast(result.tokens_earned, label);
    claimMilestone('first_debate');
    return result;
  }

  async function claimAiSparring(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'ai_sparring',
      p_reference_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'AI Sparring');
    claimMilestone('first_ai_sparring');
    return result;
  }

  async function claimPrediction(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'prediction',
      p_reference_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Prediction');
    claimMilestone('first_prediction');
    return result;
  }

  async function checkProfileMilestones(completedCount) {
    if (!completedCount) return;
    if (completedCount >= 3) claimMilestone('profile_3_sections');
    if (completedCount >= 6) claimMilestone('profile_6_sections');
    if (completedCount >= 12) claimMilestone('profile_12_sections');
    if (completedCount >= 3) claimMilestone('verified_gladiator');
  }

  async function getSummary() {
    const result = await _rpc('get_my_token_summary');
    if (!result || !result.success) return null;
    _updateBalanceDisplay(result.token_balance);
    return result;
  }

  function getMilestoneList() {
    return Object.entries(MILESTONES).map(([key, def]) => ({
      key,
      ...def,
      claimed: milestoneClaimed.has(key),
    }));
  }

  // ========== AUTO-INIT ==========
  function _init() {
    _injectCSS();
    if (typeof ColosseumAuth === 'undefined') return;

    ColosseumAuth.onChange((user, profile) => {
      if (user && profile) {
        if (profile.token_balance != null) {
          _updateBalanceDisplay(profile.token_balance);
        }
        claimDailyLogin();
        _loadMilestones();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    claimDailyLogin,
    claimHotTake,
    claimReaction,
    claimVote,
    claimDebate,
    claimAiSparring,
    claimPrediction,
    getSummary,
    requireTokens,
    claimMilestone,
    checkProfileMilestones,
    getMilestoneList,
    get balance() { return lastKnownBalance; },
    get MILESTONES() { return MILESTONES; },
  };

})();
