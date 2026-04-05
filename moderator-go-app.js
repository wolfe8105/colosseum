// ============================================================
// /go — Ephemeral AI Sparring (No Auth, No DB)
// ============================================================

const TOTAL_ROUNDS = 3;
const API_URL = '/api/go-respond';

let state = {
  topic: '',
  side: '',
  round: 1,
  messageHistory: [],
  recognition: null,
  isRecording: false,
  debateOver: false,
  roundScores: [],
};

// DOM
const setupEl = document.getElementById('setup');
const debateEl = document.getElementById('debate');
const verdictEl = document.getElementById('verdict');
const topicInput = document.getElementById('topic');
const btnFor = document.getElementById('btn-for');
const btnAgainst = document.getElementById('btn-against');
const startBtn = document.getElementById('start');
const chatArea = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const micBtn = document.getElementById('mic');
const sendBtn = document.getElementById('send');
const signupCta = document.getElementById('signup-cta');
const retryBtn = document.getElementById('retry');
const runningScoreEl = document.getElementById('running-score');
const runningScoreNumber = document.getElementById('running-score-number');
const runningScoreBar = document.getElementById('running-score-bar');

// Parse [SCORE:X] from AI response
function parseScore(text) {
  const match = text.match(/\[SCORE:\s*(\d+\.?\d*)\s*\]/i);
  if (match) {
    const score = Math.min(10, Math.max(1, parseFloat(match[1])));
    const clean = text.replace(/\[SCORE:\s*\d+\.?\d*\s*\]/i, '').trim();
    return { score, clean };
  }
  return { score: null, clean: text };
}

// Update running score display
function updateScoreDisplay() {
  if (state.roundScores.length === 0) return;
  const avg = state.roundScores.reduce((a, b) => a + b, 0) / state.roundScores.length;
  const rounded = Math.round(avg * 10) / 10;

  runningScoreEl.classList.add('visible');
  runningScoreNumber.textContent = rounded + '/10';

  // Color based on score
  if (rounded >= 7) runningScoreNumber.style.color = 'var(--cyan)';
  else if (rounded >= 5) runningScoreNumber.style.color = 'var(--orange)';
  else runningScoreNumber.style.color = 'var(--magenta)';

  // Fill pips
  const pips = runningScoreBar.children;
  const filled = Math.round(rounded);
  for (let i = 0; i < 10; i++) {
    pips[i].className = 'running-score-pip';
    if (i < filled) {
      pips[i].classList.add(rounded >= 7 ? 'filled-high' : rounded >= 5 ? 'filled-mid' : 'filled-low');
    }
  }

  // Re-trigger animation
  runningScoreEl.classList.remove('visible');
  void runningScoreEl.offsetHeight;
  runningScoreEl.classList.add('visible');
}

// Side picker
function pickSide(side) {
  state.side = side;
  btnFor.dataset.selected = side === 'for' ? 'true' : 'false';
  btnAgainst.dataset.selected = side === 'against' ? 'true' : 'false';
  checkReady();
}
btnFor.addEventListener('click', () => pickSide('for'));
btnAgainst.addEventListener('click', () => pickSide('against'));

// Enable start when ready
function checkReady() {
  startBtn.disabled = !(topicInput.value.trim().length >= 3 && state.side);
}
topicInput.addEventListener('input', checkReady);

// Start debate
startBtn.addEventListener('click', () => {
  state.topic = topicInput.value.trim();
  state.round = 1;
  state.messageHistory = [];
  state.debateOver = false;
  state.roundScores = [];
  chatArea.innerHTML = '';
  signupCta.classList.remove('visible');
  runningScoreEl.classList.remove('visible');

  setupEl.classList.add('hidden');
  debateEl.classList.add('active');
  verdictEl.classList.remove('active');

  document.getElementById('debate-topic').textContent = state.topic;
  const sideTag = document.getElementById('debate-side-tag');
  sideTag.textContent = state.side === 'for' ? 'You: FOR' : 'You: AGAINST';
  sideTag.className = 'topic-side-tag ' + state.side;

  updateRoundUI();
  userInput.focus();
});

// Round UI
function updateRoundUI() {
  document.getElementById('round-label').textContent = `Round ${state.round} of ${TOTAL_ROUNDS}`;
  const dots = document.getElementById('round-dots').children;
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    dots[i].className = 'round-dot' + (i < state.round - 1 ? ' done' : i === state.round - 1 ? ' current' : '');
  }
}

// Auto-resize textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  sendBtn.disabled = !userInput.value.trim();
});

// Send argument
async function sendArgument() {
  const text = userInput.value.trim();
  if (!text || state.debateOver) return;

  // Add user bubble
  addBubble('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Show thinking
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'ai-thinking';
  thinkingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  chatArea.appendChild(thinkingEl);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: state.topic,
        side: state.side,
        round: state.round,
        totalRounds: TOTAL_ROUNDS,
        userArg: text,
        messageHistory: state.messageHistory,
      }),
    });

    thinkingEl.remove();

    if (!res.ok) throw new Error('AI failed');

    const data = await res.json();
    const aiRaw = data.response;

    // Parse score from AI response
    const { score, clean: aiResponse } = parseScore(aiRaw);
    if (score !== null) {
      state.roundScores.push(score);
      updateScoreDisplay();
    }

    // Update history (store clean version without score tag)
    state.messageHistory.push({ role: 'user', content: text });
    state.messageHistory.push({ role: 'assistant', content: aiResponse });

    addBubble('ai', aiResponse);

    // Show signup CTA after round 1
    if (state.round === 1) {
      signupCta.classList.add('visible');
    }

    // Advance round or end
    if (state.round >= TOTAL_ROUNDS) {
      state.debateOver = true;
      document.getElementById('input-area').style.display = 'none';
      // Let user read AI's final response before scoring
      await new Promise(r => setTimeout(r, 3000));
      document.getElementById('input-hint').textContent = 'Scoring your performance...';
      await showVerdict();
    } else {
      state.round++;
      updateRoundUI();
      userInput.focus();
    }

  } catch (err) {
    thinkingEl.remove();
    addBubble('ai', 'Something went wrong. Try again.');
    console.error('[go] AI error:', err);
  }
}

sendBtn.addEventListener('click', sendArgument);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (userInput.value.trim()) sendArgument();
  }
});

// Add chat bubble
function addBubble(role, text) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + role;
  const label = role === 'user' ? 'You' : 'AI Opponent';
  bubble.innerHTML = `<div class="bubble-label">${label}</div>${escapeHtml(text)}`;
  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Web Speech API
function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    micBtn.style.display = 'none';
    return;
  }
  state.recognition = new SR();
  state.recognition.continuous = false;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  state.recognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    userInput.value = transcript;
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    sendBtn.disabled = !transcript.trim();
  };

  state.recognition.onend = () => {
    state.isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.textContent = '🎙️';
  };

  state.recognition.onerror = (e) => {
    console.error('[go] Speech error:', e.error);
    state.isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.textContent = '🎙️';
  };
}

micBtn.addEventListener('click', () => {
  if (!state.recognition) return;
  if (state.isRecording) {
    state.recognition.stop();
  } else {
    userInput.value = '';
    state.recognition.start();
    state.isRecording = true;
    micBtn.classList.add('recording');
    micBtn.textContent = '⏹️';
  }
});

// Verdict
async function showVerdict() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: state.topic,
        side: state.side,
        action: 'score',
        messageHistory: state.messageHistory,
      }),
    });

    const data = await res.json();
    const s = data.scores || { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Not bad — keep practicing.' };

    const overall = Math.round((s.logic + s.evidence + s.delivery + s.rebuttal) / 4 * 10) / 10;

    debateEl.classList.remove('active');
    verdictEl.classList.add('active');

    document.getElementById('verdict-score').textContent = overall + '/10';
    document.getElementById('verdict-score').style.color = overall >= 7 ? 'var(--cyan)' : overall >= 5 ? 'var(--orange)' : 'var(--magenta)';

    document.getElementById('score-grid').innerHTML = [
      { label: 'Logic', val: s.logic },
      { label: 'Evidence', val: s.evidence },
      { label: 'Delivery', val: s.delivery },
      { label: 'Rebuttal', val: s.rebuttal },
    ].map(item => `
      <div class="score-item">
        <div class="score-value">${item.val}</div>
        <div class="score-label">${item.label}</div>
      </div>
    `).join('');

    document.getElementById('verdict-text').textContent = s.verdict;

  } catch (err) {
    console.error('[go] Scoring error:', err);
    debateEl.classList.remove('active');
    verdictEl.classList.add('active');
    document.getElementById('verdict-score').textContent = '—';
    document.getElementById('verdict-text').textContent = 'Scoring unavailable. But you showed up — that counts.';
    document.getElementById('score-grid').innerHTML = '';
  }
}

// Retry
retryBtn.addEventListener('click', () => {
  verdictEl.classList.remove('active');
  setupEl.classList.remove('hidden');
  runningScoreEl.classList.remove('visible');
  document.getElementById('input-area').style.display = '';
  document.getElementById('input-hint').textContent = 'Tap 🎙️ to speak or type your argument';
  topicInput.value = '';
  state.side = '';
  btnFor.dataset.selected = 'false';
  btnAgainst.dataset.selected = 'false';
  startBtn.disabled = true;
  topicInput.focus();
});

// Init
initSpeech();
