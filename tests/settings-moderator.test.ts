/**
 * Tests for src/pages/settings.moderator.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockToggleModerator = vi.hoisted(() => vi.fn());
const mockToggleModAvailable = vi.hoisted(() => vi.fn());
const mockUpdateModCategories = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
const mockSetChecked = vi.hoisted(() => vi.fn());
const mockGetEl = vi.hoisted(() => vi.fn((id: string) => document.getElementById(id)));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  toggleModerator: mockToggleModerator,
  toggleModAvailable: mockToggleModAvailable,
  updateModCategories: mockUpdateModCategories,
}));

vi.mock('../src/pages/settings.helpers.ts', () => ({
  toast: mockToast,
  getEl: mockGetEl,
  setChecked: mockSetChecked,
}));

function buildDOM() {
  document.body.innerHTML = `
    <input type="checkbox" id="set-mod-enabled" />
    <input type="checkbox" id="set-mod-available" />
    <div id="mod-available-row" style="display:none"></div>
    <div id="mod-stats" style="display:none"></div>
    <div id="mod-dot"></div>
    <div id="mod-stat-rating"></div>
    <div id="mod-stat-debates"></div>
    <div id="mod-stat-rulings"></div>
    <div id="mod-stat-approval"></div>
    <div id="mod-cat-status"></div>
    <button class="mod-cat-chip" data-cat="sports">Sports</button>
    <button class="mod-cat-chip" data-cat="politics">Politics</button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockGetEl.mockImplementation((id: string) => document.getElementById(id));
  mockToggleModerator.mockResolvedValue({ error: null });
  mockToggleModAvailable.mockResolvedValue({ error: null });
  mockUpdateModCategories.mockResolvedValue({ error: null });
});

import { loadModeratorSettings, wireModeratorToggles } from '../src/pages/settings.moderator.ts';

describe('loadModeratorSettings — no-ops when no profile', () => {
  it('TC1: returns without error when getCurrentProfile returns null', () => {
    mockGetCurrentProfile.mockReturnValue(null);
    expect(() => loadModeratorSettings()).not.toThrow();
    expect(mockSetChecked).not.toHaveBeenCalled();
  });
});

describe('loadModeratorSettings — sets mod toggle state', () => {
  it('TC2: calls setChecked for mod-enabled based on profile.is_moderator', () => {
    mockGetCurrentProfile.mockReturnValue({ is_moderator: true, mod_available: false, mod_categories: [] });
    loadModeratorSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-mod-enabled', true);
  });

  it('TC3: shows mod-available-row when is_moderator is true', () => {
    mockGetCurrentProfile.mockReturnValue({ is_moderator: true, mod_available: false, mod_categories: [] });
    loadModeratorSettings();
    expect(document.getElementById('mod-available-row')!.style.display).toBe('flex');
  });

  it('TC4: hides mod-available-row when is_moderator is false', () => {
    mockGetCurrentProfile.mockReturnValue({ is_moderator: false, mod_available: false, mod_categories: [] });
    loadModeratorSettings();
    expect(document.getElementById('mod-available-row')!.style.display).toBe('none');
  });
});

describe('loadModeratorSettings — renders mod stats', () => {
  it('TC5: sets mod-stat-rating text when is_moderator is true', () => {
    mockGetCurrentProfile.mockReturnValue({
      is_moderator: true, mod_available: false, mod_categories: [],
      mod_rating: 72.5, mod_debates_total: 10, mod_rulings_total: 8, mod_approval_pct: 80,
    });
    loadModeratorSettings();
    expect(document.getElementById('mod-stat-rating')!.textContent).toBe('72.5');
  });
});

describe('wireModeratorToggles — mod-enabled toggle calls toggleModerator', () => {
  it('TC6: toggling mod-enabled calls toggleModerator', async () => {
    wireModeratorToggles();
    const toggle = document.getElementById('set-mod-enabled') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockToggleModerator).toHaveBeenCalledWith(true);
  });
});

describe('wireModeratorToggles — mod-available toggle calls toggleModAvailable', () => {
  it('TC7: toggling mod-available calls toggleModAvailable', async () => {
    wireModeratorToggles();
    const toggle = document.getElementById('set-mod-available') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockToggleModAvailable).toHaveBeenCalledWith(false);
  });
});

describe('wireModeratorToggles — category chip toggles call updateModCategories', () => {
  it('TC8: clicking a category chip calls updateModCategories', async () => {
    wireModeratorToggles();
    const chip = document.querySelector<HTMLButtonElement>('.mod-cat-chip[data-cat="sports"]')!;
    chip.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockUpdateModCategories).toHaveBeenCalled();
  });
});

describe('ARCH — src/pages/settings.moderator.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', './settings.helpers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.moderator.ts'),
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
