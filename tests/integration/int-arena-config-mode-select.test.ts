import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── Shared state ──────────────────────────────────────────────────────────────
let mockCurrentUser: { id: string; email: string } | null = null;
let mockIsPlaceholder = false;
let enterQueueCalls: Array<[string, string]> = [];
let maybeRoutePrivateReturn = false;
let showCategoryPickerCalls: Array<[string, string]> = [];
let getAvailableModeratorsCalls: Array<unknown[]> = [];
let mockModerators: unknown[] = [];

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();

  mockCurrentUser = null;
  mockIsPlaceholder = false;
  enterQueueCalls = [];
  maybeRoutePrivateReturn = false;
  showCategoryPickerCalls = [];
  getAvailableModeratorsCalls = [];
  mockModerators = [];

  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  document.body.innerHTML = '';
});

// ── ARCH TC: import lines use 'from' keyword ─────────────────────────────────
describe('TC0 — ARCH: arena-config-mode-select only mocks @supabase/supabase-js', () => {
  it('source import lines are detectable with from-keyword filter', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-config-mode-select.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.length).toBeGreaterThan(0);

    // Must import AvailableModerator from arena-types-moderator
    const typeModeratorImport = importLines.find(l => l.includes('arena-types-moderator'));
    expect(typeModeratorImport).toBeDefined();
    expect(typeModeratorImport).toContain('AvailableModerator');

    // Must not import from banned modules
    const banned = ['webrtc', 'deepgram', 'voicememo', 'arena-sounds', 'arena-css'];
    for (const b of banned) {
      const hit = importLines.find(l => l.includes(b));
      expect(hit, `unexpected import of ${b}`).toBeUndefined();
    }
  });
});

// ── TC1: no user + not placeholder → redirect to plinko ──────────────────────
describe('TC1 — showModeSelect redirects to plinko when unauthenticated non-placeholder', () => {
  it('sets window.location.href to moderator-plinko.html', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Patch auth to return null user
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => null),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');

    const originalLocation = window.location;
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.location, 'href', {
      set(v: string) { assignedHref = v; },
      get() { return assignedHref; },
      configurable: true,
    });

    showModeSelect();

    expect(assignedHref).toContain('moderator-plinko.html');

    // No overlay appended
    expect(document.getElementById('arena-mode-overlay')).toBeNull();

    // Restore
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
  });
});

// ── TC2: authenticated user → overlay with 4 mode cards ─────────────────────
describe('TC2 — showModeSelect renders overlay with all 4 mode cards', () => {
  it('appends arena-mode-overlay containing 4 .arena-mode-card elements', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const overlay = document.getElementById('arena-mode-overlay');
    expect(overlay).not.toBeNull();

    const modeCards = overlay!.querySelectorAll('.arena-mode-card');
    expect(modeCards.length).toBe(4);

    // Verify mode ids
    const modes = Array.from(modeCards).map(c => (c as HTMLElement).dataset.mode);
    expect(modes).toContain('live');
    expect(modes).toContain('voicememo');
    expect(modes).toContain('text');
    expect(modes).toContain('ai');
  });
});

// ── TC3: Cancel button closes overlay ────────────────────────────────────────
describe('TC3 — cancel button removes arena-mode-overlay', () => {
  it('clicking #arena-mode-cancel removes the overlay from DOM', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();

    const cancelBtn = document.getElementById('arena-mode-cancel') as HTMLElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });
});

// ── TC4: Backdrop click also closes overlay ───────────────────────────────────
describe('TC4 — backdrop click removes arena-mode-overlay', () => {
  it('clicking #arena-mode-backdrop removes the overlay from DOM', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const backdrop = document.getElementById('arena-mode-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    backdrop.click();

    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });
});

// ── TC5: AI mode card click calls enterQueue('ai', ...) ──────────────────────
describe('TC5 — clicking ai mode card calls enterQueue with mode=ai', () => {
  it('enterQueue is called with "ai" when the ai mode card is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEnterQueue = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: mockEnterQueue,
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const aiCard = document.querySelector('.arena-mode-card[data-mode="ai"]') as HTMLElement;
    expect(aiCard).not.toBeNull();
    aiCard.click();

    expect(mockEnterQueue).toHaveBeenCalledOnce();
    expect(mockEnterQueue).toHaveBeenCalledWith('ai', '');
  });
});

// ── TC6: Live mode card → showCategoryPicker when maybeRoutePrivate=false ────
describe('TC6 — live mode card routes to showCategoryPicker when maybeRoutePrivate returns false', () => {
  it('showCategoryPicker is called with mode="live" when live card is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockShowCategoryPicker = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: mockShowCategoryPicker,
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const liveCard = document.querySelector('.arena-mode-card[data-mode="live"]') as HTMLElement;
    expect(liveCard).not.toBeNull();
    liveCard.click();

    expect(mockShowCategoryPicker).toHaveBeenCalledOnce();
    expect(mockShowCategoryPicker).toHaveBeenCalledWith('live', '');
  });
});

// ── TC7: wireModPicker toggles .selected + checkmark between options ─────────
describe('TC7 — wireModPicker toggles selected state between mod-picker options', () => {
  it('clicking a second option deselects the first and shows checkmark on second', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({ enterQueue: vi.fn() }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({ maybeRoutePrivate: vi.fn(() => false) }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({ showCategoryPicker: vi.fn() }));

    const { wireModPicker } = await import('../../src/arena/arena-config-mode-select.ts');

    // Build a container with 2 mod-picker-opt elements
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="mod-picker-opt" data-mod-type="none" data-mod-id="">
        <span class="mod-picker-check"></span>
      </div>
      <div class="mod-picker-opt" data-mod-type="human" data-mod-id="user-abc">
        <span class="mod-picker-check"></span>
      </div>
    `;
    document.body.appendChild(container);

    wireModPicker(container);

    const opts = container.querySelectorAll('.mod-picker-opt');
    const opt1 = opts[0] as HTMLElement;
    const opt2 = opts[1] as HTMLElement;

    // Click first option
    opt1.click();
    expect(opt1.classList.contains('selected')).toBe(true);
    expect(opt1.querySelector('.mod-picker-check')!.textContent).toBe('✓');
    expect(opt2.classList.contains('selected')).toBe(false);
    expect(opt2.querySelector('.mod-picker-check')!.textContent).toBe('');

    // Click second option — first should deselect
    opt2.click();
    expect(opt2.classList.contains('selected')).toBe(true);
    expect(opt2.querySelector('.mod-picker-check')!.textContent).toBe('✓');
    expect(opt1.classList.contains('selected')).toBe(false);
    expect(opt1.querySelector('.mod-picker-check')!.textContent).toBe('');
  });
});

// ── TC8: loadAvailableModerators renders AvailableModerator fields into DOM ───
describe('TC8 — loadAvailableModerators renders moderator cards using AvailableModerator fields', () => {
  it('renders display_name, mod_rating, mod_debates_total, mod_approval_pct into #mod-picker-humans', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeMod = {
      id: 'mod-uuid-001',
      display_name: 'Alex Debate',
      username: 'alexd',
      mod_rating: 1425,
      mod_debates_total: 37,
      mod_approval_pct: 88.5,
    };

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async (_excludeIds: string[]) => [fakeMod]),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({ enterQueue: vi.fn() }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({ maybeRoutePrivate: vi.fn(() => false) }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({ showCategoryPicker: vi.fn() }));

    const { loadAvailableModerators } = await import('../../src/arena/arena-config-mode-select.ts');

    const overlay = document.createElement('div');
    overlay.innerHTML = '<div id="mod-picker-humans"></div>';
    document.body.appendChild(overlay);

    await loadAvailableModerators(overlay);

    const container = document.getElementById('mod-picker-humans')!;
    const cards = container.querySelectorAll('.mod-picker-opt');
    expect(cards.length).toBe(1);

    const card = cards[0] as HTMLElement;
    expect(card.dataset.modType).toBe('human');
    expect(card.dataset.modId).toBe('mod-uuid-001');

    const nameEl = card.querySelector('.mod-picker-name');
    expect(nameEl?.textContent).toContain('Alex Debate');

    const statsEl = card.querySelector('.mod-picker-stats');
    expect(statsEl?.textContent).toContain('1425');
    expect(statsEl?.textContent).toContain('37');
    expect(statsEl?.textContent).toContain('89'); // 88.5 rounds to 89 via toFixed(0)
  });
});

// ── Seam #257 Batch 2: arena-config-mode-select → arena-queue deep seam ──────

// ── TC9: AI mode card click sets selectedRuleset to 'amplified' before enterQueue ──
describe('TC9 — ai mode card sets selectedRuleset=amplified before calling enterQueue', () => {
  it('set_selectedRuleset is called with "amplified" when ai mode card is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEnterQueue = vi.fn();
    const mockSetSelectedRuleset = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedModerator: vi.fn(),
      set_selectedRuleset: mockSetSelectedRuleset,
      // expose remaining state getters as no-ops
      view: 'lobby',
      selectedMode: null,
      selectedRanked: false,
      selectedRuleset: 'amplified',
      selectedRounds: 3,
      selectedCategory: null,
      queuePollTimer: null,
      queueElapsedTimer: null,
      queueSeconds: 0,
      queueErrorState: false,
      aiFallbackShown: false,
      _queuePollInFlight: false,
      screenEl: null,
      selectedLinkUrl: null,
      selectedLinkPreview: null,
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      set_queuePollTimer: vi.fn(),
      set_queueElapsedTimer: vi.fn(),
      set_queueSeconds: vi.fn(),
      set_queueErrorState: vi.fn(),
      set_aiFallbackShown: vi.fn(),
      set__queuePollInFlight: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: mockEnterQueue,
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const aiCard = document.querySelector('.arena-mode-card[data-mode="ai"]') as HTMLElement;
    aiCard.click();

    expect(mockSetSelectedRuleset).toHaveBeenCalledWith('amplified');
    expect(mockEnterQueue).toHaveBeenCalledWith('ai', '');

    // Ordering: set_selectedRuleset must come before enterQueue
    const ruleset = mockSetSelectedRuleset.mock.invocationCallOrder[0];
    const enter = mockEnterQueue.mock.invocationCallOrder[0];
    expect(ruleset).toBeLessThan(enter);
  });
});

// ── TC10: AI mode with a selected moderator option sets selectedModerator ─────
describe('TC10 — ai mode card captures selected moderator from .mod-picker-opt.selected', () => {
  it('set_selectedModerator called with moderator data from selected option before enterQueue', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEnterQueue = vi.fn();
    const mockSetSelectedModerator = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedModerator: mockSetSelectedModerator,
      set_selectedRuleset: vi.fn(),
      view: 'lobby',
      selectedMode: null,
      selectedRanked: false,
      selectedRuleset: 'amplified',
      selectedRounds: 3,
      selectedCategory: null,
      queuePollTimer: null,
      queueElapsedTimer: null,
      queueSeconds: 0,
      queueErrorState: false,
      aiFallbackShown: false,
      _queuePollInFlight: false,
      screenEl: null,
      selectedLinkUrl: null,
      selectedLinkPreview: null,
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      set_queuePollTimer: vi.fn(),
      set_queueElapsedTimer: vi.fn(),
      set_queueSeconds: vi.fn(),
      set_queueErrorState: vi.fn(),
      set_aiFallbackShown: vi.fn(),
      set__queuePollInFlight: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: mockEnterQueue,
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: vi.fn(),
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    // Inject a selected moderator option into the overlay
    const overlay = document.getElementById('arena-mode-overlay')!;
    const selOpt = document.createElement('div');
    selOpt.className = 'mod-picker-opt selected';
    selOpt.dataset.modType = 'human';
    selOpt.dataset.modId = 'mod-123';
    selOpt.innerHTML = '<span class="mod-picker-name">GreatDebater</span>';
    overlay.appendChild(selOpt);

    const aiCard = document.querySelector('.arena-mode-card[data-mode="ai"]') as HTMLElement;
    aiCard.click();

    expect(mockSetSelectedModerator).toHaveBeenCalledWith({
      type: 'human',
      id: 'mod-123',
      name: 'GreatDebater',
    });
    expect(mockEnterQueue).toHaveBeenCalledWith('ai', '');
  });
});

// ── TC11: text mode card does NOT call enterQueue ─────────────────────────────
describe('TC11 — text mode card does not call enterQueue', () => {
  it('enterQueue is never called when text mode card is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEnterQueue = vi.fn();
    const mockShowCategoryPicker = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: mockEnterQueue,
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => false),
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: mockShowCategoryPicker,
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const textCard = document.querySelector('.arena-mode-card[data-mode="text"]') as HTMLElement;
    expect(textCard).not.toBeNull();
    textCard.click();

    expect(mockEnterQueue).not.toHaveBeenCalled();
    expect(mockShowCategoryPicker).toHaveBeenCalledWith('text', '');
  });
});

// ── TC12: closeModeSelect(true) calls history.replaceState (forward nav) ──────
describe('TC12 — closeModeSelect(true) calls history.replaceState with lobby state', () => {
  it('history.replaceState is called with arenaView=lobby when forward=true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({ enterQueue: vi.fn() }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({ maybeRoutePrivate: vi.fn(() => false) }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({ showCategoryPicker: vi.fn() }));

    const { showModeSelect, closeModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();

    const replaceStateSpy = vi.spyOn(history, 'replaceState');
    closeModeSelect(true);

    expect(document.getElementById('arena-mode-overlay')).toBeNull();
    expect(replaceStateSpy).toHaveBeenCalledWith({ arenaView: 'lobby' }, '');
  });
});

// ── TC13: closeModeSelect() (no arg) calls history.back ───────────────────────
describe('TC13 — closeModeSelect() without arg calls history.back', () => {
  it('history.back is called when closeModeSelect is called without forward=true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({ enterQueue: vi.fn() }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({ maybeRoutePrivate: vi.fn(() => false) }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({ showCategoryPicker: vi.fn() }));

    const { showModeSelect, closeModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const backSpy = vi.spyOn(history, 'back');
    closeModeSelect();

    expect(document.getElementById('arena-mode-overlay')).toBeNull();
    expect(backSpy).toHaveBeenCalled();
  });
});

// ── TC14: maybeRoutePrivate=true → enterQueue NOT called, showCategoryPicker NOT called ──
describe('TC14 — mode card click when maybeRoutePrivate returns true skips enterQueue and showCategoryPicker', () => {
  it('neither enterQueue nor showCategoryPicker is called when maybeRoutePrivate returns true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEnterQueue = vi.fn();
    const mockShowCategoryPicker = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
      getAvailableModerators: vi.fn(async () => []),
      safeRpc: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn(() => false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-queue.ts', () => ({
      enterQueue: mockEnterQueue,
    }));
    vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
      maybeRoutePrivate: vi.fn(() => true), // intercepts the route
    }));
    vi.doMock('../../src/arena/arena-config-category.ts', () => ({
      showCategoryPicker: mockShowCategoryPicker,
    }));

    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const liveCard = document.querySelector('.arena-mode-card[data-mode="live"]') as HTMLElement;
    liveCard.click();

    expect(mockEnterQueue).not.toHaveBeenCalled();
    expect(mockShowCategoryPicker).not.toHaveBeenCalled();
  });
});
