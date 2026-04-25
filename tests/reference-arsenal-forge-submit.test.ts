import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

const mockForgeReference = vi.hoisted(() => vi.fn());
const mockEditReference = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.rpc.ts', () => ({
  forgeReference: mockForgeReference,
  editReference: mockEditReference,
}));

import { _submitForge } from '../src/reference-arsenal.forge-submit.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    step: 5,
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023-01-01',
    locator: 'p.1',
    claim_text: 'Climate is warming',
    source_type: 'primary',
    category: 'politics',
    source_url: '',
    ...overrides,
  } as never;
}

function buildEditRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023',
    locator: 'p.1',
    claim_text: 'Old claim',
    source_type: 'primary',
    category: 'politics',
    ...overrides,
  } as never;
}

function mountSubmitBtn() {
  document.body.innerHTML = `<button id="forge-submit">⚔ Forge</button>`;
  return document.getElementById('forge-submit') as HTMLButtonElement;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockShowToast.mockReset();
  mockForgeReference.mockReset();
  mockEditReference.mockReset();
  document.body.innerHTML = '';
});

// ── _submitForge — forge path ──────────────────────────────────

describe('TC1 — _submitForge disables submit button on start', () => {
  it('button is disabled before RPC resolves', async () => {
    let resolveRpc!: (v: unknown) => void;
    mockForgeReference.mockReturnValue(new Promise(r => { resolveRpc = r; }));
    const btn = mountSubmitBtn();
    const promise = _submitForge(buildState(), false, undefined, vi.fn());
    expect(btn.disabled).toBe(true);
    resolveRpc({ ref_id: 'ref-new', action: 'created' });
    await promise;
  });
});

describe('TC2 — _submitForge calls forgeReference in non-edit mode', () => {
  it('forgeReference is called with state fields', async () => {
    mockForgeReference.mockResolvedValue({ ref_id: 'ref-new', action: 'created' });
    mountSubmitBtn();

    await _submitForge(buildState({ source_title: 'My Source' }), false, undefined, vi.fn());

    expect(mockForgeReference).toHaveBeenCalledWith(
      expect.objectContaining({ source_title: 'My Source' })
    );
  });
});

describe('TC3 — _submitForge calls onComplete with ref_id on success', () => {
  it('onComplete is called with ref_id from forgeReference result', async () => {
    mockForgeReference.mockResolvedValue({ ref_id: 'ref-new', action: 'created' });
    mountSubmitBtn();
    const onComplete = vi.fn();

    await _submitForge(buildState(), false, undefined, onComplete);

    expect(onComplete).toHaveBeenCalledWith('ref-new');
  });
});

describe('TC4 — _submitForge shows success toast on forge', () => {
  it('showToast called with success type after forge', async () => {
    mockForgeReference.mockResolvedValue({ ref_id: 'ref-new', action: 'created' });
    mountSubmitBtn();

    await _submitForge(buildState(), false, undefined, vi.fn());

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('forged'), 'success');
  });
});

describe('TC5 — _submitForge shows collision toast and does not call onComplete', () => {
  it('shows error toast and skips onComplete on collision', async () => {
    mockForgeReference.mockResolvedValue({ action: 'collision', existing_name: 'Old Ref' });
    mountSubmitBtn();
    const onComplete = vi.fn();

    await _submitForge(buildState(), false, undefined, onComplete);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Old Ref'), 'error');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('TC6 — _submitForge re-enables button after forge failure', () => {
  it('button is re-enabled when forgeReference throws', async () => {
    mockForgeReference.mockRejectedValue(new Error('RPC error'));
    const btn = mountSubmitBtn();

    await _submitForge(buildState(), false, undefined, vi.fn());

    expect(btn.disabled).toBe(false);
  });
});

describe('TC7 — _submitForge shows error toast on throw', () => {
  it('showToast called with error message when forgeReference throws', async () => {
    mockForgeReference.mockRejectedValue(new Error('forge failed'));
    mountSubmitBtn();

    await _submitForge(buildState(), false, undefined, vi.fn());

    expect(mockShowToast).toHaveBeenCalledWith('forge failed', 'error');
  });
});

// ── _submitForge — edit path ───────────────────────────────────

describe('TC8 — _submitForge calls editReference in edit mode', () => {
  it('editReference is called with editRef.id and state fields', async () => {
    mockEditReference.mockResolvedValue({ action: 'updated' });
    mountSubmitBtn();
    const editRef = buildEditRef({ id: 'ref-existing' });

    await _submitForge(buildState(), true, editRef, vi.fn());

    expect(mockEditReference).toHaveBeenCalledWith('ref-existing', expect.any(Object));
  });
});

describe('TC9 — _submitForge calls onComplete with editRef.id on edit success', () => {
  it('onComplete called with editRef.id after successful edit', async () => {
    mockEditReference.mockResolvedValue({ action: 'updated' });
    mountSubmitBtn();
    const editRef = buildEditRef({ id: 'ref-existing' });
    const onComplete = vi.fn();

    await _submitForge(buildState(), true, editRef, onComplete);

    expect(onComplete).toHaveBeenCalledWith('ref-existing');
  });
});

describe('TC10 — _submitForge shows updated toast on edit success', () => {
  it('showToast called with success type after edit', async () => {
    mockEditReference.mockResolvedValue({ action: 'updated' });
    mountSubmitBtn();

    await _submitForge(buildState(), true, buildEditRef(), vi.fn());

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('updated'), 'success');
  });
});

describe('TC11 — _submitForge shows collision toast on edit collision', () => {
  it('shows error toast with existing_name on collision during edit', async () => {
    mockEditReference.mockResolvedValue({ action: 'collision', existing_name: 'Existing' });
    mountSubmitBtn();
    const onComplete = vi.fn();

    await _submitForge(buildState(), true, buildEditRef(), onComplete);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Existing'), 'error');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('TC12 — _submitForge sets button text to Saving... in edit mode', () => {
  it('button textContent is "Saving..." while awaiting editReference', async () => {
    let resolveRpc!: (v: unknown) => void;
    mockEditReference.mockReturnValue(new Promise(r => { resolveRpc = r; }));
    const btn = mountSubmitBtn();

    const promise = _submitForge(buildState(), true, buildEditRef(), vi.fn());
    expect(btn.textContent).toBe('Saving...');
    resolveRpc({ action: 'updated' });
    await promise;
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.forge-submit.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './reference-arsenal.rpc.ts',
      './reference-arsenal.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.forge-submit.ts'),
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
