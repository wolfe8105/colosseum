/**
 * int-staking.wire.test.ts
 * Seam #450 | src/staking.wire.ts → staking.rpc
 * 7 TCs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stable mocks (module-level)
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() })),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDOM(): void {
  document.body.innerHTML = `
    <div id="staking-panel">
      <button class="stake-side-btn" data-side="a">Side A</button>
      <button class="stake-side-btn" data-side="b">Side B</button>
      <button class="stake-quick-btn" data-amount="50">50</button>
      <button class="stake-quick-btn" data-amount="100">100</button>
      <input id="stake-amount-input" type="number" value="" />
      <button id="stake-confirm-btn" disabled>SELECT A SIDE</button>
      <div id="stake-error" style="display:none;"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('staking.wire → staking.rpc integration (seam #450)', () => {
  let wireStakingPanel: typeof import('../../src/staking.wire.ts').wireStakingPanel;
  let placeStakeMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    placeStakeMock = vi.fn(() => Promise.resolve({ success: true }));

    vi.doMock('../../src/staking.rpc.ts', () => ({
      placeStake: placeStakeMock,
      getPool: vi.fn(() => Promise.resolve({ exists: false, total_side_a: 0, total_side_b: 0, pool_status: 'none', user_stake: null })),
      settleStakes: vi.fn(() => Promise.resolve({ success: true })),
      getOdds: vi.fn(() => ({ a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' })),
    }));

    vi.doMock('../../src/staking.types.ts', () => ({}));

    buildDOM();

    const mod = await import('../../src/staking.wire.ts');
    wireStakingPanel = mod.wireStakingPanel;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // -------------------------------------------------------------------------
  // TC-1: Side button click — selects side, confirm still disabled (no amount)
  // -------------------------------------------------------------------------
  it('TC-1: clicking side-btn "a" selects side but confirm stays disabled without amount', () => {
    wireStakingPanel('debate-123');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(confirmBtn.textContent).toBe('ENTER AMOUNT');
  });

  // -------------------------------------------------------------------------
  // TC-2: Quick amount button fills input and updates confirm state
  // -------------------------------------------------------------------------
  it('TC-2: clicking quick-amount btn sets input value', () => {
    wireStakingPanel('debate-123');

    const quickBtn = document.querySelector('.stake-quick-btn[data-amount="50"]') as HTMLButtonElement;
    quickBtn.click();

    const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement;
    expect(amountInput.value).toBe('50');
  });

  // -------------------------------------------------------------------------
  // TC-3: Side + amount both set → confirm button enabled with correct label
  // -------------------------------------------------------------------------
  it('TC-3: selecting side + entering amount enables confirm with stake label', () => {
    wireStakingPanel('debate-123');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement;
    amountInput.value = '75';
    amountInput.dispatchEvent(new Event('input'));

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    expect(confirmBtn.textContent).toBe('STAKE 75 ON SIDE A');
  });

  // -------------------------------------------------------------------------
  // TC-4: Confirm click → calls placeStake with correct params → success path
  // -------------------------------------------------------------------------
  it('TC-4: confirm click calls placeStake(debateId, side, amount) and shows STAKE PLACED on success', async () => {
    placeStakeMock.mockResolvedValue({ success: true });
    wireStakingPanel('debate-abc');

    // Select side A
    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    // Enter amount
    const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement;
    amountInput.value = '100';
    amountInput.dispatchEvent(new Event('input'));

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    // Flush microtasks
    await vi.advanceTimersByTimeAsync(0);

    expect(placeStakeMock).toHaveBeenCalledWith('debate-abc', 'a', 100);
    expect(confirmBtn.textContent).toBe('STAKE PLACED ✓');
    expect(confirmBtn.style.background).toBe('var(--mod-cyan)');
  });

  // -------------------------------------------------------------------------
  // TC-5: placeStake returns {success:false} → error element shown
  // -------------------------------------------------------------------------
  it('TC-5: placeStake failure shows error message in #stake-error', async () => {
    placeStakeMock.mockResolvedValue({ success: false, error: 'Not enough tokens' });
    wireStakingPanel('debate-xyz');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="b"]') as HTMLButtonElement;
    sideBtn.click();

    const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement;
    amountInput.value = '200';
    amountInput.dispatchEvent(new Event('input'));

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    await vi.advanceTimersByTimeAsync(0);

    const errorEl = document.getElementById('stake-error') as HTMLElement;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toBe('Not enough tokens');
  });

  // -------------------------------------------------------------------------
  // TC-6: placeStake throws unexpectedly → generic error message, button re-enabled
  // -------------------------------------------------------------------------
  it('TC-6: placeStake throw shows generic error and re-enables confirm button', async () => {
    placeStakeMock.mockRejectedValue(new Error('Network error'));
    wireStakingPanel('debate-throw');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement;
    amountInput.value = '50';
    amountInput.dispatchEvent(new Event('input'));

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    await vi.advanceTimersByTimeAsync(0);

    const errorEl = document.getElementById('stake-error') as HTMLElement;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toBe('Unexpected error. Please try again.');
    // Button should be re-enabled (was 'PLACING STAKE...' before throw)
    expect(confirmBtn.disabled).toBe(false);
    expect(confirmBtn.textContent).toBe('CONFIRM STAKE');
  });

  // -------------------------------------------------------------------------
  // TC-7: ARCH — staking.wire.ts imports only placeStake from staking.rpc
  // -------------------------------------------------------------------------
  it('TC-7: ARCH: staking.wire.ts imports only from staking.rpc (not staking.ts barrel)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/staking.wire.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const rpcImport = importLines.find(l => l.includes('staking.rpc'));
    expect(rpcImport).toBeTruthy();
    expect(rpcImport).toContain('placeStake');
    // Must not import from the barrel staking.ts
    const barrelImport = importLines.find(l => /from\s+['"].*\/staking['"]/.test(l));
    expect(barrelImport).toBeUndefined();
  });
});
