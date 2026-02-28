// ============================================================
// COLOSSEUM ARENA — Live Debate UI
// Items: 14.3.1–14.3.8, 14.6.1.2
// States: lobby → matchmaking → pre-debate → live → voting → results
// Wires into ColosseumWebRTC + ColosseumScoring
// ============================================================

const ColosseumArena = (() => {

  let currentView = 'lobby'; // lobby | matchmaking | pre-debate | live | voting | results
  let debateData = null;
  let localAudioLevel = null;
  let remoteAudioLevel = null;
  let votesCast = false;

  // --- Render Router ---
  function render(containerId) {
    const el = document.getElementById(containerId || 'screen-arena');
    if (!el) return;

    el.innerHTML = `<style>${getStyles()}</style><div id="arena-view"></div>`;
    showView('lobby');
  }

  function showView(view, data) {
    currentView = view;
    const el = document.getElementById('arena-view');
    if (!el) return;

    switch (view) {
      case 'lobby': el.innerHTML = renderLobby(); wireLobby(); break;
      case 'matchmaking': el.innerHTML = renderMatchmaking(); startMatchmakingTimer(); break;
      case 'pre-debate': el.innerHTML = renderPreDebate(data); wirePreDebate(); break;
      case 'live': el.innerHTML = renderLive(data); wireLive(); break;
      case 'spectating': el.innerHTML = renderSpectating(data); wireSpectating(); break;
      case 'voting': el.innerHTML = renderVoting(data); wireVoting(); break;
      case 'results': el.innerHTML = renderResults(data); wireResults(); break;
    }
  }


  // ========================
  // LOBBY
  // ========================

  function renderLobby() {
    return `
      <div class="arena-lobby">
        <div class="arena-hero">
          <div class="arena-hero-icon">🎙️</div>
          <h2 class="arena-hero-title">START A DEBATE</h2>
          <p class="arena-hero-sub">Pick a topic. Get matched. Make your case.</p>
        </div>

        <!-- Quick Match -->
        <div class="arena-section">
          <div class="arena-section-title">⚡ QUICK MATCH</div>
          <div class="arena-topic-grid" id="arena-topics">
            <button class="arena-topic-btn" data-cat="politics" data-topic="random">
              <span class="arena-topic-icon">🏛️</span>
              <span class="arena-topic-name">POLITICS</span>
            </button>
            <button class="arena-topic-btn" data-cat="sports" data-topic="random">
              <span class="arena-topic-icon">🏟️</span>
              <span class="arena-topic-name">SPORTS</span>
            </button>
            <button class="arena-topic-btn" data-cat="entertainment" data-topic="random">
              <span class="arena-topic-icon">🎬</span>
              <span class="arena-topic-name">ENTERTAINMENT</span>
            </button>
            <button class="arena-topic-btn surprise" data-cat="random" data-topic="random">
              <span class="arena-topic-icon">🎲</span>
              <span class="arena-topic-name">SURPRISE ME</span>
            </button>
          </div>
        </div>

        <!-- Custom Topic -->
        <div class="arena-section">
          <div class="arena-section-title">✍️ CUSTOM TOPIC</div>
          <div class="arena-custom-row">
            <input type="text" class="arena-custom-input" id="arena-custom-topic" placeholder="Type your topic or hot take..." maxlength="200">
            <button class="arena-custom-go" id="arena-custom-go-btn">GO</button>
          </div>
        </div>

        <!-- Format -->
        <div class="arena-section">
          <div class="arena-section-title">📐 FORMAT</div>
          <div class="arena-format-row" id="arena-formats">
            <button class="arena-format-btn active" data-format="standard">
              <span class="fmt-name">STANDARD</span>
              <span class="fmt-desc">3 rounds · 2 min each</span>
            </button>
            <button class="arena-format-btn" data-format="crossfire">
              <span class="fmt-name">CROSSFIRE</span>
              <span class="fmt-desc">Open floor · 5 min</span>
            </button>
            <button class="arena-format-btn" data-format="blitz">
              <span class="fmt-name">BLITZ</span>
              <span class="fmt-desc">1 round · 60 sec</span>
            </button>
          </div>
        </div>

        <!-- Challenge a Friend -->
        <div class="arena-section">
          <button class="arena-challenge-btn" id="arena-challenge-friend">📨 CHALLENGE A FRIEND</button>
        </div>

        <!-- Open Lobbies -->
        <div class="arena-section">
          <div class="arena-section-title">🔓 OPEN LOBBIES</div>
          <div id="arena-open-lobbies" class="arena-lobbies-list">
            <div class="arena-lobby-empty">No open lobbies right now. Start one above!</div>
          </div>
        </div>
      </div>
    `;
  }

  function wireLobby() {
    let selectedCat = 'random';
    let selectedFormat = 'standard';

    // Topic buttons
    document.querySelectorAll('.arena-topic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.arena-topic-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCat = btn.dataset.cat;
        startMatchmaking(selectedCat, null, selectedFormat);
      });
    });

    // Format buttons
    document.querySelectorAll('.arena-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.arena-format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.dataset.format;
      });
    });

    // Custom topic
    const customBtn = document.getElementById('arena-custom-go-btn');
    const customInput = document.getElementById('arena-custom-topic');
    if (customBtn && customInput) {
      customBtn.addEventListener('click', () => {
        const topic = customInput.value.trim();
        if (topic.length < 5) return;
        startMatchmaking('general', topic, selectedFormat);
      });
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') customBtn.click();
      });
    }

    // Challenge friend
    const challengeBtn = document.getElementById('arena-challenge-friend');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', () => {
        if (typeof ColosseumShare !== 'undefined') {
          ColosseumShare.challengeFriend({});
        }
      });
    }
  }


  // ========================
  // MATCHMAKING
  // ========================

  function startMatchmaking(category, customTopic, format) {
    showView('matchmaking');

    // PLACEHOLDER: In production, this creates a debate via ColosseumScoring.createDebate()
    // and subscribes to Supabase Realtime for when an opponent joins.
    // For now, simulate a 3-second search then show pre-debate.

    setTimeout(() => {
      debateData = {
        id: 'placeholder-' + Date.now(),
        topic: customTopic || getRandomTopic(category),
        category: category,
        format: format,
        debater_a: { name: 'YOU', elo: 1200 },
        debater_b: { name: 'OPPONENT', elo: 1185 },
        role: 'a'
      };
      showView('pre-debate', debateData);
    }, 3000);
  }

  function renderMatchmaking() {
    return `
      <div class="arena-matchmaking">
        <div class="arena-mm-spinner"></div>
        <h2 class="arena-mm-title">FINDING YOUR MATCH</h2>
        <p class="arena-mm-sub">Matching by topic and skill level...</p>
        <div class="arena-mm-wait">
          <span class="arena-mm-wait-label">Estimated wait:</span>
          <span class="arena-mm-wait-time" id="mm-est-time">~30s</span>
        </div>
        <div class="arena-mm-elapsed" id="mm-elapsed">0:00</div>
        <div class="arena-mm-dots">
          <span class="mm-dot"></span><span class="mm-dot"></span><span class="mm-dot"></span>
        </div>
        <p class="arena-mm-tip" id="mm-tip" style="font-size:12px;color:var(--white-dim);margin-top:12px;">💡 Tip: Try posting a Hot Take to attract challengers</p>
        <button class="arena-mm-cancel" onclick="ColosseumArena.cancelMatchmaking()">CANCEL</button>
      </div>
    `;
  }

  let mmTimer = null;
  function startMatchmakingTimer() {
    let elapsed = 0;
    const tips = [
      '💡 Tip: Try posting a Hot Take to attract challengers',
      '💡 Voice memos work when nobody\'s online — try one!',
      '💡 Challenge someone from the leaderboard',
      '💡 Sharpen your arguments while you wait',
    ];
    mmTimer = setInterval(() => {
      elapsed++;
      const el = document.getElementById('mm-elapsed');
      if (el) el.textContent = `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
      // Update tip every 15 seconds
      if (elapsed % 15 === 0) {
        const tip = document.getElementById('mm-tip');
        if (tip) tip.textContent = tips[Math.floor(elapsed/15) % tips.length];
      }
      // After 60s, suggest async mode
      if (elapsed === 60) {
        const tip = document.getElementById('mm-tip');
        if (tip) tip.innerHTML = '⏳ Long wait? <a href="#" onclick="ColosseumArena.showView(\'lobby\');return false;" style="color:var(--gold);">Try async debate instead</a>';
      }
    }, 1000);
  }

  function cancelMatchmaking() {
    if (mmTimer) { clearInterval(mmTimer); mmTimer = null; }
    showView('lobby');
  }

  function submitSurvey(answer) {
    const survey = document.getElementById('arena-survey');
    if (survey) {
      survey.innerHTML = `<div style="color:var(--gold);font-size:13px;font-weight:600;">Thanks! Your feedback shapes the platform. 🙏</div>`;
    }
    // Log to Supabase when connected
    if (typeof ColosseumScoring !== 'undefined' && debateData?.id) {
      // Future: ColosseumScoring.submitSurvey(debateData.id, answer);
      console.log('[Survey]', debateData.id, answer);
    }
    // Trigger share prompt (Item 14.5.3.6)
    setTimeout(() => {
      if (typeof ColosseumShare !== 'undefined' && ColosseumShare.showPostDebatePrompt && debateData) {
        ColosseumShare.showPostDebatePrompt(debateData);
      }
    }, 1500);
  }


  // ========================
  // PRE-DEBATE
  // ========================

  function renderPreDebate(data) {
    return `
      <div class="arena-pre">
        <div class="arena-pre-badge">MATCH FOUND</div>
        <div class="arena-pre-matchup">
          <div class="arena-pre-debater">
            <div class="arena-pre-avatar you">🔵</div>
            <div class="arena-pre-name">${data.debater_a.name}</div>
            <div class="arena-pre-elo">${data.debater_a.elo} ELO</div>
          </div>
          <div class="arena-pre-vs">VS</div>
          <div class="arena-pre-debater">
            <div class="arena-pre-avatar opp">🔴</div>
            <div class="arena-pre-name">${data.debater_b.name}</div>
            <div class="arena-pre-elo">${data.debater_b.elo} ELO</div>
          </div>
        </div>
        <div class="arena-pre-topic">"${data.topic}"</div>
        <div class="arena-pre-format">${data.format.toUpperCase()} FORMAT</div>
        <div class="arena-pre-countdown" id="arena-countdown">5</div>
        <p class="arena-pre-hint">Prepare your opening argument...</p>
      </div>
    `;
  }

  function wirePreDebate() {
    let count = 5;
    const el = document.getElementById('arena-countdown');
    const interval = setInterval(() => {
      count--;
      if (el) el.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        showView('live', debateData);
      }
    }, 1000);
  }


  // ========================
  // LIVE DEBATE
  // ========================

  function renderLive(data) {
    votesCast = false;
    return `
      <div class="arena-live">
        <!-- Top Bar -->
        <div class="arena-live-top">
          <div class="arena-live-round" id="arena-round-label">ROUND 1 / 3</div>
          <div class="arena-live-timer" id="arena-timer">2:00</div>
          <div class="arena-live-status" id="arena-status-badge">
            <span class="home-live-dot"></span> LIVE
          </div>
        </div>

        <!-- Topic -->
        <div class="arena-live-topic">"${data.topic}"</div>

        <!-- Debaters -->
        <div class="arena-live-debaters">
          <div class="arena-live-debater" id="arena-debater-a">
            <div class="arena-live-avatar ${data.role === 'a' ? 'you' : ''}">
              ${data.role === 'a' ? '🔵' : '🔴'}
            </div>
            <div class="arena-live-name">${data.debater_a.name}</div>
            <div class="arena-live-elo">${data.debater_a.elo}</div>
            <canvas class="arena-waveform" id="waveform-a" width="120" height="40"></canvas>
            <div class="arena-speaking-indicator" id="speaking-a">SPEAKING</div>
          </div>

          <div class="arena-live-vs-center">
            <span class="arena-live-vs">VS</span>
          </div>

          <div class="arena-live-debater" id="arena-debater-b">
            <div class="arena-live-avatar ${data.role === 'b' ? 'you' : ''}">
              ${data.role === 'b' ? '🔵' : '🔴'}
            </div>
            <div class="arena-live-name">${data.debater_b.name}</div>
            <div class="arena-live-elo">${data.debater_b.elo}</div>
            <canvas class="arena-waveform" id="waveform-b" width="120" height="40"></canvas>
            <div class="arena-speaking-indicator" id="speaking-b"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="arena-controls">
          <button class="arena-ctrl-btn" id="arena-mute-btn" title="Mute">🎙️</button>
          <button class="arena-ctrl-btn danger" id="arena-leave-btn" title="Leave">✖</button>
        </div>

        <!-- Spectator Vote Bar -->
        <div class="arena-vote-bar">
          <div class="arena-vote-side" id="arena-vote-a" style="width:50%">
            <span>${data.debater_a.name}</span>
          </div>
          <div class="arena-vote-side opp" id="arena-vote-b" style="width:50%">
            <span>${data.debater_b.name}</span>
          </div>
        </div>
        <div class="arena-vote-count" id="arena-vote-count">0 votes</div>

        <!-- Spectator Chat Placeholder -->
        <div class="arena-chat-bar" id="arena-chat-bar">
          <input type="text" class="arena-chat-input" placeholder="Say something..." maxlength="200">
          <button class="arena-chat-send">↑</button>
        </div>
      </div>
    `;
  }

  function wireLive() {
    // Simulate round timer (placeholder)
    let timeLeft = 120;
    let round = 1;
    const timerEl = document.getElementById('arena-timer');
    const roundEl = document.getElementById('arena-round-label');

    const interval = setInterval(() => {
      timeLeft--;
      if (timerEl) {
        const m = Math.floor(timeLeft / 60);
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
      // Pulse timer red when low
      if (timeLeft <= 10 && timerEl) timerEl.classList.add('danger');

      if (timeLeft <= 0) {
        round++;
        if (round > 3) {
          clearInterval(interval);
          showView('voting', debateData);
        } else {
          // Next round
          timeLeft = 120;
          if (roundEl) roundEl.textContent = `ROUND ${round} / 3`;
          if (timerEl) timerEl.classList.remove('danger');
        }
      }
    }, 1000);

    // Mute button
    const muteBtn = document.getElementById('arena-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (typeof ColosseumWebRTC !== 'undefined') {
          const muted = ColosseumWebRTC.toggleMute();
          muteBtn.textContent = muted ? '🔇' : '🎙️';
          muteBtn.classList.toggle('muted', muted);
        }
      });
    }

    // Leave button
    const leaveBtn = document.getElementById('arena-leave-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        if (confirm('Leave this debate? This counts as a forfeit.')) {
          if (typeof ColosseumWebRTC !== 'undefined') ColosseumWebRTC.leaveDebate();
          clearInterval(interval);
          showView('lobby');
        }
      });
    }

    // Wire into real WebRTC events if available
    if (typeof ColosseumWebRTC !== 'undefined') {
      ColosseumWebRTC.on('tick', ({ timeLeft: t, round: r }) => {
        if (timerEl) {
          const m = Math.floor(t / 60);
          const s = (t % 60).toString().padStart(2, '0');
          timerEl.textContent = `${m}:${s}`;
        }
        if (roundEl) roundEl.textContent = `ROUND ${r} / 3`;
      });

      ColosseumWebRTC.on('debateEnd', () => {
        clearInterval(interval);
        showView('voting', debateData);
      });
    }
  }


  // ========================
  // SPECTATING (Item 14.3.7)
  // ========================

  function spectate(debateInfo) {
    // Navigate to arena screen first
    if (typeof navigateTo === 'function') navigateTo('arena');

    debateData = {
      id: debateInfo?.id || 'placeholder-spectate',
      topic: debateInfo?.topic || 'Unknown Topic',
      debater_a: { name: debateInfo?.debater1 || 'DEBATER A', elo: debateInfo?.elo1 || 1200 },
      debater_b: { name: debateInfo?.debater2 || 'DEBATER B', elo: debateInfo?.elo2 || 1200 },
      spectators: debateInfo?.spectators || 0,
      round: debateInfo?.round || 1,
      totalRounds: debateInfo?.totalRounds || 5,
      timeLeft: debateInfo?.timeLeft || '2:00',
    };
    showView('spectating', debateData);
  }

  function renderSpectating(data) {
    return `
      <div class="arena-spectating">
        <div class="arena-live-top">
          <div class="arena-live-round" id="spec-round-label">ROUND ${data.round || 1} / ${data.totalRounds || 5}</div>
          <div class="arena-live-timer" id="spec-timer">${data.timeLeft || '2:00'}</div>
          <div class="arena-live-status">
            <span class="home-live-dot"></span> LIVE · 👁 <span id="spec-viewers">${data.spectators || 1}</span>
          </div>
        </div>

        <div class="arena-live-topic">"${data.topic}"</div>

        <div class="arena-live-debaters">
          <div class="arena-live-debater">
            <div class="arena-live-avatar">🔵</div>
            <div class="arena-live-name">${data.debater_a.name}</div>
            <div class="arena-live-elo">${data.debater_a.elo}</div>
            <canvas class="arena-waveform" id="spec-waveform-a" width="120" height="40"></canvas>
          </div>
          <div class="arena-live-vs-center"><span class="arena-live-vs">VS</span></div>
          <div class="arena-live-debater">
            <div class="arena-live-avatar">🔴</div>
            <div class="arena-live-name">${data.debater_b.name}</div>
            <div class="arena-live-elo">${data.debater_b.elo}</div>
            <canvas class="arena-waveform" id="spec-waveform-b" width="120" height="40"></canvas>
          </div>
        </div>

        <!-- Spectator Vote (live tally) -->
        <div class="arena-vote-bar">
          <div class="arena-vote-side" id="spec-vote-a" style="width:50%">
            <span>${data.debater_a.name}</span>
          </div>
          <div class="arena-vote-side opp" id="spec-vote-b" style="width:50%">
            <span>${data.debater_b.name}</span>
          </div>
        </div>
        <div class="arena-vote-count" id="spec-vote-count">0 votes</div>

        <!-- Reactions -->
        <div class="spec-reactions">
          <button class="spec-react-btn" onclick="ColosseumArena._specReact('🔥')">🔥</button>
          <button class="spec-react-btn" onclick="ColosseumArena._specReact('👏')">👏</button>
          <button class="spec-react-btn" onclick="ColosseumArena._specReact('💀')">💀</button>
          <button class="spec-react-btn" onclick="ColosseumArena._specReact('🧠')">🧠</button>
          <button class="spec-react-btn" onclick="ColosseumArena._specReact('❌')">❌</button>
        </div>

        <!-- Chat -->
        <div class="arena-chat-bar">
          <input type="text" class="arena-chat-input" id="spec-chat-input" placeholder="Say something..." maxlength="200">
          <button class="arena-chat-send" onclick="ColosseumArena._specChat()">↑</button>
        </div>

        <button class="spec-leave-btn" onclick="ColosseumArena.showView('lobby')">← Leave</button>
      </div>
    `;
  }

  function wireSpectating() {
    // Simulate live timer for placeholder
    const timerStr = debateData?.timeLeft || '2:00';
    const parts = timerStr.split(':');
    let timeLeft = parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
    let round = debateData?.round || 1;

    const interval = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('spec-timer');
      if (timerEl) {
        const m = Math.floor(timeLeft / 60);
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
      if (timeLeft <= 10) {
        const t = document.getElementById('spec-timer');
        if (t) t.classList.add('danger');
      }
      if (timeLeft <= 0) {
        round++;
        if (round > (debateData?.totalRounds || 5)) {
          clearInterval(interval);
          showView('voting', debateData);
        } else {
          timeLeft = 120;
          const r = document.getElementById('spec-round-label');
          if (r) r.textContent = `ROUND ${round} / ${debateData?.totalRounds || 5}`;
          const t = document.getElementById('spec-timer');
          if (t) t.classList.remove('danger');
        }
      }
    }, 1000);
  }

  function _specReact(emoji) {
    // Float the emoji up from center
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `position:fixed;bottom:150px;left:${40 + Math.random()*20}%;font-size:28px;z-index:9999;pointer-events:none;animation:specFloat 1.5s ease forwards;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function _specChat() {
    const input = document.getElementById('spec-chat-input');
    if (!input || !input.value.trim()) return;
    // Placeholder: toast the message
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:var(--navy-light);color:var(--white);padding:8px 16px;border-radius:16px;font-size:13px;z-index:9998;border:1px solid rgba(255,255,255,0.1);max-width:80vw;';
    toast.textContent = input.value.trim();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    input.value = '';
  }


  // ========================
  // VOTING
  // ========================

  function renderVoting(data) {
    return `
      <div class="arena-voting">
        <div class="arena-voting-badge">⏱ VOTING PHASE</div>
        <div class="arena-voting-topic">"${data.topic}"</div>

        <div class="arena-voting-matchup">
          <button class="arena-vote-btn" id="vote-for-a" ${votesCast ? 'disabled' : ''}>
            <div class="arena-vote-avatar">🔵</div>
            <div class="arena-vote-name">${data.debater_a.name}</div>
            <div class="arena-vote-elo">${data.debater_a.elo}</div>
          </button>

          <div class="arena-voting-or">WHO WON?</div>

          <button class="arena-vote-btn" id="vote-for-b" ${votesCast ? 'disabled' : ''}>
            <div class="arena-vote-avatar">🔴</div>
            <div class="arena-vote-name">${data.debater_b.name}</div>
            <div class="arena-vote-elo">${data.debater_b.elo}</div>
          </button>
        </div>

        <div class="arena-voting-tally" id="arena-voting-tally">
          Cast your vote — results appear after voting closes
        </div>

        <div class="arena-voting-timer" id="arena-voting-timer">Voting closes in 30s</div>
      </div>
    `;
  }

  function wireVoting() {
    let votingTime = 30;
    const timerEl = document.getElementById('arena-voting-timer');

    const interval = setInterval(() => {
      votingTime--;
      if (timerEl) timerEl.textContent = `Voting closes in ${votingTime}s`;
      if (votingTime <= 0) {
        clearInterval(interval);
        // Show results
        showView('results', {
          ...debateData,
          votes_a: 7,
          votes_b: 4,
          winner: 'a',
          elo_change_a: 16,
          elo_change_b: -16,
          new_elo_a: 1216,
          new_elo_b: 1169
        });
      }
    }, 1000);

    // Vote buttons
    const voteA = document.getElementById('vote-for-a');
    const voteB = document.getElementById('vote-for-b');

    if (voteA) voteA.addEventListener('click', () => castVote('a'));
    if (voteB) voteB.addEventListener('click', () => castVote('b'));
  }

  function castVote(side) {
    if (votesCast) return;
    votesCast = true;

    document.querySelectorAll('.arena-vote-btn').forEach(b => b.disabled = true);
    const chosen = document.getElementById('vote-for-' + side);
    if (chosen) chosen.classList.add('chosen');

    const tally = document.getElementById('arena-voting-tally');
    if (tally) tally.textContent = '✅ Vote cast! Waiting for results...';

    // Call server
    if (typeof ColosseumScoring !== 'undefined' && debateData) {
      ColosseumScoring.castVote(debateData.id, side).catch(e => console.error(e));
    }
  }


  // ========================
  // RESULTS
  // ========================

  function renderResults(data) {
    const isWinnerA = data.winner === 'a';
    return `
      <div class="arena-results">
        <div class="arena-results-badge ${isWinnerA ? '' : 'loss'}">
          ${data.winner === 'draw' ? '🤝 DRAW' : '🏆 WINNER'}
        </div>

        <div class="arena-results-matchup">
          <div class="arena-results-debater ${isWinnerA ? 'winner' : ''}">
            <div class="arena-results-avatar">🔵</div>
            <div class="arena-results-name">${data.debater_a.name}</div>
            <div class="arena-results-votes">${data.votes_a} votes</div>
            <div class="arena-results-elo ${data.elo_change_a >= 0 ? 'up' : 'down'}">
              ${data.elo_change_a >= 0 ? '+' : ''}${data.elo_change_a} ELO → ${data.new_elo_a}
            </div>
          </div>

          <div class="arena-results-vs">VS</div>

          <div class="arena-results-debater ${!isWinnerA && data.winner !== 'draw' ? 'winner' : ''}">
            <div class="arena-results-avatar">🔴</div>
            <div class="arena-results-name">${data.debater_b.name}</div>
            <div class="arena-results-votes">${data.votes_b} votes</div>
            <div class="arena-results-elo ${data.elo_change_b >= 0 ? 'up' : 'down'}">
              ${data.elo_change_b >= 0 ? '+' : ''}${data.elo_change_b} ELO → ${data.new_elo_b}
            </div>
          </div>
        </div>

        <div class="arena-results-actions">
          <div class="arena-results-survey" id="arena-survey">
            <div style="font-family:var(--font-display);font-size:14px;letter-spacing:1.5px;margin-bottom:8px;">DID THIS CHANGE YOUR MIND?</div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="arena-survey-btn" data-answer="yes" onclick="ColosseumArena.submitSurvey('yes')">✅ Yes</button>
              <button class="arena-survey-btn" data-answer="no" onclick="ColosseumArena.submitSurvey('no')">❌ No</button>
              <button class="arena-survey-btn" data-answer="kinda" onclick="ColosseumArena.submitSurvey('kinda')">🤔 Kinda</button>
            </div>
          </div>
          <button class="arena-results-btn primary" id="arena-rematch-btn">🔄 REMATCH</button>
          <button class="arena-results-btn" id="arena-share-btn">🔗 SHARE RESULT</button>
          <button class="arena-results-btn" id="arena-lobby-btn">← BACK TO LOBBY</button>
        </div>
      </div>
    `;
  }

  function wireResults() {
    document.getElementById('arena-rematch-btn')?.addEventListener('click', () => {
      showView('matchmaking');
      setTimeout(() => showView('pre-debate', debateData), 2000);
    });

    document.getElementById('arena-share-btn')?.addEventListener('click', () => {
      if (typeof ColosseumShare !== 'undefined' && debateData) {
        ColosseumShare.shareDebateResult({
          debateId: debateData.id,
          topic: debateData.topic,
          winner: debateData.debater_a.name,
          loser: debateData.debater_b.name,
          score: `${debateData?.votes_a || 0}-${debateData?.votes_b || 0}`
        });
      }
    });

    document.getElementById('arena-lobby-btn')?.addEventListener('click', () => {
      showView('lobby');
    });
  }


  // ========================
  // HELPERS
  // ========================

  function getRandomTopic(category) {
    const topics = {
      politics: [
        'Should the voting age be lowered to 16?',
        'Is universal healthcare a right or a privilege?',
        'Term limits: would they fix Congress?',
        'Should the Electoral College be abolished?',
      ],
      sports: [
        'Is LeBron the GOAT?',
        'Will Wembanyama surpass Giannis?',
        'Are analytics ruining sports?',
        'Should college athletes be paid more?',
      ],
      entertainment: [
        'Is Marvel dead?',
        'Are streaming services killing cinema?',
        'Is AI-generated music real music?',
        'Has social media ruined comedy?',
      ],
      random: [
        'Is college still worth it in 2026?',
        'Should AI be regulated like nuclear energy?',
        'Is remote work better for society?',
        'Are conspiracy theories ever useful?',
      ]
    };
    const pool = topics[category] || topics.random;
    return pool[Math.floor(Math.random() * pool.length)];
  }


  // ========================
  // STYLES
  // ========================

  function getStyles() {
    return `
      /* === MOBILE-FIRST ARENA CSS === */
      /* Base = phone (320px+), min-width breakpoints for larger */

      /* === LOBBY === */
      .arena-lobby { padding-bottom: 16px; }
      .arena-hero { text-align: center; padding: 20px 0 16px; }
      .arena-hero-icon { font-size: 40px; margin-bottom: 6px; }
      .arena-hero-title { font-family: var(--font-display); font-size: 24px; letter-spacing: 2px; }
      .arena-hero-sub { color: var(--white-dim); font-size: 13px; margin-top: 4px; }
      @media (min-width: 768px) {
        .arena-hero-icon { font-size: 48px; }
        .arena-hero-title { font-size: 28px; letter-spacing: 3px; }
      }

      .arena-section { margin-bottom: 16px; }
      .arena-section-title {
        font-family: var(--font-display);
        font-size: 13px;
        letter-spacing: 1.5px;
        color: var(--white-dim);
        margin-bottom: 8px;
      }
      @media (min-width: 768px) { .arena-section-title { font-size: 15px; letter-spacing: 2px; } }

      .arena-topic-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      /* 44px min touch target */
      .arena-topic-btn {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 14px 10px;
        min-height: 80px;
        cursor: pointer;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        color: var(--white);
        -webkit-tap-highlight-color: transparent;
      }
      .arena-topic-btn:active { border-color: rgba(212,168,67,0.3); }
      .arena-topic-btn.selected { border-color: var(--gold); background: rgba(212,168,67,0.08); }
      .arena-topic-btn.surprise { border-color: rgba(204,41,54,0.3); }
      @media (hover: hover) { .arena-topic-btn:hover { border-color: rgba(212,168,67,0.3); } }
      .arena-topic-icon { font-size: 26px; }
      .arena-topic-name { font-family: var(--font-display); font-size: 12px; letter-spacing: 1.5px; }
      @media (min-width: 768px) {
        .arena-topic-btn { padding: 16px 12px; }
        .arena-topic-icon { font-size: 28px; }
        .arena-topic-name { font-size: 14px; letter-spacing: 2px; }
      }

      .arena-custom-row { display: flex; gap: 8px; }
      .arena-custom-input {
        flex: 1;
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 0 12px;
        min-height: 44px;
        color: var(--white);
        font-size: 14px;
        font-family: var(--font-body);
      }
      .arena-custom-input::placeholder { color: var(--white-dim); }
      .arena-custom-input:focus { outline: none; border-color: var(--gold); }
      .arena-custom-go {
        background: var(--red);
        color: #fff;
        border: none;
        padding: 0 18px;
        min-height: 44px;
        border-radius: 8px;
        font-family: var(--font-display);
        font-size: 15px;
        letter-spacing: 2px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-custom-go:active { background: var(--red-hover); }
      @media (hover: hover) { .arena-custom-go:hover { background: var(--red-hover); } }

      .arena-format-row {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .arena-format-row::-webkit-scrollbar { display: none; }
      .arena-format-btn {
        flex: 1;
        min-width: 90px;
        min-height: 60px;
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 10px 8px;
        cursor: pointer;
        text-align: center;
        color: var(--white);
        scroll-snap-align: start;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-format-btn:active { border-color: rgba(212,168,67,0.2); }
      .arena-format-btn.active { border-color: var(--gold); background: rgba(212,168,67,0.08); }
      @media (hover: hover) { .arena-format-btn:hover { border-color: rgba(212,168,67,0.2); } }
      .fmt-name { display: block; font-family: var(--font-display); font-size: 13px; letter-spacing: 1px; }
      .fmt-desc { display: block; font-size: 10px; color: var(--white-dim); margin-top: 2px; }
      @media (min-width: 768px) {
        .arena-format-btn { min-width: 100px; padding: 12px 10px; }
        .fmt-name { font-size: 14px; }
        .fmt-desc { font-size: 11px; }
      }

      .arena-challenge-btn {
        width: 100%;
        min-height: 48px;
        background: rgba(212,168,67,0.1);
        border: 1px solid rgba(212,168,67,0.25);
        color: var(--gold);
        padding: 0 14px;
        border-radius: 10px;
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 2px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-challenge-btn:active { background: rgba(212,168,67,0.18); }
      @media (hover: hover) { .arena-challenge-btn:hover { background: rgba(212,168,67,0.18); } }

      .arena-lobbies-list { margin-top: 8px; }
      .arena-lobby-empty {
        text-align: center;
        padding: 16px;
        color: var(--white-dim);
        font-size: 12px;
        background: var(--navy-light);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.04);
      }

      /* === MATCHMAKING === */
      .arena-matchmaking {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 55vh;
        text-align: center;
        gap: 14px;
      }
      .arena-mm-spinner {
        width: 44px; height: 44px;
        border: 3px solid var(--navy-mid);
        border-top-color: var(--red);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .arena-mm-title { font-family: var(--font-display); font-size: 20px; letter-spacing: 2px; }
      @media (min-width: 768px) { .arena-mm-title { font-size: 22px; letter-spacing: 3px; } }
      .arena-mm-sub { color: var(--white-dim); font-size: 13px; }
      .arena-mm-dots { display: flex; gap: 8px; }
      .mm-dot {
        width: 8px; height: 8px;
        background: var(--gold);
        border-radius: 50%;
        animation: mmPulse 1.2s ease infinite;
      }
      .mm-dot:nth-child(2) { animation-delay: 0.2s; }
      .mm-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes mmPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      .arena-mm-cancel {
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.1);
        color: var(--white-dim);
        padding: 0 20px;
        min-height: 44px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-mm-cancel:active { color: var(--white); border-color: rgba(255,255,255,0.2); }
      .arena-mm-wait {
        display: flex; align-items: center; gap: 6px;
        font-size: 13px; color: var(--white-dim);
      }
      .arena-mm-wait-time { color: var(--gold); font-weight: 600; }
      .arena-mm-elapsed {
        font-family: var(--font-display); font-size: 28px;
        color: var(--white); letter-spacing: 2px;
      }

      /* === PRE-DEBATE === */
      .arena-pre {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 55vh;
        text-align: center;
        gap: 14px;
        animation: fadeIn 0.4s ease;
      }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      .arena-pre-badge {
        background: var(--gold);
        color: var(--navy);
        font-family: var(--font-display);
        font-size: 13px;
        letter-spacing: 2px;
        padding: 4px 14px;
        border-radius: 4px;
        font-weight: 700;
      }
      .arena-pre-matchup { display: flex; align-items: center; gap: 20px; margin: 6px 0; }
      .arena-pre-debater { text-align: center; }
      .arena-pre-avatar {
        width: 56px; height: 56px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px;
        margin: 0 auto 6px;
      }
      .arena-pre-avatar.you { background: rgba(212,168,67,0.15); border: 2px solid var(--gold); }
      .arena-pre-avatar.opp { background: rgba(204,41,54,0.15); border: 2px solid var(--red); }
      @media (min-width: 768px) { .arena-pre-avatar { width: 60px; height: 60px; font-size: 28px; } }
      .arena-pre-name { font-family: var(--font-display); font-size: 16px; letter-spacing: 1px; }
      .arena-pre-elo { font-size: 11px; color: var(--gold); }
      .arena-pre-vs { font-family: var(--font-display); font-size: 22px; color: var(--red); letter-spacing: 3px; }
      .arena-pre-topic { font-size: 14px; color: var(--white-dim); max-width: 280px; }
      .arena-pre-format { font-family: var(--font-display); font-size: 11px; letter-spacing: 2px; color: var(--white-dim); }
      .arena-pre-countdown {
        font-family: var(--font-display);
        font-size: 56px;
        color: var(--gold);
        animation: countPulse 1s ease infinite;
      }
      @keyframes countPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      .arena-pre-hint { font-size: 12px; color: var(--white-dim); }

      /* === LIVE === */
      .arena-live { position: relative; }
      .arena-live-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        margin-bottom: 6px;
      }
      .arena-live-round { font-family: var(--font-display); font-size: 12px; letter-spacing: 1.5px; color: var(--white-dim); }
      .arena-live-timer {
        font-family: var(--font-display);
        font-size: 28px;
        letter-spacing: 2px;
        color: var(--white);
        transition: color 0.3s;
      }
      .arena-live-timer.danger { color: var(--red); animation: timerPulse 0.5s infinite; }
      @keyframes timerPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      @media (min-width: 768px) { .arena-live-timer { font-size: 32px; } }
      .arena-live-status {
        display: flex; align-items: center; gap: 4px;
        background: var(--red);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .home-live-dot {
        width: 5px; height: 5px;
        background: #fff; border-radius: 50%;
        animation: homePulse 1.5s infinite;
      }
      @keyframes homePulse { 0%,100%{opacity:1}50%{opacity:0.3} }

      .arena-live-topic {
        text-align: center;
        font-size: 13px;
        color: var(--white-dim);
        margin-bottom: 12px;
        padding: 6px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
      }

      .arena-live-debaters {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 14px;
      }
      .arena-live-debater { flex: 1; text-align: center; }
      .arena-live-avatar {
        width: 48px; height: 48px;
        border-radius: 50%;
        background: var(--navy-light);
        border: 2px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        margin: 0 auto 4px;
      }
      .arena-live-avatar.you { border-color: var(--gold); }
      @media (min-width: 768px) { .arena-live-avatar { width: 56px; height: 56px; font-size: 24px; } }
      .arena-live-name { font-family: var(--font-display); font-size: 13px; letter-spacing: 1px; }
      @media (min-width: 768px) { .arena-live-name { font-size: 15px; } }
      .arena-live-elo { font-size: 10px; color: var(--gold); }
      .arena-waveform { display: block; margin: 4px auto 0; border-radius: 4px; }
      .arena-speaking-indicator { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--gold); height: 12px; margin-top: 2px; }
      .arena-live-vs-center { flex-shrink: 0; }
      .arena-live-vs { font-family: var(--font-display); font-size: 14px; color: var(--red); letter-spacing: 2px; }

      .arena-controls {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 14px;
      }
      /* 48px touch targets for critical audio controls */
      .arena-ctrl-btn {
        width: 48px; height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.1);
        background: var(--navy-light);
        color: var(--white);
        font-size: 20px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-ctrl-btn:active { background: var(--navy-mid); }
      .arena-ctrl-btn.danger { border-color: rgba(204,41,54,0.3); }
      .arena-ctrl-btn.danger:active { background: rgba(204,41,54,0.15); }
      .arena-ctrl-btn.muted { background: rgba(204,41,54,0.2); border-color: var(--red); }
      @media (hover: hover) {
        .arena-ctrl-btn:hover { background: var(--navy-mid); }
        .arena-ctrl-btn.danger:hover { background: rgba(204,41,54,0.15); }
      }

      .arena-vote-bar {
        display: flex;
        height: 22px;
        border-radius: 11px;
        overflow: hidden;
        background: var(--navy-light);
        margin-bottom: 4px;
      }
      .arena-vote-side {
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
        background: rgba(212,168,67,0.3);
        transition: width 0.5s ease;
      }
      .arena-vote-side.opp { background: rgba(204,41,54,0.3); }
      .arena-vote-count { text-align: center; font-size: 10px; color: var(--white-dim); margin-bottom: 10px; }

      .arena-chat-bar { display: flex; gap: 8px; }
      .arena-chat-input {
        flex: 1;
        background: var(--navy-light);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 0 14px;
        min-height: 40px;
        color: var(--white);
        font-size: 13px;
        font-family: var(--font-body);
      }
      .arena-chat-input::placeholder { color: var(--white-dim); }
      .arena-chat-input:focus { outline: none; border-color: rgba(212,168,67,0.2); }
      .arena-chat-send {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: var(--gold);
        color: var(--navy);
        border: none;
        font-size: 16px; font-weight: 700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-chat-send:active { background: var(--gold-dim); }

      /* === VOTING === */
      .arena-voting {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        text-align: center;
        gap: 14px;
      }
      .arena-voting-badge { font-family: var(--font-display); font-size: 14px; letter-spacing: 2px; color: var(--gold); }
      @media (min-width: 768px) { .arena-voting-badge { font-size: 16px; letter-spacing: 3px; } }
      .arena-voting-topic { font-size: 13px; color: var(--white-dim); }
      .arena-voting-matchup { display: flex; align-items: center; gap: 12px; }

      /* Big vote buttons — 44px+ targets */
      .arena-vote-btn {
        background: var(--navy-light);
        border: 2px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 110px;
        min-height: 100px;
        cursor: pointer;
        text-align: center;
        color: var(--white);
        -webkit-tap-highlight-color: transparent;
      }
      .arena-vote-btn:active:not(:disabled) { border-color: var(--gold); }
      .arena-vote-btn.chosen { border-color: var(--gold); background: rgba(212,168,67,0.1); }
      .arena-vote-btn:disabled { opacity: 0.6; cursor: default; }
      @media (hover: hover) { .arena-vote-btn:hover:not(:disabled) { border-color: var(--gold); } }
      .arena-vote-avatar { font-size: 28px; margin-bottom: 6px; }
      .arena-vote-name { font-family: var(--font-display); font-size: 14px; letter-spacing: 1px; }
      .arena-vote-elo { font-size: 10px; color: var(--gold); }
      .arena-voting-or { font-family: var(--font-display); font-size: 12px; color: var(--red); letter-spacing: 2px; }
      .arena-voting-tally { font-size: 12px; color: var(--white-dim); }
      .arena-voting-timer { font-size: 11px; color: var(--gold); }

      /* === RESULTS === */
      .arena-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        text-align: center;
        gap: 14px;
        animation: fadeIn 0.5s ease;
      }
      .arena-results-badge { font-family: var(--font-display); font-size: 18px; letter-spacing: 2px; color: var(--gold); }
      @media (min-width: 768px) { .arena-results-badge { font-size: 20px; letter-spacing: 3px; } }
      .arena-results-badge.loss { color: var(--white-dim); }

      .arena-results-matchup { display: flex; align-items: flex-start; gap: 16px; }
      .arena-results-debater { text-align: center; min-width: 100px; }
      .arena-results-debater.winner {
        border: 2px solid var(--gold);
        border-radius: 12px;
        padding: 10px;
        background: rgba(212,168,67,0.06);
      }
      .arena-results-avatar { font-size: 32px; margin-bottom: 4px; }
      .arena-results-name { font-family: var(--font-display); font-size: 14px; letter-spacing: 1px; }
      @media (min-width: 768px) { .arena-results-name { font-size: 16px; } }
      .arena-results-votes { font-size: 12px; color: var(--white-dim); margin: 3px 0; }
      .arena-results-elo { font-size: 11px; font-weight: 600; }
      .arena-results-elo.up { color: var(--success); }
      .arena-results-elo.down { color: var(--red); }
      .arena-results-vs { font-family: var(--font-display); font-size: 14px; color: var(--red); letter-spacing: 2px; margin-top: 36px; }

      .arena-results-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-width: 260px;
      }
      /* 44px touch targets */
      .arena-results-btn {
        width: 100%;
        min-height: 44px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        background: var(--navy-light);
        color: var(--white);
        font-family: var(--font-display);
        font-size: 13px;
        letter-spacing: 2px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-results-btn:active { border-color: rgba(212,168,67,0.2); }
      @media (hover: hover) { .arena-results-btn:hover { border-color: rgba(212,168,67,0.2); } }
      .arena-results-btn.primary { background: var(--red); border-color: var(--red); }
      .arena-results-btn.primary:active { background: var(--red-hover); }
      @media (hover: hover) { .arena-results-btn.primary:hover { background: var(--red-hover); } }
      .arena-results-survey {
        width: 100%;
        background: var(--navy-light);
        border: 1px solid rgba(212,168,67,0.15);
        border-radius: 10px;
        padding: 14px;
        text-align: center;
      }
      .arena-survey-btn {
        min-height: 40px; padding: 0 16px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.15);
        background: var(--navy-mid);
        color: var(--white);
        font-size: 14px; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .arena-survey-btn:active { border-color: var(--gold-dim); background: rgba(212,168,67,0.1); }

      /* === SPECTATOR === */
      .arena-spectating { padding-bottom: 12px; }
      .spec-reactions {
        display: flex; justify-content: center; gap: 10px; margin: 12px 0;
      }
      .spec-react-btn {
        width: 48px; height: 48px; border-radius: 50%;
        background: var(--navy-light); border: 1px solid rgba(255,255,255,0.1);
        font-size: 22px; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
      }
      .spec-react-btn:active { transform: scale(1.2); border-color: var(--gold-dim); }
      .spec-leave-btn {
        display: block; margin: 12px auto 0; background: none; border: none;
        color: var(--white-dim); font-size: 13px; cursor: pointer; padding: 8px 16px;
      }
      @keyframes specFloat {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
      }
    `;
  }

  // ========================
  // PUBLIC API
  // ========================

  return {
    render,
    showView,
    cancelMatchmaking,
    submitSurvey,
    spectate,
    _specReact,
    _specChat,
  };

})();


// Auto-render when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('screen-arena')) {
      ColosseumArena.render('screen-arena');
    }
  }, 900);
});
