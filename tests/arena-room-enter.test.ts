// ============================================================
// ARENA ROOM ENTER — tests/arena-room-enter.test.ts
// Source: src/arena/arena-room-enter.ts
//
// CLASSIFICATION:
//   enterRoom() — dispatcher → Integration test
//
// STRATEGY:
//   Mock all side-effect modules.
//   Test live mode routes to enterFeedRoom.
//   Test non-live routes to renderRoom.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet_view       = vi.hoisted(() => vi.fn());
const mockNudge          = vi.hoisted(() => vi.fn());
const mockSafeRpc        = vi.hoisted(() => vi.fn());
const mockIsPlaceholder  = vi.hoisted(() => vi.fn(() => true));
const mockEnterFeedRoom  = vi.hoisted(() => vi.fn());
const mockRenderRoom     = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_view: mockSet_view,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  enterFeedRoom: mockEnterFeedRoom,
}));

vi.mock('../src/arena/arena-room-render.ts', () => ({
  renderRoom: mockRenderRoom,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  stopIntroMusic: vi.fn(),
}));

vi.mock('../src/arena/arena-entrance.ts', () => ({
  playEntranceSequence: vi.fn().mockResolvedValue(undefined),
}));

import { enterRoom } from '../src/arena/arena-room-enter.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

const makeDebate = (overrides = {}): CurrentDebate => ({
  id: 'd-1',
  topic: 'Test',
  mode: 'text',
  role: 'a',
  messages: [],
  ...overrides,
} as unknown as CurrentDebate);

beforeEach(() => {
  mockSet_view.mockReset();
  mockNudge.mockReset();
  mockEnterFeedRoom.mockReset();
  mockRenderRoom.mockReset();
  mockIsPlaceholder.mockReturnValue(true);
});

// ── TC1: enterRoom — sets view to "room" ─────────────────────

describe('TC1 — enterRoom: calls set_view("room")', () => {
  it('updates view state on entry', () => {
    enterRoom(makeDebate());
    expect(mockSet_view).toHaveBeenCalledWith('room');
  });
});

// ── TC2: enterRoom — live mode calls enterFeedRoom ───────────

describe('TC2 — enterRoom: live mode routes to enterFeedRoom', () => {
  it('calls enterFeedRoom for live mode', () => {
    enterRoom(makeDebate({ mode: 'live', id: 'placeholder-123' }));
    expect(mockEnterFeedRoom).toHaveBeenCalledTimes(1);
  });
});

// ── TC3: enterRoom — non-live does not call enterFeedRoom ────

describe('TC3 — enterRoom: non-live mode does not call enterFeedRoom', () => {
  it('does not call enterFeedRoom for text mode', () => {
    enterRoom(makeDebate({ mode: 'text' }));
    expect(mockEnterFeedRoom).not.toHaveBeenCalled();
  });
});

// ── TC4: enterRoom — live nudges user ────────────────────────

describe('TC4 — enterRoom: live mode calls nudge', () => {
  it('calls nudge with enter_debate for live mode', () => {
    enterRoom(makeDebate({ mode: 'live', id: 'placeholder-123' }));
    expect(mockNudge).toHaveBeenCalledWith('enter_debate', expect.any(String));
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-enter.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../nudge.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-core.utils.ts',
      './arena-feed-room.ts',
      './arena-room-render.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-enter.ts'),
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
