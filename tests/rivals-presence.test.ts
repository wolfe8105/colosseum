// ============================================================
// RIVALS PRESENCE — tests/rivals-presence.test.ts
// Source: src/rivals-presence.ts
//
// CLASSIFICATION:
//   init()    — Orchestration with guards → Integration test
//   destroy() — Side-effect cleanup → Behavioral test
//
// IMPORTS:
//   { getSupabaseClient, getCurrentUser, getIsPlaceholderMode } from './auth.ts'
//   { FEATURES }                                                  from './config.ts'
//   { buildRivalSet, startPresence }                              from './rivals-presence-channel.ts'
//   { queueAlert }                                                from './rivals-presence-popup.ts'
//   import type { ... }                                           — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockFeatures = vi.hoisted(() => ({ rivals: true }));
const mockBuildRivalSet = vi.hoisted(() => vi.fn(async () => {}));
const mockStartPresence = vi.hoisted(() => vi.fn(async () => {}));
const mockQueueAlert = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getCurrentUser: mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  safeRpc: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return mockFeatures; },
}));

vi.mock('../src/rivals-presence-channel.ts', () => ({
  buildRivalSet: mockBuildRivalSet,
  startPresence: mockStartPresence,
}));

vi.mock('../src/rivals-presence-popup.ts', () => ({
  queueAlert: mockQueueAlert,
}));

import { init, destroy } from '../src/rivals-presence.ts';

beforeEach(() => {
  mockBuildRivalSet.mockReset().mockResolvedValue(undefined);
  mockStartPresence.mockReset().mockResolvedValue(undefined);
  mockQueueAlert.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue(null);
  mockGetSupabaseClient.mockReturnValue(null);
  Object.assign(mockFeatures, { rivals: true });
  document.body.innerHTML = '';
  // destroy between tests to reset `initialized` flag
  destroy();
});

// ── init ──────────────────────────────────────────────────────

describe('TC1 — init: no-op when FEATURES.rivals is false', () => {
  it('does not call buildRivalSet when feature disabled', async () => {
    mockFeatures.rivals = false;

    await init();

    expect(mockBuildRivalSet).not.toHaveBeenCalled();
  });
});

describe('TC2 — init: no-op in placeholder mode', () => {
  it('does not call buildRivalSet in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });

    await init();

    expect(mockBuildRivalSet).not.toHaveBeenCalled();
  });
});

describe('TC3 — init: no-op when no user', () => {
  it('does not call buildRivalSet when getCurrentUser returns null', async () => {
    mockGetCurrentUser.mockReturnValue(null);

    await init();

    expect(mockBuildRivalSet).not.toHaveBeenCalled();
  });
});

describe('TC4 — init: calls buildRivalSet and startPresence for authenticated user', () => {
  it('builds rival set and starts presence channel when all guards pass', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });

    await init();

    expect(mockBuildRivalSet).toHaveBeenCalled();
    expect(mockStartPresence).toHaveBeenCalled();
  });
});

describe('TC5 — init: only initializes once per session', () => {
  it('second init call skips buildRivalSet (initialized guard)', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });

    await init();
    await init(); // second call

    expect(mockBuildRivalSet).toHaveBeenCalledTimes(1);
  });
});

// ── destroy ───────────────────────────────────────────────────

describe('TC6 — destroy: removes rival-alert-popup from DOM', () => {
  it('removes #rival-alert-popup element if present', () => {
    document.body.innerHTML = '<div id="rival-alert-popup"></div>';

    destroy();

    expect(document.getElementById('rival-alert-popup')).toBeNull();
  });
});

describe('TC7 — destroy: resets initialized flag so init can run again', () => {
  it('allows init to call buildRivalSet again after destroy', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });

    await init();
    destroy();
    await init(); // should work again

    expect(mockBuildRivalSet).toHaveBeenCalledTimes(2);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/rivals-presence.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './rivals-presence-channel.ts',
      './rivals-presence-popup.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/rivals-presence.ts'),
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
