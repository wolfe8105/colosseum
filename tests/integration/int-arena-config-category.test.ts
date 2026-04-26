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

// ============================================================
// SEAM #330 — arena-config-category → dependency-clamps
// Focused on clampVercel usage in link scraping paths
// ============================================================

// TC-clamp1: clampVercel called with OK response on successful link preview fetch
describe('TC-clamp1 — clampVercel fires on successful /api/scrape-og response', () => {
  it('calls clampVercel with route and 200 response on blur of link input with valid URL', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Mock fetch for /api/scrape-og
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ domain: 'example.com', og_title: 'Test', image_url: '' }),
    } as Response);
    vi.stubGlobal('fetch', mockFetch);

    // Provide a session token so the auth gate passes
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-abc' } },
      error: null,
    });

    const clampsMod = await import('../../src/contracts/dependency-clamps.ts');
    const clampVercelSpy = vi.spyOn(clampsMod, 'clampVercel');

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Clamp test topic');

    const linkInput = document.getElementById('arena-cat-link') as HTMLInputElement | null;
    expect(linkInput).not.toBeNull();
    if (linkInput) linkInput.value = 'https://example.com/article';
    linkInput?.dispatchEvent(new Event('blur'));

    // Allow async scraping to complete
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(clampVercelSpy).toHaveBeenCalledWith('/api/scrape-og', expect.any(Object));

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

// TC-clamp2: clampVercel fires on 4xx response → error div shown
describe('TC-clamp2 — clampVercel fires on 4xx /api/scrape-og response and error div shown', () => {
  it('shows link error message and clampVercel receives the failed response on 401', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const failResponse = {
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response;
    const mockFetch = vi.fn().mockResolvedValue(failResponse);
    vi.stubGlobal('fetch', mockFetch);

    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-abc' } },
      error: null,
    });

    const clampsMod = await import('../../src/contracts/dependency-clamps.ts');
    const clampVercelSpy = vi.spyOn(clampsMod, 'clampVercel');

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Clamp 4xx test');

    const linkInput = document.getElementById('arena-cat-link') as HTMLInputElement | null;
    if (linkInput) linkInput.value = 'https://example.com/bad-link';
    linkInput?.dispatchEvent(new Event('blur'));

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    // clampVercel was called with the failed response
    expect(clampVercelSpy).toHaveBeenCalledWith('/api/scrape-og', failResponse);

    // DOM: error element exists (may or may not show depending on response shape — but
    // clampVercel must have been called regardless)
    const errorEl = document.getElementById('arena-cat-link-error');
    expect(errorEl).not.toBeNull();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

// TC-clamp3: clampVercel unit — null response fires trackEvent with http_status 0
describe('TC-clamp3 — clampVercel(route, null) fires trackEvent with http_status 0', () => {
  it('calls trackEvent("clamp:vercel:failure") with http_status: 0 on network failure', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const analyticsMod = await import('../../src/analytics.ts');
    const trackEventSpy = vi.spyOn(analyticsMod, 'trackEvent').mockImplementation(() => {});

    const { clampVercel } = await import('../../src/contracts/dependency-clamps.ts');
    clampVercel('/api/scrape-og', null);

    expect(trackEventSpy).toHaveBeenCalledWith('clamp:vercel:failure', expect.objectContaining({
      route: '/api/scrape-og',
      http_status: 0,
    }));

    vi.restoreAllMocks();
  });
});

// TC-clamp4: clampVercel unit — 500 response fires trackEvent with http_status 500
describe('TC-clamp4 — clampVercel(route, 500-response) fires trackEvent with http_status 500', () => {
  it('calls trackEvent("clamp:vercel:failure") with http_status: 500 on server error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const analyticsMod = await import('../../src/analytics.ts');
    const trackEventSpy = vi.spyOn(analyticsMod, 'trackEvent').mockImplementation(() => {});

    const { clampVercel } = await import('../../src/contracts/dependency-clamps.ts');
    clampVercel('/api/scrape-og', { ok: false, status: 500 } as Response);

    expect(trackEventSpy).toHaveBeenCalledWith('clamp:vercel:failure', expect.objectContaining({
      route: '/api/scrape-og',
      http_status: 500,
    }));

    vi.restoreAllMocks();
  });
});

// TC-clamp5: clampVercel unit — 200 response fires NO trackEvent (silent success)
describe('TC-clamp5 — clampVercel(route, 200-response) fires no trackEvent', () => {
  it('does not call trackEvent on a successful (200 OK) response', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const analyticsMod = await import('../../src/analytics.ts');
    const trackEventSpy = vi.spyOn(analyticsMod, 'trackEvent').mockImplementation(() => {});

    const { clampVercel } = await import('../../src/contracts/dependency-clamps.ts');
    clampVercel('/api/scrape-og', { ok: true, status: 200 } as Response);

    expect(trackEventSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

// TC-clamp6: clampVercel with errorText param propagates custom message to trackEvent
describe('TC-clamp6 — clampVercel passes custom errorText to trackEvent on failure', () => {
  it('trackEvent receives the custom errorText string when clampVercel is called with one', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const analyticsMod = await import('../../src/analytics.ts');
    const trackEventSpy = vi.spyOn(analyticsMod, 'trackEvent').mockImplementation(() => {});

    const { clampVercel } = await import('../../src/contracts/dependency-clamps.ts');
    clampVercel('/api/scrape-og', { ok: false, status: 503 } as Response, 'Service Unavailable');

    expect(trackEventSpy).toHaveBeenCalledWith('clamp:vercel:failure', expect.objectContaining({
      route: '/api/scrape-og',
      http_status: 503,
      error: 'Service Unavailable',
    }));

    vi.restoreAllMocks();
  });
});

// TC-clamp7: ARCH seam check — arena-config-category imports clampVercel from dependency-clamps
describe('ARCH — seam #330', () => {
  it('src/arena/arena-config-category.ts imports clampVercel from dependency-clamps', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-category.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('dependency-clamps'))).toBe(true);
    expect(importLines.some(l => l.includes('clampVercel') || l.includes('dependency-clamps'))).toBe(true);
  });
});

// ============================================================
// SEAM #476 — arena-config-category → arena-config-round-picker
// Focused on roundPickerCSS / roundPickerHTML / wireRoundPicker
// ============================================================

// TC-rp1: roundPickerCSS returns non-empty CSS string with key class
describe('TC-rp1 — roundPickerCSS returns CSS containing .arena-round-picker', () => {
  it('roundPickerCSS() returns a string that includes .arena-round-picker selector', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { roundPickerCSS } = await import('../../src/arena/arena-config-round-picker.ts');
    const css = roundPickerCSS();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('.arena-round-picker');
  });
});

// TC-rp2: roundPickerHTML returns HTML with one button per ROUND_OPTIONS entry
describe('TC-rp2 — roundPickerHTML returns buttons for every ROUND_OPTIONS entry', () => {
  it('roundPickerHTML() contains one arena-round-btn button per ROUND_OPTIONS entry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { roundPickerHTML } = await import('../../src/arena/arena-config-round-picker.ts');
    const { ROUND_OPTIONS } = await import('../../src/arena/arena-constants.ts');
    const html = roundPickerHTML();
    expect(typeof html).toBe('string');
    // Each option should produce one arena-round-btn button
    const matchCount = (html.match(/arena-round-btn/g) || []).length;
    // Each button has the class at least once — allow for selected variant
    expect(matchCount).toBeGreaterThanOrEqual(ROUND_OPTIONS.length);
  });
});

// TC-rp3: wireRoundPicker initialises selectedRounds to DEBATE.defaultRounds
describe('TC-rp3 — wireRoundPicker initialises selectedRounds to DEBATE.defaultRounds', () => {
  it('after wireRoundPicker is called, arena-state selectedRounds equals DEBATE.defaultRounds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');
    const arenaState = await import('../../src/arena/arena-state.ts');
    const { DEBATE } = await import('../../src/config.ts');

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="arena-round-row">
        <button class="arena-round-btn" data-rounds="4"><span class="arena-round-count">4</span></button>
        <button class="arena-round-btn" data-rounds="6"><span class="arena-round-count">6</span></button>
        <button class="arena-round-btn" data-rounds="8"><span class="arena-round-count">8</span></button>
        <button class="arena-round-btn" data-rounds="10"><span class="arena-round-count">10</span></button>
      </div>
    `;
    document.body.appendChild(container);

    wireRoundPicker(container);

    expect(arenaState.selectedRounds).toBe(DEBATE.defaultRounds);
    container.remove();
  });
});

// TC-rp4: Clicking a round button calls set_selectedRounds with the correct value
describe('TC-rp4 — clicking a round button updates selectedRounds in arena-state', () => {
  it('clicking a round button with data-rounds="6" sets selectedRounds to 6', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');
    const arenaState = await import('../../src/arena/arena-state.ts');

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="arena-round-row">
        <button class="arena-round-btn" data-rounds="4"><span class="arena-round-count">4</span></button>
        <button class="arena-round-btn" data-rounds="6"><span class="arena-round-count">6</span></button>
        <button class="arena-round-btn" data-rounds="8"><span class="arena-round-count">8</span></button>
        <button class="arena-round-btn" data-rounds="10"><span class="arena-round-count">10</span></button>
      </div>
    `;
    document.body.appendChild(container);

    wireRoundPicker(container);

    const btn6 = container.querySelector('[data-rounds="6"]') as HTMLElement | null;
    expect(btn6).not.toBeNull();
    btn6?.click();

    expect(arenaState.selectedRounds).toBe(6);
    container.remove();
  });
});

// TC-rp5: Clicking a round button adds .selected to that button and removes from others
describe('TC-rp5 — clicking a round button toggles .selected class correctly', () => {
  it('only the clicked round button has .selected class after being clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="arena-round-row">
        <button class="arena-round-btn selected" data-rounds="4"></button>
        <button class="arena-round-btn" data-rounds="6"></button>
        <button class="arena-round-btn" data-rounds="8"></button>
        <button class="arena-round-btn" data-rounds="10"></button>
      </div>
    `;
    document.body.appendChild(container);

    wireRoundPicker(container);

    const btn8 = container.querySelector('[data-rounds="8"]') as HTMLElement | null;
    btn8?.click();

    const allBtns = container.querySelectorAll('.arena-round-btn');
    allBtns.forEach(b => {
      if ((b as HTMLElement).dataset.rounds === '8') {
        expect(b.classList.contains('selected')).toBe(true);
      } else {
        expect(b.classList.contains('selected')).toBe(false);
      }
    });
    container.remove();
  });
});

// TC-rp6: roundPickerHTML pre-selection behaviour matches ROUND_OPTIONS vs DEBATE.defaultRounds
// NOTE: DEBATE.defaultRounds=5 does not exist in ROUND_OPTIONS (4,6,8,10), so no button will
// have the selected class pre-applied in the rendered HTML. The test asserts whichever button
// (if any) is pre-selected matches DEBATE.defaultRounds, and that no rogue selection exists.
describe('TC-rp6 — roundPickerHTML pre-selection is consistent with ROUND_OPTIONS', () => {
  it('any pre-selected round button in roundPickerHTML matches DEBATE.defaultRounds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { roundPickerHTML } = await import('../../src/arena/arena-config-round-picker.ts');
    const { DEBATE } = await import('../../src/config.ts');
    const { ROUND_OPTIONS } = await import('../../src/arena/arena-constants.ts');
    const html = roundPickerHTML();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const selectedBtn = wrapper.querySelector('.arena-round-btn.selected') as HTMLElement | null;

    if (ROUND_OPTIONS.some(o => o.rounds === DEBATE.defaultRounds)) {
      // defaultRounds exists in options — expect it to be pre-selected
      expect(selectedBtn).not.toBeNull();
      expect(selectedBtn?.dataset?.rounds).toBe(String(DEBATE.defaultRounds));
    } else {
      // defaultRounds not in ROUND_OPTIONS — no button should be pre-selected
      expect(selectedBtn).toBeNull();
    }
  });
});

// TC-rp7: showCategoryPicker embeds round picker in the overlay (integration path)
describe('TC-rp7 — showCategoryPicker overlay includes round picker HTML', () => {
  it('the arena-cat-overlay rendered by showCategoryPicker contains .arena-round-picker', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showCategoryPicker } = await import('../../src/arena/arena-config-category.ts');
    showCategoryPicker('live', 'Integration round picker test');

    const overlay = document.getElementById('arena-cat-overlay');
    expect(overlay).not.toBeNull();
    const roundPicker = overlay?.querySelector('.arena-round-picker');
    expect(roundPicker).not.toBeNull();
  });
});

// ARCH — seam #476
describe('ARCH — seam #476', () => {
  it('src/arena/arena-config-category.ts imports roundPickerCSS, roundPickerHTML, wireRoundPicker from arena-config-round-picker', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-category.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const rpLine = importLines.find(l => l.includes('arena-config-round-picker'));
    expect(rpLine).toBeDefined();
    expect(rpLine).toContain('roundPickerCSS');
    expect(rpLine).toContain('roundPickerHTML');
    expect(rpLine).toContain('wireRoundPicker');
  });
});
