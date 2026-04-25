import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockBuildForgeContent = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.forge-render.ts', () => ({
  _buildForgeContent: mockBuildForgeContent,
}));

const mockWireForgeSheet = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.forge-wiring.ts', () => ({
  _wireForgeSheet: mockWireForgeSheet,
}));

import { showForgeForm } from '../src/reference-arsenal.forge.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023',
    locator: 'p.1',
    claim_text: 'Climate warming',
    source_type: 'primary',
    category: 'politics',
    source_url: 'https://example.com',
    rarity: 'common',
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockBuildForgeContent.mockReset();
  mockBuildForgeContent.mockReturnValue('<div class="forge-form">FORGE</div>');
  mockWireForgeSheet.mockReset();
  document.body.innerHTML = '';
});

// ── showForgeForm ──────────────────────────────────────────────

describe('TC1 — showForgeForm calls _buildForgeContent on init', () => {
  it('_buildForgeContent is called during initial render', () => {
    const container = document.createElement('div');
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    showForgeForm(container, onComplete, onCancel);

    expect(mockBuildForgeContent).toHaveBeenCalled();
  });
});

describe('TC2 — showForgeForm calls _wireForgeSheet on init', () => {
  it('_wireForgeSheet is called during initial render', () => {
    const container = document.createElement('div');
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    showForgeForm(container, onComplete, onCancel);

    expect(mockWireForgeSheet).toHaveBeenCalled();
  });
});

describe('TC3 — showForgeForm renders content into container', () => {
  it('container innerHTML is set from _buildForgeContent return value', () => {
    const container = document.createElement('div');

    showForgeForm(container, vi.fn(), vi.fn());

    expect(container.innerHTML).toContain('FORGE');
  });
});

describe('TC4 — showForgeForm passes isEdit=false when no editRef', () => {
  it('_buildForgeContent called with isEdit=false', () => {
    const container = document.createElement('div');

    showForgeForm(container, vi.fn(), vi.fn());

    const [, isEdit] = mockBuildForgeContent.mock.calls[0];
    expect(isEdit).toBe(false);
  });
});

describe('TC5 — showForgeForm passes isEdit=true when editRef is provided', () => {
  it('_buildForgeContent called with isEdit=true', () => {
    const container = document.createElement('div');

    showForgeForm(container, vi.fn(), vi.fn(), buildRef());

    const [, isEdit] = mockBuildForgeContent.mock.calls[0];
    expect(isEdit).toBe(true);
  });
});

describe('TC6 — showForgeForm pre-fills state from editRef', () => {
  it('_buildForgeContent receives state with editRef fields', () => {
    const container = document.createElement('div');
    const ref = buildRef({ source_title: 'Custom Title' });

    showForgeForm(container, vi.fn(), vi.fn(), ref);

    const [state] = mockBuildForgeContent.mock.calls[0];
    expect(state.source_title).toBe('Custom Title');
  });
});

describe('TC7 — showForgeForm new form starts at step 1', () => {
  it('state.step is 1 on initial call', () => {
    const container = document.createElement('div');

    showForgeForm(container, vi.fn(), vi.fn());

    const [state] = mockBuildForgeContent.mock.calls[0];
    expect(state.step).toBe(1);
  });
});

describe('TC8 — showForgeForm returns destroy function', () => {
  it('return value is a function', () => {
    const container = document.createElement('div');
    const destroy = showForgeForm(container, vi.fn(), vi.fn());
    expect(typeof destroy).toBe('function');
  });
});

describe('TC9 — showForgeForm destroy clears container', () => {
  it('calling destroy empties the container', () => {
    const container = document.createElement('div');
    const destroy = showForgeForm(container, vi.fn(), vi.fn());

    destroy();

    expect(container.innerHTML).toBe('');
  });
});

describe('TC10 — showForgeForm destroy prevents further renders', () => {
  it('render function captured by _wireForgeSheet is no-op after destroy', () => {
    const container = document.createElement('div');
    let capturedRender!: () => void;
    mockWireForgeSheet.mockImplementation((_c: unknown, _s: unknown, _i: unknown, _e: unknown, _oc: unknown, _ocx: unknown, render: () => void) => {
      capturedRender = render;
    });

    const destroy = showForgeForm(container, vi.fn(), vi.fn());
    destroy();
    mockBuildForgeContent.mockClear();
    capturedRender();

    expect(mockBuildForgeContent).not.toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.forge.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './reference-arsenal.forge-render.ts',
      './reference-arsenal.forge-wiring.ts',
      './reference-arsenal.forge-submit.ts',
      './reference-arsenal.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.forge.ts'),
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
