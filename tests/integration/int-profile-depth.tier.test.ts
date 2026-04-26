/**
 * Integration tests — Seams #353 & #354
 * src/pages/profile-depth.tier.ts → profile-depth.state  (seam #353)
 * src/pages/profile-depth.tier.ts → profile-depth.data   (seam #354)
 *
 * profile-depth.tier.ts has NO Supabase RPC calls.
 * Seam #353 tests: serverQuestionsAnswered state drives updateMilestoneBar DOM.
 * Seam #354 tests: DEPTH_MILESTONES data drives pip rendering; window tier globals
 *                  drive renderTierBannerUI DOM.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoist mocks ─────────────────────────────────────────────────────────────

const mockRpc  = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── DOM helpers ──────────────────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="tier-banner"></div>
    <div id="milestone-bar"></div>
  `;
}

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();

  buildDOM();

  localStorage.removeItem('colosseum_profile_depth');
  localStorage.removeItem('colosseum_depth_complete');

  // Clear window tier globals (set fresh per test that needs them)
  delete (window as unknown as Record<string, unknown>).getTier;
  delete (window as unknown as Record<string, unknown>).getNextTier;
  delete (window as unknown as Record<string, unknown>).renderTierBadge;
  delete (window as unknown as Record<string, unknown>).renderTierProgress;
});

// ═══════════════════════════════════════════════════════════════════════════
// ARCH FILTER — Seams #353 & #354
// ═══════════════════════════════════════════════════════════════════════════

describe('TC-ARCH — import lines in profile-depth.tier.ts', () => {
  it('seam #353: imports serverQuestionsAnswered from profile-depth.state', () => {
    const src = readFileSync(resolve('src/pages/profile-depth.tier.ts'), 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('serverQuestionsAnswered') && l.includes('profile-depth.state'))).toBe(true);
  });

  it('seam #354: imports DEPTH_MILESTONES from profile-depth.data', () => {
    const src = readFileSync(resolve('src/pages/profile-depth.tier.ts'), 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('DEPTH_MILESTONES') && l.includes('profile-depth.data'))).toBe(true);
  });

  it('does not import any wall-listed module', () => {
    const src = readFileSync(resolve('src/pages/profile-depth.tier.ts'), 'utf-8');
    const wall = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const w of wall) {
      expect(src).not.toContain(w);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEAM #353 — profile-depth.tier → profile-depth.state
// updateMilestoneBar reads serverQuestionsAnswered and writes #milestone-bar
// ═══════════════════════════════════════════════════════════════════════════

describe('TC1 — updateMilestoneBar: serverQuestionsAnswered=0 → 0 of 100 in DOM', () => {
  it('renders milestone-pct showing 0 of 100 questions answered when state is 0', async () => {
    // serverQuestionsAnswered defaults to 0 in fresh module
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('0 of 100');
    expect(bar.innerHTML).toContain('0%');
  });
});

describe('TC2 — updateMilestoneBar: serverQuestionsAnswered=50 → 50% fill and correct pct text', () => {
  it('sets milestone-fill width to 50% and shows "50 of 100" in milestone-pct', async () => {
    const { setServerQuestionsAnswered } = await import('../../src/pages/profile-depth.state.ts');
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    setServerQuestionsAnswered(50);
    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('width:50%');
    expect(bar.innerHTML).toContain('50 of 100');
    expect(bar.innerHTML).toContain('50%');
  });
});

describe('TC3 — updateMilestoneBar: serverQuestionsAnswered=100 → 100% fill (capped)', () => {
  it('caps fill at 100% even when answered equals totalQ', async () => {
    const { setServerQuestionsAnswered } = await import('../../src/pages/profile-depth.state.ts');
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    setServerQuestionsAnswered(100);
    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('width:100%');
    expect(bar.innerHTML).toContain('100 of 100');
    expect(bar.innerHTML).toContain('100%');
  });
});

describe('TC4 — updateMilestoneBar: serverQuestionsAnswered=25 → first milestone pip is earned', () => {
  it('marks the threshold-25 pip as earned and the threshold-50 pip as not earned', async () => {
    const { setServerQuestionsAnswered } = await import('../../src/pages/profile-depth.state.ts');
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    setServerQuestionsAnswered(25);
    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    const pips = bar.querySelectorAll('.milestone-pip');

    // First pip (threshold 25) should be earned
    expect(pips[0].classList.contains('earned')).toBe(true);
    // Second pip (threshold 50) should NOT be earned
    expect(pips[1].classList.contains('earned')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEAM #354 — profile-depth.tier → profile-depth.data
// updateMilestoneBar uses DEPTH_MILESTONES; renderTierBannerUI uses window globals
// ═══════════════════════════════════════════════════════════════════════════

describe('TC5 — updateMilestoneBar renders exactly 4 milestone pips from DEPTH_MILESTONES', () => {
  it('creates 4 .milestone-pip elements in #milestone-bar', async () => {
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    updateMilestoneBar();

    const pips = document.querySelectorAll('#milestone-bar .milestone-pip');
    expect(pips.length).toBe(4);
  });
});

describe('TC6 — updateMilestoneBar: pip titles include DEPTH_MILESTONES names', () => {
  it('pip titles contain "Deep Diver" and "Grand Reveal" from data', async () => {
    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');

    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('Deep Diver');
    expect(bar.innerHTML).toContain('Grand Reveal');
  });
});

describe('TC7 — renderTierBannerUI: with getTier defined, renders tier-header in banner', () => {
  it('writes tier-header div into #tier-banner when window.getTier is available', async () => {
    // Install window tier globals before importing module
    (window as unknown as Record<string, unknown>).getTier = (_qa: number) => ({
      maxStake: 100,
      slots: 2,
      name: 'Bronze',
    });
    (window as unknown as Record<string, unknown>).getNextTier = (_qa: number) => ({
      questionsNeeded: 10,
      name: 'Silver',
    });
    (window as unknown as Record<string, unknown>).renderTierBadge = (_qa: number) =>
      '<span class="badge">Bronze</span>';
    (window as unknown as Record<string, unknown>).renderTierProgress = (_qa: number) =>
      '<div class="progress"></div>';

    const { renderTierBannerUI } = await import('../../src/pages/profile-depth.tier.ts');

    renderTierBannerUI(20);

    const banner = document.getElementById('tier-banner')!;
    expect(banner.innerHTML).toContain('tier-header');
    expect(banner.style.display).toBe('block');
  });
});

describe('TC8 — renderTierBannerUI: with getTier undefined, banner remains empty', () => {
  it('does nothing to #tier-banner when window.getTier is not installed', async () => {
    // getTier is NOT set (cleared in beforeEach)
    const { renderTierBannerUI } = await import('../../src/pages/profile-depth.tier.ts');

    renderTierBannerUI(20);

    const banner = document.getElementById('tier-banner')!;
    // Banner innerHTML should be empty — early return fired
    expect(banner.innerHTML.trim()).toBe('');
  });
});

describe('TC9 — renderTierBannerUI: tier unlock hint uses escapeHTML on next.name', () => {
  it('renders next tier name safely (escapeHTML applied) in tier-unlock-hint', async () => {
    (window as unknown as Record<string, unknown>).getTier = (_qa: number) => ({
      maxStake: 0,
      slots: 0,
      name: 'Rookie',
    });
    (window as unknown as Record<string, unknown>).getNextTier = (_qa: number) => ({
      questionsNeeded: 5,
      name: 'Silver<Elite>',
    });

    const { renderTierBannerUI } = await import('../../src/pages/profile-depth.tier.ts');

    renderTierBannerUI(0);

    const banner = document.getElementById('tier-banner')!;
    // escapeHTML converts < to &lt; and > to &gt;
    expect(banner.innerHTML).toContain('Silver&lt;Elite&gt;');
    expect(banner.innerHTML).not.toContain('Silver<Elite>');
  });
});
