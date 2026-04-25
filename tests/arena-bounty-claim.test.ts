/**
 * Tests for src/arena/arena-bounty-claim.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetOpponentBounties = vi.hoisted(() => vi.fn());
const mockSelectBountyClaim = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/bounties.ts', () => ({
  getOpponentBounties: mockGetOpponentBounties,
  selectBountyClaim: mockSelectBountyClaim,
}));

import {
  getSelectedBountyId,
  resetBountyClaim,
  renderBountyClaimDropdown,
} from '../src/arena/arena-bounty-claim.ts';

beforeEach(() => {
  vi.clearAllMocks();
  resetBountyClaim();
  document.body.innerHTML = '<div id="test-container"></div>';
});

describe('getSelectedBountyId — returns null initially', () => {
  it('TC1: returns null before any selection', () => {
    expect(getSelectedBountyId()).toBeNull();
  });
});

describe('resetBountyClaim — clears selection', () => {
  it('TC2: resets to null after being called', () => {
    resetBountyClaim();
    expect(getSelectedBountyId()).toBeNull();
  });
});

describe('renderBountyClaimDropdown — shows loading then empty message', () => {
  it('TC3: shows "No open bounties" when getOpponentBounties returns empty array', async () => {
    mockGetOpponentBounties.mockResolvedValue([]);
    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'u1', 'Alice');
    expect(container.textContent).toContain('No open bounties');
  });
});

describe('renderBountyClaimDropdown — calls getOpponentBounties with opponentId', () => {
  it('TC4: calls getOpponentBounties with the correct opponentId', async () => {
    mockGetOpponentBounties.mockResolvedValue([]);
    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'opponent-42', 'Bob');
    expect(mockGetOpponentBounties).toHaveBeenCalledWith('opponent-42');
  });
});

describe('renderBountyClaimDropdown — shows error when fetch throws', () => {
  it('TC5: shows "Could not load bounties" on error', async () => {
    mockGetOpponentBounties.mockRejectedValue(new Error('network fail'));
    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'u1', 'Alice');
    expect(container.textContent).toContain('Could not load bounties');
  });
});

describe('renderBountyClaimDropdown — renders dropdown when bounties exist', () => {
  it('TC6: renders a select element when bounties are returned', async () => {
    mockGetOpponentBounties.mockResolvedValue([
      {
        bounty_id: 'b1',
        amount: 100,
        attempt_fee: 5,
        expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      },
    ]);
    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'u1', 'Alice');
    expect(container.querySelector('select')).not.toBeNull();
  });
});

describe('renderBountyClaimDropdown — lock button calls selectBountyClaim', () => {
  it('TC7: clicking lock btn calls selectBountyClaim', async () => {
    mockGetOpponentBounties.mockResolvedValue([
      {
        bounty_id: 'b1',
        amount: 100,
        attempt_fee: 5,
        expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      },
    ]);
    mockSelectBountyClaim.mockResolvedValue({ success: true });

    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'u1', 'Alice');

    const select = container.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
    select.value = 'b1';
    select.dispatchEvent(new Event('change'));

    const lockBtn = container.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
    lockBtn.click();

    await new Promise(r => setTimeout(r, 0));
    expect(mockSelectBountyClaim).toHaveBeenCalledWith('b1', 'd1');
  });
});

describe('renderBountyClaimDropdown — escapes opponent name', () => {
  it('TC8: calls escapeHTML with opponent name', async () => {
    mockGetOpponentBounties.mockResolvedValue([]);
    const container = document.getElementById('test-container')!;
    await renderBountyClaimDropdown(container, 'd1', 'u1', '<script>Alice</script>');
    expect(mockEscapeHTML).toHaveBeenCalledWith(expect.stringContaining('<SCRIPT>ALICE</SCRIPT>'));
  });
});

describe('ARCH — src/arena/arena-bounty-claim.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', '../bounties.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-bounty-claim.ts'),
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
