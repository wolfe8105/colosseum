/**
 * Tests for src/pages/profile-depth.tier.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockServerQuestionsAnswered = vi.hoisted(() => ({ value: 0 }));
const mockDepthMilestones = vi.hoisted(() => [
  { threshold: 10, name: 'Initiate', desc: 'First milestone', icon: '🌟' },
  { threshold: 50, name: 'Veteran', desc: 'Halfway', icon: '🏆' },
]);

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/pages/profile-depth.state.ts', () => ({
  get serverQuestionsAnswered() { return mockServerQuestionsAnswered.value; },
}));

vi.mock('../src/pages/profile-depth.data.ts', () => ({
  DEPTH_MILESTONES: mockDepthMilestones,
  SECTIONS: [],
}));

function buildDOM() {
  document.body.innerHTML = `
    <div id="tier-banner" style="display:none"></div>
    <div id="milestone-bar"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockServerQuestionsAnswered.value = 0;
  // Reset window globals
  delete (window as Record<string, unknown>).getTier;
  delete (window as Record<string, unknown>).getNextTier;
  delete (window as Record<string, unknown>).renderTierBadge;
  delete (window as Record<string, unknown>).renderTierProgress;
});

import { renderTierBannerUI, updateMilestoneBar } from '../src/pages/profile-depth.tier.ts';

describe('renderTierBannerUI — no-ops when getTier not in window', () => {
  it('TC1: does not throw and does not modify banner when getTier missing', () => {
    expect(() => renderTierBannerUI(5)).not.toThrow();
    expect(document.getElementById('tier-banner')!.style.display).toBe('none');
  });
});

describe('renderTierBannerUI — no-ops when tier-banner element missing', () => {
  it('TC2: does not throw when tier-banner element is absent', () => {
    document.getElementById('tier-banner')?.remove();
    expect(() => renderTierBannerUI(5)).not.toThrow();
  });
});

describe('updateMilestoneBar — renders milestone bar', () => {
  it('TC3: renders milestone-bar HTML with percentage', () => {
    mockServerQuestionsAnswered.value = 10;
    updateMilestoneBar();
    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('10%');
  });

  it('TC4: renders milestone pips for each milestone', () => {
    mockServerQuestionsAnswered.value = 5;
    updateMilestoneBar();
    const bar = document.getElementById('milestone-bar')!;
    expect(bar.querySelectorAll('.milestone-pip').length).toBe(2);
  });

  it('TC5: earned milestone has "earned" class when threshold met', () => {
    mockServerQuestionsAnswered.value = 15;
    updateMilestoneBar();
    const bar = document.getElementById('milestone-bar')!;
    const pips = bar.querySelectorAll('.milestone-pip');
    expect(pips[0].classList.contains('earned')).toBe(true);
    expect(pips[1].classList.contains('earned')).toBe(false);
  });

  it('TC6: caps percentage at 100% when answered > 100', () => {
    mockServerQuestionsAnswered.value = 150;
    updateMilestoneBar();
    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('100%');
  });

  it('TC7: no-ops gracefully when milestone-bar element missing', () => {
    document.body.innerHTML = '';
    expect(() => updateMilestoneBar()).not.toThrow();
  });
});

describe('ARCH — src/pages/profile-depth.tier.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './profile-depth.state.ts', './profile-depth.data.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/profile-depth.tier.ts'),
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
