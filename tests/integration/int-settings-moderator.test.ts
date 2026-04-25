// int-settings-moderator.test.ts
// Seam #272 — src/pages/settings.moderator.ts → settings.helpers
// loadModeratorSettings and wireModeratorToggles use toast/getEl/setChecked from settings.helpers.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// Shared mock factories
// ============================================================

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-0000-0000-0000-000000000001',
    is_moderator: false,
    mod_available: false,
    mod_categories: [] as string[],
    mod_rating: 50,
    mod_debates_total: 0,
    mod_rulings_total: 0,
    mod_approval_pct: 0,
    ...overrides,
  };
}

function mountModeratorDOM(extra = '') {
  document.body.innerHTML = `
    <div id="toast"></div>
    <input type="checkbox" id="set-mod-enabled" />
    <input type="checkbox" id="set-mod-available" />
    <div id="mod-available-row" style="display:none"></div>
    <div id="mod-stats" style="display:none"></div>
    <span id="mod-dot"></span>
    <span id="mod-stat-rating"></span>
    <span id="mod-stat-debates"></span>
    <span id="mod-stat-rulings"></span>
    <span id="mod-stat-approval"></span>
    <div id="mod-cat-status"></div>
    ${extra}
  `;
}

function mockAuthModule(profile: Record<string, unknown> | null) {
  const toggleModerator = vi.fn().mockResolvedValue({ error: null });
  const toggleModAvailable = vi.fn().mockResolvedValue({ error: null });
  const updateModCategories = vi.fn().mockResolvedValue({ error: null });
  vi.doMock('../../src/auth.ts', () => ({
    getCurrentProfile: vi.fn(() => profile),
    toggleModerator,
    toggleModAvailable,
    updateModCategories,
    safeRpc: mockRpc,
    getCurrentUser: vi.fn(() => null),
    getSupabaseClient: vi.fn(() => null),
  }));
  return { toggleModerator, toggleModAvailable, updateModCategories };
}

beforeEach(() => {
  vi.resetModules();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// ARCH — SEAM #272
// ============================================================

describe('ARCH — settings.moderator imports only from settings.helpers (seam #272)', () => {
  it('settings.moderator source imports toast, getEl, setChecked from settings.helpers', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.moderator.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const helperImport = importLines.find(l => l.includes('settings.helpers'));
    expect(helperImport).toBeDefined();
    expect(helperImport).toContain('toast');
    expect(helperImport).toContain('getEl');
    expect(helperImport).toContain('setChecked');
  });

  it('settings.helpers exposes toast, getEl, setChecked, getChecked, validateTier', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.helpers.ts'),
      'utf-8'
    );
    expect(src).toContain('export function toast');
    expect(src).toContain('export function getEl');
    expect(src).toContain('export function setChecked');
    expect(src).toContain('export function getChecked');
    expect(src).toContain('export function validateTier');
  });
});

// ============================================================
// TC1 — loadModeratorSettings shows sections when is_moderator: true
// ============================================================

describe('TC1 — loadModeratorSettings shows mod-available-row and mod-stats when is_moderator true', () => {
  it('sets both rows to visible and checks set-mod-enabled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: true, mod_available: true });
    mockAuthModule(profile);
    mountModeratorDOM();

    const { loadModeratorSettings } = await import('../../src/pages/settings.moderator.ts');
    loadModeratorSettings();

    const modEnabledCheckbox = document.getElementById('set-mod-enabled') as HTMLInputElement;
    const modAvailCheckbox = document.getElementById('set-mod-available') as HTMLInputElement;
    const availRow = document.getElementById('mod-available-row') as HTMLElement;
    const statsBlock = document.getElementById('mod-stats') as HTMLElement;

    expect(modEnabledCheckbox.checked).toBe(true);
    expect(modAvailCheckbox.checked).toBe(true);
    expect(availRow.style.display).toBe('flex');
    expect(statsBlock.style.display).toBe('block');
  });
});

// ============================================================
// TC2 — loadModeratorSettings hides sections when is_moderator: false
// ============================================================

describe('TC2 — loadModeratorSettings hides mod-available-row and mod-stats when is_moderator false', () => {
  it('sets both rows to display:none and unchecks set-mod-enabled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: false, mod_available: false });
    mockAuthModule(profile);
    mountModeratorDOM();

    const { loadModeratorSettings } = await import('../../src/pages/settings.moderator.ts');
    loadModeratorSettings();

    const modEnabledCheckbox = document.getElementById('set-mod-enabled') as HTMLInputElement;
    const availRow = document.getElementById('mod-available-row') as HTMLElement;
    const statsBlock = document.getElementById('mod-stats') as HTMLElement;

    expect(modEnabledCheckbox.checked).toBe(false);
    expect(availRow.style.display).toBe('none');
    expect(statsBlock.style.display).toBe('none');
  });
});

// ============================================================
// TC3 — wireModeratorToggles: checking set-mod-enabled calls toggleModerator(true)
// ============================================================

describe('TC3 — wireModeratorToggles calls toggleModerator(true) when checkbox checked', () => {
  it('calls toggleModerator with true and reloads settings on success', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: false });
    const { toggleModerator } = mockAuthModule(profile);
    mountModeratorDOM();

    const { wireModeratorToggles } = await import('../../src/pages/settings.moderator.ts');
    wireModeratorToggles();

    const checkbox = document.getElementById('set-mod-enabled') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.runAllTimersAsync();

    expect(toggleModerator).toHaveBeenCalledWith(true);
  });
});

// ============================================================
// TC4 — wireModeratorToggles: toggleModerator error reverts checkbox and shows toast
// ============================================================

describe('TC4 — wireModeratorToggles reverts checkbox and toasts on toggleModerator error', () => {
  it('reverts checked state and shows error in toast element', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: false });
    const { toggleModerator } = mockAuthModule(profile);
    toggleModerator.mockResolvedValue({ error: 'Not eligible' });
    mountModeratorDOM();

    const { wireModeratorToggles } = await import('../../src/pages/settings.moderator.ts');
    wireModeratorToggles();

    const checkbox = document.getElementById('set-mod-enabled') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.runAllTimersAsync();

    expect(checkbox.checked).toBe(false);
    const toastEl = document.getElementById('toast') as HTMLElement;
    expect(toastEl.textContent).toContain('Not eligible');
  });
});

// ============================================================
// TC5 — wireModeratorToggles: checking set-mod-available calls toggleModAvailable(true)
//        and updates mod-dot background
// ============================================================

describe('TC5 — wireModeratorToggles calls toggleModAvailable(true) and updates mod-dot', () => {
  it('calls toggleModAvailable with true and sets mod-dot to var(--success)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: true, mod_available: false });
    const { toggleModAvailable } = mockAuthModule(profile);
    mountModeratorDOM();

    const { wireModeratorToggles } = await import('../../src/pages/settings.moderator.ts');
    wireModeratorToggles();

    const checkbox = document.getElementById('set-mod-available') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.runAllTimersAsync();

    expect(toggleModAvailable).toHaveBeenCalledWith(true);
    const dot = document.getElementById('mod-dot') as HTMLElement;
    expect(dot.style.background).toBe('var(--success)');
  });
});

// ============================================================
// TC6 — wireModeratorToggles: clicking .mod-cat-chip calls updateModCategories
//        and updates mod-cat-status text
// ============================================================

describe('TC6 — wireModeratorToggles: clicking mod-cat-chip calls updateModCategories', () => {
  it('calls updateModCategories with selected categories and updates status text', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({ is_moderator: true });
    const { updateModCategories } = mockAuthModule(profile);
    // Mount DOM with two chips
    mountModeratorDOM(`
      <button class="mod-cat-chip" data-cat="politics">Politics</button>
      <button class="mod-cat-chip" data-cat="sports">Sports</button>
    `);

    const { wireModeratorToggles } = await import('../../src/pages/settings.moderator.ts');
    wireModeratorToggles();

    const chip = document.querySelector('.mod-cat-chip[data-cat="politics"]') as HTMLButtonElement;
    chip.click();

    await vi.runAllTimersAsync();

    expect(updateModCategories).toHaveBeenCalledWith(['politics']);
    const statusEl = document.getElementById('mod-cat-status') as HTMLElement;
    expect(statusEl.textContent).toContain('1 category selected');
  });
});

// ============================================================
// TC7 — loadModeratorSettings populates mod stat display elements
// ============================================================

describe('TC7 — loadModeratorSettings populates mod stat elements when is_moderator true', () => {
  it('renders rating, debates, rulings, and approval percentage correctly', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const profile = makeProfile({
      is_moderator: true,
      mod_rating: 87.5,
      mod_debates_total: 42,
      mod_rulings_total: 38,
      mod_approval_pct: 91.3,
    });
    mockAuthModule(profile);
    mountModeratorDOM();

    const { loadModeratorSettings } = await import('../../src/pages/settings.moderator.ts');
    loadModeratorSettings();

    expect(document.getElementById('mod-stat-rating')?.textContent).toBe('87.5');
    expect(document.getElementById('mod-stat-debates')?.textContent).toBe('42');
    expect(document.getElementById('mod-stat-rulings')?.textContent).toBe('38');
    expect(document.getElementById('mod-stat-approval')?.textContent).toBe('91%');
  });
});
