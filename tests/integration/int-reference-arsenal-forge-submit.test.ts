// ============================================================
// INTEGRATOR — reference-arsenal.forge-submit
// Seam #206 | score: 10
// Boundary: _submitForge → forgeReference / editReference in
//           reference-arsenal.rpc.ts, which calls safeRpc.
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

describe('ARCH — reference-arsenal.forge-submit import boundary', () => {
  it('only imports from config, reference-arsenal.rpc, and reference-arsenal.types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.forge-submit.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.rpc') &&
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
    source_type: 'book',
    category: 'science',
    source_url: null,
  };
}

// ============================================================
// MODULE HANDLE
// ============================================================

let _submitForge: (
  state: Record<string, unknown>,
  isEdit: boolean,
  editRef: Record<string, unknown> | undefined,
  onComplete: (refId: string) => void
) => Promise<void>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  mockRpc.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  const mod = await import('../../src/reference-arsenal.forge-submit.ts');
  _submitForge = mod._submitForge as typeof _submitForge;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ============================================================
// TC-1: Forge success — calls forge_reference RPC with correct params
// ============================================================

describe('TC-1: forge path calls forge_reference with correct RPC params', () => {
  it('calls safeRpc forge_reference with mapped param names', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'created', ref_id: 'new-ref-id' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';

    const state = makeState();
    const onComplete = vi.fn();
    await _submitForge(state as any, false, undefined, onComplete);

    expect(mockRpc).toHaveBeenCalledWith('forge_reference', expect.objectContaining({
      p_source_title: 'Test Title',
      p_source_author: 'Test Author',
      p_source_date: '2025-01-01',
      p_locator: 'page 42',
      p_claim_text: 'This is the claim.',
      p_source_type: 'book',
      p_category: 'science',
      p_source_url: null,
    }));
  });
});

// ============================================================
// TC-2: Forge success — onComplete called with ref_id
// ============================================================

describe('TC-2: forge success calls onComplete with returned ref_id', () => {
  it('calls onComplete with the ref_id from forge result', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'created', ref_id: 'new-ref-id' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const onComplete = vi.fn();
    await _submitForge(makeState() as any, false, undefined, onComplete);

    expect(onComplete).toHaveBeenCalledWith('new-ref-id');
  });
});

// ============================================================
// TC-3: Forge collision — shows toast, does not call onComplete
// ============================================================

describe('TC-3: forge collision shows error toast and skips onComplete', () => {
  it('skips onComplete when forge returns collision', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'collision', existing_name: 'Duplicate Book' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const onComplete = vi.fn();
    await _submitForge(makeState() as any, false, undefined, onComplete);

    expect(onComplete).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-4: Edit path — calls edit_reference RPC with correct params
// ============================================================

describe('TC-4: edit path calls edit_reference with correct RPC params', () => {
  it('calls safeRpc edit_reference with ref id and mapped params', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'updated' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Save</button>';
    const editRef = makeEditRef();
    const state = makeState({
      source_title: 'Updated Title',
      claim_text: 'Updated claim.',
    });

    const onComplete = vi.fn();
    await _submitForge(state as any, true, editRef as any, onComplete);

    expect(mockRpc).toHaveBeenCalledWith('edit_reference', expect.objectContaining({
      p_ref_id: 'ref-uuid-001',
      p_source_title: 'Updated Title',
      p_claim_text: 'Updated claim.',
      p_category: 'science',
    }));
  });
});

// ============================================================
// TC-5: Edit success — onComplete called with editRef.id
// ============================================================

describe('TC-5: edit success calls onComplete with editRef.id', () => {
  it('calls onComplete with the existing ref id on edit', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'updated' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Save</button>';
    const editRef = makeEditRef();
    const onComplete = vi.fn();
    await _submitForge(makeState() as any, true, editRef as any, onComplete);

    expect(onComplete).toHaveBeenCalledWith('ref-uuid-001');
  });
});

// ============================================================
// TC-6: Edit collision — shows toast with existing_name, skips onComplete
// ============================================================

describe('TC-6: edit collision shows error toast with existing_name', () => {
  it('skips onComplete when edit returns collision', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'collision', existing_name: 'Pre-existing Source' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Save</button>';
    const editRef = makeEditRef();
    const onComplete = vi.fn();
    await _submitForge(makeState() as any, true, editRef as any, onComplete);

    expect(onComplete).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-7: RPC throws — error toast shown, button re-enabled
// ============================================================

describe('TC-7: RPC error re-enables submit button via finally block', () => {
  it('re-enables button when forgeReference throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('Network failure'));

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const btn = document.getElementById('forge-submit') as HTMLButtonElement;
    const onComplete = vi.fn();

    await _submitForge(makeState() as any, false, undefined, onComplete);

    expect(onComplete).not.toHaveBeenCalled();
    // Button should be re-enabled because it is still connected to DOM
    expect(btn.disabled).toBe(false);
  });
});

// ============================================================
// TC-8: Button disabled during submission with correct label
// ============================================================

describe('TC-8: submit button disabled with correct text during forge', () => {
  it('sets button to disabled and "Forging..." text before RPC resolves', async () => {
    let capturedDisabled = false;
    let capturedText = '';

    mockRpc.mockImplementationOnce(async () => {
      // Capture button state during RPC execution
      const btn = document.getElementById('forge-submit') as HTMLButtonElement;
      capturedDisabled = btn?.disabled ?? false;
      capturedText = btn?.textContent ?? '';
      return { data: { action: 'created', ref_id: 'r1' }, error: null };
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const onComplete = vi.fn();
    await _submitForge(makeState() as any, false, undefined, onComplete);

    expect(capturedDisabled).toBe(true);
    expect(capturedText).toBe('Forging...');
  });
});

// ============================================================
// TC-9: Button not re-enabled when detached from DOM (form closed by onComplete)
// ============================================================

describe('TC-9: button stays disabled when detached from DOM after onComplete', () => {
  it('skips re-enable in finally when button is no longer connected', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { action: 'created', ref_id: 'r2' },
      error: null,
    });

    document.body.innerHTML = '<button id="forge-submit">Forge</button>';
    const btn = document.getElementById('forge-submit') as HTMLButtonElement;

    // onComplete removes the button from DOM (simulates form close)
    const onComplete = vi.fn(() => {
      document.body.removeChild(btn);
    });

    await _submitForge(makeState() as any, false, undefined, onComplete);

    // Button was removed — isConnected is false, so finally should not re-enable
    expect(btn.isConnected).toBe(false);
    // disabled flag remains true because re-enable was skipped
    expect(btn.disabled).toBe(true);
  });
});
