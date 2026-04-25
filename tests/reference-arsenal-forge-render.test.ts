import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());
const mockSanitizeUrl = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  sanitizeUrl: mockSanitizeUrl,
}));

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: {
    primary: { label: 'Primary', tier: 'A', ceiling: 100 },
    secondary: { label: 'Secondary', tier: 'B', ceiling: 70 },
  },
  CATEGORIES: ['politics', 'sports'],
  CATEGORY_LABELS: {
    politics: 'Politics',
    sports: 'Sports',
  },
}));

import { _buildForgeContent } from '../src/reference-arsenal.forge-render.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    step: 1,
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

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockSanitizeUrl.mockImplementation((s: string) => s);
});

// ── _buildForgeContent — step indicators ──────────────────────

describe('TC1 — _buildForgeContent renders step indicator with 5 steps', () => {
  it('contains 5 forge-step elements', () => {
    const html = _buildForgeContent(buildState(), false);
    const matches = html.match(/forge-step/g);
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });
});

describe('TC2 — _buildForgeContent marks current step as active', () => {
  it('step 1 has forge-step active class', () => {
    const html = _buildForgeContent(buildState({ step: 1 }), false);
    expect(html).toContain('forge-step active');
  });
});

describe('TC3 — _buildForgeContent marks prior steps as done', () => {
  it('step 3 state has forge-step done class', () => {
    const html = _buildForgeContent(buildState({ step: 3 }), false);
    expect(html).toContain('forge-step done');
  });
});

// ── Step 1 ────────────────────────────────────────────────────

describe('TC4 — _buildForgeContent step 1 shows source title input', () => {
  it('contains forge-title input with state value', () => {
    const html = _buildForgeContent(buildState({ step: 1, source_title: 'My Title' }), false);
    expect(html).toContain('id="forge-title"');
    expect(html).toContain('My Title');
  });
});

describe('TC5 — _buildForgeContent step 1 uses escapeHTML', () => {
  it('escapeHTML is called during step 1 render', () => {
    _buildForgeContent(buildState({ step: 1 }), false);
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

// ── Step 2 ────────────────────────────────────────────────────

describe('TC6 — _buildForgeContent step 2 shows claim textarea', () => {
  it('contains forge-claim textarea with claim text', () => {
    const html = _buildForgeContent(buildState({ step: 2, claim_text: 'Test claim' }), false);
    expect(html).toContain('id="forge-claim"');
    expect(html).toContain('Test claim');
  });
});

describe('TC7 — _buildForgeContent step 2 shows char count', () => {
  it('contains forge-claim-count with current length', () => {
    const html = _buildForgeContent(buildState({ step: 2, claim_text: 'hi' }), false);
    expect(html).toContain('forge-claim-count');
    expect(html).toContain('2');
  });
});

// ── Step 3 ────────────────────────────────────────────────────

describe('TC8 — _buildForgeContent step 3 shows source type buttons', () => {
  it('contains forge-source-btn for each SOURCE_TYPE', () => {
    const html = _buildForgeContent(buildState({ step: 3 }), false);
    expect(html).toContain('forge-source-types');
    expect(html).toContain('Primary');
    expect(html).toContain('Secondary');
  });
});

describe('TC9 — _buildForgeContent step 3 marks selected source type', () => {
  it('selected class on button matching state.source_type', () => {
    const html = _buildForgeContent(buildState({ step: 3, source_type: 'primary' }), false);
    expect(html).toContain('forge-source-btn selected');
  });
});

describe('TC10 — _buildForgeContent step 3 disables buttons in edit mode', () => {
  it('source type buttons have disabled attribute in edit mode', () => {
    const html = _buildForgeContent(buildState({ step: 3 }), true);
    expect(html).toContain('disabled');
    expect(html).toContain('Locked at creation');
  });
});

// ── Step 4 ────────────────────────────────────────────────────

describe('TC11 — _buildForgeContent step 4 shows category buttons', () => {
  it('contains forge-cat-btn for each CATEGORY', () => {
    const html = _buildForgeContent(buildState({ step: 4 }), false);
    expect(html).toContain('forge-categories');
    expect(html).toContain('Politics');
    expect(html).toContain('Sports');
  });
});

describe('TC12 — _buildForgeContent step 4 marks selected category', () => {
  it('selected class on button matching state.category', () => {
    const html = _buildForgeContent(buildState({ step: 4, category: 'politics' }), false);
    expect(html).toContain('forge-cat-btn selected');
  });
});

// ── Step 5 ────────────────────────────────────────────────────

describe('TC13 — _buildForgeContent step 5 shows review card', () => {
  it('contains forge-review-card with claim text', () => {
    const html = _buildForgeContent(buildState({ step: 5 }), false);
    expect(html).toContain('forge-review-card');
    expect(html).toContain('Climate is warming');
  });
});

describe('TC14 — _buildForgeContent step 5 shows forge cost for new ref', () => {
  it('shows 50 tokens cost in non-edit mode', () => {
    const html = _buildForgeContent(buildState({ step: 5 }), false);
    expect(html).toContain('50 tokens');
  });
});

describe('TC15 — _buildForgeContent step 5 shows edit cost', () => {
  it('shows 10 tokens cost in edit mode', () => {
    const html = _buildForgeContent(buildState({ step: 5 }), true);
    expect(html).toContain('10 tokens');
  });
});

// ── Navigation ────────────────────────────────────────────────

describe('TC16 — _buildForgeContent step 1 shows Cancel button', () => {
  it('contains forge-cancel button at step 1', () => {
    const html = _buildForgeContent(buildState({ step: 1 }), false);
    expect(html).toContain('id="forge-cancel"');
  });
});

describe('TC17 — _buildForgeContent step 2+ shows Back button', () => {
  it('contains forge-back button at step 2', () => {
    const html = _buildForgeContent(buildState({ step: 2 }), false);
    expect(html).toContain('id="forge-back"');
  });
});

describe('TC18 — _buildForgeContent steps 1-4 show Next button', () => {
  it('contains forge-next button at step 1', () => {
    const html = _buildForgeContent(buildState({ step: 1 }), false);
    expect(html).toContain('id="forge-next"');
  });
});

describe('TC19 — _buildForgeContent step 5 shows submit button', () => {
  it('contains forge-submit button at step 5', () => {
    const html = _buildForgeContent(buildState({ step: 5 }), false);
    expect(html).toContain('id="forge-submit"');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.forge-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.types.ts',
      './reference-arsenal.forge-submit.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.forge-render.ts'),
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
