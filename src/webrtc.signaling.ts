/**
 * THE MODERATOR — WebRTC Signaling
 *
 * Supabase Realtime channel setup and message dispatch.
 */

import { state, signals, fire, getSupabase, SETUP_TIMEOUT_MS } from './webrtc.state.ts';
import { getCurrentUser } from './auth.ts';
import { handleOffer, handleAnswer, handleIceCandidate, createOffer } from './webrtc.peer.ts';
import { beginStep, advanceStep, endDebate } from './webrtc.engine.ts';
import type { SignalingMessage } from './webrtc.types.ts';

// ============================================================
// SIGNALING VIA SUPABASE REALTIME
// ============================================================

export async function setupSignaling(debateId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  // ADV-2: Set auth token for Realtime private channel RLS
  try { await sb.realtime.setAuth(); } catch { /* session not ready — subscribe will fail gracefully */ }

  const channelName = 'debate-' + debateId;

  state.signalingChannel = sb.channel(channelName, {
    config: {
      private: true, // ADV-2: enforce RLS on realtime.messages
      presence: { key: getCurrentUser()?.id || 'anon' },
    },
  });

  state.signalingChannel.on('broadcast', { event: 'signal' }, (payload: Record<string, unknown>) => {
    const raw = payload['payload'];
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as Record<string, unknown>;
    if (typeof msg['type'] !== 'string' || typeof msg['from'] !== 'string') return;
    void handleSignalingMessage(msg as unknown as SignalingMessage);
  });

  state.signalingChannel.on('presence', { event: 'sync' }, () => {
    const presenceState = state.signalingChannel!.presenceState();
    const count = Object.keys(presenceState).length;
    fire('presenceUpdate', { count, state: presenceState });

    if (count >= 2 && state.debateState.status === 'connecting') {
      if (state.debateState.role === 'a') {
        void createOffer();
      }
    }
  });

  state.signalingChannel.subscribe(async (status: string, err?: Error) => {
    if (status === 'SUBSCRIBED') {
      await state.signalingChannel!.track({ role: state.debateState.role });
      fire('signalingReady', { channel: channelName });

      // Session 222: RTC-BUG-3 — setup timeout.
      // If peer connection isn't 'connected' within 30s, end gracefully.
      if (state.setupTimer) clearTimeout(state.setupTimer);
      state.setupTimer = setTimeout(() => {
        state.setupTimer = null;
        if (state.debateState.status === 'connecting') {
          console.warn('[WebRTC] Setup timeout — peer connection not established in 30s');
          fire('connectionFailed', { reason: 'setup-timeout' });
          endDebate();
        }
      }, SETUP_TIMEOUT_MS);
    } else if (status === 'CHANNEL_ERROR') {
      // ADV-2: RLS rejected — user is not a debate participant, or AI-local debate
      console.warn('[WebRTC] Signaling channel denied:', err?.message ?? 'no permissions');
      fire('error', { message: 'Signaling channel access denied.' });
    }
  });
}

export function sendSignal(type: string, data: unknown): void {
  if (!state.signalingChannel) return;
  state.signalingChannel.send({
    type: 'broadcast',
    event: 'signal',
    payload: { type, data, from: state.debateState.role },
  });
}

// Wire the late-bound ref so engine can call sendSignal without circular import
signals.sendSignal = sendSignal;

async function handleSignalingMessage(msg: SignalingMessage): Promise<void> {
  if (msg.from === state.debateState.role) return;

  switch (msg.type) {
    case 'offer':
      await handleOffer(msg.data as RTCSessionDescriptionInit);
      break;
    case 'answer':
      await handleAnswer(msg.data as RTCSessionDescriptionInit);
      break;
    case 'ice-candidate':
      await handleIceCandidate(msg.data as RTCIceCandidateInit);
      break;
    // Legacy round signals — still handled for backward compat
    case 'round-start':
      // If received from old client, treat as turn-start for round 1
      if (state.debateState.turn.stepIndex < 0) {
        beginStep(0);
      }
      break;
    case 'round-end':
      break; // handled by turn system now
    case 'debate-end':
      endDebate();
      break;
    // New turn-based signals (Session 178)
    case 'turn-start': {
      const d = msg.data as { stepIndex: number };
      // Sync to the same step as the other client
      if (d.stepIndex !== state.debateState.turn.stepIndex) {
        beginStep(d.stepIndex);
      }
      break;
    }
    case 'turn-end': {
      // Other side's turn ended (timer expired or finish-turn).
      // Advance to next step.
      advanceStep();
      break;
    }
    case 'finish-turn': {
      // Other debater pressed Finish Turn — advance immediately.
      advanceStep();
      break;
    }
  }
}
