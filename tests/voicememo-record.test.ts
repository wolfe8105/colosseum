import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

import {
  startRecording,
  stopRecording,
  cancelRecording,
  cleanupPendingRecording,
  isRecordingState,
} from '../src/voicememo.record.ts';

// ── Browser API stubs ──────────────────────────────────────────

function makeTrack() {
  return { stop: vi.fn() };
}

function makeStream(tracks = [makeTrack()]) {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

function makeMediaRecorder(stream: MediaStream, opts: MediaRecorderOptions = {}) {
  const mr = {
    mimeType: opts.mimeType ?? 'audio/webm',
    ondataavailable: null as ((e: BlobEvent) => void) | null,
    onstop: null as (() => void) | null,
    start: vi.fn(),
    stop: vi.fn().mockImplementation(function (this: typeof mr) {
      // Simulate synchronous onstop
      if (this.onstop) this.onstop();
    }),
  };
  return mr;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockShowToast.mockReset();
  document.body.innerHTML = '';
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
  global.URL.revokeObjectURL = vi.fn();
});

// ── stopRecording — no recorder ────────────────────────────────

describe('TC1 — stopRecording returns null when not recording', () => {
  it('returns null when called without first starting', async () => {
    const result = await stopRecording();
    expect(result).toBeNull();
  });
});

// ── cancelRecording ────────────────────────────────────────────

describe('TC2 — cancelRecording removes vm-recorder-sheet', () => {
  it('vm-recorder-sheet is removed from DOM', () => {
    document.body.innerHTML = '<div id="vm-recorder-sheet"></div>';
    cancelRecording();
    expect(document.getElementById('vm-recorder-sheet')).toBeNull();
  });
});

describe('TC3 — cancelRecording is a no-op when sheet not in DOM', () => {
  it('does not throw when vm-recorder-sheet is absent', () => {
    expect(() => cancelRecording()).not.toThrow();
  });
});

// ── cleanupPendingRecording ────────────────────────────────────

describe('TC4 — cleanupPendingRecording calls revokeObjectURL for url', () => {
  it('URL.revokeObjectURL called with provided url', () => {
    cleanupPendingRecording('blob:fake-url');
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});

describe('TC5 — cleanupPendingRecording skips revoke when url is null', () => {
  it('URL.revokeObjectURL not called when url is null', () => {
    cleanupPendingRecording(null);
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('TC6 — cleanupPendingRecording does not throw', () => {
  it('no exception for null url and no active recording', () => {
    expect(() => cleanupPendingRecording(null)).not.toThrow();
  });
});

// ── isRecordingState ───────────────────────────────────────────

describe('TC7 — isRecordingState is initially false', () => {
  it('isRecordingState starts as false', () => {
    // After clean test run, no recording has started
    expect(isRecordingState).toBe(false);
  });
});

// ── startRecording — getUserMedia failure ──────────────────────

describe('TC8 — startRecording shows toast on getUserMedia denial', () => {
  it('showToast called when getUserMedia rejects', async () => {
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
    } as unknown as MediaDevices;

    await startRecording();

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Microphone access denied'));
  });
});

describe('TC9 — startRecording returns false on getUserMedia denial', () => {
  it('returns false when microphone access is denied', async () => {
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
    } as unknown as MediaDevices;

    const result = await startRecording();

    expect(result).toBe(false);
  });
});

// ── startRecording — success path ─────────────────────────────

describe('TC10 — startRecording returns true on success', () => {
  it('returns true when getUserMedia and MediaRecorder succeed', async () => {
    const stream = makeStream();
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
    } as unknown as MediaDevices;

    const mr = makeMediaRecorder(stream);
    global.MediaRecorder = vi.fn().mockImplementation(() => mr) as unknown as typeof MediaRecorder;
    (global.MediaRecorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = () => false;

    global.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
      createAnalyser: vi.fn().mockReturnValue({ fftSize: 0, frequencyBinCount: 0, getByteFrequencyData: vi.fn() }),
      close: vi.fn().mockResolvedValue(undefined),
    })) as unknown as typeof AudioContext;

    global.requestAnimationFrame = vi.fn() as unknown as typeof requestAnimationFrame;

    const result = await startRecording();

    expect(result).toBe(true);

    // Clean up: stop the interval that startRecording set
    cancelRecording();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — voicememo.record.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/voicememo.record.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
