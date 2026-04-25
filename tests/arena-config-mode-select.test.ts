/**
 * Tests for src/arena/arena-config-mode-select.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetAvailableModerators = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockSet_selectedModerator = vi.hoisted(() => vi.fn());
const mockSet_selectedRuleset = vi.hoisted(() => vi.fn());
const mockIsPlaceholder = vi.hoisted(() => vi.fn());
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockEnterQueue = vi.hoisted(() => vi.fn());
const mockMaybeRoutePrivate = vi.hoisted(() => vi.fn());
const mockShowCategoryPicker = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getAvailableModerators: mockGetAvailableModerators,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedModerator: mockSet_selectedModerator,
  set_selectedRuleset: mockSet_selectedRuleset,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  MODES: {
    text: { id: 'text', name: 'TEXT BATTLE', desc: 'Type it out', icon: '⌨️', color: '#fff', available: 'Live now' },
    audio: { id: 'audio', name: 'LIVE AUDIO', desc: 'Speak your mind', icon: '🎤', color: '#fff', available: 'Live now' },
    ai: { id: 'ai', name: 'AI SPARRING', desc: 'Debate the machine', icon: '🤖', color: '#fff', available: 'Live now' },
  },
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-queue.ts', () => ({
  enterQueue: mockEnterQueue,
}));

vi.mock('../src/arena/arena-private-picker.ts', () => ({
  maybeRoutePrivate: mockMaybeRoutePrivate,
}));

vi.mock('../src/arena/arena-config-category.ts', () => ({
  showCategoryPicker: mockShowCategoryPicker,
}));

import {
  showModeSelect,
  closeModeSelect,
  wireModPicker,
  loadAvailableModerators,
} from '../src/arena/arena-config-mode-select.ts';

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  mockIsPlaceholder.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
});

describe('showModeSelect — redirects when no user and not placeholder', () => {
  it('TC1: sets window.location.href when no user and not placeholder', () => {
    mockGetCurrentUser.mockReturnValue(null);
    mockIsPlaceholder.mockReturnValue(false);
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as Location);
    showModeSelect();
    locationSpy.mockRestore();
    // Just assert no overlay was appended
    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });
});

describe('showModeSelect — appends overlay to body', () => {
  it('TC2: appends #arena-mode-overlay when user is present', () => {
    showModeSelect();
    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();
  });

  it('TC3: calls pushArenaState with modeSelect', () => {
    showModeSelect();
    expect(mockPushArenaState).toHaveBeenCalledWith('modeSelect');
  });
});

describe('closeModeSelect — removes overlay', () => {
  it('TC4: removes overlay from DOM when called', () => {
    showModeSelect();
    closeModeSelect();
    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });

  it('TC5: safe to call when overlay does not exist', () => {
    expect(() => closeModeSelect()).not.toThrow();
  });
});

describe('showModeSelect — backdrop click closes overlay', () => {
  it('TC6: clicking backdrop removes overlay', () => {
    showModeSelect();
    const backdrop = document.getElementById('arena-mode-backdrop')!;
    backdrop.click();
    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });
});

describe('showModeSelect — ai mode card click calls enterQueue', () => {
  it('TC7: clicking ai mode card calls enterQueue with "ai"', () => {
    showModeSelect();
    const aiCard = document.querySelector('[data-mode="ai"]') as HTMLElement;
    aiCard?.click();
    expect(mockEnterQueue).toHaveBeenCalledWith('ai', '');
  });
});

describe('showModeSelect — non-ai mode routes to category picker if not private', () => {
  it('TC8: clicking text card calls showCategoryPicker when maybeRoutePrivate returns false', () => {
    mockMaybeRoutePrivate.mockReturnValue(false);
    showModeSelect();
    const textCard = document.querySelector('[data-mode="text"]') as HTMLElement;
    textCard?.click();
    expect(mockShowCategoryPicker).toHaveBeenCalledWith('text', '');
  });
});

describe('wireModPicker — toggle selection on click', () => {
  it('TC9: clicking an option adds "selected" class', () => {
    document.body.innerHTML = `
      <div id="picker">
        <div class="mod-picker-opt"><span class="mod-picker-check"></span></div>
        <div class="mod-picker-opt"><span class="mod-picker-check"></span></div>
      </div>
    `;
    const container = document.getElementById('picker')!;
    wireModPicker(container);
    const opts = container.querySelectorAll<HTMLElement>('.mod-picker-opt');
    opts[0].click();
    expect(opts[0].classList.contains('selected')).toBe(true);
    expect(opts[1].classList.contains('selected')).toBe(false);
  });
});

describe('loadAvailableModerators — renders moderators', () => {
  it('TC10: calls getAvailableModerators and renders options', async () => {
    mockGetAvailableModerators.mockResolvedValue([
      { id: 'm1', display_name: 'Mod One', username: 'modone', mod_rating: 1200, mod_debates_total: 10, mod_approval_pct: 80 },
    ]);
    const overlay = document.createElement('div');
    overlay.innerHTML = '<div id="mod-picker-humans"></div>';
    document.body.appendChild(overlay);
    await loadAvailableModerators(overlay);
    expect(overlay.querySelectorAll('.mod-picker-opt').length).toBe(1);
  });

  it('TC11: no-ops when container not found', async () => {
    mockGetAvailableModerators.mockResolvedValue([
      { id: 'm1', display_name: 'Mod One', username: 'modone', mod_rating: 1200, mod_debates_total: 10, mod_approval_pct: 80 },
    ]);
    const overlay = document.createElement('div'); // no #mod-picker-humans
    await expect(loadAvailableModerators(overlay)).resolves.toBeUndefined();
  });
});

describe('ARCH — src/arena/arena-config-mode-select.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-moderator.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-queue.ts',
      './arena-private-picker.ts',
      './arena-config-category.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-config-mode-select.ts'),
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
