/**
 * THE MODERATOR — WebRTC Peer Connection
 *
 * RTCPeerConnection lifecycle. Knows about state.peerConnection,
 * state.localStream, state.remoteStream, state.debateState, ICE restart state.
 */

import { state, signals, fire, MAX_ICE_RESTART_ATTEMPTS, SETUP_TIMEOUT_MS } from './webrtc.state.ts';
import { getIceServers } from './webrtc.ice.ts';

// ============================================================
// PEER CONNECTION
// ============================================================

export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  state.peerConnection = new RTCPeerConnection({ iceServers });

  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => {
      state.peerConnection!.addTrack(track, state.localStream!);
    });
  }

  state.peerConnection.ontrack = (event) => {
    state.remoteStream = event.streams[0] ?? null;
    fire('remoteStream', { stream: state.remoteStream });
  };

  state.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signals.sendSignal?.('ice-candidate', event.candidate.toJSON());
    }
  };

  state.peerConnection.onconnectionstatechange = () => {
    const connState = state.peerConnection!.connectionState;
    fire('connectionState', { state: connState });

    if (connState === 'connected') {
      state.debateState.status = 'live';
      state.iceRestartAttempts = 0;
      if (state.disconnectTimer) { clearTimeout(state.disconnectTimer); state.disconnectTimer = null; }
      // Session 222: RTC-BUG-3 — clear setup timeout on successful connection
      if (state.setupTimer) { clearTimeout(state.setupTimer); state.setupTimer = null; }
      fire('connected', {});
    } else if (connState === 'disconnected') {
      // Transient — wait 3s before attempting restart (connection may recover)
      fire('disconnected', { state: connState, recovering: true });
      if (state.disconnectTimer) clearTimeout(state.disconnectTimer);
      state.disconnectTimer = setTimeout(() => {
        state.disconnectTimer = null;
        if (state.peerConnection?.connectionState === 'disconnected' || state.peerConnection?.connectionState === 'failed') {
          void attemptIceRestart();
        }
      }, 3000);
    } else if (connState === 'failed') {
      // Permanent failure — restart immediately
      if (state.disconnectTimer) { clearTimeout(state.disconnectTimer); state.disconnectTimer = null; }
      void attemptIceRestart();
    }
  };

  return state.peerConnection;
}

// Session 208: ICE restart on connection failure (audit #14)
export async function attemptIceRestart(): Promise<void> {
  state.iceRestartAttempts++;

  if (state.iceRestartAttempts > MAX_ICE_RESTART_ATTEMPTS) {
    console.warn(`[WebRTC] ICE restart failed after ${MAX_ICE_RESTART_ATTEMPTS} attempts`);
    fire('connectionFailed', { attempts: MAX_ICE_RESTART_ATTEMPTS });
    return;
  }

  console.log(`[WebRTC] ICE restart attempt ${state.iceRestartAttempts}/${MAX_ICE_RESTART_ATTEMPTS}`);
  fire('reconnecting', { attempt: state.iceRestartAttempts, max: MAX_ICE_RESTART_ATTEMPTS });

  // Only role 'a' (the offerer) initiates ICE restart.
  // Role 'b' waits — they'll receive the re-offer via signaling
  // and handleOffer() will renegotiate automatically.
  if (state.debateState.role === 'a' && state.peerConnection) {
    try {
      state.peerConnection.restartIce();
      const offer = await state.peerConnection.createOffer({ iceRestart: true });
      await state.peerConnection.setLocalDescription(offer);
      signals.sendSignal?.('offer', offer);
    } catch (err) {
      console.warn('[WebRTC] ICE restart offer error:', err);
    }
  }
}

export async function createOffer(): Promise<void> {
  try {
    if (!state.peerConnection) {
      const servers = await getIceServers();
      createPeerConnection(servers);
    }
    const offer = await state.peerConnection!.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await state.peerConnection!.setLocalDescription(offer);
    signals.sendSignal?.('offer', offer);
  } catch (err) {
    console.warn('[WebRTC] createOffer error:', err);
  }
}

export async function handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
  try {
    if (!state.peerConnection) {
      const servers = await getIceServers();
      createPeerConnection(servers);
    }
    await state.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await state.peerConnection!.createAnswer();
    await state.peerConnection!.setLocalDescription(answer);
    signals.sendSignal?.('answer', answer);
  } catch (err) {
    console.warn('[WebRTC] handleOffer error:', err);
  }
}

export async function handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
  try {
    if (!state.peerConnection) return;
    await state.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (err) {
    console.warn('[WebRTC] handleAnswer error:', err);
  }
}

export async function handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!state.peerConnection) return;
  try {
    await state.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn('ICE candidate error:', err);
  }
}
