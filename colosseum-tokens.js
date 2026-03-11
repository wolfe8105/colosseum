// ============================================================
// colosseum-tokens.js — Token Earn System (Session 71)
//
// Auto-claims daily login on auth ready.
// Other modules call ColosseumTokens.claim*() after actions.
// Shows gold toast on earn. Updates balance in header.
//
// DEPENDENCIES: colosseum-config.js, colosseum-auth.js
// LOAD ORDER: After colosseum-auth.js
// ============================================================

window.ColosseumTokens = (function () {
  'use strict';

  let lastKnownBalance = null;

  // --- Toast for token earn (gold flash) ---
  function _tokenToast(tokens, label) {
    if (!tokens || tokens <= 0) return;
    const msg = `+${tokens} 🪙 ${label}`;

    // Use ColosseumConfig.showToast if available, else DIY
    if (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.showToast) {
      ColosseumConfig.showToast(msg, 'success');
    } else {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#D4A843;color:#0A0A1A;font-family:"Cinzel",serif;font-weight:700;padding:10px 20px;border-radius:8px;z-index:99999;font-size:16px;animation:fadeIn 0.3s ease;';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  // --- Update balance display anywhere on page ---
  function _updateBalanceDisplay(newBalance) {
    if (newBalance == null) return;
    lastKnownBalance = newBalance;

    // Update any element with data-token-balance attribute
    document.querySelectorAll('[data-token-balance]').forEach(el => {
      el.textContent = newBalance.toLocaleString();
    });

    // Update any element with id="token-balance"
    const el = document.getElementById('token-balance');
    if (el) el.textContent = newBalance.toLocaleString();
  }

  // --- Safe RPC helper ---
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

  // ========== PUBLIC CLAIM FUNCTIONS ==========

  // Called automatically on auth ready
  async function claimDailyLogin() {
    const result = await _rpc('claim_daily_login');
    if (!result) return null;
    if (!result.success) {
      // "Already claimed today" is expected — not an error
      if (result.error !== 'Already claimed today') {
        console.warn('[Tokens] Daily login:', result.error);
      }
      return null;
    }

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned,
      result.streak_bonus > 0
        ? `Daily login + ${result.login_streak}-day streak!`
        : 'Daily login'
    );

    console.log(`[Tokens] Daily login: +${result.tokens_earned} (streak: ${result.login_streak})`);
    return result;
  }

  // Call after create_hot_take succeeds — pass the new hot take ID
  async function claimHotTake(hotTakeId) {
    if (!hotTakeId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'hot_take',
      p_reference_id: hotTakeId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Hot take');
    return result;
  }

  // Call after react_hot_take succeeds AND the reaction was ADDED (not removed)
  async function claimReaction(hotTakeId) {
    if (!hotTakeId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'reaction',
      p_reference_id: hotTakeId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Reaction');
    return result;
  }

  // Call after vote_arena_debate or cast_vote succeeds
  async function claimVote(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'vote',
      p_reference_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'Vote');
    return result;
  }

  // Call after debate ends (any mode) — pass the debate ID
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
    return result;
  }

  // Call after AI sparring completes
  async function claimAiSparring(debateId) {
    if (!debateId) return null;
    const result = await _rpc('claim_action_tokens', {
      p_action: 'ai_sparring',
      p_reference_id: debateId
    });
    if (!result || !result.success) return null;

    _updateBalanceDisplay(result.new_balance);
    _tokenToast(result.tokens_earned, 'AI Sparring');
    return result;
  }

  // Get full token summary (balance, streaks, today's earnings)
  async function getSummary() {
    const result = await _rpc('get_my_token_summary');
    if (!result || !result.success) return null;
    _updateBalanceDisplay(result.token_balance);
    return result;
  }

  // ========== AUTO-INIT ==========

  function _init() {
    if (typeof ColosseumAuth === 'undefined') return;

    ColosseumAuth.onChange((user, profile) => {
      if (user && profile) {
        // Update display from profile data immediately
        if (profile.token_balance != null) {
          _updateBalanceDisplay(profile.token_balance);
        }
        // Auto-claim daily login (fire and forget)
        claimDailyLogin();
      }
    });
  }

  // Auto-init after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  // --- Public API ---
  return {
    claimDailyLogin,
    claimHotTake,
    claimReaction,
    claimVote,
    claimDebate,
    claimAiSparring,
    getSummary,
    get balance() { return lastKnownBalance; },
  };

})();
