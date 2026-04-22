/**
 * arena-deepgram.ts — F-51 Phase 4: Deepgram Speech-to-Text
 *
 * Manages Deepgram WebSocket lifecycle per turn:
 *   1. Fetch short-lived JWT from deepgram-token Edge Function
 *   2. Open WebSocket to Deepgram streaming API
 *   3. Pipe mic audio via MediaRecorder (250ms chunks)
 *   4. Emit final transcripts via onTranscript callback → feed events
 *   5. Three-tier fallback on failure (auto-reconnect → indicator → gap)
 *
 * One WebSocket session per speaker turn. Clean start/stop.
 * Only the speaking debater's client transcribes — others receive
 * speech events via Supabase Realtime.
 *
 * Session 238. Refactored Session 254 (types → arena-deepgram.types.ts,
 * token → arena-deepgram.token.ts).
 */

import type { TranscriptCallback, StatusCallback, DeepgramStatus, DeepgramResult } from './arena-deepgram.types.ts';
import { fetchDeepgramToken } from './arena-deepgram.token.ts';
import { clampDeepgram } from '../contracts/dependency-clamps.ts';

export type { TranscriptCallback, StatusCallback, DeepgramStatus } from './arena-deepgram.types.ts';

// ============================================================
// MODULE STATE
// ============================================================

let _ws: WebSocket | null = null;
let _recorder: MediaRecorder | null = null;
let _stream: MediaStream | null = null;
let _onTranscript: TranscriptCallback | null = null;
let _onInterim: TranscriptCallback | null = null;
let _onStatus: StatusCallback | null = null;
let _language: string = 'en';
let _active = false;  // true while a turn is in progress
let _reconnecting = false;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _audioBuffer: Blob[] = []; // buffer during reconnect
const RECONNECT_TIMEOUT_MS = 5000;
const CHUNK_INTERVAL_MS = 250;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Start transcription for the current speaker's turn.
 * Call this when it becomes this debater's turn to speak.
 *
 * @param stream - The local mic MediaStream (from webrtc.ts getLocalStream())
 * @param language - BCP-47 language tag (e.g. 'en', 'es', 'fr')
 * @param onTranscript - Called with final transcript text for each utterance
 * @param onInterim - Called with interim (partial) transcript text
 * @param onStatus - Called when connection status changes
 */
export async function startTranscription(
  stream: MediaStream,
  language: string,
  onTranscript: TranscriptCallback,
  onInterim?: TranscriptCallback,
  onStatus?: StatusCallback,
): Promise<void> {
  // Prevent double-start
  if (_active) {
    console.warn('[Deepgram] startTranscription called while already active');
    return;
  }

  _active = true;
  _stream = stream;
  _language = language || 'en';
  _onTranscript = onTranscript;
  _onInterim = onInterim || null;
  _onStatus = onStatus || null;
  _audioBuffer = [];

  emitStatus('connecting');
  await connect();
}

/**
 * Stop transcription. Call on turn end or debate end.
 * Sends Finalize to flush pending transcript, then closes cleanly.
 */
export function stopTranscription(): void {
  if (!_active) return;
  _active = false;
  clearReconnectTimer();

  // Finalize: flush any pending transcript before closing
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    try {
      _ws.send(JSON.stringify({ type: 'Finalize' }));
    } catch { /* ignore */ }
    // Give Deepgram a moment to return final results, then close
    setTimeout(() => closeCleanly(), 500);
  } else {
    closeCleanly();
  }
}

/**
 * Whether transcription is currently active.
 */
export function isTranscribing(): boolean {
  return _active;
}

// ============================================================
// CONNECTION LIFECYCLE
// ============================================================

async function connect(): Promise<void> {
  // Step 1: Get temporary JWT from Edge Function
  const token = await fetchDeepgramToken();
  if (!token) {
    console.error('[Deepgram] Failed to get token');
    emitStatus('error');
    // Don't kill the turn — text input still works
    return;
  }

  if (!_active) return; // turn ended while fetching token

  // Step 2: Open WebSocket to Deepgram
  const params = new URLSearchParams({
    model: 'nova-3',
    language: _language,
    punctuate: 'true',
    smart_format: 'true',
    interim_results: 'true',
    endpointing: '300',
    vad_events: 'true',
  });

  const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

  try {
    // Browser WebSocket can't set Authorization header — use Sec-WebSocket-Protocol
    _ws = new WebSocket(url, ['token', token]);
  } catch (err) {
    console.error('[Deepgram] WebSocket constructor error:', err);
    emitStatus('error');
    return;
  }

  _ws.onopen = () => {
    console.debug('[Deepgram] WebSocket connected');
    _reconnecting = false;
    emitStatus('live');

    // Send any buffered audio from a reconnect
    if (_audioBuffer.length > 0) {
      console.debug(`[Deepgram] Sending ${_audioBuffer.length} buffered chunks`);
      for (const chunk of _audioBuffer) {
        if (_ws && _ws.readyState === WebSocket.OPEN) {
          _ws.send(chunk);
        }
      }
      _audioBuffer = [];
    }

    // Start recording mic audio
    startRecording();
  };

  _ws.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (msg.type === 'Results') {
        handleResult(msg as DeepgramResult);
      }
      // Metadata, SpeechStarted, UtteranceEnd — logged but not acted on
    } catch {
      // Binary or unparseable — ignore
    }
  };

  _ws.onerror = (event: Event) => {
    console.warn('[Deepgram] WebSocket error:', event);
  };

  _ws.onclose = (event: CloseEvent) => {
    console.debug(`[Deepgram] WebSocket closed: code=${event.code} reason=${event.reason}`);
    stopRecording();

    if (_active && !_reconnecting) {
      // Unexpected close during active turn — attempt reconnect (Tier 1)
      attemptReconnect();
    }
  };
}

function handleResult(msg: DeepgramResult): void {
  const alt = msg.channel?.alternatives?.[0];
  if (!alt) return;

  const text = alt.transcript?.trim();
  if (!text) return;

  if (msg.is_final) {
    // Final transcript — post to feed
    if (_onTranscript) _onTranscript(text);
  } else {
    // Interim — show live indicator (no DB write)
    if (_onInterim) _onInterim(text);
  }
}

// ============================================================
// AUDIO RECORDING
// ============================================================

function startRecording(): void {
  if (!_stream || _recorder) return;

  try {
    // Prefer webm/opus — Deepgram auto-detects encoding
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''; // browser default

    const options: MediaRecorderOptions = {};
    if (mimeType) options.mimeType = mimeType;

    _recorder = new MediaRecorder(_stream, options);

    _recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size === 0) return;

      if (_ws && _ws.readyState === WebSocket.OPEN) {
        _ws.send(event.data);
      } else if (_reconnecting) {
        // Buffer during reconnect (Tier 1)
        _audioBuffer.push(event.data);
      }
    };

    _recorder.onerror = (event: Event) => {
      console.error('[Deepgram] MediaRecorder error:', event);
    };

    _recorder.start(CHUNK_INTERVAL_MS);
    console.debug(`[Deepgram] MediaRecorder started (${mimeType || 'default'}, ${CHUNK_INTERVAL_MS}ms chunks)`);
  } catch (err) {
    console.error('[Deepgram] MediaRecorder start failed:', err);
    // Fall back to text-only — don't break the debate
    emitStatus('error');
  }
}

function stopRecording(): void {
  if (_recorder) {
    try {
      if (_recorder.state !== 'inactive') _recorder.stop();
    } catch { /* ignore */ }
    _recorder = null;
  }
}

// ============================================================
// THREE-TIER FALLBACK
// ============================================================

function attemptReconnect(): void {
  _reconnecting = true;
  console.debug('[Deepgram] Attempting reconnect (Tier 1)...');
  // Keep MediaRecorder running — buffer audio
  // Don't stop recording, just disconnect WS and reconnect

  clearReconnectTimer();

  // Tier 2 timer: if we can't reconnect within 5s, show "paused"
  _reconnectTimer = setTimeout(() => {
    if (_active && _reconnecting) {
      console.warn('[Deepgram] Reconnect timeout — entering Tier 2 (paused)');
      emitStatus('paused');
      // Keep trying every 10s
      tryReconnectLoop();
    }
  }, RECONNECT_TIMEOUT_MS);

  // Immediate retry
  void connect();
}

function tryReconnectLoop(): void {
  if (!_active || !_reconnecting) return;

  // Retry every 10s while turn is active
  _reconnectTimer = setTimeout(async () => {
    if (!_active || !_reconnecting) return;
    console.debug('[Deepgram] Retry reconnect...');
    await connect();
    // If still reconnecting after connect attempt, loop
    if (_active && _reconnecting) {
      tryReconnectLoop();
    }
  }, 10000);
}

// ============================================================
// CLEANUP
// ============================================================

function closeCleanly(): void {
  stopRecording();

  if (_ws) {
    try {
      if (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING) {
        _ws.send(JSON.stringify({ type: 'CloseStream' }));
        _ws.close(1000, 'Turn ended');
      }
    } catch { /* ignore */ }
    _ws = null;
  }

  _audioBuffer = [];
  _reconnecting = false;
  clearReconnectTimer();
  emitStatus('stopped');
}

function clearReconnectTimer(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

function emitStatus(status: DeepgramStatus): void {
  clampDeepgram(status);
  if (_onStatus) _onStatus(status);
}

/**
 * Full cleanup — call on debate end / room exit.
 */
export function cleanupDeepgram(): void {
  _active = false;
  closeCleanly();
  _onTranscript = null;
  _onInterim = null;
  _onStatus = null;
  _stream = null;
}
