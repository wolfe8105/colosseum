import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
}));

const mockStartRecording = vi.hoisted(() => vi.fn());
const mockStopRecording = vi.hoisted(() => vi.fn());
let mockIsRecordingState = false;

vi.mock('../src/voicememo.record.ts', () => ({
  get isRecordingState() { return mockIsRecordingState; },
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  RecordingResult: {},
}));

const mockResetPlayingState = vi.hoisted(() => vi.fn());

vi.mock('../src/voicememo.player.ts', () => ({
  resetPlayingState: mockResetPlayingState,
}));

const mockUploadVoiceMemo = vi.hoisted(() => vi.fn());

vi.mock('../src/voicememo.upload.ts', () => ({
  uploadVoiceMemo: mockUploadVoiceMemo,
}));

// voicememo.ts is imported for RecorderContext type only
vi.mock('../src/voicememo.ts', () => ({}));

import {
  openRecorderSheet,
  closeRecorderSheet,
  toggleRecord,
  retake,
  send,
} from '../src/voicememo.sheet.ts';

// ── Setup ──────────────────────────────────────────────────────

const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  mockShowToast.mockReset();
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockStartRecording.mockReset();
  mockStopRecording.mockReset();
  mockResetPlayingState.mockReset();
  mockUploadVoiceMemo.mockReset();
  mockRevokeObjectURL.mockReset();
  mockIsRecordingState = false;
  document.body.innerHTML = '';
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

// ── openRecorderSheet ──────────────────────────────────────────

describe('TC1 — openRecorderSheet is a stub that does not throw', () => {
  it('calling openRecorderSheet does not throw', () => {
    expect(() => openRecorderSheet({ section: 'trending' })).not.toThrow();
  });
});

// ── closeRecorderSheet ─────────────────────────────────────────

describe('TC2 — closeRecorderSheet removes vm-recorder-sheet from DOM', () => {
  it('sheet element is removed after closeRecorderSheet', () => {
    document.body.innerHTML = '<div id="vm-recorder-sheet"></div>';
    closeRecorderSheet();
    expect(document.getElementById('vm-recorder-sheet')).toBeNull();
  });
});

describe('TC3 — closeRecorderSheet is a no-op when sheet not in DOM', () => {
  it('does not throw when vm-recorder-sheet is absent', () => {
    expect(() => closeRecorderSheet()).not.toThrow();
  });
});

// ── toggleRecord ───────────────────────────────────────────────

describe('TC4 — toggleRecord calls startRecording when not recording', () => {
  it('startRecording is called when isRecordingState is false', async () => {
    mockIsRecordingState = false;
    mockStartRecording.mockResolvedValue(undefined);

    await toggleRecord();

    expect(mockStartRecording).toHaveBeenCalled();
  });
});

describe('TC5 — toggleRecord calls stopRecording when recording', () => {
  it('stopRecording is called when isRecordingState is true', async () => {
    mockIsRecordingState = true;
    mockStopRecording.mockResolvedValue(null);

    await toggleRecord();

    expect(mockStopRecording).toHaveBeenCalled();
  });
});

describe('TC6 — toggleRecord stores result from stopRecording', () => {
  it('stopRecording result is stored as pendingRecording', async () => {
    mockIsRecordingState = true;
    const result = { blob: new Blob(), url: 'blob:fake', duration: 30 };
    mockStopRecording.mockResolvedValue(result);

    await toggleRecord();

    // Verify by calling send() which will use pendingRecording
    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockUploadVoiceMemo.mockResolvedValue({ url: 'blob:fake', path: 'placeholder/123.webm' });
    await send();
    expect(mockUploadVoiceMemo).toHaveBeenCalled();
  });
});

// ── retake ─────────────────────────────────────────────────────

describe('TC7 — retake resets timer text', () => {
  it('vm-timer text becomes 0:00 after retake', () => {
    document.body.innerHTML = `
      <div id="vm-preview" class="visible"></div>
      <div id="vm-timer" class="">1:30</div>
      <div id="vm-hint">old</div>`;

    retake();

    expect(document.getElementById('vm-timer')!.textContent).toBe('0:00');
  });
});

describe('TC8 — retake removes visible class from preview', () => {
  it('vm-preview loses visible class after retake', () => {
    document.body.innerHTML = `<div id="vm-preview" class="visible"></div>`;

    retake();

    expect(document.getElementById('vm-preview')!.classList.contains('visible')).toBe(false);
  });
});

describe('TC9 — retake calls resetPlayingState', () => {
  it('resetPlayingState import contract — called during retake', () => {
    retake();
    expect(mockResetPlayingState).toHaveBeenCalled();
  });
});

describe('TC10 — retake resets hint text', () => {
  it('vm-hint text is updated after retake', () => {
    document.body.innerHTML = `<div id="vm-hint">old hint</div>`;

    retake();

    expect(document.getElementById('vm-hint')!.textContent).toContain('Tap to record');
  });
});

// ── send ───────────────────────────────────────────────────────

describe('TC11 — send is a no-op when pendingRecording is null', () => {
  it('send returns early without calling uploadVoiceMemo when no pending recording', async () => {
    // Ensure pendingRecording is null by not having stopped recording
    await send();
    expect(mockUploadVoiceMemo).not.toHaveBeenCalled();
  });
});

describe('TC12 — send shows sending toast', () => {
  it('showToast called with sending message when pendingRecording is set', async () => {
    // Set pendingRecording via toggleRecord
    mockIsRecordingState = true;
    mockStopRecording.mockResolvedValue({ blob: new Blob(), url: 'blob:x', duration: 10 });
    await toggleRecord();

    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockUploadVoiceMemo.mockResolvedValue({ url: 'blob:x', path: 'placeholder/123.webm' });
    await send();

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Sending'));
  });
});

describe('TC13 — send calls uploadVoiceMemo after stopRecording', () => {
  it('uploadVoiceMemo is called when pendingRecording is set via toggleRecord', async () => {
    mockIsRecordingState = true;
    mockStopRecording.mockResolvedValue({ blob: new Blob(), url: null, duration: 10 });
    await toggleRecord();

    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockUploadVoiceMemo.mockResolvedValue({ url: 'blob:u', path: 'placeholder/x.webm' });
    await send();

    expect(mockUploadVoiceMemo).toHaveBeenCalled();
  });
});

describe('TC14 — send calls create_voice_take RPC in non-placeholder mode', () => {
  it('safeRpc called with create_voice_take when not placeholder', async () => {
    mockIsRecordingState = true;
    mockStopRecording.mockResolvedValue({ blob: new Blob(), url: null, duration: 15 });
    await toggleRecord();

    mockGetIsPlaceholderMode.mockReturnValue(false);
    mockUploadVoiceMemo.mockResolvedValue({ url: 'https://cdn.example.com/x.webm', path: 'voice-memos/u/d.webm' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    await send();

    expect(mockSafeRpc).toHaveBeenCalledWith('create_voice_take', expect.any(Object));
  });
});

describe('TC15 — send shows success toast after successful send', () => {
  it('showToast called with success message after send completes', async () => {
    mockIsRecordingState = true;
    mockStopRecording.mockResolvedValue({ blob: new Blob(), url: null, duration: 10 });
    await toggleRecord();

    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockUploadVoiceMemo.mockResolvedValue({ url: 'blob:y', path: 'placeholder/y.webm' });
    await send();

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('posted'));
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — voicememo.sheet.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './voicememo.record.ts',
      './voicememo.ts',
      './voicememo.player.ts',
      './voicememo.upload.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/voicememo.sheet.ts'),
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
