// ============================================================
// COLOSSEUM VOICE MEMO — Async Voice Debate (Item 14.3.3.2)
// SURVIVAL-CRITICAL: Solves empty lobby problem
// Record take → opponent records reply → async voice debate
// Uses MediaRecorder API, Supabase Storage, placeholder fallback
// Mobile-first: bottom sheet recorder, waveform, playback
// ============================================================

window.ColosseumVoiceMemo = (() => {

  // --- State ---
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStream = null;
  let isRecording = false;
  let recordingStartTime = null;
  let recordingTimer = null;
  let audioContext = null;
  let analyser = null;
  let animationFrame = null;

  const MAX_DURATION_SEC = 120; // 2 minutes, matches round duration
  const MIN_DURATION_SEC = 5;   // Don't allow <5s clips

  // --- Supabase helper ---
  function getSupabase() {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) {
      return ColosseumAuth.supabase;
    }
    return null;
  }

  function isPlaceholder() {
    return !getSupabase();
  }

  function currentUserId() {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.currentUser) {
      return ColosseumAuth.currentUser.id;
    }
    return 'placeholder-user';
  }

  function currentUsername() {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.currentProfile) {
      return ColosseumAuth.currentProfile.display_name || ColosseumAuth.currentProfile.username || 'Gladiator';
    }
    return 'Gladiator';
  }


  // ========================
  // RECORDING
  // ========================

  async function startRecording() {
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      mediaRecorder = new MediaRecorder(recordingStream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stopVisualization();
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      isRecording = true;
      recordingStartTime = Date.now();

      // Start timer
      updateRecorderUI();
      recordingTimer = setInterval(updateRecorderUI, 100);

      // Start waveform visualization
      startVisualization(recordingStream);

      // Auto-stop at max duration
      setTimeout(() => {
        if (isRecording) stopRecording();
      }, MAX_DURATION_SEC * 1000);

      return true;
    } catch (err) {
      console.error('Mic access denied:', err);
      showToast('🎤 Microphone access denied. Check browser permissions.');
      return false;
    }
  }

  function stopRecording() {
    if (!mediaRecorder || !isRecording) return null;

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        stopVisualization();
        const elapsed = (Date.now() - recordingStartTime) / 1000;

        if (elapsed < MIN_DURATION_SEC) {
          showToast(`⚠️ Too short — record at least ${MIN_DURATION_SEC} seconds`);
          cleanup();
          resolve(null);
          return;
        }

        const mimeType = mediaRecorder.mimeType;
        const blob = new Blob(audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = Math.round(elapsed);

        cleanup();
        resolve({ blob, url, duration, mimeType });
      };

      mediaRecorder.stop();
      isRecording = false;
      clearInterval(recordingTimer);
    });
  }

  function cancelRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
    isRecording = false;
    clearInterval(recordingTimer);
    cleanup();
    closeRecorderSheet();
  }

  function cleanup() {
    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
      recordingStream = null;
    }
    audioChunks = [];
    mediaRecorder = null;
    isRecording = false;
    recordingStartTime = null;
  }


  // ========================
  // VISUALIZATION
  // ========================

  function startVisualization(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const canvas = document.getElementById('vm-waveform');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!isRecording) return;
      animationFrame = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 32;
      const barWidth = (w / barCount) - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] / 255;
        const barHeight = Math.max(2, val * h);
        const x = i * (barWidth + 2);
        const y = (h - barHeight) / 2;

        const alpha = 0.4 + val * 0.6;
        ctx.fillStyle = `rgba(212, 168, 67, ${alpha})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    draw();
  }

  function stopVisualization() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
  }


  // ========================
  // UPLOAD / STORAGE
  // ========================

  async function uploadVoiceMemo(blob, debateId) {
    const supabase = getSupabase();
    if (!supabase) {
      // Placeholder: store in memory, return fake URL
      const url = URL.createObjectURL(blob);
      console.log('[PLACEHOLDER] Voice memo stored locally:', url);
      return { url, path: 'placeholder/' + Date.now() + '.webm' };
    }

    const userId = currentUserId();
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const path = `voice-memos/${userId}/${debateId || 'take'}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('debate-audio')
      .upload(path, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload failed:', error);
      showToast('⚠️ Upload failed. Saved locally.');
      return { url: URL.createObjectURL(blob), path: 'local-fallback' };
    }

    const { data: urlData } = supabase.storage
      .from('debate-audio')
      .getPublicUrl(path);

    return { url: urlData.publicUrl, path };
  }


  // ========================
  // RECORDER UI (Bottom Sheet)
  // ========================

  function openRecorderSheet(context = {}) {
    // Remove existing if any
    closeRecorderSheet();

    const sheet = document.createElement('div');
    sheet.id = 'vm-recorder-sheet';
    sheet.innerHTML = `
      <style>
        #vm-recorder-sheet {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #0a1628;
          border-top: 2px solid rgba(212,168,67,0.3);
          border-radius: 16px 16px 0 0;
          padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
          z-index: 9000;
          animation: vmSlideUp 0.3s ease;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
        }
        @keyframes vmSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .vm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .vm-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          color: #f0f0f0;
        }
        .vm-close {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: #1a2d4a;
          border: none;
          color: #a0a8b8;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .vm-close:active { background: #132240; color: #f0f0f0; }

        .vm-context {
          font-size: 13px;
          color: #a0a8b8;
          margin-bottom: 14px;
          line-height: 1.4;
        }
        .vm-context strong { color: #d4a843; }

        .vm-waveform-box {
          background: #132240;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 64px;
        }
        #vm-waveform {
          width: 100%;
          height: 48px;
        }

        .vm-timer {
          text-align: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 3px;
          color: #cc2936;
          margin-bottom: 16px;
        }
        .vm-timer.idle { color: #a0a8b8; }

        .vm-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .vm-record-btn {
          width: 64px; height: 64px;
          border-radius: 50%;
          border: 3px solid #cc2936;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.2s;
        }
        .vm-record-btn .vm-record-inner {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #cc2936;
          transition: all 0.2s;
        }
        .vm-record-btn.recording .vm-record-inner {
          border-radius: 4px;
          width: 22px; height: 22px;
        }
        .vm-record-btn:active { transform: scale(0.95); }

        .vm-cancel-btn, .vm-send-btn {
          min-width: 44px; min-height: 44px;
          border-radius: 50%;
          border: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .vm-cancel-btn {
          background: #1a2d4a;
          color: #a0a8b8;
        }
        .vm-cancel-btn:active { background: #132240; }
        .vm-send-btn {
          background: #2ecc71;
          color: #fff;
          display: none;
        }
        .vm-send-btn:active { background: #27ae60; }
        .vm-send-btn.visible { display: flex; }

        .vm-hint {
          text-align: center;
          font-size: 11px;
          color: #6a7a90;
          margin-top: 10px;
          letter-spacing: 0.5px;
        }

        /* Playback preview */
        .vm-preview {
          display: none;
          background: #132240;
          border: 1px solid rgba(212,168,67,0.15);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 14px;
        }
        .vm-preview.visible { display: block; }
        .vm-preview-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vm-play-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: #d4a843;
          border: none;
          color: #0a1628;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .vm-play-btn:active { background: #b8922e; }
        .vm-preview-info {
          flex: 1;
          font-size: 13px;
          color: #a0a8b8;
        }
        .vm-preview-duration {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          color: #f0f0f0;
          letter-spacing: 1px;
        }
        .vm-retake-btn {
          min-height: 44px;
          padding: 0 16px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #a0a8b8;
          font-size: 12px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .vm-retake-btn:active { background: rgba(255,255,255,0.05); color: #f0f0f0; }
      </style>

      <div class="vm-header">
        <span class="vm-title">🎤 VOICE TAKE</span>
        <button class="vm-close" onclick="ColosseumVoiceMemo.cancelRecording()">✕</button>
      </div>

      ${context.replyTo ? `<div class="vm-context">Replying to <strong>@${context.replyTo}</strong>: "${truncate(context.replyText, 60)}"</div>` : ''}
      ${context.topic ? `<div class="vm-context">Topic: <strong>${truncate(context.topic, 80)}</strong></div>` : ''}

      <div class="vm-waveform-box">
        <canvas id="vm-waveform" width="300" height="48"></canvas>
      </div>

      <div class="vm-timer idle" id="vm-timer">0:00</div>

      <!-- Playback preview (shown after recording) -->
      <div class="vm-preview" id="vm-preview">
        <div class="vm-preview-row">
          <button class="vm-play-btn" id="vm-play-btn" onclick="ColosseumVoiceMemo.togglePlayback()">▶</button>
          <div class="vm-preview-info">
            <div class="vm-preview-duration" id="vm-preview-duration">0:00</div>
            <div>Voice take recorded</div>
          </div>
          <button class="vm-retake-btn" onclick="ColosseumVoiceMemo.retake()">Retake</button>
        </div>
      </div>

      <audio id="vm-audio-preview" style="display:none;"></audio>

      <div class="vm-controls" id="vm-controls">
        <button class="vm-cancel-btn" onclick="ColosseumVoiceMemo.cancelRecording()">🗑️</button>
        <button class="vm-record-btn" id="vm-record-btn" onclick="ColosseumVoiceMemo.toggleRecord()">
          <div class="vm-record-inner"></div>
        </button>
        <button class="vm-send-btn" id="vm-send-btn" onclick="ColosseumVoiceMemo.send()">✓</button>
      </div>

      <div class="vm-hint" id="vm-hint">Tap to record your take (${MAX_DURATION_SEC}s max)</div>
    `;

    sheet._context = context;
    document.body.appendChild(sheet);

    // Scale canvas to device pixels
    const canvas = document.getElementById('vm-waveform');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }

  function closeRecorderSheet() {
    const sheet = document.getElementById('vm-recorder-sheet');
    if (sheet) sheet.remove();
  }

  function updateRecorderUI() {
    const timerEl = document.getElementById('vm-timer');
    if (!timerEl || !recordingStartTime) return;

    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const remaining = MAX_DURATION_SEC - elapsed;
    const min = Math.floor(elapsed / 60);
    const sec = String(elapsed % 60).padStart(2, '0');

    timerEl.textContent = `${min}:${sec}`;
    timerEl.classList.remove('idle');

    if (remaining <= 10) {
      timerEl.style.color = '#e74c3c';
    }
  }


  // ========================
  // TOGGLE RECORD / PLAYBACK / SEND
  // ========================

  let pendingRecording = null;

  async function toggleRecord() {
    const btn = document.getElementById('vm-record-btn');

    if (!isRecording) {
      // Start recording
      const success = await startRecording();
      if (success && btn) {
        btn.classList.add('recording');
        document.getElementById('vm-hint').textContent = 'Recording... tap to stop';
        document.getElementById('vm-preview').classList.remove('visible');
        document.getElementById('vm-send-btn').classList.remove('visible');
      }
    } else {
      // Stop recording
      const result = await stopRecording();
      if (btn) btn.classList.remove('recording');

      if (result) {
        pendingRecording = result;
        showPreview(result);
      } else {
        document.getElementById('vm-timer').textContent = '0:00';
        document.getElementById('vm-timer').classList.add('idle');
        document.getElementById('vm-hint').textContent = `Tap to record your take (${MAX_DURATION_SEC}s max)`;
      }
    }
  }

  function showPreview(recording) {
    const preview = document.getElementById('vm-preview');
    const controls = document.getElementById('vm-controls');
    const duration = document.getElementById('vm-preview-duration');
    const audioEl = document.getElementById('vm-audio-preview');
    const sendBtn = document.getElementById('vm-send-btn');
    const hint = document.getElementById('vm-hint');

    if (preview) preview.classList.add('visible');
    if (sendBtn) sendBtn.classList.add('visible');
    if (hint) hint.textContent = 'Listen back, retake, or send it';

    const min = Math.floor(recording.duration / 60);
    const sec = String(recording.duration % 60).padStart(2, '0');
    if (duration) duration.textContent = `${min}:${sec}`;

    if (audioEl) {
      audioEl.src = recording.url;
    }
  }

  let isPlaying = false;

  function togglePlayback() {
    const audioEl = document.getElementById('vm-audio-preview');
    const playBtn = document.getElementById('vm-play-btn');
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.pause();
      audioEl.currentTime = 0;
      isPlaying = false;
      if (playBtn) playBtn.textContent = '▶';
    } else {
      audioEl.play();
      isPlaying = true;
      if (playBtn) playBtn.textContent = '⏸';
      audioEl.onended = () => {
        isPlaying = false;
        if (playBtn) playBtn.textContent = '▶';
      };
    }
  }

  function retake() {
    pendingRecording = null;
    isPlaying = false;
    const audioEl = document.getElementById('vm-audio-preview');
    if (audioEl) { audioEl.pause(); audioEl.src = ''; }

    document.getElementById('vm-preview')?.classList.remove('visible');
    document.getElementById('vm-send-btn')?.classList.remove('visible');
    document.getElementById('vm-timer').textContent = '0:00';
    document.getElementById('vm-timer').classList.add('idle');
    document.getElementById('vm-hint').textContent = `Tap to record your take (${MAX_DURATION_SEC}s max)`;
  }

  async function send() {
    if (!pendingRecording) return;

    const sheet = document.getElementById('vm-recorder-sheet');
    const context = sheet?._context || {};

    showToast('📤 Sending voice take...');

    // Upload audio
    const { url, path } = await uploadVoiceMemo(
      pendingRecording.blob,
      context.debateId || null
    );

    // Create async voice take entry
    if (!isPlaceholder()) {
      const supabase = getSupabase();
      await supabase.from('hot_takes').insert({
        user_id: currentUserId(),
        text: '🎤 Voice Take',
        section: context.section || 'trending',
        voice_memo_url: url,
        voice_memo_path: path,
        voice_memo_duration: pendingRecording.duration,
        parent_id: context.parentTakeId || null,
      });
    }

    pendingRecording = null;
    closeRecorderSheet();
    showToast('🎤 Voice take posted!');

    // Refresh feed if async module is available
    if (typeof ColosseumAsync !== 'undefined' && ColosseumAsync.loadHotTakes) {
      ColosseumAsync.loadHotTakes(context.section || 'all');
    }
  }


  // ========================
  // PUBLIC ENTRY POINTS
  // ========================

  // Open recorder for a new voice take
  function recordTake(section = 'trending') {
    openRecorderSheet({ section });
  }

  // Open recorder to reply to a take
  function replyToTake(takeId, username, takeText, section) {
    openRecorderSheet({
      replyTo: username,
      replyText: takeText,
      parentTakeId: takeId,
      section,
    });
  }

  // Open recorder for async voice debate response
  function debateReply(debateId, topic, section) {
    openRecorderSheet({
      debateId,
      topic,
      section,
    });
  }


  // ========================
  // PLAYBACK COMPONENT (inline in feed)
  // ========================

  function renderPlayer(voiceUrl, duration) {
    const id = 'vmp-' + Math.random().toString(36).slice(2, 8);
    const min = Math.floor(duration / 60);
    const sec = String(duration % 60).padStart(2, '0');

    return `
      <div class="vm-inline-player" style="
        display:flex;align-items:center;gap:10px;
        background:#132240;border:1px solid rgba(212,168,67,0.12);
        border-radius:10px;padding:10px 12px;margin-top:8px;
      ">
        <button onclick="ColosseumVoiceMemo.playInline('${id}')" style="
          width:40px;height:40px;border-radius:50%;
          background:#d4a843;border:none;color:#0a1628;
          font-size:16px;cursor:pointer;display:flex;
          align-items:center;justify-content:center;flex-shrink:0;
          -webkit-tap-highlight-color:transparent;
        " id="${id}-btn">▶</button>
        <div style="flex:1;">
          <div style="font-size:11px;color:#a0a8b8;letter-spacing:0.5px;">🎤 VOICE TAKE</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:#f0f0f0;letter-spacing:1px;">${min}:${sec}</div>
        </div>
        <audio id="${id}" src="${voiceUrl}" preload="metadata" style="display:none;"></audio>
      </div>
    `;
  }

  function playInline(id) {
    const audio = document.getElementById(id);
    const btn = document.getElementById(id + '-btn');
    if (!audio || !btn) return;

    if (audio.paused) {
      // Pause any other players first
      document.querySelectorAll('.vm-inline-player audio').forEach(a => {
        if (a.id !== id) { a.pause(); a.currentTime = 0; }
      });
      document.querySelectorAll('.vm-inline-player button').forEach(b => {
        b.textContent = '▶';
      });

      audio.play();
      btn.textContent = '⏸';
      audio.onended = () => { btn.textContent = '▶'; };
    } else {
      audio.pause();
      audio.currentTime = 0;
      btn.textContent = '▶';
    }
  }


  // ========================
  // HELPERS
  // ========================

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#132240;color:#f0f0f0;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;border:1px solid rgba(212,168,67,0.2);box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:90vw;text-align:center;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
  }

  // Check if voice memo feature is enabled
  function isEnabled() {
    if (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.FEATURES) {
      return ColosseumConfig.FEATURES.voiceMemo;
    }
    return true; // Default enabled if no config
  }


  // ========================
  // PUBLIC API
  // ========================

  return {
    // Recording
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecord,
    retake,
    send,

    // Entry points
    recordTake,
    replyToTake,
    debateReply,

    // Playback
    togglePlayback,
    playInline,
    renderPlayer,

    // UI
    openRecorderSheet,
    closeRecorderSheet,

    // State
    get isRecording() { return isRecording; },
    get isEnabled() { return isEnabled(); },
  };

})();
