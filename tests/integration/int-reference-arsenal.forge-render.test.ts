// ============================================================
// INTEGRATOR — reference-arsenal.forge-render → reference-arsenal.forge-submit
// Seam #413 | score: 5
// Boundary: _buildForgeContent (forge-render.ts) uses ForgeFormState
//           type from forge-submit.ts to render the 5-step form HTML.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// ARCH FILTER
// ============================================================

describe('ARCH — reference-arsenal.forge-render import boundary', () => {
  it('only imports from config, reference-arsenal.constants, and reference-arsenal.types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge-render.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.constants') &&
        !l.includes('./reference-arsenal.types') &&
        !l.includes('./reference-arsenal.forge-submit')
    );
    expect(externalImports).toHaveLength(0);
  });

  it('forge-submit import in forge-render is type-only (no runtime dependency)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge-render.ts'),
      'utf8'
    );
    const forgeSubmitImports = src.split('\n').filter(
      l => /from\s+['"]/.test(l) && l.includes('./reference-arsenal.forge-submit')
    );
    // All imports from forge-submit must be `import type`
    for (const line of forgeSubmitImports) {
      expect(line).toMatch(/import\s+type\s/);
    }
  });
});

// ============================================================
// HELPERS
// ============================================================

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    step: 1,
    source_title: 'Test Title',
    source_author: 'Test Author',
    source_date: '2025-01-01',
    locator: 'page 42',
    claim_text: 'This is the claim.',
    source_type: 'book' as const,
    category: 'science' as const,
    source_url: '',
    ...overrides,
  };
}

// ============================================================
// BEHAVIOR TESTS
// ============================================================

describe('forge-render → forge-submit: _buildForgeContent renders correct HTML', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC1: step 1 renders step indicator with step 1 active', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({ step: 1 });
    const html = _buildForgeContent(state as any, false);

    expect(html).toContain('forge-step active');
    expect(html).toContain('forge-step-num');
    // Step 1 is active, steps 2-5 should not be 'done'
    const activeCount = (html.match(/forge-step active/g) || []).length;
    expect(activeCount).toBe(1);
  });

  it('TC2: step 1 renders source detail input fields with escaped state values', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({
      step: 1,
      source_title: 'IPCC Report',
      source_author: 'IPCC Group',
      source_date: '2023-06-01',
      locator: 'p.42',
    });
    const html = _buildForgeContent(state as any, false);

    expect(html).toContain('id="forge-title"');
    expect(html).toContain('value="IPCC Report"');
    expect(html).toContain('id="forge-author"');
    expect(html).toContain('value="IPCC Group"');
    expect(html).toContain('id="forge-date"');
    expect(html).toContain('value="2023-06-01"');
    expect(html).toContain('id="forge-locator"');
    expect(html).toContain('value="p.42"');
  });

  it('TC3: step 1 escapes XSS in source_title', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({
      step: 1,
      source_title: '<script>alert(1)</script>',
    });
    const html = _buildForgeContent(state as any, false);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('TC4: step 2 renders claim textarea with escaped claim_text', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({
      step: 2,
      claim_text: 'Temps rose 1.1°C',
    });
    const html = _buildForgeContent(state as any, false);

    expect(html).toContain('id="forge-claim"');
    expect(html).toContain('Temps rose 1.1°C');
    expect(html).toContain('id="forge-claim-count"');
  });

  it('TC5: step 5 renders review card with claim and source info', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({
      step: 5,
      claim_text: 'Global warming is real.',
      source_title: 'IPCC Report',
      source_author: 'IPCC',
      source_date: '2023-01-01',
      locator: 'page 1',
      source_type: 'book',
      category: 'science',
    });
    const html = _buildForgeContent(state as any, false);

    expect(html).toContain('forge-review-claim');
    expect(html).toContain('Global warming is real.');
    expect(html).toContain('IPCC Report');
    expect(html).toContain('Forge Weapon (50t)');
  });

  it('TC6: step 5 in edit mode shows save button and edit cost hint', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({
      step: 5,
      claim_text: 'Claim text',
      source_type: 'book',
      category: 'science',
    });
    const html = _buildForgeContent(state as any, true);

    expect(html).toContain('Save Changes (10t)');
    expect(html).toContain('Editing costs 10 tokens');
  });

  it('TC7: step indicator marks past steps as done when on step 3', async () => {
    const { _buildForgeContent } = await import('../../src/reference-arsenal.forge-render.ts');
    const state = makeState({ step: 3 });
    const html = _buildForgeContent(state as any, false);

    // Steps 1 and 2 should be done, step 3 active
    const doneCount = (html.match(/forge-step done/g) || []).length;
    const activeCount = (html.match(/forge-step active/g) || []).length;
    expect(doneCount).toBe(2);
    expect(activeCount).toBe(1);
  });
});
