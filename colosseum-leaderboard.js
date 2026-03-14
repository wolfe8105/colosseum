// ============================================================
// COLOSSEUM LEADERBOARD — Rankings (Item 6.2.6.6)
// Items: 14.8.4.1-14.8.4.3
// ELO/Wins/Streak tabs, time filters, My Rank card
// SESSION 37: Wired to Supabase profiles_public. Falls back to
//   placeholder data if no Supabase or no rows returned.
// SESSION 60: Elo explainer modal + shimmer loading skeletons
// SESSION 65 SECURITY AUDIT (Session 14): 4 bugs fixed
//   - BUG 1 (CRITICAL): XSS via unescaped myName in My Rank Card
//   - BUG 2 (MEDIUM): Broken fallback escapeHTML — " matched but not mapped
//   - BUG 3 (MEDIUM): Numeric profile values not type-checked before innerHTML
//   - BUG 4 (LOW): liveData subtitle leaks connection state
// ============================================================

window.ColosseumLeaderboard = (() => {

  let currentTab = 'elo';
  let currentTime = 'all';
  let liveData = null;   // null = not fetched yet
  let myRank = null;
  let isLoading = false;

  const escHtml = ColosseumConfig.escapeHTML;

  const PLACEHOLDER_DATA = [
    { rank: 1, user: 'SHARPMIND', elo: 1847, wins: 142, losses: 38, streak: 12, level: 24, tier: 'champion' },
    { rank: 2, user: 'SHARPSHOOTER', elo: 1792, wins: 128, losses: 45, streak: 5, level: 22, tier: 'creator' },
    { rank: 3, user: 'QUICKTHINKER', elo: 1754, wins: 115, losses: 41, streak: 8, level: 20, tier: 'champion' },
    { rank: 4, user: 'TECHBRO_NO', elo: 1690, wins: 98, losses: 52, streak: 3, level: 18, tier: 'contender' },
    { rank: 5, user: 'FACTCHECKER', elo: 1654, wins: 91, losses: 55, streak: 2, level: 17, tier: 'contender' },
    { rank: 6, user: 'HOOPHEAD', elo: 1620, wins: 87, losses: 60, streak: 4, level: 16, tier: 'free' },
    { rank: 7, user: 'POLICYwonk', elo: 1590, wins: 83, losses: 58, streak: 1, level: 15, tier: 'contender' },
    { rank: 8, user: 'BOLDCLAIM', elo: 1545, wins: 76, losses: 64, streak: 6, level: 14, tier: 'free' },
    { rank: 9, user: 'FILMTAKES', elo: 1510, wins: 71, losses: 61, streak: 0, level: 13, tier: 'free' },
    { rank: 10, user: 'BEATDROP', elo: 1488, wins: 67, losses: 63, streak: 2, level: 12, tier: 'free' },
  ];

  // --- Fetch from Supabase ---
  async function _fetchLeaderboard() {
    if (isLoading) return;
    const sb = ColosseumAuth?.supabase;
    if (!sb || ColosseumAuth?.isPlaceholderMode) return;

    isLoading = true;
    try {
      const sortCol = currentTab === 'elo' ? 'elo_rating'
                    : currentTab === 'wins' ? 'wins'
                    : 'current_streak';

      const { data, error } = await ColosseumAuth.safeRpc('get_leaderboard', {
        p_sort_by: sortCol,
        p_limit: 50,
        p_offset: 0
      });

      if (error || !data || data.length === 0) {
        liveData = null;
      } else {
        liveData = data.map((p, i) => ({
          rank: i + 1,
          id: p.id,
          username: p.username || '',
          user: (p.username || p.display_name || 'ANON').toUpperCase(),
          elo: Number(p.elo_rating) || 1200,
          wins: Number(p.wins) || 0,
          losses: Number(p.losses) || 0,
          streak: Number(p.current_streak) || 0,
          level: Number(p.level) || 1,
          tier: p.subscription_tier || 'free',
          debates: Number(p.debates_completed) || 0,
        }));

        const me = ColosseumAuth?.currentUser?.id;
        if (me) {
          const idx = liveData.findIndex(p => p.id === me);
          myRank = idx >= 0 ? idx + 1 : null;
        }
      }
    } catch (e) {
      console.warn('Leaderboard fetch failed:', e);
      liveData = null;
    }
    isLoading = false;
  }

  function _getData() {
    return liveData || PLACEHOLDER_DATA;
  }

  // --- Shimmer skeleton rows ---
  function _renderShimmer() {
    let rows = '';
    for (let i = 0; i < 6; i++) {
      rows += `
        <div style="display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid rgba(255,255,255,0.03);">
          <div class="colo-shimmer" style="width:28px;height:20px;border-radius:4px;"></div>
          <div class="colo-shimmer" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <div class="colo-shimmer" style="width:${55 + i * 5}%;height:13px;border-radius:4px;"></div>
            <div class="colo-shimmer" style="width:${35 + i * 3}%;height:10px;border-radius:4px;"></div>
          </div>
          <div class="colo-shimmer" style="width:44px;height:20px;border-radius:4px;"></div>
        </div>`;
    }
    return rows;
  }

  // --- Elo Explainer Modal ---
  function _showEloExplainer() {
    // Remove existing
    document.getElementById('elo-explainer-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'elo-explainer-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:flex-end;justify-content:center;animation:coloFadeIn 0.2s ease;';
    modal.innerHTML = `
      <div style="
        background:linear-gradient(180deg,#12122A 0%,#1a2d4a 100%);
        border:1px solid rgba(212,168,67,0.25);border-radius:16px 16px 0 0;
        padding:24px 20px 32px;max-width:420px;width:100%;
        max-height:70vh;overflow-y:auto;
        animation:coloSlideUp 0.25s ease;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-family:'Cinzel',serif;font-size:18px;color:#d4a843;font-weight:700;letter-spacing:2px;">⚔️ ELO RATING</div>
          <button onclick="document.getElementById('elo-explainer-modal').remove()" style="
            background:none;border:none;color:#a0a8b8;font-size:22px;cursor:pointer;padding:4px 8px;line-height:1;
          ">&times;</button>
        </div>

        <div style="color:#e0e4ec;font-family:'Barlow Condensed',sans-serif;font-size:15px;line-height:1.6;">
          <p style="margin-bottom:14px;">
            Your Elo is a <strong style="color:#d4a843;">skill number</strong> that goes up when you win and down when you lose. Everyone starts at <strong style="color:#d4a843;">1200</strong>.
          </p>

          <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:14px;margin-bottom:14px;">
            <div style="font-weight:700;color:#d4a843;margin-bottom:8px;font-size:13px;letter-spacing:1px;">HOW IT MOVES</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#4caf50;font-size:18px;">▲</span>
                <span>Beat someone ranked <em>higher</em> than you = <strong style="color:#4caf50;">big gain</strong></span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#4caf50;font-size:18px;">▲</span>
                <span>Beat someone ranked <em>lower</em> than you = <strong style="color:#a0a8b8;">small gain</strong></span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#cc2936;font-size:18px;">▼</span>
                <span>Lose to someone ranked <em>lower</em> = <strong style="color:#cc2936;">big drop</strong></span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#cc2936;font-size:18px;">▼</span>
                <span>Lose to someone ranked <em>higher</em> = <strong style="color:#a0a8b8;">small drop</strong></span>
              </div>
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:14px;margin-bottom:14px;">
            <div style="font-weight:700;color:#d4a843;margin-bottom:8px;font-size:13px;letter-spacing:1px;">WHAT THE NUMBERS MEAN</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:14px;">
              <div><span style="color:#a0a8b8;">1000–1199</span> — Getting started</div>
              <div><span style="color:#4caf50;">1200–1399</span> — Solid debater</div>
              <div><span style="color:#2a5aab;">1400–1599</span> — Sharp mind</div>
              <div><span style="color:#cc2936;">1600–1799</span> — Heavy hitter</div>
              <div><span style="color:#d4a843;">1800+</span> — Gladiator elite</div>
            </div>
          </div>

          <p style="color:#6a7a90;font-size:13px;">
            Elo only moves in <strong>Ranked</strong> debates. Casual mode keeps your rating safe.
          </p>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  function render() {
    const container = document.getElementById('screen-leaderboard');
    if (!container) return;

    const profile = ColosseumAuth?.currentProfile;
    // BUG 3 FIX: Cast numeric values to Number() to prevent non-numeric strings in innerHTML
    const myElo = Number(profile?.elo_rating) || 1200;
    const myWins = Number(profile?.wins) || 0;
    // BUG 1 FIX: Escape username before injecting into innerHTML
    const myName = escHtml((profile?.username || 'YOU').toUpperCase());
    const rankDisplay = myRank ? `#${myRank}` : '#--';

    container.innerHTML = `
      <div style="padding:4px 0;">
        
        <!-- Section Banner -->
        <div style="text-align:center;padding:16px 0 12px;">
          <div style="font-family:'Cinzel',serif;font-size:24px;letter-spacing:3px;color:#d4a843;font-weight:700;">🏆 RANKINGS</div>
          <!-- BUG 4 FIX: Static subtitle — no longer leaks connection state -->
          <div style="color:#a0a8b8;font-size:13px;">The numbers speak for themselves.</div>
        </div>

        <!-- My Rank Card -->
        <div style="
          background:linear-gradient(135deg,rgba(212,168,67,0.12) 0%,rgba(204,41,54,0.08) 100%);
          border:1px solid rgba(212,168,67,0.2);border-radius:12px;padding:14px;margin-bottom:16px;
          display:flex;align-items:center;gap:12px;
        ">
          <div style="
            width:40px;height:40px;border-radius:50%;background:#1a2d4a;border:2px solid #d4a843;
            display:flex;align-items:center;justify-content:center;font-weight:700;color:#d4a843;font-size:14px;
          ">${myName[0]}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:#f0f0f0;">${myName}</div>
            <div style="font-size:12px;color:#a0a8b8;">ELO ${myElo} · ${myWins}W</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:'Cinzel',serif;font-size:20px;color:#d4a843;font-weight:700;">${rankDisplay}</div>
            <div style="font-size:10px;color:#6a7a90;">YOUR RANK</div>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:4px;margin-bottom:8px;">
          <button class="lb-tab ${currentTab === 'elo' ? 'active' : ''}" onclick="ColosseumLeaderboard.setTab('elo')" style="
            flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
            font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
            background:${currentTab === 'elo' ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.05)'};
            color:${currentTab === 'elo' ? '#d4a843' : '#a0a8b8'};
          ">ELO
            <span onclick="event.stopPropagation();ColosseumLeaderboard.showEloExplainer();" style="
              display:inline-block;width:16px;height:16px;border-radius:50%;
              background:rgba(212,168,67,0.25);color:#d4a843;
              font-size:10px;line-height:16px;text-align:center;
              margin-left:6px;cursor:pointer;vertical-align:middle;
              font-family:serif;font-weight:700;
            ">?</span>
          </button>
          <button class="lb-tab ${currentTab === 'wins' ? 'active' : ''}" onclick="ColosseumLeaderboard.setTab('wins')" style="
            flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
            font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
            background:${currentTab === 'wins' ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.05)'};
            color:${currentTab === 'wins' ? '#d4a843' : '#a0a8b8'};
          ">WINS</button>
          <button class="lb-tab ${currentTab === 'streak' ? 'active' : ''}" onclick="ColosseumLeaderboard.setTab('streak')" style="
            flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
            font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
            background:${currentTab === 'streak' ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.05)'};
            color:${currentTab === 'streak' ? '#d4a843' : '#a0a8b8'};
          ">🔥 STREAK</button>
        </div>

        <!-- Time Filter -->
        <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
          ${['all', 'week', 'month'].map(t => `
            <button onclick="ColosseumLeaderboard.setTime('${t}')" style="
              padding:6px 14px;border-radius:16px;border:none;cursor:pointer;font-size:11px;font-weight:600;
              background:${currentTime === t ? 'rgba(204,41,54,0.15)' : 'rgba(255,255,255,0.05)'};
              color:${currentTime === t ? '#cc2936' : '#a0a8b8'};white-space:nowrap;
            ">${t === 'all' ? 'ALL TIME' : t === 'week' ? 'THIS WEEK' : 'THIS MONTH'}</button>
          `).join('')}
        </div>

        <!-- Rankings List -->
        <div id="lb-list">
          ${isLoading ? _renderShimmer() : _renderList()}
        </div>
      </div>
    `;

    // Wire profile navigation via event delegation
    const lbList = document.getElementById('lb-list');
    if (lbList) {
      lbList.addEventListener('click', (e) => {
        const row = e.target.closest('[data-username]');
        if (row && row.dataset.username) {
          window.location.href = '/u/' + encodeURIComponent(row.dataset.username);
        }
      });
    }
  }

  function _renderList() {
    const data = _getData();
    const sorted = [...data].sort((a, b) => {
      if (currentTab === 'elo') return b.elo - a.elo;
      if (currentTab === 'wins') return b.wins - a.wins;
      if (currentTab === 'streak') return b.streak - a.streak;
      return 0;
    });

    sorted.forEach((item, i) => item.rank = i + 1);

    return sorted.map(p => {
      const stat = currentTab === 'elo' ? p.elo : currentTab === 'wins' ? p.wins : p.streak;
      const statLabel = currentTab === 'elo' ? 'ELO' : currentTab === 'wins' ? 'WINS' : '🔥';

      const medalColors = { 1: '#d4a843', 2: '#a8a8a8', 3: '#b87333' };
      const rankColor = medalColors[p.rank] || '#6a7a90';

      const tierBorder = {
        creator: '#d4a843',
        champion: '#cc2936',
        contender: '#2a5aab',
        free: 'rgba(255,255,255,0.15)'
      }[p.tier] || 'rgba(255,255,255,0.15)';

      // BUG 2 FIX: Use local escHtml() instead of broken inline fallback
      const safeUsername = escHtml(p.username || '');
      return `
        <div data-username="${safeUsername}" style="
          display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;
          background:${p.rank <= 3 ? 'rgba(212,168,67,0.04)' : 'transparent'};
          border-bottom:1px solid rgba(255,255,255,0.03);
        ">
          <div style="width:28px;text-align:center;font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:${rankColor};">
            ${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}
          </div>
          <div style="
            width:36px;height:36px;border-radius:50%;background:#1a2d4a;
            border:2px solid ${tierBorder};
            display:flex;align-items:center;justify-content:center;
            font-weight:700;color:#f0f0f0;font-size:13px;
          ">${escHtml(p.user[0])}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:13px;color:#f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(p.user)}</div>
            <div style="font-size:11px;color:#6a7a90;">LVL ${Number(p.level) || 1} · ${Number(p.wins) || 0}W/${Number(p.losses) || 0}L</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:${currentTab === 'streak' && p.streak >= 5 ? '#cc2936' : '#d4a843'};">${Number(stat) || 0}</div>
            <div style="font-size:9px;color:#6a7a90;letter-spacing:1px;">${statLabel}</div>
          </div>
        </div>`;
    }).join('');
  }

  async function setTab(tab) {
    currentTab = tab;
    liveData = null;
    render();
    await _fetchLeaderboard();
    render();
  }

  function setTime(time) {
    currentTime = time;
    // NOTE: Week/month time filters require time-bucketed stats
    // which don't exist yet in the schema. For now, all filters
    // show the same data. When time-based tracking is added,
    // wire the filter into _fetchLeaderboard().
    render();
  }

  function init() {
    const observer = new MutationObserver(() => {
      const screen = document.getElementById('screen-leaderboard');
      if (screen?.classList.contains('active') && screen.children.length === 0) {
        render();
        _fetchLeaderboard().then(() => render());
      }
    });

    const screen = document.getElementById('screen-leaderboard');
    if (screen) {
      observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  return { render, setTab, setTime, showEloExplainer: _showEloExplainer };

})();
