import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: {
    primary: { label: 'Primary', tier: 'A', ceiling: 100 },
  },
  RARITY_COLORS: {
    common: '#aaa', uncommon: '#0f0', rare: '#00f', legendary: '#f90', mythic: '#f00',
  },
  CATEGORIES: ['politics', 'sports'],
  CATEGORY_LABELS: { politics: 'Politics', sports: 'Sports' },
}));

const mockGetLibrary = vi.hoisted(() => vi.fn());
const mockGetTrendingReferences = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.rpc.ts', () => ({
  getLibrary: mockGetLibrary,
  getTrendingReferences: mockGetTrendingReferences,
}));

const mockRenderReferenceCard = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.render.ts', () => ({
  renderReferenceCard: mockRenderReferenceCard,
}));

const mockOpenSheet = vi.hoisted(() => vi.fn());
const mockCloseSheet = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.armory.sheet.ts', () => ({
  openSheet: mockOpenSheet,
  closeSheet: mockCloseSheet,
}));

import { renderArmory, renderLibrary } from '../src/reference-arsenal.armory.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    claim_text: 'Climate is warming',
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023',
    locator: 'p.1',
    source_type: 'primary',
    rarity: 'common',
    graduated: false,
    challenge_status: null,
    source_url: null,
    owner_username: 'PatW',
    seconds: 3,
    strikes: 0,
    current_power: 10,
    created_at: '2023-01-01T00:00:00Z',
    cite_count: 5,
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
  mockGetLibrary.mockReset();
  mockGetTrendingReferences.mockReset();
  mockGetTrendingReferences.mockResolvedValue([]);
  mockRenderReferenceCard.mockReset();
  mockRenderReferenceCard.mockReturnValue('<div class="ref-card">card</div>');
  mockOpenSheet.mockReset();
  mockCloseSheet.mockReset();
  document.body.innerHTML = '';
});

// ── renderArmory — initial structure ──────────────────────────

describe('TC1 — renderArmory renders search input', () => {
  it('armory-search input is present after render', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');

    await renderArmory(container);

    expect(container.querySelector('#armory-search')).not.toBeNull();
  });
});

describe('TC2 — renderArmory renders filter drawer', () => {
  it('armory-filter-drawer is present after render', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');

    await renderArmory(container);

    expect(container.querySelector('#armory-filter-drawer')).not.toBeNull();
  });
});

describe('TC3 — renderArmory renders category chips', () => {
  it('armory-chip buttons for each CATEGORY are present', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');

    await renderArmory(container);

    const chips = container.querySelectorAll('[data-filter="category"]');
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TC4 — renderArmory calls getLibrary on init', () => {
  it('getLibrary is called once during renderArmory', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(mockGetLibrary).toHaveBeenCalled();
  });
});

// ── renderArmory — cards ───────────────────────────────────────

describe('TC5 — renderArmory renders ref cards when getLibrary returns refs', () => {
  it('armory-card-wrap elements are present for each ref', async () => {
    mockGetLibrary.mockResolvedValue([buildRef()]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(document.querySelector('.armory-card-wrap')).not.toBeNull();
  });
});

describe('TC6 — renderArmory calls renderReferenceCard for each ref', () => {
  it('renderReferenceCard is called once per ref', async () => {
    mockGetLibrary.mockResolvedValue([buildRef(), buildRef({ id: 'ref-2' })]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(mockRenderReferenceCard).toHaveBeenCalledTimes(2);
  });
});

describe('TC7 — renderArmory shows empty state when no refs', () => {
  it('arsenal-empty message shown when getLibrary returns []', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(document.getElementById('armory-cards')!.innerHTML).toContain('arsenal-empty');
  });
});

describe('TC8 — renderArmory shows error state when getLibrary throws', () => {
  it('armory-cards shows error message on exception', async () => {
    mockGetLibrary.mockRejectedValue(new Error('fail'));
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(document.getElementById('armory-cards')!.innerHTML).toContain('Could not load');
  });
});

// ── renderArmory — bottom sheet ────────────────────────────────

describe('TC9 — renderArmory appends sheet host to body', () => {
  it('armory-sheet-host is appended to body if not present', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(document.getElementById('armory-sheet-host')).not.toBeNull();
  });
});

describe('TC10 — renderArmory does not duplicate sheet host', () => {
  it('only one armory-sheet-host exists after calling renderArmory twice', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await renderArmory(container);

    const hosts = document.querySelectorAll('#armory-sheet-host');
    expect(hosts.length).toBe(1);
  });
});

// ── renderArmory — card click ──────────────────────────────────

describe('TC11 — clicking armory-card-wrap calls openSheet', () => {
  it('openSheet called when user clicks a card wrap', async () => {
    mockGetLibrary.mockResolvedValue([buildRef({ id: 'ref-1' })]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const wrap = document.querySelector('.armory-card-wrap') as HTMLElement;
    wrap.click();

    expect(mockOpenSheet).toHaveBeenCalled();
  });
});

// ── renderArmory — filter chip ─────────────────────────────────

describe('TC12 — sharpen button toggles filter drawer visibility', () => {
  it('clicking armory-sharpen-btn shows the filter drawer', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const btn = document.getElementById('armory-sharpen-btn') as HTMLButtonElement;
    const drawer = document.getElementById('armory-filter-drawer') as HTMLElement;
    expect(drawer.style.display).toBe('none');

    btn.click();

    expect(drawer.style.display).toBe('block');
  });
});

describe('TC13 — chip click calls getLibrary with filter value', () => {
  it('getLibrary called again after chip click', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    mockGetLibrary.mockClear();

    const chip = container.querySelector('[data-filter="category"]') as HTMLElement;
    chip.click();

    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
  });
});

// ── renderLibrary ──────────────────────────────────────────────

describe('TC14 — renderLibrary is a backward-compat alias for renderArmory', () => {
  it('renderLibrary calls getLibrary (same as renderArmory)', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderLibrary(container);

    expect(mockGetLibrary).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.armory.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.rpc.ts',
      './reference-arsenal.types.ts',
      './reference-arsenal.render.ts',
      './reference-arsenal.armory.sheet.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.armory.ts'),
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
