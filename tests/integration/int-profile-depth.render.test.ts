/**
 * Integration tests — profile-depth.render.ts → profile-depth.state (#355)
 *                      profile-depth.render.ts → profile-depth.data  (#356)
 * Seams: #355, #356
 * 10 TCs total (5 per seam)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ARCH filter (mandatory) ───────────────────────────────────────────────────
const renderSource = readFileSync(
  resolve(__dirname, '../../src/pages/profile-depth.render.ts'),
  'utf8'
);
const renderImports = renderSource.split('\n').filter(l => /from\s+['"]/.test(l));

describe('ARCH — profile-depth.render import lines', () => {
  it('imports from profile-depth.state', () => {
    expect(renderImports.some(l => l.includes('profile-depth.state'))).toBe(true);
  });
  it('imports from profile-depth.data', () => {
    expect(renderImports.some(l => l.includes('profile-depth.data'))).toBe(true);
  });
  it('has no wall imports', () => {
    const WALL = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    const hit = renderImports.find(l => WALL.some(w => l.includes(w)));
    expect(hit).toBeUndefined();
  });
});

// ── Shared setup ─────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
  })),
}));

// Provide minimal localStorage stub (jsdom already has one, but ensure clean state)

// Helper: create a minimal DOM environment for renderGrid
function setupGridDOM(): HTMLElement {
  const grid = document.createElement('div');
  grid.id = 'section-grid';
  document.body.appendChild(grid);
  return grid;
}

function teardownGridDOM(): void {
  const existing = document.getElementById('section-grid');
  if (existing) existing.remove();
}

// ── Seam #355 — render → state ────────────────────────────────────────────────

describe('Seam #355 — profile-depth.render → profile-depth.state', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    // Reset localStorage to a known baseline
    localStorage.removeItem('colosseum_profile_depth');
    localStorage.removeItem('colosseum_depth_complete');
    teardownGridDOM();
  });

  it('TC355-1: sectionPct returns 0 when answers is empty', async () => {
    const { sectionPct } = await import('../../src/pages/profile-depth.render.ts');
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    // answers is empty (fresh localStorage)
    const pct = sectionPct(SECTIONS[0]);
    expect(pct).toBe(0);
  });

  it('TC355-2: sectionPct returns 100 when all questions in a section answered', async () => {
    // Pre-fill localStorage with answers for SECTIONS[0] (basics: b1-b5)
    const basics = { b1: 'Pat', b2: 'NYC', b3: 'Male', b4: '25-34', b5: '$50-75K' };
    localStorage.setItem('colosseum_profile_depth', JSON.stringify(basics));

    const { sectionPct } = await import('../../src/pages/profile-depth.render.ts');
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const pct = sectionPct(SECTIONS[0]); // basics section
    expect(pct).toBe(100);
  });

  it('TC355-3: renderGrid marks tile with "complete" class for completed sections', async () => {
    localStorage.setItem('colosseum_depth_complete', JSON.stringify(['basics']));
    const grid = setupGridDOM();

    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    renderGrid(() => {});

    const tile = grid.querySelector('[data-section="basics"]') as HTMLElement;
    expect(tile).toBeTruthy();
    expect(tile.classList.contains('complete')).toBe(true);
  });

  it('TC355-4: renderGrid marks tile with "active-section" class matching activeSection', async () => {
    // Set activeSection via state setter
    const stateModule = await import('../../src/pages/profile-depth.state.ts');
    stateModule.setActiveSection('politics');

    const grid = setupGridDOM();
    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    renderGrid(() => {});

    const tile = grid.querySelector('[data-section="politics"]') as HTMLElement;
    expect(tile).toBeTruthy();
    expect(tile.classList.contains('active-section')).toBe(true);
  });

  it('TC355-5: renderGrid click listener calls onSectionClick with correct section id', async () => {
    const grid = setupGridDOM();
    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    const onSectionClick = vi.fn();
    renderGrid(onSectionClick);

    const tile = grid.querySelector('[data-section="basics"]') as HTMLElement;
    expect(tile).toBeTruthy();
    tile.click();
    expect(onSectionClick).toHaveBeenCalledWith('basics');
  });
});

// ── Seam #356 — render → data ─────────────────────────────────────────────────

describe('Seam #356 — profile-depth.render → profile-depth.data', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    localStorage.removeItem('colosseum_profile_depth');
    localStorage.removeItem('colosseum_depth_complete');
    teardownGridDOM();
  });

  it('TC356-1: SECTIONS is non-empty and renderGrid renders at least one tile', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    expect(SECTIONS.length).toBeGreaterThan(0);

    const grid = setupGridDOM();
    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    renderGrid(() => {});

    const tiles = grid.querySelectorAll('.section-tile');
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('TC356-2: renderGrid renders exactly SECTIONS.length tiles', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const grid = setupGridDOM();
    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    renderGrid(() => {});

    const tiles = grid.querySelectorAll('.section-tile');
    expect(tiles.length).toBe(SECTIONS.length);
  });

  it('TC356-3: renderQuestion with chips question from SECTIONS produces .chip-group', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const { renderQuestion } = await import('../../src/pages/profile-depth.render.ts');

    // basics section q b3 is a chips question
    const chipsQ = SECTIONS[0].questions.find(q => q.type === 'chips');
    expect(chipsQ).toBeTruthy();
    const html = renderQuestion(chipsQ!);
    expect(html).toContain('chip-group');
    expect(html).toContain(`data-qid="${chipsQ!.id}"`);
  });

  it('TC356-4: renderQuestion with slider question from SECTIONS produces q-slider input', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const { renderQuestion } = await import('../../src/pages/profile-depth.render.ts');

    // politics section p1 is a slider
    const sliderQ = SECTIONS[1].questions.find(q => q.type === 'slider');
    expect(sliderQ).toBeTruthy();
    const html = renderQuestion(sliderQ!);
    expect(html).toContain('q-slider');
    expect(html).toContain(`data-qid="${sliderQ!.id}"`);
  });

  it('TC356-5: renderQuestion with select question renders <select> options matching data', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const { renderQuestion } = await import('../../src/pages/profile-depth.render.ts');

    // basics section b5 is a select question
    const selectQ = SECTIONS[0].questions.find(q => q.type === 'select');
    expect(selectQ).toBeTruthy();
    const html = renderQuestion(selectQ!);
    expect(html).toContain('<select');
    expect(html).toContain('q-select');
    // Check one known option from b5
    expect(html).toContain('Under $25K');
  });
});
