/**
 * Integration tests — Seam #275
 * src/async.render.wager.ts → async.state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock (mandatory — only mock @supabase/supabase-js)
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal card DOM that _showWagerPicker searches for */
function buildCardDOM(debateId: string): HTMLElement {
  document.body.innerHTML = '';

  const card = document.createElement('div');
  // Must use setAttribute so the raw style string matches the source's
  // closest('div[style*="background:var(--mod-bg-card)"]') selector.
  // jsdom normalises .style.cssText by inserting spaces, breaking the match.
  card.setAttribute('style', 'background:var(--mod-bg-card);');

  const btn = document.createElement('button');
  btn.setAttribute('data-action', 'predict');
  btn.setAttribute('data-id', debateId);

  card.appendChild(btn);
  document.body.appendChild(card);
  return card;
}

// ---------------------------------------------------------------------------
// TC1 — _showWagerPicker appends #wager-picker-wrapper when prediction matches
// ---------------------------------------------------------------------------
describe('TC1: _showWagerPicker appends picker when prediction exists', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('appends #wager-picker-wrapper to card', async () => {
    // Seed state before importing render module
    const { state } = await import('../../src/async.state.ts');
    state.predictions = [
      {
        debate_id: 'debate-1',
        topic: 'Test Topic',
        p1: 'Alice',
        p2: 'Bob',
        p1_elo: 1200,
        p2_elo: 1300,
        total: 100,
        pct_a: 40,
        pct_b: 60,
        user_pick: null,
        status: 'live',
      },
    ];

    // Mock auth so getCurrentProfile returns a token balance
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u1',
      token_balance: 200,
    } as never);

    buildCardDOM('debate-1');

    const { _showWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-1', 'a');

    const wrapper = document.getElementById('wager-picker-wrapper');
    expect(wrapper).not.toBeNull();
    expect(document.getElementById('wager-picker')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC2 — _showWagerPicker does nothing when no matching prediction
// ---------------------------------------------------------------------------
describe('TC2: _showWagerPicker is a no-op when prediction missing', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('does not append picker DOM', async () => {
    const { state } = await import('../../src/async.state.ts');
    state.predictions = []; // no predictions

    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u1',
      token_balance: 100,
    } as never);

    buildCardDOM('debate-999');

    const { _showWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-999', 'a');

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC3 — zero token balance produces no quick-amount buttons
// ---------------------------------------------------------------------------
describe('TC3: zero token balance → no quick-amount buttons', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('renders empty quick amounts', async () => {
    const { state } = await import('../../src/async.state.ts');
    state.predictions = [
      {
        debate_id: 'debate-2',
        topic: 'Zero Balance Test',
        p1: 'X',
        p2: 'Y',
        p1_elo: 1000,
        p2_elo: 1000,
        total: 0,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];

    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u2',
      token_balance: 0,
    } as never);

    buildCardDOM('debate-2');

    const { _showWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-2', 'b');

    // With balance=0, no quick amounts pass the filter (a <= Math.min(500,0) = 0)
    const quickBtns = document.querySelectorAll('[data-action="wager-quick"]');
    expect(quickBtns.length).toBe(0);

    // "need at least 1 token" message should appear
    const wrapper = document.getElementById('wager-picker-wrapper');
    expect(wrapper?.innerHTML).toContain('need at least 1 token');
  });
});

// ---------------------------------------------------------------------------
// TC4 — balance of 30 produces quick amounts [10, 25] only
// ---------------------------------------------------------------------------
describe('TC4: balance 30 → quick amounts [10, 25]', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('renders only amounts ≤ 30', async () => {
    const { state } = await import('../../src/async.state.ts');
    state.predictions = [
      {
        debate_id: 'debate-3',
        topic: 'Budget Test',
        p1: 'Frugal',
        p2: 'Spender',
        p1_elo: 1100,
        p2_elo: 1200,
        total: 50,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];

    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u3',
      token_balance: 30,
    } as never);

    buildCardDOM('debate-3');

    const { _showWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-3', 'a');

    const quickBtns = document.querySelectorAll('[data-action="wager-quick"]');
    expect(quickBtns.length).toBe(2);

    const amounts = Array.from(quickBtns).map(b => Number(b.getAttribute('data-amount')));
    expect(amounts).toEqual([10, 25]);
  });
});

// ---------------------------------------------------------------------------
// TC5 — _hideWagerPicker removes wrapper from DOM
// ---------------------------------------------------------------------------
describe('TC5: _hideWagerPicker removes #wager-picker-wrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('removes the wrapper element', async () => {
    const { state } = await import('../../src/async.state.ts');
    state.predictions = [
      {
        debate_id: 'debate-4',
        topic: 'Hide Test',
        p1: 'P1',
        p2: 'P2',
        p1_elo: 1000,
        p2_elo: 1000,
        total: 0,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];

    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u4',
      token_balance: 100,
    } as never);

    buildCardDOM('debate-4');

    const { _showWagerPicker, _hideWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-4', 'a');

    expect(document.getElementById('wager-picker-wrapper')).not.toBeNull();

    _hideWagerPicker();

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC6 — Calling _showWagerPicker twice leaves only one picker in DOM
// ---------------------------------------------------------------------------
describe('TC6: double _showWagerPicker → only one picker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('replaces old picker with new one', async () => {
    const { state } = await import('../../src/async.state.ts');
    const pred = {
      debate_id: 'debate-5',
      topic: 'Double Call',
      p1: 'A',
      p2: 'B',
      p1_elo: 1000,
      p2_elo: 1000,
      total: 0,
      pct_a: 50,
      pct_b: 50,
      user_pick: null as null,
      status: 'live',
    };
    state.predictions = [pred];

    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u5',
      token_balance: 50,
    } as never);

    buildCardDOM('debate-5');

    const { _showWagerPicker } = await import('../../src/async.render.wager.ts');
    _showWagerPicker('debate-5', 'a');
    _showWagerPicker('debate-5', 'b');

    const wrappers = document.querySelectorAll('#wager-picker-wrapper');
    expect(wrappers.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TC7 — ARCH filter: import lines use from '...' pattern
// ---------------------------------------------------------------------------
describe('TC7: ARCH filter — import lines use from "..." pattern', () => {
  it('detects imports via regex, not startsWith', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/async.render.wager.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    const importLines = source
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));

    // Must find at least the 3 imports
    expect(importLines.length).toBeGreaterThanOrEqual(3);

    const hasState = importLines.some((l: string) => l.includes('./async.state'));
    const hasConfig = importLines.some((l: string) => l.includes('./config'));
    const hasAuth = importLines.some((l: string) => l.includes('./auth'));

    expect(hasState).toBe(true);
    expect(hasConfig).toBe(true);
    expect(hasAuth).toBe(true);
  });
});
