/**
 * Tests for src/pages/plinko-step2-age.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockClearMsg = vi.hoisted(() => vi.fn());
const mockGetAge = vi.hoisted(() => vi.fn());
const mockGoToStep = vi.hoisted(() => vi.fn());
const mockShowMsg = vi.hoisted(() => vi.fn());
const mockSet_isMinor = vi.hoisted(() => vi.fn());
const mockSet_signupDob = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/plinko-helpers.ts', () => ({
  clearMsg: mockClearMsg,
  getAge: mockGetAge,
  goToStep: mockGoToStep,
  showMsg: mockShowMsg,
}));

vi.mock('../src/pages/plinko-state.ts', () => ({
  set_isMinor: mockSet_isMinor,
  set_signupDob: mockSet_signupDob,
}));

import { attachStep2 } from '../src/pages/plinko-step2-age.ts';

function buildDOM(month = '1', day = '15', year = '2000', tosChecked = true) {
  document.body.innerHTML = `
    <select id="dob-month"><option value="${month}" selected>${month}</option></select>
    <select id="dob-day"><option value="${day}" selected>${day}</option></select>
    <select id="dob-year"><option value="${year}" selected>${year}</option></select>
    <input type="checkbox" id="tos-check" ${tosChecked ? 'checked' : ''} />
    <div id="step2-msg"></div>
    <button id="btn-age-next">NEXT</button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('attachStep2 — shows error when dob incomplete', () => {
  it('TC1: shows error when month is missing', () => {
    buildDOM('', '15', '2000', true);
    mockGetAge.mockReturnValue(24);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockShowMsg).toHaveBeenCalledWith('step2-msg', expect.any(String), 'error');
    expect(mockGoToStep).not.toHaveBeenCalled();
  });
});

describe('attachStep2 — shows error when tos not checked', () => {
  it('TC2: shows error when tos checkbox is unchecked', () => {
    buildDOM('1', '15', '2000', false);
    mockGetAge.mockReturnValue(24);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockShowMsg).toHaveBeenCalledWith('step2-msg', expect.stringContaining('Terms'), 'error');
  });
});

describe('attachStep2 — shows error for age under 13', () => {
  it('TC3: shows error when computed age is 12', () => {
    buildDOM('1', '15', '2014', true);
    mockGetAge.mockReturnValue(12);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockShowMsg).toHaveBeenCalledWith('step2-msg', expect.stringContaining('13'), 'error');
  });
});

describe('attachStep2 — advances to step 3 for valid adult', () => {
  it('TC4: calls goToStep(3) for age 18+', () => {
    buildDOM('1', '15', '2000', true);
    mockGetAge.mockReturnValue(24);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockGoToStep).toHaveBeenCalledWith(3);
  });
});

describe('attachStep2 — sets signupDob correctly', () => {
  it('TC5: calls set_signupDob with formatted date', () => {
    buildDOM('3', '5', '1995', true);
    mockGetAge.mockReturnValue(30);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockSet_signupDob).toHaveBeenCalledWith('1995-03-05');
  });
});

describe('attachStep2 — sets isMinor for age 13-17', () => {
  it('TC6: calls set_isMinor(true) for age 15', () => {
    buildDOM('1', '15', '2010', true);
    mockGetAge.mockReturnValue(15);
    attachStep2();
    document.getElementById('btn-age-next')!.click();
    expect(mockSet_isMinor).toHaveBeenCalledWith(true);
  });
});

describe('ARCH — src/pages/plinko-step2-age.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./plinko-helpers.ts', './plinko-state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-step2-age.ts'),
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
