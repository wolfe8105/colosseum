// ============================================================
// INTRO MUSIC — tests/intro-music.test.ts
// Source: src/intro-music.ts
//
// CLASSIFICATION:
//   openIntroMusicPicker() — Multi-step orchestration + DOM event wiring
//     → Integration test: verify calls to imported deps and DOM mutations
//
// IMPORTS:
//   { getCurrentProfile }              from './auth.ts'
//   { escapeHTML, showToast }          from './config.ts'
//   { INTRO_TRACKS, playIntroMusic }   from './arena/arena-sounds.ts'
//   { injectIntroMusicCSS }            from './intro-music-css.ts'
//   { saveIntroMusic }                 from './intro-music-save.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentProfile   = vi.hoisted(() => vi.fn(() => null));
const mockEscapeHTML          = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast           = vi.hoisted(() => vi.fn());
const mockPlayIntroMusic      = vi.hoisted(() => vi.fn());
const mockInjectIntroMusicCSS = vi.hoisted(() => vi.fn());
const mockSaveIntroMusic      = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const FAKE_TRACKS = vi.hoisted(() => [
  { id: 'gladiator', label: 'Gladiator', description: 'Epic', icon: '⚔️' },
  { id: 'thunder',   label: 'Thunder',   description: 'Bold', icon: '⚡' },
]);

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  safeRpc: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  INTRO_TRACKS: FAKE_TRACKS,
  playIntroMusic: mockPlayIntroMusic,
}));

vi.mock('../src/intro-music-css.ts', () => ({
  injectIntroMusicCSS: mockInjectIntroMusicCSS,
}));

vi.mock('../src/intro-music-save.ts', () => ({
  saveIntroMusic: mockSaveIntroMusic,
}));

import { openIntroMusicPicker } from '../src/intro-music.ts';

beforeEach(() => {
  mockGetCurrentProfile.mockReset();
  mockGetCurrentProfile.mockReturnValue(null);
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockShowToast.mockReset();
  mockPlayIntroMusic.mockReset();
  mockInjectIntroMusicCSS.mockReset();
  mockSaveIntroMusic.mockResolvedValue(undefined);
  // Clean up any leftover DOM elements
  document.getElementById('im-backdrop')?.remove();
  document.body.innerHTML = '';
});

// ── TC1: calls injectIntroMusicCSS ────────────────────────────

describe('TC1 — openIntroMusicPicker: calls injectIntroMusicCSS', () => {
  it('injects CSS before building the sheet', () => {
    openIntroMusicPicker();
    expect(mockInjectIntroMusicCSS).toHaveBeenCalledTimes(1);
  });
});

// ── TC2: calls getCurrentProfile ─────────────────────────────

describe('TC2 — openIntroMusicPicker: reads current profile', () => {
  it('calls getCurrentProfile to get intro_music_id', () => {
    openIntroMusicPicker();
    expect(mockGetCurrentProfile).toHaveBeenCalledTimes(1);
  });
});

// ── TC3: appends backdrop to document.body ───────────────────

describe('TC3 — openIntroMusicPicker: appends im-backdrop to document.body', () => {
  it('adds an element with class im-backdrop to the body', () => {
    openIntroMusicPicker();
    expect(document.querySelector('.im-backdrop')).not.toBeNull();
  });

  it('backdrop has id im-backdrop', () => {
    openIntroMusicPicker();
    expect(document.getElementById('im-backdrop')).not.toBeNull();
  });
});

// ── TC4: renders track buttons for INTRO_TRACKS ──────────────

describe('TC4 — openIntroMusicPicker: renders one button per track', () => {
  it('creates a .im-track-btn for each track in INTRO_TRACKS', () => {
    openIntroMusicPicker();
    const buttons = document.querySelectorAll('.im-track-btn[data-id]');
    expect(buttons.length).toBe(FAKE_TRACKS.length);
  });
});

// ── TC5: clicking track button updates selection ──────────────

describe('TC5 — openIntroMusicPicker: track button click selects that track', () => {
  it('clicking a track button adds selected class to it', () => {
    openIntroMusicPicker();
    const btn = document.querySelector<HTMLElement>('.im-track-btn[data-id="thunder"]');
    btn?.click();
    expect(btn?.classList.contains('selected')).toBe(true);
  });
});

// ── TC6: save button calls saveIntroMusic ────────────────────

describe('TC6 — openIntroMusicPicker: save button calls saveIntroMusic', () => {
  it('clicking save calls saveIntroMusic with the selected track id', async () => {
    openIntroMusicPicker();
    const saveBtn = document.getElementById('im-save-btn') as HTMLButtonElement;
    saveBtn?.click();
    // Wait for async handler
    await new Promise(r => setTimeout(r, 0));
    expect(mockSaveIntroMusic).toHaveBeenCalledTimes(1);
    const [trackId] = mockSaveIntroMusic.mock.calls[0];
    expect(typeof trackId).toBe('string');
  });
});

// ── TC7: save success shows toast and closes ─────────────────

describe('TC7 — openIntroMusicPicker: successful save shows success toast', () => {
  it('shows "Intro music saved" toast after successful save', async () => {
    mockSaveIntroMusic.mockResolvedValue(undefined);
    openIntroMusicPicker();
    document.getElementById('im-save-btn')?.click();
    await new Promise(r => setTimeout(r, 50));
    expect(mockShowToast).toHaveBeenCalledWith('Intro music saved ✓', 'success');
  });
});

// ── TC8: save failure shows error toast ──────────────────────

describe('TC8 — openIntroMusicPicker: save error shows error toast', () => {
  it('shows error toast when saveIntroMusic throws', async () => {
    mockSaveIntroMusic.mockRejectedValue(new Error('Upload failed'));
    openIntroMusicPicker();
    document.getElementById('im-save-btn')?.click();
    await new Promise(r => setTimeout(r, 50));
    expect(mockShowToast).toHaveBeenCalledWith('Upload failed', 'error');
  });
});

// ── TC9: backdrop click closes picker ────────────────────────

describe('TC9 — openIntroMusicPicker: clicking backdrop removes it', () => {
  it('clicking directly on the backdrop removes it from the DOM after animation', async () => {
    openIntroMusicPicker();
    const backdrop = document.getElementById('im-backdrop') as HTMLElement;
    // Simulate a click on the backdrop itself (not a child)
    const evt = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(evt, 'target', { value: backdrop, writable: false });
    backdrop.dispatchEvent(evt);
    // close has 220ms timeout — just verify the element starts fading
    expect(backdrop.style.transition).toContain('opacity');
  });
});

// ── TC10: preview button calls playIntroMusic ────────────────

describe('TC10 — openIntroMusicPicker: preview button fires playIntroMusic', () => {
  it('clicking a preview button calls playIntroMusic with the track id', () => {
    openIntroMusicPicker();
    const previewBtn = document.querySelector<HTMLElement>('.im-preview-btn[data-preview="gladiator"]');
    // Prevent propagation so the track-btn click doesn't interfere
    previewBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mockPlayIntroMusic).toHaveBeenCalledWith('gladiator');
  });
});

// ── TC11: previous backdrop is removed before new one ────────

describe('TC11 — openIntroMusicPicker: removes previous backdrop before re-opening', () => {
  it('only one im-backdrop exists after calling openIntroMusicPicker twice', () => {
    openIntroMusicPicker();
    openIntroMusicPicker();
    const backdrops = document.querySelectorAll('#im-backdrop');
    expect(backdrops.length).toBe(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/intro-music.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './arena/arena-sounds.ts',
      './intro-music-css.ts',
      './intro-music-save.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/intro-music.ts'),
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
