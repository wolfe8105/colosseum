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
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// ─── TC1: silenceTimer is cleared when active ────────────────────────────────

describe('TC1 — renderNulledDebate clears active silenceTimer', () => {
  it('calls clearInterval and nulls silenceTimer when it is set', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const arenaState = await import('../../src/arena/arena-state.ts');
    const fakeTimer = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>;
    arenaState.set_silenceTimer(fakeTimer);
    expect(arenaState.silenceTimer).not.toBeNull();

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');
    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const debate = {
      id: 'debate-001',
      topic: 'Test topic',
      _nullReason: 'Opponent disconnected',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    expect(arenaState.silenceTimer).toBeNull();

    vi.useRealTimers();
  });
});

// ─── TC2: shieldActive is cleared and activatedPowerUps is emptied ───────────

describe('TC2 — renderNulledDebate clears shieldActive and activatedPowerUps', () => {
  it('sets shieldActive to false and clears the activated power-ups set', async () => {
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_shieldActive(true);
    arenaState.activatedPowerUps.add('shield');
    arenaState.activatedPowerUps.add('silence');

    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    const debate = {
      id: 'debate-002',
      topic: 'Shield test',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    expect(arenaState.shieldActive).toBe(false);
    expect(arenaState.activatedPowerUps.size).toBe(0);
  });
});

// ─── TC3: overlay elements are removed from DOM ──────────────────────────────

describe('TC3 — renderNulledDebate removes power-up overlays from DOM', () => {
  it('removes powerup-silence-overlay and powerup-reveal-popup elements', async () => {
    document.body.innerHTML = `
      <div id="screen-main"></div>
      <div id="powerup-silence-overlay"></div>
      <div id="powerup-reveal-popup"></div>
    `;

    const arenaState = await import('../../src/arena/arena-state.ts');
    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    const debate = {
      id: 'debate-003',
      topic: 'Overlay test',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    expect(document.getElementById('powerup-silence-overlay')).toBeNull();
    expect(document.getElementById('powerup-reveal-popup')).toBeNull();
  });
});

// ─── TC4: NULLED screen renders topic and reason (XSS-escaped) ──────────────

describe('TC4 — renderNulledDebate renders NULLED screen with escaped content', () => {
  it('renders topic and _nullReason content escaped in screenEl', async () => {
    const arenaState = await import('../../src/arena/arena-state.ts');
    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    const debate = {
      id: 'debate-004',
      topic: '<script>alert("xss")</script>',
      _nullReason: 'Opponent left <early>',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    const html = screenEl!.innerHTML;
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;early&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('DEBATE NULLED');
    expect(html).toContain('No Rating Change');
  });
});

// ─── TC5: default reason when _nullReason is absent ─────────────────────────

describe('TC5 — renderNulledDebate uses default reason when _nullReason is absent', () => {
  it('shows "Debate nulled" when no _nullReason is provided', async () => {
    const arenaState = await import('../../src/arena/arena-state.ts');
    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    const debate = {
      id: 'debate-005',
      topic: 'Default reason test',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    expect(screenEl!.innerHTML).toContain('Debate nulled');
  });
});

// ─── TC6: back-to-lobby button triggers dynamic import of arena-lobby ────────

describe('TC6 — back-to-lobby button loads arena-lobby and calls renderLobby', () => {
  it('clicking #arena-back-to-lobby invokes renderLobby from dynamic import', async () => {
    const mockRenderLobby = vi.fn();
    vi.doMock('../../src/arena/arena-lobby.ts', () => ({
      renderLobby: mockRenderLobby,
    }));

    const arenaState = await import('../../src/arena/arena-state.ts');
    const screenEl = document.getElementById('screen-main');
    arenaState.set_screenEl(screenEl);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    const debate = {
      id: 'debate-006',
      topic: 'Lobby nav test',
      _nullReason: 'Timeout',
    } as Parameters<typeof renderNulledDebate>[0];

    renderNulledDebate(debate);

    const btn = document.getElementById('arena-back-to-lobby') as HTMLButtonElement;
    expect(btn).not.toBeNull();

    btn.click();
    // Allow dynamic import microtask to settle
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(mockRenderLobby).toHaveBeenCalledTimes(1);
  });
});

// ─── ARCH ────────────────────────────────────────────────────────────────────

describe('ARCH — seam #031 import boundary unchanged', () => {
  it('src/arena/arena-room-end-nulled.ts still imports arena-state', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-nulled.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ─── seam #247: arena-room-end-nulled → powerups ────────────────────────────

describe('seam #247 TC-P1 — removeShieldIndicator removes #powerup-shield-indicator', () => {
  it('removes the shield indicator element from DOM during nulled render', async () => {
    document.body.innerHTML = `
      <div id="screen-main"></div>
      <div id="powerup-shield-indicator"></div>
    `;

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(document.getElementById('screen-main'));
    arenaState.set_shieldActive(true);

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    renderNulledDebate({
      id: 'debate-p01',
      topic: 'Shield removal test',
    } as Parameters<typeof renderNulledDebate>[0]);

    expect(document.getElementById('powerup-shield-indicator')).toBeNull();
    expect(arenaState.shieldActive).toBe(false);
  });
});

describe('seam #247 TC-P2 — removeShieldIndicator is safe when element absent', () => {
  it('renderNulledDebate does not throw when #powerup-shield-indicator is not in DOM', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(document.getElementById('screen-main'));

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    expect(() =>
      renderNulledDebate({
        id: 'debate-p02',
        topic: 'No shield present',
      } as Parameters<typeof renderNulledDebate>[0])
    ).not.toThrow();
  });
});

describe('seam #247 TC-P3 — screenEl is cleared before NULLED post is appended', () => {
  it('empties screenEl.innerHTML before appending the post element', async () => {
    document.body.innerHTML = '<div id="screen-main"><span id="stale-content">old</span></div>';

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(document.getElementById('screen-main'));

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    renderNulledDebate({
      id: 'debate-p03',
      topic: 'Clear test',
    } as Parameters<typeof renderNulledDebate>[0]);

    const screenEl = document.getElementById('screen-main');
    expect(document.getElementById('stale-content')).toBeNull();
    expect(screenEl!.querySelector('.arena-post')).not.toBeNull();
  });
});

describe('seam #247 TC-P4 — null silenceTimer does not throw', () => {
  it('renderNulledDebate succeeds when silenceTimer is already null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="screen-main"></div>';

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_silenceTimer(null);
    arenaState.set_screenEl(document.getElementById('screen-main'));

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    expect(() =>
      renderNulledDebate({
        id: 'debate-p04',
        topic: 'Null timer test',
      } as Parameters<typeof renderNulledDebate>[0])
    ).not.toThrow();

    expect(arenaState.silenceTimer).toBeNull();

    vi.useRealTimers();
  });
});

describe('seam #247 TC-P5 — NULLED post contains back-to-lobby button', () => {
  it('renders #arena-back-to-lobby button inside screenEl after nulled render', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(document.getElementById('screen-main'));

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    renderNulledDebate({
      id: 'debate-p05',
      topic: 'Button render test',
      _nullReason: 'Timeout expired',
    } as Parameters<typeof renderNulledDebate>[0]);

    const btn = document.getElementById('arena-back-to-lobby');
    expect(btn).not.toBeNull();
    expect(btn!.tagName).toBe('BUTTON');
  });
});

describe('seam #247 TC-P6 — activatedPowerUps cleared even when pre-populated', () => {
  it('clears all entries from activatedPowerUps set before rendering', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.activatedPowerUps.add('silence');
    arenaState.activatedPowerUps.add('multiplier_2x');
    arenaState.activatedPowerUps.add('shield');
    expect(arenaState.activatedPowerUps.size).toBe(3);

    arenaState.set_screenEl(document.getElementById('screen-main'));

    const { renderNulledDebate } = await import('../../src/arena/arena-room-end-nulled.ts');

    renderNulledDebate({
      id: 'debate-p06',
      topic: 'Power-ups clear test',
    } as Parameters<typeof renderNulledDebate>[0]);

    expect(arenaState.activatedPowerUps.size).toBe(0);
  });
});

describe('seam #247 ARCH-P — import boundary: arena-room-end-nulled imports from powerups', () => {
  it('imports removeShieldIndicator from ../powerups.ts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-nulled.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('powerups'))).toBe(true);
    expect(importLines.some(l => l.includes('removeShieldIndicator'))).toBe(true);
  });
});
