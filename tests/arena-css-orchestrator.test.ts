// ============================================================
// ARENA CSS ORCHESTRATOR — tests/arena-css-orchestrator.test.ts
// Source: src/arena/arena-css.ts
//
// CLASSIFICATION:
//   injectCSS() — Orchestration (calls all section injectors) → Integration test
//
// STRATEGY:
//   Mock arena-state.ts to control cssInjected guard.
//   Mock all section injectors to verify call order and idempotency.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCssInjected      = vi.hoisted(() => ({ value: false }));
const mockSet_cssInjected  = vi.hoisted(() => vi.fn((v: boolean) => { mockCssInjected.value = v; }));

const sectionMocks = vi.hoisted(() => ({
  injectLobbyCSS: vi.fn(),
  injectModeSelectCSS: vi.fn(),
  injectQueueMatchCSS: vi.fn(),
  injectRoomCSS: vi.fn(),
  injectRoomInputCSS: vi.fn(),
  injectPostDebateCSS: vi.fn(),
  injectMiscCSS: vi.fn(),
  injectReferencesCSS: vi.fn(),
  injectRankedCSS: vi.fn(),
  injectPreDebateCSS: vi.fn(),
  injectAfterEffectsCSS: vi.fn(),
  injectModeratorCSS: vi.fn(),
  injectTranscriptCSS: vi.fn(),
  injectUnpluggedCSS: vi.fn(),
  injectFeedRoomCSS: vi.fn(),
  injectFeedSpecChatCSS: vi.fn(),
  injectFeedStreamCSS: vi.fn(),
  injectFeedControlsCSS: vi.fn(),
  injectFeedFireworksCSS: vi.fn(),
  injectReferencesPhase3CSS: vi.fn(),
  injectFeedPhase4_5CSS: vi.fn(),
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get cssInjected() { return mockCssInjected.value; },
  set_cssInjected: mockSet_cssInjected,
  set_view: vi.fn(),
}));

vi.mock('../src/arena/arena-css-lobby.ts', () => ({ injectLobbyCSS: sectionMocks.injectLobbyCSS }));
vi.mock('../src/arena/arena-css-mode-select.ts', () => ({ injectModeSelectCSS: sectionMocks.injectModeSelectCSS }));
vi.mock('../src/arena/arena-css-queue-match.ts', () => ({ injectQueueMatchCSS: sectionMocks.injectQueueMatchCSS }));
vi.mock('../src/arena/arena-css-room.ts', () => ({ injectRoomCSS: sectionMocks.injectRoomCSS }));
vi.mock('../src/arena/arena-css-room-input.ts', () => ({ injectRoomInputCSS: sectionMocks.injectRoomInputCSS }));
vi.mock('../src/arena/arena-css-post-debate.ts', () => ({ injectPostDebateCSS: sectionMocks.injectPostDebateCSS }));
vi.mock('../src/arena/arena-css-misc.ts', () => ({ injectMiscCSS: sectionMocks.injectMiscCSS }));
vi.mock('../src/arena/arena-css-references.ts', () => ({ injectReferencesCSS: sectionMocks.injectReferencesCSS }));
vi.mock('../src/arena/arena-css-ranked.ts', () => ({ injectRankedCSS: sectionMocks.injectRankedCSS }));
vi.mock('../src/arena/arena-css-pre-debate.ts', () => ({ injectPreDebateCSS: sectionMocks.injectPreDebateCSS }));
vi.mock('../src/arena/arena-css-after-effects.ts', () => ({ injectAfterEffectsCSS: sectionMocks.injectAfterEffectsCSS }));
vi.mock('../src/arena/arena-css-moderator.ts', () => ({ injectModeratorCSS: sectionMocks.injectModeratorCSS }));
vi.mock('../src/arena/arena-css-transcript.ts', () => ({ injectTranscriptCSS: sectionMocks.injectTranscriptCSS }));
vi.mock('../src/arena/arena-css-unplugged.ts', () => ({ injectUnpluggedCSS: sectionMocks.injectUnpluggedCSS }));
vi.mock('../src/arena/arena-css-feed-room.ts', () => ({ injectFeedRoomCSS: sectionMocks.injectFeedRoomCSS }));
vi.mock('../src/arena/arena-css-feed-spec-chat.ts', () => ({ injectFeedSpecChatCSS: sectionMocks.injectFeedSpecChatCSS }));
vi.mock('../src/arena/arena-css-feed-stream.ts', () => ({ injectFeedStreamCSS: sectionMocks.injectFeedStreamCSS }));
vi.mock('../src/arena/arena-css-feed-controls.ts', () => ({ injectFeedControlsCSS: sectionMocks.injectFeedControlsCSS }));
vi.mock('../src/arena/arena-css-feed-fireworks.ts', () => ({ injectFeedFireworksCSS: sectionMocks.injectFeedFireworksCSS }));
vi.mock('../src/arena/arena-css-references-phase3.ts', () => ({ injectReferencesPhase3CSS: sectionMocks.injectReferencesPhase3CSS }));
vi.mock('../src/arena/arena-css-feed-phase4-5.ts', () => ({ injectFeedPhase4_5CSS: sectionMocks.injectFeedPhase4_5CSS }));

import { injectCSS } from '../src/arena/arena-css.ts';

beforeEach(() => {
  mockCssInjected.value = false;
  mockSet_cssInjected.mockClear();
  Object.values(sectionMocks).forEach(m => m.mockClear());
});

// ── TC1: injectCSS — calls set_cssInjected(true) ─────────────

describe('TC1 — injectCSS: marks cssInjected as true', () => {
  it('calls set_cssInjected(true)', () => {
    injectCSS();
    expect(mockSet_cssInjected).toHaveBeenCalledWith(true);
  });
});

// ── TC2: injectCSS — calls all section injectors ─────────────

describe('TC2 — injectCSS: calls each section CSS injector', () => {
  it('calls injectLobbyCSS and injectRoomCSS', () => {
    injectCSS();
    expect(sectionMocks.injectLobbyCSS).toHaveBeenCalledTimes(1);
    expect(sectionMocks.injectRoomCSS).toHaveBeenCalledTimes(1);
  });

  it('calls all 21 section injectors', () => {
    injectCSS();
    Object.values(sectionMocks).forEach(m => {
      expect(m).toHaveBeenCalledTimes(1);
    });
  });
});

// ── TC3: injectCSS — idempotent (cssInjected guard) ──────────

describe('TC3 — injectCSS: no-op on second call when cssInjected=true', () => {
  it('does not call any injector when cssInjected is already true', () => {
    mockCssInjected.value = true;
    injectCSS();
    Object.values(sectionMocks).forEach(m => {
      expect(m).not.toHaveBeenCalled();
    });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-css.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-state.ts',
      './arena-css-lobby.ts',
      './arena-css-mode-select.ts',
      './arena-css-queue-match.ts',
      './arena-css-room.ts',
      './arena-css-room-input.ts',
      './arena-css-post-debate.ts',
      './arena-css-misc.ts',
      './arena-css-references.ts',
      './arena-css-ranked.ts',
      './arena-css-pre-debate.ts',
      './arena-css-after-effects.ts',
      './arena-css-moderator.ts',
      './arena-css-transcript.ts',
      './arena-css-unplugged.ts',
      './arena-css-feed-room.ts',
      './arena-css-feed-spec-chat.ts',
      './arena-css-feed-stream.ts',
      './arena-css-feed-controls.ts',
      './arena-css-feed-fireworks.ts',
      './arena-css-references-phase3.ts',
      './arena-css-feed-phase4-5.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-css.ts'),
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
