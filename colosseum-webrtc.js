// ============================================================
// COLOSSEUM WEBRTC — Live Audio Debate Engine
// Item: 14.11.3.9, 14.3.2.1–14.3.2.6
// Uses Supabase Realtime channels for signaling (no separate server)
// Handles: peer connection, audio streams, round management
// ============================================================

const ColosseumWebRTC = (() => {

  // --- State ---
  let peerConnection = null;
  let localStream = null;
  let remoteStream = null;
  let signalingChannel = null;
  let debateState = {
    debateId: null,
    role: null,        // 'a' or 'b'
    status: 'idle',    // idle, connecting, live, paused, ended
    round: 0,
    totalRounds: 3,
    roundTimer: null,
    breakTimer: null,
    timeLeft: 0,
    isMuted: false,
  };
  let callbacks = {};

  // STUN/TURN servers for NAT traversal
  const ICE_SERVERS = (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.ICE_SERVERS)
    ? ColosseumConfig.ICE_SERVERS
    : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];

  const ROUND_DURATION = (typeof ColosseumConfig !== 'undefined')
    ? ColosseumConfig.DEBATE.roundDurationSec
    : 120;
  const BREAK_DURATION = (typeof ColosseumConfig !== 'undefined')
    ? ColosseumConfig.DEBATE.breakDurationSec
    : 30;
  const MAX_ROUNDS = (typeof ColosseumConfig !== 'undefined')
    ? ColosseumConfig.DEBATE.defaultRounds
    : 5;


  // --- Supabase client helper ---
  function getSupabase() {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) {
      return ColosseumAuth.supabase;
    }
    return null;
  }

  function isPlaceholder() {
    return !getSupabase();
  }


  // ========================
  // MICROPHONE
  // ========================

  async function requestMic() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false
      });
      fire('micReady', { stream: localStream });
      return localStream;
    } catch (err) {
      fire('error', { type: 'mic', message: 'Microphone access denied. Check browser permissions.' });
      throw err;
    }
  }

  function toggleMute() {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      debateState.isMuted = !track.enabled;
      fire('muteChanged', { muted: debateState.isMuted });
    }
    return debateState.isMuted;
  }

  function getAudioLevel(stream) {
    // Returns a function that reads current audio level (0-1)
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      return sum / (dataArray.length * 255);
    };
  }


  // ========================
  // SIGNALING via Supabase Realtime
  // ========================

  function setupSignaling(debateId) {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('[PLACEHOLDER] Signaling not available');
      return;
    }

    const channelName = 'debate-' + debateId;

    signalingChannel = supabase.channel(channelName, {
      config: { presence: { key: ColosseumAuth?.currentUser?.id || 'anon' } }
    });

    // Listen for signaling messages
    signalingChannel.on('broadcast', { event: 'signal' }, (payload) => {
      handleSignalingMessage(payload.payload);
    });

    // Presence: know when both debaters are connected
    signalingChannel.on('presence', { event: 'sync' }, () => {
      const state = signalingChannel.presenceState();
      const count = Object.keys(state).length;
      fire('presenceUpdate', { count, state });

      // Auto-start when both present
      if (count >= 2 && debateState.status === 'connecting') {
        if (debateState.role === 'a') {
          // Side A initiates the WebRTC offer
          createOffer();
        }
      }
    });

    signalingChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await signalingChannel.track({ role: debateState.role });
        fire('signalingReady', { channel: channelName });
      }
    });
  }

  function sendSignal(type, data) {
    if (!signalingChannel) return;
    signalingChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type, data, from: debateState.role }
    });
  }

  async function handleSignalingMessage(msg) {
    if (msg.from === debateState.role) return; // Ignore own messages

    switch (msg.type) {
      case 'offer':
        await handleOffer(msg.data);
        break;
      case 'answer':
        await handleAnswer(msg.data);
        break;
      case 'ice-candidate':
        await handleIceCandidate(msg.data);
        break;
      case 'round-start':
        startRoundTimer(msg.data.round);
        break;
      case 'round-end':
        endRound();
        break;
      case 'debate-end':
        endDebate();
        break;
    }
  }


  // ========================
  // WEBRTC PEER CONNECTION
  // ========================

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local audio tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Receive remote audio
    peerConnection.ontrack = (event) => {
      remoteStream = event.streams[0];
      fire('remoteStream', { stream: remoteStream });
    };

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate.toJSON());
      }
    };

    // Connection state
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      fire('connectionState', { state });

      if (state === 'connected') {
        debateState.status = 'live';
        fire('connected', {});
      } else if (state === 'disconnected' || state === 'failed') {
        fire('disconnected', { state });
      }
    };

    return peerConnection;
  }

  async function createOffer() {
    if (!peerConnection) createPeerConnection();

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await peerConnection.setLocalDescription(offer);
    sendSignal('offer', offer);
  }

  async function handleOffer(offer) {
    if (!peerConnection) createPeerConnection();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendSignal('answer', answer);
  }

  async function handleAnswer(answer) {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async function handleIceCandidate(candidate) {
    if (!peerConnection) return;
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('ICE candidate error:', err);
    }
  }


  // ========================
  // ROUND MANAGEMENT
  // ========================

  function startRoundTimer(round) {
    debateState.round = round;
    debateState.timeLeft = ROUND_DURATION;
    debateState.status = 'live';

    fire('roundStart', { round, timeLeft: ROUND_DURATION });

    clearInterval(debateState.roundTimer);
    debateState.roundTimer = setInterval(() => {
      debateState.timeLeft--;
      fire('tick', { timeLeft: debateState.timeLeft, round });

      if (debateState.timeLeft <= 0) {
        clearInterval(debateState.roundTimer);

        if (round >= debateState.totalRounds) {
          // Final round over — move to voting
          sendSignal('debate-end', {});
          endDebate();
        } else {
          // Break between rounds
          sendSignal('round-end', { round });
          startBreak(round);
        }
      }
    }, 1000);
  }

  function startBreak(afterRound) {
    debateState.status = 'break';
    debateState.timeLeft = BREAK_DURATION;

    fire('breakStart', { afterRound, timeLeft: BREAK_DURATION });

    clearInterval(debateState.breakTimer);
    debateState.breakTimer = setInterval(() => {
      debateState.timeLeft--;
      fire('breakTick', { timeLeft: debateState.timeLeft });

      if (debateState.timeLeft <= 0) {
        clearInterval(debateState.breakTimer);
        // Next round
        const nextRound = afterRound + 1;
        sendSignal('round-start', { round: nextRound });
        startRoundTimer(nextRound);
      }
    }, 1000);
  }

  function endRound() {
    clearInterval(debateState.roundTimer);
    fire('roundEnd', { round: debateState.round });
  }

  function endDebate() {
    debateState.status = 'ended';
    clearInterval(debateState.roundTimer);
    clearInterval(debateState.breakTimer);
    fire('debateEnd', { debateId: debateState.debateId });
  }


  // ========================
  // MAIN API: JOIN / START / LEAVE
  // ========================

  async function joinDebate(debateId, role) {
    debateState.debateId = debateId;
    debateState.role = role;
    debateState.status = 'connecting';
    debateState.totalRounds = MAX_ROUNDS;

    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] joinDebate:', debateId, role);
      fire('placeholderMode', {
        message: 'WebRTC running in placeholder mode. Connect Supabase to go live.'
      });
      return;
    }

    // Get mic
    await requestMic();

    // Set up signaling
    setupSignaling(debateId);

    fire('joining', { debateId, role });
  }

  async function startLive() {
    // Called when both debaters are present and ready
    if (debateState.role === 'a') {
      // Side A kicks off round 1
      sendSignal('round-start', { round: 1 });
      startRoundTimer(1);
    }
  }

  function leaveDebate() {
    // Clean up everything
    if (debateState.roundTimer) clearInterval(debateState.roundTimer);
    if (debateState.breakTimer) clearInterval(debateState.breakTimer);

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    remoteStream = null;

    if (signalingChannel) {
      signalingChannel.unsubscribe();
      signalingChannel = null;
    }

    debateState = {
      debateId: null,
      role: null,
      status: 'idle',
      round: 0,
      totalRounds: MAX_ROUNDS,
      roundTimer: null,
      breakTimer: null,
      timeLeft: 0,
      isMuted: false,
    };

    fire('left', {});
  }


  // ========================
  // SPECTATOR MODE
  // ========================

  function spectateDebate(debateId) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] spectateDebate:', debateId);
      return;
    }

    const supabase = getSupabase();
    const channelName = 'debate-spectate-' + debateId;

    // Spectators listen on a separate broadcast channel
    // Debaters push state updates here
    const spectatorChannel = supabase.channel(channelName);

    spectatorChannel.on('broadcast', { event: 'state' }, (payload) => {
      fire('spectatorUpdate', payload.payload);
    });

    spectatorChannel.subscribe();

    return {
      channel: spectatorChannel,
      leave: () => spectatorChannel.unsubscribe()
    };
  }

  // Debater broadcasts state to spectators
  function broadcastToSpectators(data) {
    if (!debateState.debateId || isPlaceholder()) return;

    const supabase = getSupabase();
    const channelName = 'debate-spectate-' + debateState.debateId;
    const channel = supabase.channel(channelName);

    channel.send({
      type: 'broadcast',
      event: 'state',
      payload: {
        round: debateState.round,
        timeLeft: debateState.timeLeft,
        status: debateState.status,
        ...data
      }
    });
  }


  // ========================
  // EVENT SYSTEM
  // ========================

  function on(event, fn) {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(fn);
  }

  function off(event, fn) {
    if (!callbacks[event]) return;
    callbacks[event] = callbacks[event].filter(f => f !== fn);
  }

  function fire(event, data) {
    (callbacks[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('Event handler error:', e); }
    });
  }


  // ========================
  // AUDIO VISUALIZATION HELPER
  // ========================

  function createWaveform(stream, canvasElement) {
    const ctx = canvasElement.getContext('2d');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvasElement.width;
      const h = canvasElement.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = (w / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h;
        const gold = `rgba(212, 168, 67, ${0.4 + (dataArray[i] / 255) * 0.6})`;
        ctx.fillStyle = gold;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }

    draw();
    return { analyser, audioCtx };
  }


  // ========================
  // PUBLIC API
  // ========================

  return {
    // Core
    joinDebate,
    startLive,
    leaveDebate,

    // Mic
    requestMic,
    toggleMute,
    getAudioLevel,

    // Spectator
    spectateDebate,
    broadcastToSpectators,

    // Visualization
    createWaveform,

    // Events
    on,
    off,

    // State (read-only)
    get state() { return { ...debateState }; },
    get localStream() { return localStream; },
    get remoteStream() { return remoteStream; },
    get isConnected() { return peerConnection?.connectionState === 'connected'; },
  };

})();
