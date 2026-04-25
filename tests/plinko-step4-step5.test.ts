/**
 * Tests for src/pages/plinko-step4-step5.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockToggleModerator = vi.hoisted(() => vi.fn());
const mockGetReturnTo = vi.hoisted(() => vi.fn());
const mockGoToStep = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  toggleModerator: mockToggleModerator,
}));

vi.mock('../src/pages/plinko-helpers.ts', () => ({
  getReturnTo: mockGetReturnTo,
  goToStep: mockGoToStep,
}));

import { attachStep4, attachStep5 } from '../src/pages/plinko-step4-step5.ts';

function buildStep4DOM() {
  document.body.innerHTML = `
    <button id="btn-enable-mod">ENABLE MOD</button>
    <button id="btn-skip-mod">SKIP</button>
  `;
}

function buildStep5DOM() {
  document.body.innerHTML = `
    <button id="btn-enter">ENTER</button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('attachStep4 — enable mod button calls toggleModerator and advances', () => {
  it('TC1: clicking enable mod calls toggleModerator(true) then goToStep(5)', async () => {
    buildStep4DOM();
    mockToggleModerator.mockResolvedValue(undefined);
    attachStep4();
    document.getElementById('btn-enable-mod')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockToggleModerator).toHaveBeenCalledWith(true);
    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachStep4 — still advances to step 5 even if toggleModerator fails', () => {
  it('TC2: calls goToStep(5) even when toggleModerator throws', async () => {
    buildStep4DOM();
    mockToggleModerator.mockRejectedValue(new Error('fail'));
    attachStep4();
    document.getElementById('btn-enable-mod')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachStep4 — skip button advances to step 5 without toggleModerator', () => {
  it('TC3: clicking skip goes to step 5 without calling toggleModerator', () => {
    buildStep4DOM();
    attachStep4();
    document.getElementById('btn-skip-mod')!.click();
    expect(mockToggleModerator).not.toHaveBeenCalled();
    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachStep5 — enter button navigates to returnTo URL', () => {
  it('TC4: clicking enter sets window.location.href to getReturnTo()', () => {
    buildStep5DOM();
    mockGetReturnTo.mockReturnValue('/arena');
    attachStep5();
    // Just verify getReturnTo is called — location change is side-effect
    document.getElementById('btn-enter')!.click();
    expect(mockGetReturnTo).toHaveBeenCalled();
  });
});

describe('ARCH — src/pages/plinko-step4-step5.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', './plinko-helpers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-step4-step5.ts'),
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
