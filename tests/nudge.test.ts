// ============================================================
// NUDGE — tests/nudge.test.ts
// Source: src/nudge.ts
//
// CLASSIFICATION:
//   nudge() — Behavioral/side effect: reads sessionStorage + localStorage,
//              calls showToast when conditions pass → Behavioral test
//
// IMPORTS:
//   { showToast } from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  FEATURES: { shareLinks: true },
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

import { nudge } from '../src/nudge.ts';

beforeEach(() => {
  mockShowToast.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});

// ── nudge: basic fire ─────────────────────────────────────────

describe('TC1 — nudge: fires showToast on first call', () => {
  it('calls showToast with the message on a fresh nudge', () => {
    nudge('welcome', 'Welcome to the app!');

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Welcome to the app!', 'info');
  });
});

describe('TC2 — nudge: import contract — calls showToast', () => {
  it('showToast mock is called (import contract)', () => {
    nudge('test-import', 'Test');
    expect(mockShowToast).toHaveBeenCalled();
  });
});

describe('TC3 — nudge: passes type through to showToast', () => {
  it('passes "success" type to showToast', () => {
    nudge('success-nudge', 'Great job!', 'success');
    expect(mockShowToast).toHaveBeenCalledWith('Great job!', 'success');
  });
});

// ── nudge: session suppression ────────────────────────────────

describe('TC4 — nudge: suppressed on second call with same ID', () => {
  it('does not fire showToast when the same ID already fired this session', () => {
    nudge('dup-id', 'First time');
    mockShowToast.mockReset();

    nudge('dup-id', 'Second time — should be suppressed');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('TC5 — nudge: different IDs can all fire in same session (up to cap)', () => {
  it('fires for different IDs independently', () => {
    nudge('id-1', 'Msg 1');
    nudge('id-2', 'Msg 2');

    expect(mockShowToast).toHaveBeenCalledTimes(2);
  });
});

// ── nudge: session cap ────────────────────────────────────────

describe('TC6 — nudge: 4th unique nudge is suppressed (session cap = 3)', () => {
  it('stops firing after 3 nudges per session', () => {
    nudge('cap-1', 'One');
    nudge('cap-2', 'Two');
    nudge('cap-3', 'Three');
    mockShowToast.mockReset();

    nudge('cap-4', 'Four — should be blocked by session cap');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// ── nudge: 24h cooldown ───────────────────────────────────────

describe('TC7 — nudge: suppressed when 24h cooldown has not expired', () => {
  it('does not fire when the same ID was shown less than 24h ago', () => {
    // Manually write recent history
    const history: Record<string, number> = { 'cooldown-id': Date.now() - 1000 }; // 1s ago
    localStorage.setItem('mod_nudge_history', JSON.stringify(history));

    nudge('cooldown-id', 'Should be blocked by cooldown');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('TC8 — nudge: fires when 24h cooldown has expired', () => {
  it('fires when the history entry is older than 24h', () => {
    const TWENTY_FIVE_HOURS_AGO = Date.now() - 25 * 60 * 60 * 1000;
    const history: Record<string, number> = { 'old-id': TWENTY_FIVE_HOURS_AGO };
    localStorage.setItem('mod_nudge_history', JSON.stringify(history));

    nudge('old-id', 'Should fire — cooldown expired');

    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/nudge.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/nudge.ts'),
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
