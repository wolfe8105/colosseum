/**
 * Integration tests — src/arena/arena-bounty-claim.ts → bounties
 * SEAM #250
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Arch test
// ---------------------------------------------------------------------------
describe('ARCH: arena-bounty-claim only imports from allowed modules', () => {
  it('imports only config and bounties (no wall deps)', async () => {
    const src = await import('../../src/arena/arena-bounty-claim.ts?raw').then(m => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_BOUNTY_A = {
  bounty_id: 'b-aaa',
  poster_id: 'p-111',
  amount: 200,
  duration_days: 7,
  expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  attempt_fee: 10,
};

const MOCK_BOUNTY_B = {
  bounty_id: 'b-bbb',
  poster_id: 'p-222',
  amount: 500,
  duration_days: 14,
  expires_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
  attempt_fee: 25,
};

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function teardown(el: HTMLElement) {
  el.remove();
}

// ---------------------------------------------------------------------------
// Module-under-test (re-imported fresh each test)
// ---------------------------------------------------------------------------

let renderBountyClaimDropdown: typeof import('../../src/arena/arena-bounty-claim.ts')['renderBountyClaimDropdown'];
let getSelectedBountyId: typeof import('../../src/arena/arena-bounty-claim.ts')['getSelectedBountyId'];
let resetBountyClaim: typeof import('../../src/arena/arena-bounty-claim.ts')['resetBountyClaim'];

let mockGetOpponentBounties: ReturnType<typeof vi.fn>;
let mockSelectBountyClaim: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  mockGetOpponentBounties = vi.fn().mockResolvedValue([]);
  mockSelectBountyClaim = vi.fn().mockResolvedValue({ success: true });

  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }));

  vi.mock('../../src/bounties.ts', () => ({
    getOpponentBounties: (...args: unknown[]) => mockGetOpponentBounties(...args),
    selectBountyClaim: (...args: unknown[]) => mockSelectBountyClaim(...args),
  }));

  const mod = await import('../../src/arena/arena-bounty-claim.ts');
  renderBountyClaimDropdown = mod.renderBountyClaimDropdown;
  getSelectedBountyId = mod.getSelectedBountyId;
  resetBountyClaim = mod.resetBountyClaim;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// TC-01: Loading state shown before async resolves
// ---------------------------------------------------------------------------
describe('TC-01: loading state before async resolves', () => {
  it('renders Checking bounties… immediately on call', async () => {
    // Use a controlled promise so we can both inspect mid-flight and cleanly resolve
    let resolvePromise!: (v: unknown[]) => void;
    const controlledPromise = new Promise<unknown[]>(res => { resolvePromise = res; });
    mockGetOpponentBounties.mockReturnValue(controlledPromise);

    const container = makeContainer();
    const renderPromise = renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    // Synchronous check — loading state must be visible before promise resolves
    expect(container.innerHTML).toContain('Checking bounties');

    // Resolve cleanly so no dangling rejection
    resolvePromise([]);
    await renderPromise;

    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-02: No bounties → fallback message
// ---------------------------------------------------------------------------
describe('TC-02: no open bounties shows fallback', () => {
  it('shows "No open bounties" when RPC returns empty array', async () => {
    mockGetOpponentBounties.mockResolvedValue([]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const inner = container.querySelector<HTMLElement>('#bounty-claim-inner');
    expect(inner?.textContent).toContain('No open bounties on this opponent');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-03: RPC throws → error message
// ---------------------------------------------------------------------------
describe('TC-03: RPC error shows graceful fallback', () => {
  it('shows "Could not load bounties" on thrown error', async () => {
    mockGetOpponentBounties.mockRejectedValue(new Error('network failure'));

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const inner = container.querySelector<HTMLElement>('#bounty-claim-inner');
    expect(inner?.textContent).toContain('Could not load bounties');
    teardown(container);
  });

  it('calls getOpponentBounties with the opponent ID', async () => {
    mockGetOpponentBounties.mockRejectedValue(new Error('fail'));

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-xyz', 'Bob');

    expect(mockGetOpponentBounties).toHaveBeenCalledWith('opp-xyz');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-04: Bounties rendered into dropdown
// ---------------------------------------------------------------------------
describe('TC-04: bounties render as <option> elements', () => {
  it('renders one option per bounty plus the placeholder', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A, MOCK_BOUNTY_B]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select');
    expect(select).toBeTruthy();
    // placeholder + 2 real options
    expect(select!.options.length).toBe(3);
    expect(select!.options[1].value).toBe('b-aaa');
    expect(select!.options[2].value).toBe('b-bbb');
    teardown(container);
  });

  it('lock button is disabled before a selection is made', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn');
    expect(lockBtn?.disabled).toBe(true);
    teardown(container);
  });

  it('escapes opponent name in heading', async () => {
    mockGetOpponentBounties.mockResolvedValue([]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', '<script>xss</script>');

    expect(container.innerHTML).not.toContain('<script>xss</script>');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-05: Select change enables lock button and shows preview
// ---------------------------------------------------------------------------
describe('TC-05: selecting a bounty enables lock and shows preview', () => {
  it('enables lock button and shows fee preview after selection', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    const preview = container.querySelector<HTMLElement>('#bounty-claim-preview')!;

    // Select the first real option (index 1)
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    expect(lockBtn.disabled).toBe(false);
    expect(preview.textContent).toContain('Attempt fee: 10 tokens');
    expect(preview.textContent).toContain('190'); // 200 * 0.95
    teardown(container);
  });

  it('disables lock button again when placeholder is re-selected', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;

    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));
    expect(lockBtn.disabled).toBe(false);

    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(lockBtn.disabled).toBe(true);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-06: Lock click — success path
// ---------------------------------------------------------------------------
describe('TC-06: lock click success — shows locked state, updates module state', () => {
  it('calls selectBountyClaim with correct params on lock', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-99', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockSelectBountyClaim).toHaveBeenCalledWith('b-aaa', 'debate-99');
    teardown(container);
  });

  it('sets getSelectedBountyId to the locked bounty after success', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-99', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(getSelectedBountyId()).toBe('b-aaa');
    teardown(container);
  });

  it('shows #bounty-claim-locked and hides select/preview/button on success', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-99', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();
    await vi.advanceTimersByTimeAsync(0);

    const lockedEl = container.querySelector<HTMLElement>('#bounty-claim-locked')!;
    const previewEl = container.querySelector<HTMLElement>('#bounty-claim-preview')!;

    expect(lockedEl.style.display).toBe('block');
    expect(select.style.display).toBe('none');
    expect(previewEl.style.display).toBe('none');
    expect(lockBtn.style.display).toBe('none');
    teardown(container);
  });

  it('detail text includes fee and earnings on success', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-99', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    const detailEl = container.querySelector<HTMLElement>('#bounty-claim-locked-detail')!;
    expect(detailEl.textContent).toContain('10 token attempt fee paid');
    expect(detailEl.textContent).toContain('190'); // 200 * 0.95
    teardown(container);
  });

  it('prevents double-click via _attemptFeePaid flag', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-99', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();
    await vi.advanceTimersByTimeAsync(0);
    lockBtn.click(); // second click should be no-op
    await vi.advanceTimersByTimeAsync(0);

    expect(mockSelectBountyClaim).toHaveBeenCalledTimes(1);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-07: Lock click — failure path
// ---------------------------------------------------------------------------
describe('TC-07: lock click failure — shows error, state not updated', () => {
  it('shows error message from RPC on failure', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: false, error: 'Insufficient tokens' });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    const errEl = container.querySelector<HTMLElement>('#bounty-claim-error')!;
    expect(errEl.style.display).toBe('block');
    expect(errEl.textContent).toContain('Insufficient tokens');
    teardown(container);
  });

  it('getSelectedBountyId remains null after failure', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: false, error: 'Insufficient tokens' });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(getSelectedBountyId()).toBeNull();
    teardown(container);
  });

  it('restores lock button after failure (re-enable for retry)', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: false, error: 'fail' });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();
    await vi.advanceTimersByTimeAsync(0);

    // finally block re-enables button
    expect(lockBtn.disabled).toBe(false);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-08: resetBountyClaim clears state
// ---------------------------------------------------------------------------
describe('TC-08: resetBountyClaim clears selected bounty', () => {
  it('getSelectedBountyId returns null after resetBountyClaim', async () => {
    mockGetOpponentBounties.mockResolvedValue([MOCK_BOUNTY_A]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = makeContainer();
    await renderBountyClaimDropdown(container, 'debate-1', 'opp-1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = MOCK_BOUNTY_A.bounty_id;
    select.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(getSelectedBountyId()).toBe('b-aaa');
    resetBountyClaim();
    expect(getSelectedBountyId()).toBeNull();
    teardown(container);
  });
});
