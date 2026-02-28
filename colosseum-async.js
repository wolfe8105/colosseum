// ============================================================
// COLOSSEUM ASYNC — Hot Takes, Challenges, Async Debate (Item 6.2.6.4)
// Items: 14.3.3, 14.8.1, 7.9.4
// Post → React → Challenge → Structure appears
// ============================================================

window.ColosseumAsync = (() => {

  let hotTakes = [];
  let currentFilter = 'all';

  // --- Placeholder Data ---
  const PLACEHOLDER_TAKES = {
    all: [
      { id: 't1', user: 'SHARPMIND', elo: 1847, text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.', section: 'trending', reactions: 1247, challenges: 23, time: '2h', userReacted: false },
      { id: 't2', user: 'BOLDCLAIM', elo: 1280, text: 'Patrick Mahomes is already the greatest QB ever. Stats don\'t lie.', section: 'sports', reactions: 531, challenges: 11, time: '45m', userReacted: false },
      { id: 't3', user: 'SENATEWATCH', elo: 1340, text: 'Term limits would fix 80% of Congress overnight. Change my mind.', section: 'politics', reactions: 312, challenges: 4, time: '12m', userReacted: false },
      { id: 't4', user: 'FILMTAKES', elo: 1190, text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.', section: 'entertainment', reactions: 402, challenges: 8, time: '15m', userReacted: false },
      { id: 't5', user: 'TECHBRO_NO', elo: 1590, text: 'Every generation thinks they\'re living through the apocalypse. AI doomerism is no different.', section: 'trending', reactions: 894, challenges: 17, time: '3h', userReacted: false },
      { id: 't6', user: 'HOOPHEAD', elo: 1420, text: 'The NBA play-in tournament is the best thing the league has done in 20 years.', section: 'sports', reactions: 247, challenges: 6, time: '8m', userReacted: false },
    ],
    politics: [],
    sports: [],
    entertainment: [],
    trending: [],
  };

  // Populate category filters from all
  PLACEHOLDER_TAKES.all.forEach(t => {
    if (PLACEHOLDER_TAKES[t.section]) {
      PLACEHOLDER_TAKES[t.section].push(t);
    }
  });

  function init() {
    hotTakes = [...PLACEHOLDER_TAKES.all];
  }

  // --- Load Hot Takes ---
  function loadHotTakes(category = 'all') {
    currentFilter = category;
    const container = document.getElementById('hot-takes-feed');
    if (!container) return;

    const takes = category === 'all' ? hotTakes : hotTakes.filter(t => t.section === category);

    if (takes.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 16px;color:#a0a8b8;">
          <div style="font-size:36px;margin-bottom:8px;">🤫</div>
          <div style="font-size:14px;">No takes here yet. Be the first.</div>
        </div>`;
      return;
    }

    container.innerHTML = takes.map(t => _renderTake(t)).join('');
  }

  function _renderTake(t) {
    return `
      <div class="hot-take-card" data-id="${t.id}" style="
        background:#132240;border:1px solid rgba(255,255,255,0.06);border-radius:12px;
        padding:14px;margin-bottom:10px;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#1a2d4a;border:2px solid #d4a843;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#d4a843;">
            ${t.user[0]}
          </div>
          <div>
            <span style="font-weight:700;font-size:13px;color:#f0f0f0;">${t.user}</span>
            <span style="font-size:11px;color:#6a7a90;margin-left:6px;">ELO ${t.elo}</span>
          </div>
          <div style="margin-left:auto;font-size:11px;color:#6a7a90;">${t.time}</div>
        </div>
        
        <div style="font-size:14px;line-height:1.5;color:#f0f0f0;margin-bottom:12px;">${t.text}</div>
        
        <div style="display:flex;align-items:center;gap:12px;">
          <button onclick="ColosseumAsync.react('${t.id}')" style="
            display:flex;align-items:center;gap:4px;background:${t.userReacted ? 'rgba(204,41,54,0.15)' : 'rgba(255,255,255,0.05)'};
            border:1px solid ${t.userReacted ? 'rgba(204,41,54,0.3)' : 'rgba(255,255,255,0.08)'};
            color:${t.userReacted ? '#cc2936' : '#a0a8b8'};
            padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
          ">🔥 ${t.reactions}</button>
          
          <button onclick="ColosseumAsync.challenge('${t.id}')" style="
            display:flex;align-items:center;gap:4px;
            background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);
            color:#cc2936;padding:6px 12px;border-radius:20px;
            font-size:12px;font-weight:700;cursor:pointer;
          ">⚔️ BET. (${t.challenges})</button>
          
          <button onclick="ColosseumShare?.shareTake?.('${t.id}','${encodeURIComponent(t.text)}')" style="
            display:flex;align-items:center;gap:4px;
            background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
            color:#a0a8b8;padding:6px 12px;border-radius:20px;
            font-size:12px;cursor:pointer;
          ">↗ Share</button>
        </div>
      </div>`;
  }

  // --- React ---
  function react(takeId) {
    const take = hotTakes.find(t => t.id === takeId);
    if (!take) return;

    take.userReacted = !take.userReacted;
    take.reactions += take.userReacted ? 1 : -1;
    loadHotTakes(currentFilter);

    // Supabase update
    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      if (take.userReacted) {
        ColosseumAuth.supabase.from('hot_take_reactions').insert({
          hot_take_id: takeId,
          user_id: ColosseumAuth.currentUser.id,
          reaction_type: 'fire'
        });
      } else {
        ColosseumAuth.supabase.from('hot_take_reactions').delete()
          .eq('hot_take_id', takeId)
          .eq('user_id', ColosseumAuth.currentUser.id);
      }
    }
  }

  // --- Challenge ("BET.") ---
  function challenge(takeId) {
    const take = hotTakes.find(t => t.id === takeId);
    if (!take) return;

    _showChallengeModal(take);
  }

  function _showChallengeModal(take) {
    const existing = document.getElementById('challenge-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'challenge-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
      display:flex;align-items:flex-end;justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        background:linear-gradient(180deg,#132240 0%,#0a1628 100%);
        border-top-left-radius:20px;border-top-right-radius:20px;
        width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
        transform:translateY(0);
      ">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 20px;"></div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#cc2936;text-align:center;margin-bottom:4px;">⚔️ CHALLENGE</div>
        <div style="color:#a0a8b8;text-align:center;font-size:13px;margin-bottom:16px;">You disagree with ${take.user}?</div>
        
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-size:13px;color:#f0f0f0;line-height:1.4;">"${take.text}"</div>
          <div style="font-size:11px;color:#6a7a90;margin-top:6px;">— ${take.user} (ELO ${take.elo})</div>
        </div>
        
        <textarea id="challenge-response" placeholder="Your counter-argument..." style="
          width:100%;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;
          color:#f0f0f0;padding:12px;font-size:14px;resize:none;height:80px;
          font-family:'Source Sans 3',sans-serif;margin-bottom:12px;
        "></textarea>
        
        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('challenge-modal')?.remove()" style="
            flex:1;padding:12px;background:#1a2d4a;color:#a0a8b8;border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;
          ">CANCEL</button>
          <button onclick="ColosseumAsync._submitChallenge('${take.id}')" style="
            flex:1;padding:12px;background:#cc2936;color:#fff;border:none;
            border-radius:10px;font-family:'Bebas Neue',sans-serif;font-size:16px;
            letter-spacing:2px;cursor:pointer;
          ">⚔️ BET.</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  function _submitChallenge(takeId) {
    const textarea = document.getElementById('challenge-response');
    const text = textarea?.value?.trim();
    if (!text) {
      textarea.style.borderColor = '#cc2936';
      return;
    }

    const take = hotTakes.find(t => t.id === takeId);
    if (take) take.challenges++;

    document.getElementById('challenge-modal')?.remove();

    // Toast
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#cc2936;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;';
    toast.textContent = '⚔️ Challenge sent!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    loadHotTakes(currentFilter);
  }

  // --- Post Composer ---
  function getComposerHTML() {
    return `
      <div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:16px;">
        <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
          width:100%;background:#1a2d4a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
          color:#f0f0f0;padding:12px;font-size:14px;resize:none;height:60px;
          font-family:'Source Sans 3',sans-serif;margin-bottom:8px;
        " maxlength="280"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div id="take-char-count" style="font-size:11px;color:#6a7a90;">0 / 280</div>
          <button onclick="ColosseumAsync.postTake()" style="
            background:#cc2936;color:#fff;border:none;border-radius:8px;
            padding:8px 20px;font-family:'Bebas Neue',sans-serif;font-size:14px;
            letter-spacing:1px;cursor:pointer;
          ">POST</button>
        </div>
      </div>`;
  }

  function postTake() {
    const input = document.getElementById('hot-take-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const profile = ColosseumAuth?.currentProfile;
    const newTake = {
      id: 't_' + Date.now(),
      user: (profile?.username || 'YOU').toUpperCase(),
      elo: profile?.elo_rating || 1200,
      text,
      section: currentFilter === 'all' ? 'trending' : currentFilter,
      reactions: 0,
      challenges: 0,
      time: 'now',
      userReacted: false,
    };

    hotTakes.unshift(newTake);
    input.value = '';
    loadHotTakes(currentFilter);

    // Supabase insert
    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      ColosseumAuth.supabase.from('hot_takes').insert({
        user_id: ColosseumAuth.currentUser.id,
        content: text,
        section: newTake.section,
      });
    }
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    loadHotTakes,
    react,
    challenge,
    postTake,
    getComposerHTML,
    _submitChallenge,
  };

})();
