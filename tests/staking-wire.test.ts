import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockPlaceStake = vi.hoisted(() => vi.fn());

vi.mock('../src/staking.rpc.ts', () => ({
  placeStake: mockPlaceStake,
}));

import { wireStakingPanel } from '../src/staking.wire.ts';

// ── DOM helpers ────────────────────────────────────────────────

function buildDOM(): void {
  document.body.innerHTML = `
    <button class="stake-side-btn" data-side="a">Side A</button>
    <button class="stake-side-btn" data-side="b">Side B</button>
    <button class="stake-quick-btn" data-amount="50">50</button>
    <button class="stake-quick-btn" data-amount="100">100</button>
    <input id="stake-amount-input" value="" />
    <button id="stake-confirm-btn" disabled style="opacity:0.5">SELECT A SIDE</button>
    <div id="stake-error" style="display:none"></div>
  `;
}

function getSideBtn(side: 'a' | 'b'): HTMLButtonElement {
  return document.querySelector(`.stake-side-btn[data-side="${side}"]`) as HTMLButtonElement;
}

function getQuickBtn(amount: string): HTMLButtonElement {
  return document.querySelector(`.stake-quick-btn[data-amount="${amount}"]`) as HTMLButtonElement;
}

function getAmountInput(): HTMLInputElement {
  return document.getElementById('stake-amount-input') as HTMLInputElement;
}

function getConfirmBtn(): HTMLButtonElement {
  return document.getElementById('stake-confirm-btn') as HTMLButtonElement;
}

function getErrorEl(): HTMLElement {
  return document.getElementById('stake-error') as HTMLElement;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockPlaceStake.mockReset();
  buildDOM();
});

// ── TC1: Confirm button starts disabled with no side selected ──

describe('TC1 — confirm button disabled before selection', () => {
  it('confirm button is initially disabled', () => {
    wireStakingPanel('debate-tc1');
    expect(getConfirmBtn().disabled).toBe(true);
    expect(getConfirmBtn().textContent).toBe('SELECT A SIDE');
  });
});

// ── TC2: Clicking a side button updates selectedSide ──────────

describe('TC2 — clicking a side button captures selectedSide', () => {
  it('confirm button shows ENTER AMOUNT after selecting side with no amount', () => {
    wireStakingPanel('debate-tc2');
    getSideBtn('a').click();
    expect(getConfirmBtn().disabled).toBe(true);
    expect(getConfirmBtn().textContent).toBe('ENTER AMOUNT');
  });
});

// ── TC3: Side + amount enables confirm button ─────────────────

describe('TC3 — side + amount enables confirm button', () => {
  it('confirm button enabled with label when side and amount are set', () => {
    wireStakingPanel('debate-tc3');
    getAmountInput().value = '50';
    getSideBtn('a').click();
    expect(getConfirmBtn().disabled).toBe(false);
    expect(getConfirmBtn().textContent).toBe('STAKE 50 ON SIDE A');
  });
});

// ── TC4: Quick amount button sets input value ─────────────────

describe('TC4 — quick amount button fills input', () => {
  it('clicking quick-btn sets the amount input value', () => {
    wireStakingPanel('debate-tc4');
    getQuickBtn('100').click();
    expect(getAmountInput().value).toBe('100');
  });
});

// ── TC5: Amount input event updates confirm button ────────────

describe('TC5 — typing in amount input updates confirm button', () => {
  it('confirm button updates when amount input fires input event', () => {
    wireStakingPanel('debate-tc5');
    getSideBtn('b').click();
    const input = getAmountInput();
    input.value = '75';
    input.dispatchEvent(new Event('input'));
    expect(getConfirmBtn().disabled).toBe(false);
    expect(getConfirmBtn().textContent).toBe('STAKE 75 ON SIDE B');
  });
});

// ── TC6: Confirm button click calls placeStake ────────────────

describe('TC6 — confirm click calls placeStake with correct args', () => {
  it('calls placeStake with debateId, side, and parsed amount', async () => {
    mockPlaceStake.mockResolvedValue({ success: true });
    wireStakingPanel('debate-tc6');
    getSideBtn('a').click();
    getAmountInput().value = '200';
    getAmountInput().dispatchEvent(new Event('input'));

    await getConfirmBtn().click();
    await vi.waitFor(() => expect(mockPlaceStake).toHaveBeenCalledTimes(1));

    const [debateId, side, amount] = mockPlaceStake.mock.calls[0];
    expect(debateId).toBe('debate-tc6');
    expect(side).toBe('a');
    expect(amount).toBe(200);
  });
});

// ── TC7: placeStake import contract ──────────────────────────

describe('TC7 — placeStake import contract', () => {
  it('wireStakingPanel uses placeStake from staking.rpc', async () => {
    mockPlaceStake.mockResolvedValue({ success: true });
    wireStakingPanel('debate-tc7');
    getSideBtn('b').click();
    getAmountInput().value = '50';
    getAmountInput().dispatchEvent(new Event('input'));

    await getConfirmBtn().click();
    await vi.waitFor(() => expect(mockPlaceStake).toHaveBeenCalled());
  });
});

// ── TC8: Success path updates confirm button text ─────────────

describe('TC8 — success path updates confirm button', () => {
  it('sets confirm button text to STAKE PLACED on success', async () => {
    mockPlaceStake.mockResolvedValue({ success: true });
    wireStakingPanel('debate-tc8');
    getSideBtn('a').click();
    getAmountInput().value = '30';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(getConfirmBtn().textContent).toBe('STAKE PLACED ✓'));
  });
});

// ── TC9: Success path hides error element ─────────────────────

describe('TC9 — success path hides error element', () => {
  it('sets stake-error display to none on success', async () => {
    mockPlaceStake.mockResolvedValue({ success: true });
    const errorEl = getErrorEl();
    errorEl.style.display = 'block';
    wireStakingPanel('debate-tc9');
    getSideBtn('a').click();
    getAmountInput().value = '10';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(errorEl.style.display).toBe('none'));
  });
});

// ── TC10: Success path calls onStakePlaced callback ───────────

describe('TC10 — success path fires onStakePlaced callback', () => {
  it('calls the optional onStakePlaced callback with the result', async () => {
    const stakeResult = { success: true as const };
    mockPlaceStake.mockResolvedValue(stakeResult);
    const cb = vi.fn();
    wireStakingPanel('debate-tc10', cb);
    getSideBtn('b').click();
    getAmountInput().value = '25';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(stakeResult));
  });
});

// ── TC11: Failure path shows error message ────────────────────

describe('TC11 — failure path shows error in stake-error element', () => {
  it('sets stake-error text and displays it on failure', async () => {
    mockPlaceStake.mockResolvedValue({ success: false, error: 'Insufficient tokens' });
    wireStakingPanel('debate-tc11');
    getSideBtn('a').click();
    getAmountInput().value = '999';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(getErrorEl().style.display).toBe('block'));
    expect(getErrorEl().textContent).toBe('Insufficient tokens');
  });
});

// ── TC12: Exception path shows fallback error ─────────────────

describe('TC12 — unexpected throw shows fallback error message', () => {
  it('shows generic error text when placeStake throws', async () => {
    mockPlaceStake.mockRejectedValue(new Error('Network timeout'));
    wireStakingPanel('debate-tc12');
    getSideBtn('a').click();
    getAmountInput().value = '50';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(getErrorEl().style.display).toBe('block'));
    expect(getErrorEl().textContent).toBe('Unexpected error. Please try again.');
  });
});

// ── TC13: Confirm button re-enables after failed stake ────────

describe('TC13 — confirm button re-enables after non-success result', () => {
  it('confirm button is re-enabled via finally block after failure', async () => {
    mockPlaceStake.mockResolvedValue({ success: false, error: 'Failed' });
    wireStakingPanel('debate-tc13');
    getSideBtn('b').click();
    getAmountInput().value = '10';
    getAmountInput().dispatchEvent(new Event('input'));

    getConfirmBtn().click();
    await vi.waitFor(() => expect(getConfirmBtn().textContent).toBe('CONFIRM STAKE'));
    expect(getConfirmBtn().disabled).toBe(false);
  });
});

// ── ARCH — import structure ────────────────────────────────────

describe('ARCH — staking.wire.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./staking.rpc.ts', './staking.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/staking.wire.ts'),
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
