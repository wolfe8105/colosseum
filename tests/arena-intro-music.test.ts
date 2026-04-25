// ============================================================
// ARENA INTRO MUSIC — tests/arena-intro-music.test.ts
// Source: src/arena/arena-intro-music.ts
//
// CLASSIFICATION:
//   INTRO_TRACKS           — Pure data → Pure calculation test
//   playIntroMusic()       — Web Audio + DOM → Behavioral test
//   stopIntroMusic()       — Audio cleanup → Behavioral test
//
// STRATEGY:
//   Mock arena-sounds-core for sfxEnabled/getCtx/osc/noise.
//   Mock Audio constructor to avoid real audio playback.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSfxEnabled = vi.hoisted(() => vi.fn(() => true));
const mockGetCtx     = vi.hoisted(() => vi.fn(() => null));
const mockOsc        = vi.hoisted(() => vi.fn());
const mockNoise      = vi.hoisted(() => vi.fn());

vi.mock('../src/arena/arena-sounds-core.ts', () => ({
  sfxEnabled: mockSfxEnabled,
  getCtx: mockGetCtx,
  osc: mockOsc,
  noise: mockNoise,
}));

import { INTRO_TRACKS, playIntroMusic, stopIntroMusic } from '../src/arena/arena-intro-music.ts';

beforeEach(() => {
  mockSfxEnabled.mockReturnValue(true);
  mockGetCtx.mockReturnValue(null);
  mockOsc.mockReset();
  mockNoise.mockReset();
  stopIntroMusic(); // clear any leftover audio
});

// ── TC1: INTRO_TRACKS has 10 entries ─────────────────────────

describe('TC1 — INTRO_TRACKS: contains 10 tracks', () => {
  it('has exactly 10 tracks', () => {
    expect(INTRO_TRACKS.length).toBe(10);
  });
});

// ── TC2: INTRO_TRACKS — first track is gladiator ─────────────

describe('TC2 — INTRO_TRACKS: first track is gladiator', () => {
  it('has id="gladiator" as first entry', () => {
    expect(INTRO_TRACKS[0]!.id).toBe('gladiator');
  });
});

// ── TC3: INTRO_TRACKS — each has id, label, icon, description ─

describe('TC3 — INTRO_TRACKS: each track has required fields', () => {
  it('all tracks have id, label, icon, description', () => {
    for (const track of INTRO_TRACKS) {
      expect(track.id).toBeTruthy();
      expect(track.label).toBeTruthy();
      expect(track.icon).toBeTruthy();
      expect(track.description).toBeTruthy();
    }
  });
});

// ── TC4: playIntroMusic — no-op when sfxEnabled=false ────────

describe('TC4 — playIntroMusic: no-op when sfxEnabled returns false', () => {
  it('does not call getCtx when sfx disabled', () => {
    mockSfxEnabled.mockReturnValue(false);
    playIntroMusic('gladiator');
    expect(mockGetCtx).not.toHaveBeenCalled();
  });
});

// ── TC5: playIntroMusic — calls getCtx for standard track ────

describe('TC5 — playIntroMusic: calls getCtx for standard track', () => {
  it('calls getCtx when sfx enabled', () => {
    mockSfxEnabled.mockReturnValue(true);
    playIntroMusic('gladiator');
    expect(mockGetCtx).toHaveBeenCalled();
  });
});

// ── TC6: playIntroMusic — no-op when getCtx returns null ─────

describe('TC6 — playIntroMusic: no-op when getCtx returns null', () => {
  it('does not throw when ctx is null', () => {
    mockGetCtx.mockReturnValue(null);
    expect(() => playIntroMusic('gladiator')).not.toThrow();
  });
});

// ── TC7: playIntroMusic — custom track plays Audio element ───

describe('TC7 — playIntroMusic: custom track creates Audio element', () => {
  it('calls Audio play for custom track with URL', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    const MockAudio = vi.fn(() => ({
      play: mockPlay,
      pause: vi.fn(),
      volume: 0,
    }));
    vi.stubGlobal('Audio', MockAudio);

    playIntroMusic('custom', 'https://example.com/track.mp3');
    expect(MockAudio).toHaveBeenCalledWith('https://example.com/track.mp3');
    expect(mockPlay).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

// ── TC8: stopIntroMusic — does not throw ─────────────────────

describe('TC8 — stopIntroMusic: does not throw', () => {
  it('can be called without error even when no audio playing', () => {
    expect(() => stopIntroMusic()).not.toThrow();
  });
});

// ── TC9: playIntroMusic — unknown trackId falls back to gladiator

describe('TC9 — playIntroMusic: unknown trackId does not throw', () => {
  it('falls back to gladiator for unknown trackId', () => {
    expect(() => playIntroMusic('nonexistent-track')).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-intro-music.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./arena-sounds-core.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-intro-music.ts'),
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
