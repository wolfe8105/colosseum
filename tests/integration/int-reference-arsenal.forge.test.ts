// ============================================================
// INTEGRATOR — reference-arsenal.forge → reference-arsenal.forge-submit
// Seam #347 | score: 6
// Boundary: showForgeForm (forge.ts) → _submitForge (forge-submit.ts)
//   via _wireForgeSheet (forge-wiring.ts)
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

describe('ARCH — reference-arsenal.forge import boundary', () => {
  it('only imports from forge-render, forge-wiring, forge-submit (type), and reference-arsenal.types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./reference-arsenal.forge-render') &&
        !l.includes('./reference-arsenal.forge-wiring') &&
        !l.includes('./reference-arsenal.forge-submit') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// HELPERS
// ============================================================

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makeEditRef() {
  return {
    id: 'ref-uuid-edit-001',
    source_title: 'Existing Title',
    source_author: 'Existing Author',
    source_date: '2020-06-15',
    locator: 'chapter 3',
    claim_text: 'Existing claim text.',
    source_type: 'book' as const,
    category: 'science' as const,
    source_url: null,
  };
}

// ============================================================
// MODULE HANDLES
// ============================================================

type ForgeFormState = {
  step: number;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: string;
  category: string;
  source_url: string;
};

let showForgeForm: (
  container: HTMLElement,
  onComplete: (refId: string) => void,
  onCancel: () => void,
  editRef?: ReturnType<typeof makeEditRef>
) => () => void;

let _submitForge: (
  state: ForgeFormState,
  isEdit: boolean,
  editRef: ReturnType<typeof makeEditRef> | undefined,
  onComplete: (refId: string) => void,
) => Promise<void>;

function makeState(overrides: Partial<ForgeFormState> = {}): ForgeFormState {
  return {
    step: 5,
    source_title: 'Test Title',
    source_author: 'Test Author',
    source_date: '2025-01-01',
    locator: 'page 42',
    claim_text: 'This is the claim.',
    source_type: 'book',
    category: 'science',
    source_url: '',
    ...overrides,
  };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  mockRpc.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  const forgeMod = await import('../../src/reference-arsenal.forge.ts');
  showForgeForm = forgeMod.showForgeForm as typeof showForgeForm;

  const submitMod = await import('../../src/reference-arsenal.forge-submit.ts');
  _submitForge = submitMod._submitForge as typeof _submitForge;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ============================================================
// TC-1: showForgeForm renders into container (step 1 DOM)
// ============================================================

describe('TC-1: showForgeForm renders forge form into container', () => {
  it('injects HTML into the container element on call', () => {
    const container = makeContainer();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    showForgeForm(container, onComplete, onCancel);

    expect(container.innerHTML).not.toBe('');
  });
});

// ============================================================
// TC-2: destroy() clears container and prevents further renders
// ============================================================

describe('TC-2: destroy() empties the container', () => {
  it('sets container innerHTML to empty string', () => {
    const container = makeContainer();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    const destroy = showForgeForm(container, onComplete, onCancel);
    expect(container.innerHTML).not.toBe('');

    destroy();
    expect(container.innerHTML).toBe('');
  });
});

// ============================================================
// TC-3: showForgeForm pre-fills form with editRef values
// ============================================================

describe('TC-3: edit mode pre-fills input values from editRef', () => {
  it('sets forge-title input value to editRef.source_title', () => {
    const container = makeContainer();
    const editRef = makeEditRef();

    showForgeForm(container, vi.fn(), vi.fn(), editRef);

    const titleInput = document.getElementById('forge-title') as HTMLInputElement | null;
    // The input may be rendered with value attribute — check the element value
    expect(titleInput?.value ?? '').toBe('Existing Title');
  });
});

// ============================================================
// TC-4: _submitForge (forge path) calls forge_reference RPC with correct params
// ============================================================

describe('TC-4: _submitForge new-forge path calls forge_reference RPC', () => {
  it('calls safeRpc forge_reference with mapped param names', async () => {
    mockRpc.mockResolvedValue({
      data: { action: 'created', ref_id: 'new-id-777' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const onComplete = vi.fn();

    await _submitForge(makeState(), false, undefined, onComplete);

    expect(mockRpc).toHaveBeenCalledWith('forge_reference', expect.objectContaining({
      p_source_title: 'Test Title',
      p_source_author: 'Test Author',
      p_locator: 'page 42',
      p_source_type: 'book',
      p_category: 'science',
    }));
  });
});

// ============================================================
// TC-5: _submitForge (edit path) calls edit_reference RPC with correct params
// ============================================================

describe('TC-5: _submitForge edit path calls edit_reference RPC', () => {
  it('calls safeRpc edit_reference with ref id and mapped params', async () => {
    mockRpc.mockResolvedValue({
      data: { action: 'updated' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Save</button>';
    const editRef = makeEditRef();
    const onComplete = vi.fn();

    await _submitForge(
      makeState({ source_title: 'Updated Title', claim_text: 'Updated claim.' }),
      true,
      editRef,
      onComplete,
    );

    expect(mockRpc).toHaveBeenCalledWith('edit_reference', expect.objectContaining({
      p_ref_id: 'ref-uuid-edit-001',
      p_source_title: 'Updated Title',
      p_claim_text: 'Updated claim.',
      p_category: 'science',
    }));
  });
});

// ============================================================
// TC-6: onCancel is called when forge-cancel button is clicked
// ============================================================

describe('TC-6: forge-cancel button triggers onCancel callback', () => {
  it('calls onCancel when cancel button is clicked', () => {
    const container = makeContainer();
    const onCancel = vi.fn();

    showForgeForm(container, vi.fn(), onCancel);

    const cancelBtn = document.getElementById('forge-cancel');
    cancelBtn?.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// TC-7: _submitForge forge success → onComplete called with ref_id
// ============================================================

describe('TC-7: _submitForge forge success calls onComplete with returned ref_id', () => {
  it('onComplete receives ref_id from forge_reference result', async () => {
    mockRpc.mockResolvedValue({
      data: { action: 'created', ref_id: 'success-ref-id' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const onComplete = vi.fn();

    await _submitForge(makeState(), false, undefined, onComplete);

    expect(onComplete).toHaveBeenCalledWith('success-ref-id');
  });
});

// ============================================================
// SEAM #488 — reference-arsenal.forge → reference-arsenal.forge-render
// Boundary: showForgeForm calls _buildForgeContent (forge-render.ts)
// to produce the HTML that gets injected into the container.
// ============================================================

// Import _buildForgeContent directly for isolated render tests
let _buildForgeContent: (state: {
  step: number;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: string;
  category: string;
  source_url: string;
}, isEdit: boolean) => string;

beforeEach(async () => {
  // Re-import forge-render after vi.resetModules() (already called in outer beforeEach)
  const renderMod = await import('../../src/reference-arsenal.forge-render.ts');
  _buildForgeContent = renderMod._buildForgeContent as typeof _buildForgeContent;
});

// ============================================================
// TC-A: ARCH — forge-render.ts imports only allowed modules
// ============================================================

describe('ARCH — forge-render import boundary (seam #488)', () => {
  it('only imports from config, reference-arsenal.constants, and reference-arsenal.types', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge-render.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const forbidden = importLines.filter(
      (l: string) =>
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.constants') &&
        !l.includes('./reference-arsenal.types') &&
        !l.includes('./reference-arsenal.forge-submit'),
    );
    expect(forbidden).toHaveLength(0);
  });
});

// ============================================================
// TC-B: step indicator renders 5 steps; step 1 is active
// ============================================================

describe('TC-B: _buildForgeContent step indicator (seam #488)', () => {
  it('renders .forge-steps with 5 items; first has class active', () => {
    const state = {
      step: 1, source_title: '', source_author: '', source_date: '',
      locator: '', claim_text: '', source_type: '', category: '', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    const steps = tmp.querySelectorAll('.forge-step');
    expect(steps).toHaveLength(5);

    const active = tmp.querySelectorAll('.forge-step.active');
    expect(active).toHaveLength(1);
    expect(active[0].querySelector('.forge-step-num')?.textContent).toBe('1');
  });
});

// ============================================================
// TC-C: step 1 renders required input fields
// ============================================================

describe('TC-C: _buildForgeContent step 1 renders source-detail inputs (seam #488)', () => {
  it('renders #forge-title, #forge-author, #forge-date, #forge-locator, #forge-url', () => {
    const state = {
      step: 1, source_title: 'My Title', source_author: 'Auth', source_date: '2024-01-01',
      locator: 'p.5', claim_text: '', source_type: '', category: '', source_url: 'https://example.com',
    };
    const html = _buildForgeContent(state, false);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    expect(tmp.querySelector('#forge-title')).not.toBeNull();
    expect(tmp.querySelector('#forge-author')).not.toBeNull();
    expect(tmp.querySelector('#forge-date')).not.toBeNull();
    expect(tmp.querySelector('#forge-locator')).not.toBeNull();
    expect(tmp.querySelector('#forge-url')).not.toBeNull();
  });
});

// ============================================================
// TC-D: step 1 pre-fills field values from state
// ============================================================

describe('TC-D: _buildForgeContent step 1 pre-fills state values (seam #488)', () => {
  it('input value attributes reflect state source_title and locator', () => {
    const state = {
      step: 1, source_title: 'Climate Report', source_author: 'IPCC',
      source_date: '2023-03-15', locator: 'p.42',
      claim_text: '', source_type: '', category: '', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    // value attribute is embedded in the HTML string for pre-fill
    expect(html).toContain('Climate Report');
    expect(html).toContain('IPCC');
    expect(html).toContain('p.42');
  });
});

// ============================================================
// TC-E: step 3 source-type buttons disabled in edit mode
// ============================================================

describe('TC-E: _buildForgeContent step 3 disables source-type in edit mode (seam #488)', () => {
  it('all forge-source-btn elements have disabled attribute when isEdit=true', () => {
    const state = {
      step: 3, source_title: '', source_author: '', source_date: '',
      locator: '', claim_text: '', source_type: 'book', category: '', source_url: '',
    };
    const html = _buildForgeContent(state, true);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    const btns = tmp.querySelectorAll<HTMLButtonElement>('.forge-source-btn');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach(btn => {
      expect(btn.disabled).toBe(true);
    });
  });

  it('source-type buttons are NOT disabled when isEdit=false', () => {
    const state = {
      step: 3, source_title: '', source_author: '', source_date: '',
      locator: '', claim_text: '', source_type: 'book', category: '', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    const btns = tmp.querySelectorAll<HTMLButtonElement>('.forge-source-btn');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach(btn => {
      expect(btn.disabled).toBe(false);
    });
  });
});

// ============================================================
// TC-F: step 5 review shows correct token cost text
// ============================================================

describe('TC-F: _buildForgeContent step 5 shows correct token cost (seam #488)', () => {
  it('shows "50 tokens" hint for new forge', () => {
    const state = {
      step: 5, source_title: 'Title', source_author: 'Author',
      source_date: '2024-01-01', locator: 'p.1', claim_text: 'Claim.',
      source_type: 'book', category: 'politics', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    expect(html).toContain('50 tokens');
  });

  it('shows "10 tokens" hint for edit', () => {
    const state = {
      step: 5, source_title: 'Title', source_author: 'Author',
      source_date: '2024-01-01', locator: 'p.1', claim_text: 'Claim.',
      source_type: 'book', category: 'politics', source_url: '',
    };
    const html = _buildForgeContent(state, true);
    expect(html).toContain('10 tokens');
  });
});

// ============================================================
// TC-G: nav buttons — step 1 shows cancel, step 5 shows submit
// ============================================================

describe('TC-G: _buildForgeContent nav button placement (seam #488)', () => {
  it('step 1 shows #forge-cancel, not #forge-back', () => {
    const state = {
      step: 1, source_title: '', source_author: '', source_date: '',
      locator: '', claim_text: '', source_type: '', category: '', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    expect(tmp.querySelector('#forge-cancel')).not.toBeNull();
    expect(tmp.querySelector('#forge-back')).toBeNull();
    expect(tmp.querySelector('#forge-next')).not.toBeNull();
  });

  it('step 5 shows #forge-back and #forge-submit, not #forge-next', () => {
    const state = {
      step: 5, source_title: 'T', source_author: 'A', source_date: '2024',
      locator: 'p1', claim_text: 'c', source_type: 'book', category: 'sports', source_url: '',
    };
    const html = _buildForgeContent(state, false);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    expect(tmp.querySelector('#forge-back')).not.toBeNull();
    expect(tmp.querySelector('#forge-submit')).not.toBeNull();
    expect(tmp.querySelector('#forge-next')).toBeNull();
    expect(tmp.querySelector('#forge-cancel')).toBeNull();
  });
});

// ============================================================
// SEAM #487 — reference-arsenal.forge → reference-arsenal.forge-wiring
// Boundary: showForgeForm calls _wireForgeSheet to attach all DOM event listeners
// Mock boundary: @supabase/supabase-js only. All source modules run real.
// ============================================================

describe('ARCH #487 — forge.ts imports _wireForgeSheet from forge-wiring', () => {
  it('forge.ts has an import of _wireForgeSheet from ./reference-arsenal.forge-wiring', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const wiringImport = importLines.find(l => l.includes('./reference-arsenal.forge-wiring'));
    expect(wiringImport).toBeDefined();
    expect(wiringImport).toMatch(/_wireForgeSheet/);
  });
});

describe('#487-TC1: _wireForgeSheet wires #forge-title input → state.source_title', () => {
  it('input event on #forge-title syncs state.source_title', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const input = document.createElement('input');
    input.id = 'forge-title';
    container.appendChild(input);

    const state = {
      step: 1, source_title: '', source_author: 'Auth', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: 'book', category: 'science', source_url: '',
    };
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), vi.fn());

    input.value = 'Wired Title';
    input.dispatchEvent(new Event('input'));

    expect(state.source_title).toBe('Wired Title');
  });
});

describe('#487-TC2: _wireForgeSheet wires #forge-back → decrements step and calls onRender', () => {
  it('clicking #forge-back decrements state.step and calls onRender once', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const btn = document.createElement('button');
    btn.id = 'forge-back';
    container.appendChild(btn);

    const state = {
      step: 3, source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: 'book', category: 'science', source_url: '',
    };
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), onRender);

    btn.click();

    expect(state.step).toBe(2);
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});

describe('#487-TC3: _wireForgeSheet wires .forge-source-btn in new mode → state.source_type', () => {
  it('clicking .forge-source-btn sets state.source_type and calls onRender', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const srcBtn = document.createElement('button');
    srcBtn.className = 'forge-source-btn';
    srcBtn.dataset.source = 'journal';
    container.appendChild(srcBtn);

    const state = {
      step: 3, source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: '', category: 'science', source_url: '',
    };
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), onRender);

    srcBtn.click();

    expect(state.source_type).toBe('journal');
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});

describe('#487-TC4: _wireForgeSheet does NOT wire .forge-source-btn in edit mode (LM-ARSENAL-002)', () => {
  it('clicking .forge-source-btn in edit mode does NOT mutate state.source_type', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const srcBtn = document.createElement('button');
    srcBtn.className = 'forge-source-btn';
    srcBtn.dataset.source = 'journal';
    container.appendChild(srcBtn);

    const editRef = {
      id: 'ref-lock-001', source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: 'book' as const,
      category: 'science' as const, source_url: null,
    };
    const state = {
      step: 3, source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: 'book', category: 'science', source_url: '',
    };
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, true, editRef as any, vi.fn(), vi.fn(), onRender);

    srcBtn.click();

    expect(state.source_type).toBe('book');
    expect(onRender).not.toHaveBeenCalled();
  });
});

describe('#487-TC5: _wireForgeSheet wires .forge-cat-btn → state.category', () => {
  it('clicking .forge-cat-btn sets state.category and calls onRender', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const catBtn = document.createElement('button');
    catBtn.className = 'forge-cat-btn';
    catBtn.dataset.cat = 'history';
    container.appendChild(catBtn);

    const state = {
      step: 4, source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: 'claim', source_type: 'book', category: '', source_url: '',
    };
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), onRender);

    catBtn.click();

    expect(state.category).toBe('history');
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});

describe('#487-TC6: _wireForgeSheet wires #forge-claim input → state.claim_text and count', () => {
  it('textarea input event syncs state.claim_text and updates forge-claim-count textContent', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const textarea = document.createElement('textarea');
    textarea.id = 'forge-claim';
    container.appendChild(textarea);
    const countEl = document.createElement('span');
    countEl.id = 'forge-claim-count';
    container.appendChild(countEl);

    const state = {
      step: 2, source_title: 'T', source_author: 'A', source_date: '2025-01-01',
      locator: 'p1', claim_text: '', source_type: 'book', category: 'science', source_url: '',
    };
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), vi.fn());

    textarea.value = 'Hello world';
    textarea.dispatchEvent(new Event('input'));

    expect(state.claim_text).toBe('Hello world');
    expect(countEl.textContent).toBe('11');
  });
});

describe('#487-TC7: _validateStep blocks step advance at step 1 when source_title too short', () => {
  it('#forge-next click at step 1 does NOT advance step when source_title is 1 char', async () => {
    vi.resetModules();
    const { _wireForgeSheet } = await import('../../src/reference-arsenal.forge-wiring.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const nextBtn = document.createElement('button');
    nextBtn.id = 'forge-next';
    container.appendChild(nextBtn);

    const state = {
      step: 1, source_title: 'X', source_author: 'Author Name', source_date: '2025-01-01',
      locator: 'p1', claim_text: '', source_type: '', category: '', source_url: '',
    };
    const onRender = vi.fn();
    _wireForgeSheet(container, state as any, false, undefined, vi.fn(), vi.fn(), onRender);

    nextBtn.click();

    expect(state.step).toBe(1);
    expect(onRender).not.toHaveBeenCalled();
  });
});
