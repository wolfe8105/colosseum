// ============================================================
// ARENA ROOM END TRANSCRIPT — tests/arena-room-end-transcript.test.ts
// Source: src/arena/arena-room-end-transcript.ts
//
// CLASSIFICATION:
//   attachTranscriptHandler() — DOM event wiring → Integration test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockEscapeHTML        = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { attachTranscriptHandler } from '../src/arena/arena-room-end-transcript.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

const makeDebate = (overrides = {}): CurrentDebate => ({
  id: 'd-1',
  topic: 'AI will rule',
  mode: 'text',
  role: 'a',
  opponentName: 'Bob',
  messages: [],
  ...overrides,
} as unknown as CurrentDebate);

beforeEach(() => {
  document.body.innerHTML = '<button id="arena-transcript">VIEW TRANSCRIPT</button>';
  mockGetCurrentProfile.mockReturnValue({ display_name: 'Alice' });
  mockEscapeHTML.mockImplementation((s: string) => s);
});

// ── TC1: no-op when #arena-transcript missing ─────────────────

describe('TC1 — attachTranscriptHandler: no-op when #arena-transcript missing', () => {
  it('does not throw when button absent', () => {
    document.body.innerHTML = '';
    expect(() => attachTranscriptHandler(makeDebate())).not.toThrow();
  });
});

// ── TC2: click creates overlay ────────────────────────────────

describe('TC2 — attachTranscriptHandler: click creates transcript overlay', () => {
  it('appends #arena-transcript-overlay to body', () => {
    attachTranscriptHandler(makeDebate());
    document.getElementById('arena-transcript')!.click();
    expect(document.getElementById('arena-transcript-overlay')).not.toBeNull();
  });
});

// ── TC3: empty messages shows empty state ─────────────────────

describe('TC3 — attachTranscriptHandler: empty messages shows no-messages text', () => {
  it('shows "No messages recorded" for empty messages', () => {
    attachTranscriptHandler(makeDebate({ messages: [] }));
    document.getElementById('arena-transcript')!.click();
    expect(document.body.innerHTML).toContain('No messages recorded');
  });
});

// ── TC4: messages are rendered with escapeHTML ────────────────

describe('TC4 — attachTranscriptHandler: escapes message content', () => {
  it('passes message text through escapeHTML', () => {
    const debate = makeDebate({
      messages: [{ text: '<b>XSS</b>', role: 'user', round: 1 }],
    });
    attachTranscriptHandler(debate);
    document.getElementById('arena-transcript')!.click();
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>XSS</b>');
  });
});

// ── TC5: escapes topic in overlay ────────────────────────────

describe('TC5 — attachTranscriptHandler: escapes topic in overlay header', () => {
  it('passes topic through escapeHTML', () => {
    const debate = makeDebate({ topic: '<b>Hot Topic</b>' });
    attachTranscriptHandler(debate);
    document.getElementById('arena-transcript')!.click();
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Hot Topic</b>');
  });
});

// ── TC6: overlay removed on backdrop click ────────────────────

describe('TC6 — attachTranscriptHandler: backdrop click removes overlay', () => {
  it('removes overlay when clicking the backdrop', () => {
    attachTranscriptHandler(makeDebate());
    document.getElementById('arena-transcript')!.click();
    const overlay = document.getElementById('arena-transcript-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('arena-transcript-overlay')).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-end-transcript.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './arena-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-transcript.ts'),
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
