// ============================================================
// COLOSSEUM HOME — Section/Banner Layout Engine (Mobile-First)
// Items: 14.6.2, 3.16, 3.17, 8.1-8.5
// Fox News chyron energy + ESPN stat cards + gladiator gold
// Themed sections with progressive disclosure
// ============================================================

const ColosseumHome = (() => {

  const SECTIONS = [
    { id: 'politics', name: 'THE FLOOR', subtitle: 'Policy. Power. The arguments that shape everything.', icon: '🏛️', accent: '#1a3a6b', accentLight: 'rgba(26,58,107,0.25)', borderColor: '#2a5aab', tier: 1 },
    { id: 'sports', name: 'THE PRESSBOX', subtitle: 'Hot takes. Cold stats. Every fan thinks they know better.', icon: '🏟️', accent: '#1a4d2e', accentLight: 'rgba(26,77,46,0.25)', borderColor: '#2e8b57', tier: 1 },
    { id: 'entertainment', name: 'THE SPOTLIGHT', subtitle: 'Movies. Music. Tabloids. The takes nobody asked for.', icon: '🎬', accent: '#4a1a5e', accentLight: 'rgba(74,26,94,0.25)', borderColor: '#8b3aad', tier: 2 },
    { id: 'trending', name: 'THE FIRE', subtitle: 'What\'s blowing up right now across every section.', icon: '🔥', accent: '#5e2a0a', accentLight: 'rgba(94,42,10,0.25)', borderColor: '#cc5500', tier: 1 }
  ];

  const PLACEHOLDER_LIVE = [
    { debater1: 'GLADIATOR42', elo1: 1847, debater2: 'IRONMIND', elo2: 1792, topic: '"Is college still worth it in 2026?"', section: 'politics', spectators: 127, round: 3, totalRounds: 5, timeLeft: '1:14' },
    { debater1: 'SHARPSHOOTER', elo1: 1654, debater2: 'HOOPSDREAMS', elo2: 1601, topic: '"LeBron is NOT the GOAT"', section: 'sports', spectators: 89, round: 1, totalRounds: 5, timeLeft: '1:48' }
  ];

  const PLACEHOLDER_TONIGHT = [
    { debater1: 'REDPILL_RICK', elo1: 1520, debater2: 'FACTCHECKER', elo2: 1488, topic: '"Should voting age be lowered to 16?"', section: 'politics', time: '8:00 PM', predictions: 34 },
    { debater1: 'BALLTALK', elo1: 1390, debater2: 'COURTSIDE_Q', elo2: 1445, topic: '"Wemby will surpass Giannis within 3 years"', section: 'sports', time: '9:30 PM', predictions: 21 },
    { debater1: 'CINEPHILE', elo1: 1280, debater2: 'STREAMQUEEN', elo2: 1315, topic: '"Marvel is dead and Disney killed it"', section: 'entertainment', time: '10:00 PM', predictions: 48 }
  ];

  const PLACEHOLDER_HOT_TAKES = {
    politics: [
      { user: 'SENATEWATCH', elo: 1340, text: 'Term limits would fix 80% of Congress overnight. Change my mind.', reactions: 312, challenges: 4, time: '12m' },
      { user: 'POLICYwonk', elo: 1510, text: 'Universal basic income isn\'t radical — Alaska has had it for decades.', reactions: 189, challenges: 2, time: '28m' },
    ],
    sports: [
      { user: 'HOOPHEAD', elo: 1420, text: 'The NBA play-in tournament is the best thing the league has done in 20 years.', reactions: 247, challenges: 6, time: '8m' },
      { user: 'GRIDIRONKING', elo: 1280, text: 'Patrick Mahomes is already the greatest QB ever. Stats don\'t lie.', reactions: 531, challenges: 11, time: '45m' },
    ],
    entertainment: [
      { user: 'FILMTAKES', elo: 1190, text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.', reactions: 402, challenges: 8, time: '15m' },
      { user: 'BEATDROP', elo: 1355, text: 'Drake vs Kendrick settled it: the better artist doesn\'t always win the battle.', reactions: 678, challenges: 14, time: '1h' },
    ],
    trending: [
      { user: 'GLADIATOR42', elo: 1847, text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.', reactions: 1247, challenges: 23, time: '2h' },
      { user: 'TECHBRO_NO', elo: 1590, text: 'Every generation thinks they\'re living through the apocalypse. AI doomerism is no different.', reactions: 894, challenges: 17, time: '3h' },
    ]
  };


  // --- Render Functions ---

  function renderLiveBadge() {
    return `<span class="home-live-badge"><span class="home-live-dot"></span>LIVE</span>`;
  }

  function renderOnAirNow() {
    if (PLACEHOLDER_LIVE.length === 0) return '';
    const cards = PLACEHOLDER_LIVE.map(d => `
      <div class="home-live-card">
        <div class="home-live-card-header">
          ${renderLiveBadge()}
          <span class="home-live-round">RD ${d.round}/${d.totalRounds} · ${d.timeLeft}</span>
        </div>
        <div class="home-matchup">
          <div class="home-debater">
            <span class="home-debater-name">${d.debater1}</span>
            <span class="home-debater-elo">${d.elo1}</span>
          </div>
          <span class="home-vs">VS</span>
          <div class="home-debater right">
            <span class="home-debater-name">${d.debater2}</span>
            <span class="home-debater-elo">${d.elo2}</span>
          </div>
        </div>
        <div class="home-live-topic">${d.topic}</div>
        <div class="home-live-footer">
          <span class="home-spectators">👁 ${d.spectators} watching</span>
          <button class="home-watch-btn" onclick="ColosseumHome.watchDebate('${d.section}')">WATCH LIVE</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="home-on-air">
        <div class="home-on-air-header">
          <span class="home-on-air-title">${renderLiveBadge()} ON AIR NOW</span>
          <span class="home-on-air-count">${PLACEHOLDER_LIVE.length} debates live</span>
        </div>
        <div class="home-live-scroll">${cards}</div>
      </div>
    `;
  }

  function renderTonightsCard() {
    if (PLACEHOLDER_TONIGHT.length === 0) return '';
    const cards = PLACEHOLDER_TONIGHT.map((d, i) => {
      const section = SECTIONS.find(s => s.id === d.section);
      return `
        <div class="home-tonight-card" style="border-left: 3px solid ${section?.borderColor || 'var(--gold)'};cursor:pointer;" onclick="ColosseumHome.openPrediction(${i})">
          <div class="home-tonight-time">${d.time}</div>
          <div class="home-tonight-matchup">
            <span class="home-tonight-name">${d.debater1}</span>
            <span class="home-tonight-vs">vs</span>
            <span class="home-tonight-name">${d.debater2}</span>
          </div>
          <div class="home-tonight-topic">${d.topic}</div>
          <div class="home-tonight-footer">
            <span class="home-tonight-section">${section?.icon || ''} ${section?.name || ''}</span>
            <button class="home-predict-btn" onclick="event.stopPropagation();ColosseumHome.openPrediction(${i})">🎯 PREDICT</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="home-tonight">
        <div class="home-section-header-row">
          <span class="home-section-header-title">🗓️ TONIGHT'S CARD</span>
        </div>
        ${cards}
      </div>
    `;
  }

  function openPrediction(index) {
    const d = PLACEHOLDER_TONIGHT[index];
    if (!d) return;

    const existing = document.getElementById('prediction-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'prediction-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
    modal.innerHTML = `
      <div style="
        background:linear-gradient(180deg,#132240 0%,#0a1628 100%);
        border-top-left-radius:20px;border-top-right-radius:20px;
        width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
      ">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 16px;"></div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#d4a843;text-align:center;">🎯 MAKE YOUR PREDICTION</div>
        <div style="color:#a0a8b8;text-align:center;font-size:12px;margin-bottom:16px;">${d.time} · ${d.topic}</div>
        
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="pred-pick-btn" id="pred-pick-a" onclick="document.getElementById('pred-pick-a').classList.add('selected');document.getElementById('pred-pick-b').classList.remove('selected');" style="
            flex:1;padding:16px 8px;background:#1a2d4a;border:2px solid rgba(255,255,255,0.1);
            border-radius:12px;text-align:center;cursor:pointer;color:#f0f0f0;
          ">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;">${d.debater1}</div>
            <div style="font-size:11px;color:#a0a8b8;">ELO ${d.elo1}</div>
          </button>
          <button class="pred-pick-btn" id="pred-pick-b" onclick="document.getElementById('pred-pick-b').classList.add('selected');document.getElementById('pred-pick-a').classList.remove('selected');" style="
            flex:1;padding:16px 8px;background:#1a2d4a;border:2px solid rgba(255,255,255,0.1);
            border-radius:12px;text-align:center;cursor:pointer;color:#f0f0f0;
          ">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;">${d.debater2}</div>
            <div style="font-size:11px;color:#a0a8b8;">ELO ${d.elo2}</div>
          </button>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:12px;color:#a0a8b8;margin-bottom:6px;">WAGER TOKENS</div>
          <div style="display:flex;gap:6px;">
            <button class="pred-wager-btn" onclick="document.getElementById('pred-amount').value='5'" style="padding:8px 14px;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#d4a843;font-weight:700;font-size:13px;cursor:pointer;">5</button>
            <button class="pred-wager-btn" onclick="document.getElementById('pred-amount').value='10'" style="padding:8px 14px;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#d4a843;font-weight:700;font-size:13px;cursor:pointer;">10</button>
            <button class="pred-wager-btn" onclick="document.getElementById('pred-amount').value='25'" style="padding:8px 14px;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#d4a843;font-weight:700;font-size:13px;cursor:pointer;">25</button>
            <input id="pred-amount" type="number" value="5" min="1" max="100" style="flex:1;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#d4a843;padding:8px;text-align:center;font-weight:700;font-size:14px;min-width:60px;">
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('prediction-modal')?.remove()" style="
            flex:1;padding:14px;background:#1a2d4a;color:#a0a8b8;border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;
          ">CANCEL</button>
          <button onclick="ColosseumHome._submitPrediction(${index})" style="
            flex:1;padding:14px;background:#cc2936;color:#fff;border:none;
            border-radius:10px;font-family:'Bebas Neue',sans-serif;font-size:16px;
            letter-spacing:2px;cursor:pointer;
          ">🎯 LOCK IT IN</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Style selected state via CSS
    const style = document.createElement('style');
    style.textContent = '.pred-pick-btn.selected { border-color: #d4a843 !important; background: rgba(212,168,67,0.1) !important; }';
    modal.appendChild(style);
  }

  function _submitPrediction(index) {
    const pickA = document.getElementById('pred-pick-a')?.classList.contains('selected');
    const pickB = document.getElementById('pred-pick-b')?.classList.contains('selected');
    const amount = parseInt(document.getElementById('pred-amount')?.value) || 5;

    if (!pickA && !pickB) {
      showToast('Pick a winner first!');
      return;
    }

    const d = PLACEHOLDER_TONIGHT[index];
    const winner = pickA ? d.debater1 : d.debater2;

    document.getElementById('prediction-modal')?.remove();
    d.predictions++;
    showToast(`🎯 Locked in: ${winner} wins! (${amount} tokens wagered)`);

    // In production, calls ColosseumScoring.placePrediction()
    if (typeof ColosseumScoring !== 'undefined' && ColosseumScoring.placePrediction) {
      // ColosseumScoring.placePrediction(d.id, pickA ? 'a' : 'b', amount);
      console.log('[Prediction]', d.topic, winner, amount);
    }
  }

  function renderSectionBanner(section) {
    return `
      <div class="home-banner" style="border-left: 4px solid ${section.borderColor}; background: linear-gradient(135deg, ${section.accentLight}, var(--navy-light));" data-section="${section.id}">
        <div class="home-banner-top">
          <span class="home-banner-icon">${section.icon}</span>
          <div class="home-banner-text">
            <h2 class="home-banner-name">${section.name}</h2>
            <div class="home-banner-subtitle">${section.subtitle}</div>
          </div>
          <button class="home-banner-toggle" data-section="${section.id}" aria-label="Expand section">▾</button>
        </div>
        <div class="home-banner-stats">
          <span class="home-banner-stat">${renderLiveBadge()} ${PLACEHOLDER_LIVE.filter(l => l.section === section.id).length} live</span>
          <span class="home-banner-stat">🔥 ${(PLACEHOLDER_HOT_TAKES[section.id] || []).reduce((a, t) => a + t.reactions, 0)} reactions</span>
        </div>
      </div>
    `;
  }

  function renderSectionContent(section) {
    const takes = PLACEHOLDER_HOT_TAKES[section.id] || [];
    const liveDeb = PLACEHOLDER_LIVE.filter(l => l.section === section.id);

    let liveHtml = '';
    if (liveDeb.length > 0) {
      liveHtml = liveDeb.map(d => `
        <div class="home-section-live-mini">
          <span class="home-mini-live">${renderLiveBadge()}</span>
          <span class="home-mini-matchup">${d.debater1} vs ${d.debater2}</span>
          <button class="home-mini-watch" onclick="ColosseumHome.watchDebate('${section.id}')">WATCH</button>
        </div>
      `).join('');
    }

    const takesHtml = takes.map(t => `
      <div class="home-take-card">
        <div class="home-take-header">
          <span class="home-take-user">${t.user}</span>
          <span class="home-take-elo">⚔ ${t.elo}</span>
          <span class="home-take-time">${t.time}</span>
        </div>
        <div class="home-take-body">${t.text}</div>
        <div class="home-take-actions">
          <button class="home-take-btn fire" onclick="ColosseumHome.react('${section.id}')">🔥 ${t.reactions}</button>
          <button class="home-take-btn challenge" onclick="ColosseumHome.challenge('${section.id}')">⚔️ ${t.challenges}</button>
          <button class="home-take-btn" onclick="ColosseumVoiceMemo?.replyToTake?.('','${t.user}','${t.text.replace(/'/g, "\\'")}','${section.id}')" style="color:var(--white-dim);">🎤</button>
          <button class="home-take-bet" onclick="ColosseumHome.bet('${section.id}')">BET.</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="home-section-content" id="section-content-${section.id}" style="display:none;">
        ${liveHtml}
        ${takesHtml}
        <button class="home-section-more" onclick="ColosseumHome.loadMore('${section.id}')">Load more from ${section.name}</button>
      </div>
    `;
  }

  function renderSection(section) {
    return renderSectionBanner(section) + renderSectionContent(section);
  }

  function renderPostComposer() {
    return `
      <div class="home-composer">
        <div class="home-composer-row" style="display:flex;gap:8px;align-items:center;">
          <div class="home-composer-prompt" id="home-composer-prompt" onclick="ColosseumHome.openComposer()" style="flex:1;">
            🔥 Drop a hot take...
          </div>
          <button class="home-mic-btn" onclick="ColosseumVoiceMemo?.recordTake?.('trending')" title="Voice Take" style="
            width:48px;height:48px;border-radius:50%;
            background:rgba(204,41,54,0.15);border:1px solid rgba(204,41,54,0.3);
            color:#cc2936;font-size:20px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            flex-shrink:0;-webkit-tap-highlight-color:transparent;
          ">🎤</button>
        </div>
      </div>
    `;
  }

  function renderActivityBar() {
    // Pull from notification module if available, else placeholder
    const items = [
      { icon: '⚔️', text: 'gladiator42 just won a debate in Politics', time: '2m' },
      { icon: '🔥', text: 'Your hot take got 12 new reactions', time: '8m' },
      { icon: '🏆', text: 'You moved up to rank #47', time: '1h' },
    ];

    return `
      <div class="home-activity-bar">
        <div class="home-activity-header">
          <span style="font-family:var(--font-display);font-size:12px;letter-spacing:1.5px;">📢 ACTIVITY</span>
          <button class="home-activity-see-all" onclick="document.getElementById('notif-btn')?.click()">See all</button>
        </div>
        <div class="home-activity-scroll">
          ${items.map(i => `
            <div class="home-activity-item">
              <span class="home-activity-icon">${i.icon}</span>
              <span class="home-activity-text">${i.text}</span>
              <span class="home-activity-time">${i.time}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }


  // --- Main Render ---

  function render(containerId) {
    const container = document.getElementById(containerId || 'screen-home');
    if (!container) return;

    container.innerHTML = `
      <style>${getStyles()}</style>
      ${renderOnAirNow()}
      ${renderActivityBar()}
      ${renderPostComposer()}
      ${renderTonightsCard()}
      <div class="home-sections">
        ${SECTIONS.map(s => renderSection(s)).join('')}
      </div>
    `;

    container.querySelectorAll('.home-banner-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSection(btn.dataset.section);
      });
    });

    container.querySelectorAll('.home-banner').forEach(banner => {
      banner.addEventListener('click', () => {
        toggleSection(banner.dataset.section);
      });
    });

    setTimeout(() => toggleSection(SECTIONS[0].id), 300);
  }

  function toggleSection(sectionId) {
    const content = document.getElementById('section-content-' + sectionId);
    const btn = document.querySelector(`.home-banner-toggle[data-section="${sectionId}"]`);
    if (!content) return;

    const isOpen = content.style.display !== 'none';
    if (isOpen) {
      content.style.display = 'none';
      if (btn) btn.textContent = '▾';
    } else {
      content.style.display = 'block';
      content.style.animation = 'homeSlideDown 0.3s ease';
      if (btn) btn.textContent = '▴';
    }
  }


  // --- Placeholder Actions ---

  function watchDebate(section) {
    const debate = PLACEHOLDER_LIVE.find(d => d.section === section) || PLACEHOLDER_LIVE[0];
    if (debate && typeof ColosseumArena !== 'undefined' && ColosseumArena.spectate) {
      ColosseumArena.spectate(debate);
    } else {
      showToast('⚔️ Joining live debate...');
    }
  }
  function react(section) { showToast('🔥 Reaction sent!'); }
  function challenge(section) { showToast('⚔️ Challenge sent!'); }
  function bet(section) { showToast('💰 BET. — Challenge created!'); }
  function loadMore(section) { showToast('Loading more from ' + section + '...'); }

  function openComposer() {
    if (typeof ColosseumAsync !== 'undefined' && ColosseumAsync.openComposer) {
      ColosseumAsync.openComposer();
    } else {
      showToast('🔥 Post composer coming soon');
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--navy-light);color:var(--white);padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;border:1px solid rgba(212,168,67,0.2);box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:homeSlideUp 0.3s ease;max-width:90vw;text-align:center;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2000);
  }


  // --- MOBILE-FIRST STYLES ---

  function getStyles() {
    return `
      /* ===== ON AIR NOW ===== */
      .home-on-air { margin-bottom: 14px; }
      .home-on-air-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .home-on-air-title {
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 1.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .home-on-air-count { font-size: 11px; color: var(--white-dim); }

      /* Horizontal scroll with snap */
      .home-live-scroll {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .home-live-scroll::-webkit-scrollbar { display: none; }

      .home-live-card {
        min-width: 280px;
        max-width: 88vw;
        scroll-snap-align: start;
        background: var(--navy-light);
        border: 1px solid rgba(204,41,54,0.3);
        border-radius: 10px;
        padding: 12px;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }
      .home-live-card::after {
        content: '';
        position: absolute;
        top: 0; right: 0;
        width: 80px; height: 80px;
        background: radial-gradient(circle, rgba(204,41,54,0.08) 0%, transparent 70%);
        pointer-events: none;
      }
      @media (min-width: 768px) {
        .home-live-card { min-width: 300px; max-width: 340px; padding: 14px; border-radius: 12px; }
      }

      .home-live-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .home-live-round { font-size: 11px; color: var(--white-dim); font-weight: 600; }

      .home-matchup {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 6px;
      }
      .home-debater { display: flex; flex-direction: column; gap: 1px; }
      .home-debater.right { text-align: right; }
      .home-debater-name {
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 1px;
      }
      .home-debater-elo { font-size: 10px; color: var(--gold); font-weight: 600; }
      @media (min-width: 768px) {
        .home-debater-name { font-size: 16px; }
        .home-debater-elo { font-size: 11px; }
      }

      .home-vs {
        font-family: var(--font-display);
        font-size: 12px;
        color: var(--red);
        letter-spacing: 2px;
        flex-shrink: 0;
      }

      .home-live-topic { font-size: 12px; color: var(--white-dim); line-height: 1.4; margin-bottom: 8px; }
      @media (min-width: 768px) { .home-live-topic { font-size: 13px; } }

      .home-live-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .home-spectators { font-size: 11px; color: var(--white-dim); }

      /* 44px touch target */
      .home-watch-btn {
        background: var(--red);
        color: #fff;
        border: none;
        padding: 0 16px;
        min-height: 36px;
        border-radius: 6px;
        font-family: var(--font-display);
        font-size: 12px;
        letter-spacing: 2px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .home-watch-btn:active { background: var(--red-hover); }
      @media (hover: hover) { .home-watch-btn:hover { background: var(--red-hover); } }

      /* ===== LIVE BADGE ===== */
      .home-live-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--red);
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .home-live-dot {
        width: 5px; height: 5px;
        background: #fff; border-radius: 50%;
        animation: homePulse 1.5s infinite;
      }
      @keyframes homePulse { 0%,100%{opacity:1}50%{opacity:0.3} }

      /* ===== COMPOSER ===== */
      .home-composer { margin-bottom: 14px; }
      .home-composer-prompt {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 14px 14px;
        min-height: 48px;
        font-size: 14px;
        color: var(--white-dim);
        cursor: pointer;
        display: flex;
        align-items: center;
        -webkit-tap-highlight-color: transparent;
      }
      .home-composer-prompt:active { border-color: rgba(212,168,67,0.25); }
      @media (hover: hover) { .home-composer-prompt:hover { border-color: rgba(212,168,67,0.25); } }

      /* Activity Bar (Item 14.6.1.5) */
      .home-activity-bar {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 14px;
      }
      .home-activity-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 8px;
      }
      .home-activity-see-all {
        background: none; border: none; color: var(--gold); font-size: 12px;
        font-weight: 600; cursor: pointer; padding: 4px 8px;
        -webkit-tap-highlight-color: transparent;
      }
      .home-activity-scroll { display: flex; flex-direction: column; gap: 6px; }
      .home-activity-item {
        display: flex; align-items: center; gap: 8px;
        font-size: 13px; color: var(--white-dim);
        padding: 4px 0;
      }
      .home-activity-icon { flex-shrink: 0; }
      .home-activity-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .home-activity-time { flex-shrink: 0; font-size: 11px; color: var(--gold-dim); }

      /* ===== TONIGHT'S CARD ===== */
      .home-tonight { margin-bottom: 16px; }
      .home-section-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .home-section-header-title {
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 1.5px;
      }
      @media (min-width: 768px) { .home-section-header-title { font-size: 16px; letter-spacing: 2px; } }

      .home-tonight-card {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 6px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .home-tonight-card:active { background: var(--navy-mid); }
      @media (hover: hover) { .home-tonight-card:hover { border-color: rgba(212,168,67,0.2); } }
      @media (min-width: 768px) { .home-tonight-card { padding: 12px 14px; border-radius: 10px; } }

      .home-tonight-time {
        font-family: var(--font-display);
        font-size: 12px;
        letter-spacing: 2px;
        color: var(--gold);
        margin-bottom: 3px;
      }
      .home-tonight-matchup {
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 1px;
        margin-bottom: 3px;
      }
      @media (min-width: 768px) { .home-tonight-matchup { font-size: 15px; } }
      .home-tonight-vs { color: var(--red); font-size: 11px; margin: 0 5px; }
      .home-tonight-topic { font-size: 12px; color: var(--white-dim); margin-bottom: 4px; }
      .home-tonight-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
        color: var(--white-dim);
      }
      .home-tonight-section { font-weight: 600; letter-spacing: 0.5px; }
      .home-tonight-predictions { color: var(--gold); }
      .home-predict-btn {
        background: rgba(212,168,67,0.15); border: 1px solid rgba(212,168,67,0.3);
        color: var(--gold); font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        padding: 4px 10px; border-radius: 12px; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .home-predict-btn:active { background: rgba(212,168,67,0.25); }

      /* ===== SECTION BANNERS ===== */
      .home-sections { margin-top: 6px; }

      .home-banner {
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 4px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
      }
      .home-banner:active { filter: brightness(1.05); }
      @media (hover: hover) { .home-banner:hover { filter: brightness(1.05); } }
      .home-banner::after {
        content: '';
        position: absolute;
        top: -20px; right: -20px;
        width: 100px; height: 100px;
        background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
        pointer-events: none;
      }
      @media (min-width: 768px) { .home-banner { padding: 16px; border-radius: 12px; } }

      .home-banner-top { display: flex; align-items: center; gap: 10px; }
      .home-banner-icon { font-size: 24px; flex-shrink: 0; }
      @media (min-width: 768px) { .home-banner-icon { font-size: 28px; } }
      .home-banner-text { flex: 1; }
      .home-banner-name {
        font-family: var(--font-display);
        font-size: 18px;
        letter-spacing: 2px;
        line-height: 1;
      }
      @media (min-width: 768px) { .home-banner-name { font-size: 20px; letter-spacing: 3px; } }
      .home-banner-subtitle { font-size: 11px; color: var(--white-dim); margin-top: 2px; line-height: 1.3; }
      @media (min-width: 768px) { .home-banner-subtitle { font-size: 12px; } }

      /* 44px touch target */
      .home-banner-toggle {
        background: rgba(255,255,255,0.06);
        border: none;
        color: var(--white-dim);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .home-banner-toggle:active { background: rgba(255,255,255,0.12); color: var(--white); }
      @media (hover: hover) { .home-banner-toggle:hover { background: rgba(255,255,255,0.12); color: var(--white); } }

      .home-banner-stats {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        padding-left: 34px;
      }
      @media (min-width: 768px) { .home-banner-stats { padding-left: 40px; gap: 16px; } }
      .home-banner-stat {
        font-size: 10px;
        color: var(--white-dim);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* ===== SECTION CONTENT ===== */
      .home-section-content { padding: 0 0 10px 0; }

      .home-section-live-mini {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(204,41,54,0.08);
        border: 1px solid rgba(204,41,54,0.15);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 6px;
      }
      .home-mini-live { flex-shrink: 0; }
      .home-mini-matchup {
        flex: 1;
        font-family: var(--font-display);
        font-size: 12px;
        letter-spacing: 1px;
      }
      /* 44px touch target */
      .home-mini-watch {
        background: var(--red);
        color: #fff;
        border: none;
        padding: 0 12px;
        min-height: 36px;
        border-radius: 4px;
        font-family: var(--font-display);
        font-size: 10px;
        letter-spacing: 1px;
        cursor: pointer;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;
      }
      .home-mini-watch:active { background: var(--red-hover); }

      /* ===== HOT TAKE CARDS ===== */
      .home-take-card {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 6px;
      }
      @media (min-width: 768px) { .home-take-card { padding: 14px; } }
      .home-take-card:active { border-color: rgba(212,168,67,0.15); }
      @media (hover: hover) { .home-take-card:hover { border-color: rgba(212,168,67,0.15); } }

      .home-take-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .home-take-user { font-family: var(--font-display); font-size: 13px; letter-spacing: 1px; }
      .home-take-elo { font-size: 10px; color: var(--gold); font-weight: 600; }
      .home-take-time { font-size: 10px; color: var(--white-dim); margin-left: auto; }

      .home-take-body { font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
      @media (min-width: 768px) { .home-take-body { font-size: 15px; } }

      .home-take-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

      /* 44px touch target via padding */
      .home-take-btn {
        background: none;
        border: none;
        color: var(--white-dim);
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 8px 4px;
        min-height: 36px;
        -webkit-tap-highlight-color: transparent;
      }
      .home-take-btn.fire:active { color: #ff6b35; }
      .home-take-btn.challenge:active { color: var(--red); }
      @media (hover: hover) {
        .home-take-btn.fire:hover { color: #ff6b35; }
        .home-take-btn.challenge:hover { color: var(--red); }
      }

      .home-take-bet {
        background: var(--red);
        color: #fff;
        border: none;
        padding: 0 14px;
        min-height: 36px;
        border-radius: 5px;
        font-family: var(--font-display);
        font-size: 12px;
        letter-spacing: 2px;
        cursor: pointer;
        margin-left: auto;
        -webkit-tap-highlight-color: transparent;
      }
      .home-take-bet:active { background: var(--red-hover); }
      @media (hover: hover) { .home-take-bet:hover { background: var(--red-hover); } }

      .home-section-more {
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        padding: 0;
        min-height: 44px;
        color: var(--white-dim);
        font-size: 13px;
        cursor: pointer;
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .home-section-more:active { background: rgba(255,255,255,0.06); color: var(--white); }
      @media (hover: hover) { .home-section-more:hover { background: rgba(255,255,255,0.06); color: var(--white); } }

      /* ===== ANIMATIONS ===== */
      @keyframes homeSlideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes homeSlideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    `;
  }


  return {
    render, toggleSection, watchDebate, react, challenge, bet, loadMore, openComposer, openPrediction, _submitPrediction, SECTIONS
  };

})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('screen-home')) {
      ColosseumHome.render('screen-home');
    }
  }, 900);
});
