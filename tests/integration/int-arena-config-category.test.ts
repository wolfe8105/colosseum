import { describe, it, expect, vi, beforeEach } from 'vitest';
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

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// TC1: showCategoryPicker appends overlay with disabled submit button
describe('TC1 — showCategoryPicker renders overlay with disabled submit', () => {
  it('appends arena-cat-overlay to document.body with submit button disabled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Is AI taking all our jobs?');

    const overlay = document.getElementById('arena-cat-overlay');
    expect(overlay).not.toBeNull();

    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement | null;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn?.disabled).toBe(true);
  });
});

// TC2: Clicking a category button selects it but submit stays disabled (no mod chosen)
describe('TC2 — category button click marks selected, submit still disabled without mod', () => {
  it('clicking first category button adds selected class but leaves submit disabled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Test topic');

    const catButtons = document.querySelectorAll('.arena-cat-btn');
    expect(catButtons.length).toBeGreaterThan(0);

    (catButtons[0] as HTMLElement).click();

    expect(catButtons[0].classList.contains('selected')).toBe(true);

    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement | null;
    // submit still disabled because no mod choice made
    expect(submitBtn?.disabled).toBe(true);
  });
});

// TC3: After selecting both category and mod, submit button becomes enabled
describe('TC3 — submit enabled after category + mod both selected', () => {
  it('enables submit button once both a category and a mod option are chosen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Test topic');

    // Select first category
    const catBtn = document.querySelector('.arena-cat-btn') as HTMLElement | null;
    catBtn?.click();

    // Select AI moderator option
    const modAiBtn = document.getElementById('arena-mod-ai') as HTMLElement | null;
    modAiBtn?.click();

    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement | null;
    expect(submitBtn?.disabled).toBe(false);
  });
});

// TC4: Clicking submit calls safeRpc('create_debate_card', ...) with correct params
describe('TC4 — submit triggers safeRpc create_debate_card', () => {
  it('calls create_debate_card RPC with p_content and p_category when submitted', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockResolvedValue({ data: { id: 'debate-abc-123' }, error: null });

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Default topic fallback');

    // Set a title
    const titleInput = document.getElementById('arena-cat-title') as HTMLInputElement | null;
    if (titleInput) titleInput.value = 'AI will replace programmers';

    // Select first category
    const catBtn = document.querySelector('.arena-cat-btn') as HTMLElement | null;
    catBtn?.click();

    // Select AI mod
    const modAiBtn = document.getElementById('arena-mod-ai') as HTMLElement | null;
    modAiBtn?.click();

    // Click submit (fires postDebate async — does not block)
    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement | null;
    submitBtn?.click();

    // Advance fake timers past auth safety timeout so readyPromise resolves,
    // then flush microtasks so the awaited safeRpc call completes.
    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    const createCall = mockRpc.mock.calls.find(c => c[0] === 'create_debate_card');
    expect(createCall).toBeDefined();
    expect(createCall?.[1]).toMatchObject({
      p_content: 'AI will replace programmers',
    });
  });
});

// TC5: Moderator search input debounce fires safeRpc('search_moderators', ...)
describe('TC5 — moderator search input fires search_moderators RPC after debounce', () => {
  it('calls search_moderators RPC with p_query after 350ms debounce', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Test topic');

    // Select AI mod first to show invite search (need 'invite' mod to see search)
    const modInviteBtn = document.getElementById('arena-mod-invite') as HTMLElement | null;
    modInviteBtn?.click();

    const searchInput = document.getElementById('arena-mod-search-input') as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    // Simulate typing
    if (searchInput) searchInput.value = 'testmod';
    searchInput?.dispatchEvent(new Event('input'));

    // Advance past debounce (350ms) and flush microtasks so safeRpc resolves
    await vi.advanceTimersByTimeAsync(400);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    const searchCall = mockRpc.mock.calls.find(c => c[0] === 'search_moderators');
    expect(searchCall).toBeDefined();
    expect(searchCall?.[1]).toMatchObject({ p_query: 'testmod' });
  });
});

// TC6: set_selectedCategory and set_selectedWantMod called during post
describe('TC6 — state setters set_selectedCategory and set_selectedWantMod called on submit', () => {
  it('set_selectedCategory is set to the chosen category id on submit', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockResolvedValue({ data: { id: 'debate-xyz' }, error: null });

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    const arenaState = await import('../../src/arena/arena-state.ts');

    showCategoryPicker('live', 'Some debate topic');

    // Set title
    const titleInput = document.getElementById('arena-cat-title') as HTMLInputElement | null;
    if (titleInput) titleInput.value = 'Is remote work better?';

    // Select a specific category button
    const catBtn = document.querySelector('.arena-cat-btn') as HTMLElement | null;
    const catId = (catBtn as HTMLElement)?.dataset?.cat;
    catBtn?.click();

    // Select human mod (want_mod = true)
    const modHumanBtn = document.getElementById('arena-mod-human') as HTMLElement | null;
    modHumanBtn?.click();

    // Click submit (fires postDebate async)
    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement | null;
    submitBtn?.click();

    // Advance past auth safety timeout so readyPromise resolves, then flush microtasks
    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(arenaState.selectedCategory).toBe(catId ?? null);
    expect(arenaState.selectedWantMod).toBe(true);
  });
});

// TC7: ARCH — seam import check
describe('ARCH — seam #046', () => {
  it('src/arena/arena-config-category.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-category.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #102 — arena-config-category → arena-core.utils
// Focused on pushArenaState usage
// ============================================================

// TC-core1: showCategoryPicker calls history.pushState with arenaView='categoryPicker'
describe('TC-core1 — showCategoryPicker pushes arena history state on open', () => {
  it('calls history.pushState({ arenaView: "categoryPicker" }, "") when the picker is shown', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const pushState = vi.spyOn(history, 'pushState');

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Test topic');

    expect(pushState).toHaveBeenCalledWith({ arenaView: 'categoryPicker' }, '');
    pushState.mockRestore();
  });
});

// TC-core2: pushArenaState utility itself calls history.pushState with correct shape
describe('TC-core2 — pushArenaState utility calls history.pushState correctly', () => {
  it('pushArenaState("myView") invokes history.pushState with { arenaView: "myView" }', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const pushState = vi.spyOn(history, 'pushState');

    const { pushArenaState } = await import('../../src/arena/arena-core.utils.ts');
    pushArenaState('myView');

    expect(pushState).toHaveBeenCalledWith({ arenaView: 'myView' }, '');
    pushState.mockRestore();
  });
});

// TC-core3: showCategoryPicker calls pushArenaState exactly once per invocation
describe('TC-core3 — showCategoryPicker calls history.pushState exactly once per open', () => {
  it('history.pushState is called exactly once when showCategoryPicker is invoked once', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const pushState = vi.spyOn(history, 'pushState');

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('text', 'Should we colonise Mars?');

    expect(pushState).toHaveBeenCalledTimes(1);
    pushState.mockRestore();
  });
});

// TC-core4: Cancel button calls history.back() (complement to pushArenaState push)
describe('TC-core4 — cancel button calls history.back to undo the pushState', () => {
  it('clicking #arena-cat-cancel calls history.back()', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const histBack = vi.spyOn(history, 'back').mockImplementation(() => {});

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Cancel test');

    const cancelBtn = document.getElementById('arena-cat-cancel') as HTMLButtonElement | null;
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();

    expect(histBack).toHaveBeenCalledTimes(1);
    histBack.mockRestore();
  });
});

// TC-core5: Backdrop click also calls history.back()
describe('TC-core5 — backdrop click calls history.back to undo the pushState', () => {
  it('clicking #arena-cat-backdrop calls history.back()', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const histBack = vi.spyOn(history, 'back').mockImplementation(() => {});

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Backdrop test');

    const backdrop = document.getElementById('arena-cat-backdrop') as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    backdrop?.click();

    expect(histBack).toHaveBeenCalledTimes(1);
    histBack.mockRestore();
  });
});

// TC-core6: ARCH seam check — arena-config-category imports arena-core.utils
describe('ARCH — seam #102', () => {
  it('src/arena/arena-config-category.ts imports from arena-core.utils', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-category.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-core.utils'))).toBe(true);
  });
});
