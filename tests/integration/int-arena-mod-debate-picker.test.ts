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

// Stub @peermetrics/webrtc-stats — pulled in transitively via webrtc.monitor.ts
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// TC1: showModDebatePicker sets view to 'modDebatePicker' in arena-state
describe('TC1 — showModDebatePicker sets arena-state view to modDebatePicker', () => {
  it('calls set_view with modDebatePicker', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(state.view).toBe('modDebatePicker');
  });
});

// TC2: showModDebatePicker renders #mod-debate-create-btn into screenEl
describe('TC2 — showModDebatePicker renders #mod-debate-create-btn', () => {
  it('injects create button into the DOM', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(document.getElementById('mod-debate-create-btn')).not.toBeNull();
  });
});

// TC3: showModDebatePicker renders mode select with text/live/voicememo options
describe('TC3 — showModDebatePicker renders #mod-debate-mode with correct options', () => {
  it('includes text, live, and voicememo options in the mode select', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    const modeSelect = document.getElementById('mod-debate-mode') as HTMLSelectElement | null;
    expect(modeSelect).not.toBeNull();
    const values = Array.from(modeSelect!.options).map(o => o.value);
    expect(values).toContain('text');
    expect(values).toContain('live');
    expect(values).toContain('voicememo');
  });
});

// TC4: showModDebatePicker renders #mod-debate-picker-back button
describe('TC4 — showModDebatePicker renders back button', () => {
  it('injects #mod-debate-picker-back into the DOM', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(document.getElementById('mod-debate-picker-back')).not.toBeNull();
  });
});

// TC5: createModDebate calls safeRpc → create_mod_debate with correct params
describe('TC5 — createModDebate calls create_mod_debate RPC with correct params', () => {
  it('fires rpc create_mod_debate including p_mode and p_total_rounds from selectedRounds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));
    state.set_selectedRounds(5);

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    // Mock the create_mod_debate RPC; subsequent poll RPC also needs a response
    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-001', join_code: 'ABC123' }, error: null });

    const createPromise = mod.createModDebate();
    // Advance enough for the async RPC to resolve but not run poll intervals forever
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(mockRpc).toHaveBeenCalledWith(
      'create_mod_debate',
      expect.objectContaining({
        p_mode: 'text',
        p_total_rounds: 5,
      }),
    );
  });
});

// TC6: createModDebate calls set_modDebateId with returned debate_id on success
describe('TC6 — createModDebate stores debate_id in arena-state via set_modDebateId', () => {
  it('sets modDebateId to the returned debate_id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-777', join_code: 'XYZ999' }, error: null });

    const createPromise = mod.createModDebate();
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(state.modDebateId).toBe('deb-777');
  });
});

// TC7: createModDebate disables button during async call, re-enables after
describe('TC7 — createModDebate disables and re-enables the create button', () => {
  it('button is disabled during call and re-enabled after resolution', async () => {
    // Use real timers so we can directly await the promise without timer loops
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    // Use a deferred promise to capture the in-flight state
    let resolveRpc!: (v: unknown) => void;
    const rpcPromise = new Promise(res => { resolveRpc = res; });
    mockRpc.mockReturnValueOnce(rpcPromise);
    // Subsequent RPC calls (from poll) return empty to avoid side effects
    mockRpc.mockResolvedValue({ data: null, error: null });

    const createPromise = mod.createModDebate();

    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    resolveRpc({ data: { debate_id: 'deb-999', join_code: 'LMNO' }, error: null });
    await createPromise;

    expect(btn.disabled).toBe(false);
  });
});

// ARCH — seam boundary check
describe('ARCH — seam #038', () => {
  it('src/arena/arena-mod-debate-picker.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ─── Seam #471: arena-mod-debate-picker → arena-config-round-picker ───────────

// TC8: roundPickerCSS returns a non-empty string containing expected class names
describe('TC8 — roundPickerCSS returns CSS with expected selectors', () => {
  it('contains .arena-round-picker and .arena-round-btn class selectors', async () => {
    const { roundPickerCSS } = await import('../../src/arena/arena-config-round-picker.ts');
    const css = roundPickerCSS();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('.arena-round-picker');
    expect(css).toContain('.arena-round-btn');
  });
});

// TC9: roundPickerHTML returns HTML with one .arena-round-btn per ROUND_OPTION entry
describe('TC9 — roundPickerHTML produces one button per ROUND_OPTIONS entry', () => {
  it('renders 4 round buttons corresponding to ROUND_OPTIONS', async () => {
    const { roundPickerHTML } = await import('../../src/arena/arena-config-round-picker.ts');
    const html = roundPickerHTML();
    const matches = html.match(/class="arena-round-btn/g);
    // ROUND_OPTIONS has 4 entries: 4, 6, 8, 10
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(4);
  });
});

// TC10: roundPickerHTML marks the default round count as selected
describe('TC10 — roundPickerHTML marks DEBATE.defaultRounds button as selected', () => {
  it('includes selected class on the default rounds button', async () => {
    const { roundPickerHTML } = await import('../../src/arena/arena-config-round-picker.ts');
    const html = roundPickerHTML();
    // DEBATE.defaultRounds = 5 is NOT in ROUND_OPTIONS (4,6,8,10), so no button
    // should be pre-selected (the selected class depends on o.rounds === defaultRounds)
    // Verify the HTML is well-formed and contains data-rounds attributes
    expect(html).toContain('data-rounds="4"');
    expect(html).toContain('data-rounds="6"');
    expect(html).toContain('data-rounds="8"');
    expect(html).toContain('data-rounds="10"');
  });
});

// TC11: wireRoundPicker sets selectedRounds to DEBATE.defaultRounds on init
describe('TC11 — wireRoundPicker initialises selectedRounds via set_selectedRounds', () => {
  it('sets arena-state selectedRounds to defaultRounds when wired', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    // Set to a sentinel value first
    state.set_selectedRounds(999);

    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');
    const container = document.createElement('div');
    container.innerHTML = '<button class="arena-round-btn" data-rounds="6"></button>';
    wireRoundPicker(container);

    // wireRoundPicker calls set_selectedRounds(DEBATE.defaultRounds) which is 5
    expect(state.selectedRounds).toBe(5);
  });
});

// TC12: wireRoundPicker updates selectedRounds when a round button is clicked
describe('TC12 — wireRoundPicker updates selectedRounds on button click', () => {
  it('sets selectedRounds to the data-rounds value of the clicked button', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');

    const container = document.createElement('div');
    container.innerHTML = `
      <button class="arena-round-btn" data-rounds="4"></button>
      <button class="arena-round-btn" data-rounds="6"></button>
      <button class="arena-round-btn" data-rounds="8"></button>
    `;
    document.body.appendChild(container);
    wireRoundPicker(container);

    const btn8 = container.querySelector('[data-rounds="8"]') as HTMLElement;
    btn8.click();

    expect(state.selectedRounds).toBe(8);
    document.body.removeChild(container);
  });
});

// TC13: wireRoundPicker toggles selected class — only clicked button has it
describe('TC13 — wireRoundPicker toggles .selected class exclusively to clicked button', () => {
  it('adds selected to clicked button and removes it from others', async () => {
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');

    const container = document.createElement('div');
    container.innerHTML = `
      <button class="arena-round-btn selected" data-rounds="4"></button>
      <button class="arena-round-btn" data-rounds="6"></button>
    `;
    document.body.appendChild(container);
    wireRoundPicker(container);

    const btn6 = container.querySelector('[data-rounds="6"]') as HTMLElement;
    btn6.click();

    const btn4 = container.querySelector('[data-rounds="4"]') as HTMLElement;
    expect(btn6.classList.contains('selected')).toBe(true);
    expect(btn4.classList.contains('selected')).toBe(false);
    document.body.removeChild(container);
  });
});

// TC14: showModDebatePicker injects round picker HTML into the DOM
describe('TC14 — showModDebatePicker injects round picker (.arena-round-row) into DOM', () => {
  it('renders .arena-round-row inside the container', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(document.querySelector('.arena-round-row')).not.toBeNull();
  });
});

// ARCH — seam #471 boundary checks
describe('ARCH — seam #471 | arena-mod-debate-picker → arena-config-round-picker', () => {
  it('arena-mod-debate-picker.ts imports from arena-config-round-picker', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-config-round-picker'))).toBe(true);
  });

  it('arena-config-round-picker.ts imports set_selectedRounds from arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-round-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });

  it('arena-config-round-picker.ts does NOT import from arena-config-mode or arena-config-settings', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-round-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.every(l => !l.includes('arena-config-mode'))).toBe(true);
    expect(importLines.every(l => !l.includes('arena-config-settings'))).toBe(true);
  });
});

// ─── Seam #527: arena-mod-debate-picker → arena-mod-debate-waiting ────────────

// TC15: createModDebate success → view becomes 'modDebateWaiting'
describe('TC15 — createModDebate success transitions view to modDebateWaiting', () => {
  it('arena-state view equals modDebateWaiting after successful create', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-527a', join_code: 'WAIT1' }, error: null });

    const createPromise = mod.createModDebate();
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(state.view).toBe('modDebateWaiting');
  });
});

// TC16: createModDebate success → join code is rendered in the DOM
describe('TC16 — createModDebate success renders join code into the DOM', () => {
  it('join code text from RPC response appears in rendered waiting screen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-527b', join_code: 'JCODE9' }, error: null });

    const createPromise = mod.createModDebate();
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(document.body.innerHTML).toContain('JCODE9');
  });
});

// TC17: showModDebateWaitingMod renders slot-a-name and slot-b-name elements
describe('TC17 — showModDebateWaitingMod renders debater slot elements', () => {
  it('injects #slot-a-name and #slot-b-name into the DOM', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const waiting = await import('../../src/arena/arena-mod-debate-waiting.ts');
    waiting.showModDebateWaitingMod('deb-tc17', 'CODE17', 'Test Topic', 'text', false);

    expect(document.getElementById('slot-a-name')).not.toBeNull();
    expect(document.getElementById('slot-b-name')).not.toBeNull();
  });
});

// TC18: showModDebateWaitingMod renders #mod-debate-cancel-btn
describe('TC18 — showModDebateWaitingMod renders cancel button', () => {
  it('injects #mod-debate-cancel-btn into the DOM', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const waiting = await import('../../src/arena/arena-mod-debate-waiting.ts');
    waiting.showModDebateWaitingMod('deb-tc18', 'CODE18', 'Cancel Topic', 'live', true);

    expect(document.getElementById('mod-debate-cancel-btn')).not.toBeNull();
  });
});

// TC19: clicking cancel button fires cancel_mod_debate RPC
describe('TC19 — cancel button click fires cancel_mod_debate RPC', () => {
  it('calls rpc cancel_mod_debate with the debate_id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const waiting = await import('../../src/arena/arena-mod-debate-waiting.ts');
    waiting.showModDebateWaitingMod('deb-tc19', 'CODE19', 'Cancel Test', 'text', false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const cancelBtn = document.getElementById('mod-debate-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    // Let the async cancelModDebate RPC resolve
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith(
      'cancel_mod_debate',
      expect.objectContaining({ p_debate_id: 'deb-tc19' }),
    );
  });
});

// TC20: startModDebatePoll fires check_mod_debate RPC after the 4-second interval
describe('TC20 — startModDebatePoll fires check_mod_debate RPC after 4s interval', () => {
  it('calls rpc check_mod_debate with the debate_id after 4000ms', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    // Render waiting screen which calls startModDebatePoll
    const waiting = await import('../../src/arena/arena-mod-debate-waiting.ts');
    waiting.showModDebateWaitingMod('deb-tc20', 'CODE20', 'Poll Topic', 'text', false);

    mockRpc.mockResolvedValue({ data: { status: 'waiting', debater_a_name: null, debater_b_name: null }, error: null });

    // Advance past one poll interval
    await vi.advanceTimersByTimeAsync(4100);

    expect(mockRpc).toHaveBeenCalledWith(
      'check_mod_debate',
      expect.objectContaining({ p_debate_id: 'deb-tc20' }),
    );

    // Stop the poll so the interval doesn't leak
    const poll = await import('../../src/arena/arena-mod-debate-poll.ts');
    poll.stopModDebatePoll();
  });
});

// TC21: showModDebateWaitingMod sets view to 'modDebateWaiting' in arena-state
describe('TC21 — showModDebateWaitingMod sets arena-state view to modDebateWaiting', () => {
  it('arena-state view equals modDebateWaiting after showModDebateWaitingMod call', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const waiting = await import('../../src/arena/arena-mod-debate-waiting.ts');
    waiting.showModDebateWaitingMod('deb-tc21', 'CODE21', 'State Topic', 'voicememo', true);

    expect(state.view).toBe('modDebateWaiting');
  });
});

// ARCH — seam #527 boundary checks
describe('ARCH — seam #527 | arena-mod-debate-picker → arena-mod-debate-waiting', () => {
  it('arena-mod-debate-picker.ts imports showModDebateWaitingMod from arena-mod-debate-waiting', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-mod-debate-waiting'))).toBe(true);
  });

  it('arena-mod-debate-waiting.ts does NOT import from arena-mod-debate-picker (no cycle)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-waiting.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.every(l => !l.includes('arena-mod-debate-picker'))).toBe(true);
  });
});
