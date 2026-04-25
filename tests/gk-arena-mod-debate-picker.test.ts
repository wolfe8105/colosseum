// ============================================================
// GK — F-48 MOD-INITIATED DEBATE — PICKER TESTS
// Tests showModDebatePicker() and createModDebate()
// from src/arena/arena-mod-debate-picker.ts.
// Spec: docs/product/F-48-mod-initiated-debate.md §1–§2
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── All mocks hoisted to avoid TDZ in vi.mock factories ──────

const mockSafeRpc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { debate_id: 'deb-gk', join_code: 'GK1234' }, error: null })
);
const mockShowToast    = vi.hoisted(() => vi.fn());
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));

const mockScreenEl      = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockSelectedRounds = vi.hoisted(() => ({ value: 3 }));
const mockSet_view      = vi.hoisted(() => vi.fn());
const mockSet_modDebateId = vi.hoisted(() => vi.fn());

const mockRoundPickerCSS  = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockRoundPickerHTML = vi.hoisted(() => vi.fn().mockReturnValue('<div id="round-picker"></div>'));
const mockWireRoundPicker = vi.hoisted(() => vi.fn());
const mockShowModDebateWaitingMod = vi.hoisted(() => vi.fn());
const mockShowModQueue    = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl()       { return mockScreenEl.value; },
  get selectedRounds() { return mockSelectedRounds.value; },
  set_view:        mockSet_view,
  set_modDebateId: mockSet_modDebateId,
}));

vi.mock('../src/arena/arena-config-round-picker.ts', () => ({
  roundPickerCSS:  mockRoundPickerCSS,
  roundPickerHTML: mockRoundPickerHTML,
  wireRoundPicker: mockWireRoundPicker,
}));

vi.mock('../src/arena/arena-mod-debate-waiting.ts', () => ({
  showModDebateWaitingMod: mockShowModDebateWaitingMod,
}));

vi.mock('../src/arena/arena-mod-queue-browse.ts', () => ({
  showModQueue: mockShowModQueue,
}));

import { showModDebatePicker, createModDebate } from '../src/arena/arena-mod-debate-picker.ts';

// ── Helpers ──────────────────────────────────────────────────

function setupPickerDOM() {
  document.body.innerHTML = '<div id="app"></div>';
  mockScreenEl.value = document.getElementById('app');
}

function setupCreateDOM(overrides: Partial<{
  mode: string; category: string; topic: string; ranked: boolean; ruleset: string;
}> = {}) {
  const o = { mode: 'text', category: '', topic: 'Climate Change', ranked: false, ruleset: 'amplified', ...overrides };
  document.body.innerHTML = `
    <button id="mod-debate-create-btn">⚔️ CREATE &amp; GET CODE</button>
    <select id="mod-debate-mode">
      <option value="text"  ${o.mode === 'text'  ? 'selected' : ''}>Text</option>
      <option value="live"  ${o.mode === 'live'  ? 'selected' : ''}>Live</option>
    </select>
    <select id="mod-debate-category">
      <option value=""        ${o.category === ''        ? 'selected' : ''}>Any</option>
      <option value="politics" ${o.category === 'politics' ? 'selected' : ''}>Politics</option>
    </select>
    <input id="mod-debate-topic" value="${o.topic}" />
    <input id="mod-debate-ranked" type="checkbox" ${o.ranked ? 'checked' : ''} />
    <select id="mod-debate-ruleset">
      <option value="amplified" ${o.ruleset === 'amplified' ? 'selected' : ''}>Amplified</option>
      <option value="unplugged" ${o.ruleset === 'unplugged' ? 'selected' : ''}>Unplugged</option>
    </select>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectedRounds.value = 3;
  mockSafeRpc.mockResolvedValue({ data: { debate_id: 'deb-gk', join_code: 'GK1234' }, error: null });
});

// ── TC1: set_view called with modDebatePicker ─────────────────

describe('TC1 — showModDebatePicker sets view to modDebatePicker', () => {
  it('calls set_view("modDebatePicker")', () => {
    setupPickerDOM();
    showModDebatePicker();
    expect(mockSet_view).toHaveBeenCalledWith('modDebatePicker');
  });
});

// ── TC2: history push with arenaView ─────────────────────────

describe('TC2 — showModDebatePicker pushes arenaView: modDebatePicker to browser history', () => {
  it('window.history.state contains arenaView: modDebatePicker after call', () => {
    setupPickerDOM();
    showModDebatePicker();
    expect(window.history.state).toEqual({ arenaView: 'modDebatePicker' });
  });
});

// ── TC3: screenEl cleared before render ──────────────────────

describe('TC3 — showModDebatePicker clears screenEl.innerHTML before rendering', () => {
  it('pre-existing screenEl content is removed', () => {
    setupPickerDOM();
    mockScreenEl.value!.innerHTML = '<p>stale content</p>';
    showModDebatePicker();
    expect(document.body.innerHTML).not.toContain('stale content');
  });
});

// ── TC4: mode select — text, live, voicememo ─────────────────

describe('TC4 — showModDebatePicker renders mode select with text, live, voicememo options', () => {
  it('all three mode values are present in mod-debate-mode select', () => {
    setupPickerDOM();
    showModDebatePicker();
    const sel = document.getElementById('mod-debate-mode') as HTMLSelectElement;
    const values = Array.from(sel.options).map(o => o.value);
    expect(values).toContain('text');
    expect(values).toContain('live');
    expect(values).toContain('voicememo');
  });
});

// ── TC5: category select — blank + all 6 categories ──────────

describe('TC5 — showModDebatePicker renders category select with Any and all six categories', () => {
  it('category select contains empty string plus politics, sports, entertainment, music, movies, general', () => {
    setupPickerDOM();
    showModDebatePicker();
    const sel = document.getElementById('mod-debate-category') as HTMLSelectElement;
    const values = Array.from(sel.options).map(o => o.value);
    expect(values).toContain('');
    expect(values).toContain('politics');
    expect(values).toContain('sports');
    expect(values).toContain('entertainment');
    expect(values).toContain('music');
    expect(values).toContain('movies');
    expect(values).toContain('general');
  });
});

// ── TC6: topic input — maxlength 200 ─────────────────────────

describe('TC6 — showModDebatePicker renders topic input with maxlength 200', () => {
  it('mod-debate-topic maxLength attribute is 200', () => {
    setupPickerDOM();
    showModDebatePicker();
    const input = document.getElementById('mod-debate-topic') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.maxLength).toBe(200);
  });
});

// ── TC7: ranked — checkbox type ───────────────────────────────

describe('TC7 — showModDebatePicker renders mod-debate-ranked as a checkbox input', () => {
  it('mod-debate-ranked is an input element of type checkbox', () => {
    setupPickerDOM();
    showModDebatePicker();
    const cb = document.getElementById('mod-debate-ranked') as HTMLInputElement;
    expect(cb).not.toBeNull();
    expect(cb.type).toBe('checkbox');
  });
});

// ── TC8: ruleset select — amplified and unplugged ─────────────

describe('TC8 — showModDebatePicker renders ruleset select with amplified and unplugged', () => {
  it('mod-debate-ruleset contains amplified and unplugged options', () => {
    setupPickerDOM();
    showModDebatePicker();
    const sel = document.getElementById('mod-debate-ruleset') as HTMLSelectElement;
    const values = Array.from(sel.options).map(o => o.value);
    expect(values).toContain('amplified');
    expect(values).toContain('unplugged');
  });
});

// ── TC9: wireRoundPicker called once ──────────────────────────

describe('TC9 — showModDebatePicker calls wireRoundPicker exactly once', () => {
  it('wireRoundPicker is invoked once per render', () => {
    setupPickerDOM();
    showModDebatePicker();
    expect(mockWireRoundPicker).toHaveBeenCalledTimes(1);
  });
});

// ── TC10: BACK button → showModQueue ─────────────────────────

describe('TC10 — back button click calls showModQueue', () => {
  it('clicking mod-debate-picker-back triggers showModQueue via dynamic import', async () => {
    setupPickerDOM();
    showModDebatePicker();
    document.getElementById('mod-debate-picker-back')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowModQueue).toHaveBeenCalledTimes(1);
  });
});

// ── TC11: CREATE button wires createModDebate ─────────────────

describe('TC11 — clicking create button triggers createModDebate', () => {
  it('mod-debate-create-btn click causes safeRpc create_mod_debate to be called', async () => {
    setupPickerDOM();
    showModDebatePicker();
    document.getElementById('mod-debate-create-btn')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSafeRpc).toHaveBeenCalledWith('create_mod_debate', expect.any(Object));
  });
});

// ── TC12: createModDebate — skip when disabled ────────────────

describe('TC12 — createModDebate returns early when button is already disabled', () => {
  it('safeRpc is not called when button.disabled is true before createModDebate runs', async () => {
    setupCreateDOM();
    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    btn.disabled = true;
    await createModDebate();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC13: createModDebate — button disabled during RPC ────────

describe('TC13 — createModDebate disables button and shows Creating… while RPC is pending', () => {
  it('button.disabled is true and textContent contains Creating while safeRpc awaits', async () => {
    setupCreateDOM();
    let resolveRpc!: (v: unknown) => void;
    mockSafeRpc.mockReturnValueOnce(new Promise(r => { resolveRpc = r; }));
    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    const promise = createModDebate();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Creating');
    resolveRpc({ data: { debate_id: 'deb-gk', join_code: 'GK1234' }, error: null });
    await promise;
  });
});

// ── TC14: createModDebate — correct RPC name ─────────────────

describe('TC14 — createModDebate calls safeRpc with name create_mod_debate', () => {
  it('first argument to safeRpc is the string "create_mod_debate"', async () => {
    setupCreateDOM();
    await createModDebate();
    const [rpcName] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('create_mod_debate');
  });
});

// ── TC15: createModDebate — all six named params present ──────

describe('TC15 — createModDebate sends all six required named parameters', () => {
  it('payload keys include p_mode, p_topic, p_category, p_ranked, p_ruleset, p_total_rounds', async () => {
    setupCreateDOM({ topic: 'Test topic' });
    await createModDebate();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(Object.keys(args)).toEqual(
      expect.arrayContaining(['p_mode', 'p_topic', 'p_category', 'p_ranked', 'p_ruleset', 'p_total_rounds'])
    );
  });
});

// ── TC16: createModDebate — blank topic → p_topic null ────────

describe('TC16 — createModDebate sends null for p_topic when topic input is blank', () => {
  it('p_topic is null when topic input value is an empty string', async () => {
    setupCreateDOM({ topic: '' });
    await createModDebate();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_topic).toBeNull();
  });
});

// ── TC17: createModDebate — empty category → p_category null ─

describe('TC17 — createModDebate sends null for p_category when category is empty string (Any)', () => {
  it('p_category is null when category select value is empty string', async () => {
    setupCreateDOM({ category: '' });
    await createModDebate();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_category).toBeNull();
  });
});

// ── TC18: createModDebate — p_total_rounds from selectedRounds ─

describe('TC18 — createModDebate uses selectedRounds from state for p_total_rounds', () => {
  it('p_total_rounds equals the current selectedRounds value', async () => {
    setupCreateDOM();
    mockSelectedRounds.value = 7;
    await createModDebate();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_total_rounds).toBe(7);
  });
});

// ── TC19: createModDebate — set_modDebateId called ────────────

describe('TC19 — createModDebate calls set_modDebateId with the debate_id from RPC', () => {
  it('set_modDebateId receives debate_id returned by create_mod_debate RPC', async () => {
    setupCreateDOM();
    await createModDebate();
    expect(mockSet_modDebateId).toHaveBeenCalledWith('deb-gk');
  });
});

// ── TC20: createModDebate — showModDebateWaitingMod args ──────

describe('TC20 — createModDebate calls showModDebateWaitingMod with debateId, joinCode, topic, mode, ranked', () => {
  it('showModDebateWaitingMod receives the five correct positional arguments', async () => {
    setupCreateDOM({ topic: 'Gun Control', mode: 'text', ranked: false });
    await createModDebate();
    expect(mockShowModDebateWaitingMod).toHaveBeenCalledWith(
      'deb-gk', 'GK1234', 'Gun Control', 'text', false
    );
  });
});

// ── TC21: createModDebate — blank topic → 'Open Debate' ───────

describe('TC21 — createModDebate passes "Open Debate" to waiting screen when topic is blank', () => {
  it('third argument to showModDebateWaitingMod is "Open Debate" when topic input is empty', async () => {
    setupCreateDOM({ topic: '' });
    await createModDebate();
    const thirdArg = mockShowModDebateWaitingMod.mock.calls[0][2];
    expect(thirdArg).toBe('Open Debate');
  });
});

// ── TC22: createModDebate — toast on RPC error ────────────────

describe('TC22 — createModDebate shows toast when safeRpc returns an error', () => {
  it('showToast is called once when RPC returns a non-null error', async () => {
    setupCreateDOM();
    mockSafeRpc.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
    await createModDebate();
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// ── TC23: createModDebate — button re-enabled in finally ──────

describe('TC23 — createModDebate re-enables the button and restores CREATE text after failure', () => {
  it('button.disabled is false and textContent contains CREATE & GET CODE after RPC error', async () => {
    setupCreateDOM();
    mockSafeRpc.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    await createModDebate();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('CREATE');
    expect(btn.textContent).toContain('GET CODE');
  });
});

// ── ARCH: only allowed static imports ────────────────────────

describe('ARCH — arena-mod-debate-picker.ts has no static imports outside the allowed list', () => {
  it('every static import path is in the allowed set', () => {
    const allowed = new Set([
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-config-round-picker.ts',
      './arena-mod-debate-waiting.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-debate-picker.ts'),
      'utf-8'
    );
    const staticImportLines = source
      .split('\n')
      .filter(line => /^import\s/.test(line.trimStart()));
    const paths = staticImportLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed.has(path), `Unexpected static import found: ${path}`).toBe(true);
    }
  });
});
