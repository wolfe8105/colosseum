// ============================================================
// INTEGRATOR — reference-arsenal.forge-wiring → reference-arsenal.forge-submit
// Seam #412 | score: 5
// Boundary: _wireForgeSheet (forge-wiring.ts) → _submitForge (forge-submit.ts)
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

describe('ARCH — reference-arsenal.forge-wiring import boundary', () => {
  it('only imports from config, forge-submit, and reference-arsenal.types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge-wiring.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.forge-submit') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
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

function makeEditRef() {
  return {
    id: 'ref-uuid-001',
    source_title: 'Old Title',
    source_author: 'Old Author',
    source_date: '2020-01-01',
    locator: 'page 1',
    claim_text: 'Old claim.',
    source_type: 'book' as const,
    category: 'science' as const,
    source_url: null,
  };
}

function setupDOM(extraIds: string[] = []) {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);

  const ids = ['forge-title', 'forge-author', 'forge-date', 'forge-locator', 'forge-url',
    'forge-claim', 'forge-claim-count', 'forge-back', 'forge-cancel', 'forge-next',
    'forge-submit', ...extraIds];

  for (const id of ids) {
    const tag = ['forge-claim'].includes(id) ? 'textarea' : 'button';
    const finalTag = ['forge-title', 'forge-author', 'forge-date', 'forge-locator',
      'forge-url', 'forge-claim-count'].includes(id) ?
      (id === 'forge-claim' ? 'textarea' : id === 'forge-claim-count' ? 'span' : 'input') : tag;
    const el = document.createElement(finalTag);
    el.id = id;
    container.appendChild(el);
  }

  return container;
}

// ============================================================
// BEHAVIOR TESTS
// ============================================================

describe('forge-wiring → forge-submit: #forge-submit click triggers _submitForge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC1: clicking #forge-submit fires safeRpc forge_reference for new forge', async () => {
    const container = setupDOM();
    mockRpc.mockResolvedValue({ data: { action: 'forged', ref_id: 'new-ref-123' }, error: null });

    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 5 });
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const onRender = vi.fn();

    _wireForgeSheet(container, state as any, false, undefined, onComplete, onCancel, onRender);

    const btn = document.getElementById('forge-submit') as HTMLButtonElement;
    btn.click();

    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenCalledWith(
      'forge_reference',
      expect.objectContaining({ p_source_title: 'Test Title' })
    );
  });

  it('TC2: _submitForge disables the submit button immediately on click', async () => {
    const container = setupDOM();

    let resolveFn!: (v: unknown) => void;
    mockRpc.mockReturnValue(new Promise(r => { resolveFn = r; }));

    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 5 });
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), vi.fn());

    const btn = document.getElementById('forge-submit') as HTMLButtonElement;
    btn.click();

    // Button should be disabled while RPC is in-flight
    await Promise.resolve(); // let microtask run
    expect(btn.disabled).toBe(true);

    // Resolve to cleanup
    resolveFn({ data: { action: 'forged', ref_id: 'r1' }, error: null });
    await vi.runAllTimersAsync();
  });

  it('TC3: onComplete is called with ref_id on successful forge', async () => {
    const container = setupDOM();
    mockRpc.mockResolvedValue({ data: { action: 'forged', ref_id: 'new-ref-xyz' }, error: null });

    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 5 });
    const onComplete = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, onComplete, vi.fn(), vi.fn());

    document.getElementById('forge-submit')!.click();
    await vi.runAllTimersAsync();

    expect(onComplete).toHaveBeenCalledWith('new-ref-xyz');
  });

  it('TC4: collision response does NOT call onComplete', async () => {
    const container = setupDOM();
    mockRpc.mockResolvedValue({
      data: { action: 'collision', existing_name: 'Duplicate Ref' },
      error: null,
    });

    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 5 });
    const onComplete = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, onComplete, vi.fn(), vi.fn());

    document.getElementById('forge-submit')!.click();
    await vi.runAllTimersAsync();

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('TC5: edit mode calls safeRpc edit_reference with ref id', async () => {
    const container = setupDOM();
    mockRpc.mockResolvedValue({ data: { action: 'updated' }, error: null });

    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 5 });
    const editRef = makeEditRef();
    const onComplete = vi.fn();
    _wireForgeSheet(container, state as any, true, editRef as any, onComplete, vi.fn(), vi.fn());

    document.getElementById('forge-submit')!.click();
    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenCalledWith(
      'edit_reference',
      expect.objectContaining({ p_ref_id: 'ref-uuid-001' })
    );
    expect(onComplete).toHaveBeenCalledWith('ref-uuid-001');
  });

  it('TC6: #forge-next click increments step when step 1 data is valid', async () => {
    const container = setupDOM();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 1 });
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), onRender);

    document.getElementById('forge-next')!.click();

    expect((state as any).step).toBe(2);
    expect(onRender).toHaveBeenCalled();
  });

  it('TC7: #forge-cancel click fires onCancel at step 1', async () => {
    const container = setupDOM();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const state = makeState({ step: 1 });
    const onCancel = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), onCancel, vi.fn());

    document.getElementById('forge-cancel')!.click();

    expect(onCancel).toHaveBeenCalled();
  });
});
