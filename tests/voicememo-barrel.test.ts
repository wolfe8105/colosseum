import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

let mockVoiceMemoFeature: boolean | undefined = true;

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return { voiceMemo: mockVoiceMemoFeature }; },
}));

vi.mock('../src/voicememo.record.ts', () => ({
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  cancelRecording: vi.fn(),
  cleanupPendingRecording: vi.fn(),
  isRecordingState: false,
  RecordingResult: {},
}));

vi.mock('../src/voicememo.upload.ts', () => ({
  uploadVoiceMemo: vi.fn(),
  revokeAllFallbackURLs: vi.fn(),
}));

vi.mock('../src/voicememo.player.ts', () => ({
  renderPlayer: vi.fn(),
  playInline: vi.fn(),
  togglePlayback: vi.fn(),
}));

vi.mock('../src/voicememo.sheet.ts', () => ({
  openRecorderSheet: vi.fn(),
  closeRecorderSheet: vi.fn(),
  toggleRecord: vi.fn(),
  retake: vi.fn(),
  send: vi.fn(),
}));

import {
  _currentUsername,
  _truncate,
  isEnabled,
  recordTake,
  replyToTake,
  debateReply,
} from '../src/voicememo.ts';
import { openRecorderSheet } from '../src/voicememo.sheet.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockVoiceMemoFeature = true;
  vi.mocked(openRecorderSheet).mockReset();
});

// ── _currentUsername ───────────────────────────────────────────

describe('TC1 — _currentUsername returns "Gladiator"', () => {
  it('returns the string "Gladiator"', () => {
    expect(_currentUsername()).toBe('Gladiator');
  });
});

// ── _truncate ──────────────────────────────────────────────────

describe('TC2 — _truncate returns empty string for nullish input', () => {
  it('returns "" for null', () => { expect(_truncate(null, 10)).toBe(''); });
  it('returns "" for undefined', () => { expect(_truncate(undefined, 10)).toBe(''); });
  it('returns "" for empty string', () => { expect(_truncate('', 10)).toBe(''); });
});

describe('TC3 — _truncate returns original string when shorter than max', () => {
  it('does not truncate when str.length <= max', () => {
    expect(_truncate('hello', 10)).toBe('hello');
  });
});

describe('TC4 — _truncate adds ellipsis when longer than max', () => {
  it('truncates and appends ...', () => {
    expect(_truncate('hello world', 5)).toBe('hello...');
  });
});

// ── isEnabled ──────────────────────────────────────────────────

describe('TC5 — isEnabled returns true when FEATURES.voiceMemo is not false', () => {
  it('returns true when voiceMemo feature is true', () => {
    mockVoiceMemoFeature = true;
    expect(isEnabled()).toBe(true);
  });
});

describe('TC6 — isEnabled returns false when FEATURES.voiceMemo is false', () => {
  it('returns false when voiceMemo feature is disabled', () => {
    mockVoiceMemoFeature = false;
    expect(isEnabled()).toBe(false);
  });
});

// ── recordTake ─────────────────────────────────────────────────

describe('TC7 — recordTake calls openRecorderSheet with section', () => {
  it('openRecorderSheet called with section object', () => {
    recordTake('politics');
    expect(openRecorderSheet).toHaveBeenCalledWith({ section: 'politics' });
  });
});

describe('TC8 — recordTake defaults section to trending', () => {
  it('openRecorderSheet called with section=trending when no arg', () => {
    recordTake();
    expect(openRecorderSheet).toHaveBeenCalledWith({ section: 'trending' });
  });
});

// ── replyToTake ────────────────────────────────────────────────

describe('TC9 — replyToTake calls openRecorderSheet with replyTo context', () => {
  it('openRecorderSheet called with takeId, username, takeText, section', () => {
    replyToTake('take-1', 'PatW', 'Great point', 'politics');
    expect(openRecorderSheet).toHaveBeenCalledWith({
      replyTo: 'PatW',
      replyText: 'Great point',
      parentTakeId: 'take-1',
      section: 'politics',
    });
  });
});

// ── debateReply ────────────────────────────────────────────────

describe('TC10 — debateReply calls openRecorderSheet with debateId and topic', () => {
  it('openRecorderSheet called with debateId, topic, section', () => {
    debateReply('debate-1', 'Climate Change', 'arena');
    expect(openRecorderSheet).toHaveBeenCalledWith({
      debateId: 'debate-1',
      topic: 'Climate Change',
      section: 'arena',
    });
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — voicememo.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './voicememo.record.ts',
      './voicememo.upload.ts',
      './voicememo.player.ts',
      './voicememo.sheet.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/voicememo.ts'),
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
