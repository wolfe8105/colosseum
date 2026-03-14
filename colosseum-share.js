// ============================================================
// COLOSSEUM SHARE — Share, Invite, Referral, Deep Links (Item 6.2.6.5)
// Items: 14.5.3.1-14.5.3.6
// SESSION 65 SECURITY AUDIT (Session 18): 3 bugs fixed
//   - BUG 1 (HIGH): XSS via result object in inline onclick handler
//   - BUG 2 (MEDIUM): username not URL-encoded in challenge link query param
//   - BUG 3 (LOW): challenge from URL params not sanitized before display
// ============================================================

window.ColosseumShare = (() => {

  // BUG 1 FIX: Store result data in module scope instead of serializing into onclick attribute
  let _pendingShareResult = null;

  function _getBaseUrl() {
    return ColosseumConfig?.APP?.baseUrl || window.location.origin;
  }

  // --- Share Debate Result (Item 14.5.3.1) ---
  function shareResult({ debateId, topic, winner, winnerElo, loser, loserElo, spectators }) {
    const url = `${_getBaseUrl()}/debate/${encodeURIComponent(debateId || 'demo')}`;
    const text = `🏆 ${winner} (${winnerElo}) won vs ${loser} (${loserElo})\n"${topic}"\n👁 ${spectators} watched\n\n${url}`;
    _share({ title: 'Debate Result — The Colosseum', text, url });
  }

  // --- Share Profile (Item 14.5.3.2) ---
  function shareProfile({ userId, username, displayName, elo, wins, losses, streak }) {
    const url = `${_getBaseUrl()}/u/${encodeURIComponent(username || userId || 'debater')}`;
    const text = `🏟️ ${displayName || username} on The Colosseum\nELO: ${elo} | W: ${wins} | L: ${losses} | Streak: ${streak}\n\n${url}`;
    _share({ title: `${displayName || username} — The Colosseum`, text, url });
  }

  // --- Invite Friend (Item 14.5.3.3) ---
  function inviteFriend() {
    const userId = ColosseumAuth?.currentUser?.id || 'demo';
    const refCode = _generateRefCode(userId);
    const url = `${_getBaseUrl()}/join?ref=${encodeURIComponent(refCode)}`;
    const text = `Think you can hold your own? Join me on The Colosseum.\n\n${url}`;
    _share({ title: 'Join The Colosseum', text, url });
  }

  // --- Share Hot Take ---
  function shareTake(takeId, takeText) {
    const url = `${_getBaseUrl()}/take/${encodeURIComponent(takeId)}`;
    const decoded = decodeURIComponent(takeText);
    const text = `🔥 Hot Take on The Colosseum:\n"${decoded}"\n\nReact or challenge: ${url}`;
    _share({ title: 'Hot Take — The Colosseum', text, url });
  }

  // --- Post-Debate Share Prompt (Item 14.5.3.6) ---
  function showPostDebatePrompt(result) {
    const existing = document.getElementById('post-debate-share');
    if (existing) existing.remove();

    // BUG 1 FIX: Store result in module scope — reference via function call, not inline serialization
    _pendingShareResult = result || {};

    const won = result?.won;
    const modal = document.createElement('div');
    modal.id = 'post-debate-share';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
      display:flex;align-items:flex-end;justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        background:linear-gradient(180deg,#132240 0%,#0a1628 100%);
        border-top-left-radius:20px;border-top-right-radius:20px;
        width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
        text-align:center;
      ">
        <div style="font-size:48px;margin-bottom:8px;">${won ? '🏆' : '⚔️'}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:${won ? '#d4a843' : '#f0f0f0'};">
          ${won ? 'YOU WON' : 'GOOD DEBATE'}
        </div>
        <div style="color:#a0a8b8;font-size:14px;margin:8px 0 20px;">
          ${won ? 'Share your win with the world.' : 'Challenge them to a rematch?'}
        </div>
        
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="post-debate-share-btn" style="
            flex:1;padding:14px;background:#cc2936;color:#fff;border:none;border-radius:10px;
            font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
          ">📤 SHARE</button>
          <button id="post-debate-invite-btn" style="
            flex:1;padding:14px;background:#1a2d4a;color:#d4a843;border:1px solid rgba(212,168,67,0.3);border-radius:10px;
            font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
          ">📨 INVITE</button>
        </div>
        
        <button id="post-debate-skip-btn" style="
          width:100%;padding:12px;background:none;color:#a0a8b8;border:none;font-size:13px;cursor:pointer;
        ">Skip</button>
      </div>
    `;

    // BUG 1 FIX: Use addEventListener instead of inline onclick with serialized data
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    document.getElementById('post-debate-share-btn').addEventListener('click', () => {
      ColosseumShare.shareResult(_pendingShareResult);
      modal.remove();
    });
    document.getElementById('post-debate-invite-btn').addEventListener('click', () => {
      ColosseumShare.inviteFriend();
      modal.remove();
    });
    document.getElementById('post-debate-skip-btn').addEventListener('click', () => {
      modal.remove();
    });
  }

  // --- Core Share ---
  async function _share({ title, text, url }) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      _showToast('Copied to clipboard!');
    } catch (e) {
      // Final fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      _showToast('Copied to clipboard!');
    }
  }

  function _generateRefCode(userId) {
    const base = (userId || 'demo').slice(0, 8);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${base}-${rand}`;
  }

  function _showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#2ecc71;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // --- Deep Link Handler ---
  function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const debate = params.get('debate');
    const challenge = params.get('from');

    if (ref) {
      localStorage.setItem('colosseum_referrer', ref);
    }
    if (debate) {
      // Navigate to debate screen
      setTimeout(() => navigateTo('arena'), 500);
    }
    if (challenge) {
      // BUG 3 FIX: Sanitize and truncate URL params before display
      const safeName = String(challenge).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
      const topic = params.get('topic') || 'Open challenge';
      const safeTopic = String(decodeURIComponent(topic)).slice(0, 100);
      setTimeout(() => {
        _showToast(`⚔️ Challenge from ${safeName}: "${safeTopic}"`);
      }, 1000);
    }
  }

  // Auto-handle deep links on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleDeepLink);
  } else {
    setTimeout(handleDeepLink, 200);
  }

  return {
    shareResult,
    shareProfile,
    inviteFriend,
    shareTake,
    showPostDebatePrompt,
    handleDeepLink,
  };

})();
