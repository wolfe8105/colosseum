import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { debate_id: 'deb-1', join_code: 'XYZ99' }, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockSelectedRounds = vi.hoisted(() => ({ value: 3 }));
const mockSet_view = vi.hoisted(() => vi.fn());
const mockSet_modDebateId = vi.hoisted(() => vi.fn());

const mockRoundPickerCSS = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockRoundPickerHTML = vi.hoisted(() => vi.fn().mockReturnValue('<div id="round-picker"></div>'));
const mockWireRoundPicker = vi.hoisted(() => vi.fn());
const mockShowModDebateWaitingMod = vi.hoisted(() => vi.fn());
const mockShowModQueue = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  get selectedRounds() { return mockSelectedRounds.value; },
  set_view: mockSet_view,
  set_modDebateId: mockSet_modDebateId,
}));

vi.mock('../src/arena/arena-config-round-picker.ts', () => ({
  roundPickerCSS: mockRoundPickerCSS,
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

describe('TC1 — showModDebatePicker renders picker UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls set_view with modDebatePicker', () => {
    showModDebatePicker();
    expect(mockSet_view).toHaveBeenCalledWith('modDebatePicker');
  });

  it('renders create button', () => {
    showModDebatePicker();
    expect(document.getElementById('mod-debate-create-btn')).not.toBeNull();
  });

  it('renders back button', () => {
    showModDebatePicker();
    expect(document.getElementById('mod-debate-picker-back')).not.toBeNull();
  });

  it('renders mode select with text/live/voicememo options', () => {
    showModDebatePicker();
    const sel = document.getElementById('mod-debate-mode') as HTMLSelectElement;
    expect(sel).not.toBeNull();
    const values = Array.from(sel.options).map(o => o.value);
    expect(values).toContain('text');
    expect(values).toContain('live');
    expect(values).toContain('voicememo');
  });

  it('calls wireRoundPicker', () => {
    showModDebatePicker();
    expect(mockWireRoundPicker).toHaveBeenCalled();
  });

  it('back button calls showModQueue', async () => {
    showModDebatePicker();
    document.getElementById('mod-debate-picker-back')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowModQueue).toHaveBeenCalled();
  });
});

describe('TC2 — createModDebate calls safeRpc and shows waiting screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="app"></div>
      <button id="mod-debate-create-btn">CREATE</button>
      <select id="mod-debate-mode"><option value="text" selected>Text</option></select>
      <select id="mod-debate-category"><option value="" selected>Any</option></select>
      <input id="mod-debate-topic" value="Climate Change" />
      <input id="mod-debate-ranked" type="checkbox" />
      <select id="mod-debate-ruleset"><option value="amplified" selected>Amplified</option></select>
    `;
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls safeRpc create_mod_debate', async () => {
    await createModDebate();
    expect(mockSafeRpc).toHaveBeenCalledWith('create_mod_debate', expect.objectContaining({
      p_mode: 'text',
    }));
  });

  it('calls set_modDebateId with the returned debate_id', async () => {
    await createModDebate();
    expect(mockSet_modDebateId).toHaveBeenCalledWith('deb-1');
  });

  it('calls showModDebateWaitingMod with join code and topic', async () => {
    await createModDebate();
    expect(mockShowModDebateWaitingMod).toHaveBeenCalledWith('deb-1', 'XYZ99', 'Climate Change', 'text', false);
  });

  it('uses selectedRounds from state', async () => {
    mockSelectedRounds.value = 5;
    await createModDebate();
    expect(mockSafeRpc).toHaveBeenCalledWith('create_mod_debate', expect.objectContaining({ p_total_rounds: 5 }));
  });

  it('shows toast on RPC error', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    await createModDebate();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('skips when button is already disabled', async () => {
    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    btn.disabled = true;
    await createModDebate();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-mod-debate-picker.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-config-round-picker.ts',
      './arena-mod-debate-waiting.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-debate-picker.ts'),
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
