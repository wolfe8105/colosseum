// ============================================================
// F-27 GATEKEEPER — REFERENCE LIBRARY BROWSE (THE ARMORY)
// Tests renderArmory / renderLibrary from
// src/reference-arsenal.armory.ts against the F-27 spec.
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md row F-27.
// ============================================================

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
    secondary: { label: 'Secondary', tier: 'B', ceiling: 80 },
  },
  RARITY_COLORS: {
    common: '#aaa',
    uncommon: '#0f0',
    rare: '#00f',
    legendary: '#f90',
    mythic: '#f00',
  },
  CATEGORIES: ['politics', 'sports', 'science'],
  CATEGORY_LABELS: { politics: 'Politics', sports: 'Sports', science: 'Science' },
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
    claim_text: 'The climate is warming',
    source_title: 'IPCC Report',
    source_author: 'Scientists',
    source_date: '2023',
    locator: 'p.1',
    source_type: 'primary',
    rarity: 'common',
    graduated: false,
    challenge_status: null,
    source_url: null,
    owner_username: 'TestUser',
    seconds: 3,
    strikes: 0,
    current_power: 10,
    created_at: '2023-01-01T00:00:00Z',
    cite_count: 5,
    ...overrides,
  } as never;
}

function buildTrending(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trend-1',
    claim_text: 'Trending claim text',
    source_title: 'Trending Source',
    rarity: 'rare',
    cite_count: 42,
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
  mockGetLibrary.mockReset();
  mockGetLibrary.mockResolvedValue([]);
  mockGetTrendingReferences.mockReset();
  mockGetTrendingReferences.mockResolvedValue([]);
  mockRenderReferenceCard.mockReset();
  mockRenderReferenceCard.mockReturnValue('<div class="ref-card">card</div>');
  mockOpenSheet.mockReset();
  mockCloseSheet.mockReset();
  document.body.innerHTML = '';
});

// ── TC1 — Search bar ──────────────────────────────────────────

describe('TC1 — search bar is rendered with correct placeholder', () => {
  it('armory-search input has placeholder "Hunt a blade..."', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const input = container.querySelector('#armory-search') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe('Hunt a blade...');
  });
});

// ── TC2 — Sharpen filter drawer initially hidden ───────────────

describe('TC2 — filter drawer is rendered but initially hidden', () => {
  it('armory-filter-drawer exists and style.display is none', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const drawer = container.querySelector('#armory-filter-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.style.display).toBe('none');
  });
});

// ── TC3 — Category chips ───────────────────────────────────────

describe('TC3 — category chip row has one chip per CATEGORIES entry', () => {
  it('renders 3 category chips matching CATEGORIES mock (politics/sports/science)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const chips = Array.from(container.querySelectorAll('[data-filter="category"]')) as HTMLElement[];
    expect(chips.length).toBe(3);
    const values = chips.map(c => c.dataset.value);
    expect(values).toContain('politics');
    expect(values).toContain('sports');
    expect(values).toContain('science');
  });
});

// ── TC4 — Rarity chips ────────────────────────────────────────

describe('TC4 — rarity chips are rendered for all five rarities', () => {
  it('renders chips for common/uncommon/rare/legendary/mythic', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const chips = Array.from(container.querySelectorAll('[data-filter="rarity"]')) as HTMLElement[];
    const values = chips.map(c => c.dataset.value);
    expect(values).toContain('common');
    expect(values).toContain('uncommon');
    expect(values).toContain('rare');
    expect(values).toContain('legendary');
    expect(values).toContain('mythic');
    expect(chips.length).toBe(5);
  });
});

// ── TC5 — Source type chips ────────────────────────────────────

describe('TC5 — source type chips rendered one per SOURCE_TYPES key', () => {
  it('renders chips for primary and secondary source types', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const chips = Array.from(container.querySelectorAll('[data-filter="sourceType"]')) as HTMLElement[];
    const values = chips.map(c => c.dataset.value);
    expect(values).toContain('primary');
    expect(values).toContain('secondary');
    expect(chips.length).toBe(2);
  });
});

// ── TC6 — Status chips ────────────────────────────────────────

describe('TC6 — status chips include graduated, clean, disputed, frozen', () => {
  it('renders graduated, challengeStatus clean/disputed/frozen chips', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const gradChip = container.querySelector('[data-filter="graduated"][data-value="true"]');
    const cleanChip = container.querySelector('[data-filter="challengeStatus"][data-value="none"]');
    const disputedChip = container.querySelector('[data-filter="challengeStatus"][data-value="disputed"]');
    const frozenChip = container.querySelector('[data-filter="challengeStatus"][data-value="frozen"]');

    expect(gradChip).not.toBeNull();
    expect(cleanChip).not.toBeNull();
    expect(disputedChip).not.toBeNull();
    expect(frozenChip).not.toBeNull();
  });
});

// ── TC7 — Sort chips: all six rendered; power starts active ───

describe('TC7 — sort chips are rendered and power chip starts active', () => {
  it('renders 6 sort chips and power chip has active class initially', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const sortChips = Array.from(container.querySelectorAll('[data-filter="sort"]')) as HTMLElement[];
    const values = sortChips.map(c => c.dataset.value);
    expect(values).toContain('power');
    expect(values).toContain('strikes');
    expect(values).toContain('seconds');
    expect(values).toContain('newest');
    expect(values).toContain('oldest');
    expect(values).toContain('alpha');
    expect(sortChips.length).toBe(6);

    const powerChip = sortChips.find(c => c.dataset.value === 'power');
    expect(powerChip!.classList.contains('active')).toBe(true);
    const otherActive = sortChips.filter(c => c.dataset.value !== 'power' && c.classList.contains('active'));
    expect(otherActive.length).toBe(0);
  });
});

// ── TC8 — Trending shelf shown when items returned ────────────

describe('TC8 — trending shelf is rendered with HOT IN THE ARENA label when items exist', () => {
  it('armory-trending contains shelf label when getTrendingReferences returns items', async () => {
    mockGetTrendingReferences.mockResolvedValue([buildTrending()]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await vi.runAllTimersAsync();

    const trendEl = document.getElementById('armory-trending');
    expect(trendEl!.innerHTML).toContain('HOT IN THE ARENA');
  });
});

// ── TC9 — Trending shelf hidden when no items ─────────────────

describe('TC9 — trending shelf not rendered when getTrendingReferences returns empty', () => {
  it('armory-trending stays empty when no trending items', async () => {
    mockGetTrendingReferences.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await vi.runAllTimersAsync();

    const trendEl = document.getElementById('armory-trending');
    expect(trendEl!.innerHTML).toBe('');
  });
});

// ── TC10 — Trending card shows claim_text, source_title, cite_count, rarity ──

describe('TC10 — trending cards render claim_text, source_title, cite_count, and rarity badge', () => {
  it('trending card html contains claim and source info', async () => {
    mockGetTrendingReferences.mockResolvedValue([
      buildTrending({ id: 'trend-1', claim_text: 'Hot take here', source_title: 'Hot Source', rarity: 'legendary', cite_count: 99 }),
    ]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await vi.runAllTimersAsync();

    const trendEl = document.getElementById('armory-trending');
    expect(trendEl!.innerHTML).toContain('Hot take here');
    expect(trendEl!.innerHTML).toContain('Hot Source');
    expect(trendEl!.innerHTML).toContain('99');
    expect(trendEl!.innerHTML).toContain('LEGENDARY');
  });
});

// ── TC11 — getLibrary called on init with sort='power' ─────────

describe('TC11 — getLibrary called on init with default sort=power', () => {
  it('initial getLibrary call includes sort: "power"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    expect(mockGetLibrary).toHaveBeenCalled();
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.sort).toBe('power');
  });
});

// ── TC12 — getLibrary receives category filter when chip clicked ──

describe('TC12 — getLibrary called with category after category chip click', () => {
  it('getLibrary receives category value matching clicked chip', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    mockGetLibrary.mockClear();

    const chip = container.querySelector('[data-filter="category"][data-value="politics"]') as HTMLElement;
    chip.click();

    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.category).toBe('politics');
  });
});

// ── TC13 — graduated='true' string maps to boolean true ───────

describe('TC13 — graduated filter maps string "true" to boolean true in getLibrary call', () => {
  it('getLibrary receives graduated: true (boolean) when graduated chip clicked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    mockGetLibrary.mockClear();

    const chip = container.querySelector('[data-filter="graduated"][data-value="true"]') as HTMLElement;
    chip.click();

    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.graduated).toBe(true);
  });
});

// ── TC14 — getLibrary receives challengeStatus when chip clicked ──

describe('TC14 — getLibrary called with challengeStatus after status chip click', () => {
  it('getLibrary receives challengeStatus: "disputed" when disputed chip clicked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    mockGetLibrary.mockClear();

    const chip = container.querySelector('[data-filter="challengeStatus"][data-value="disputed"]') as HTMLElement;
    chip.click();

    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.challengeStatus).toBe('disputed');
  });
});

// ── TC15 — Filter badge count increments with active filters ──

describe('TC15 — filter badge shows count of active non-sort filters', () => {
  it('badge count is 1 after one non-sort chip is activated', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const badge = document.getElementById('armory-filter-badge') as HTMLElement;
    expect(badge.style.display).toBe('none');

    const chip = container.querySelector('[data-filter="rarity"][data-value="rare"]') as HTMLElement;
    chip.click();

    await vi.waitFor(() => expect(badge.style.display).toBe('inline-flex'));
    expect(badge.textContent).toBe('1');
  });
});

// ── TC16 — Clicking same chip twice toggles filter off ────────

describe('TC16 — clicking same non-sort chip twice clears the filter', () => {
  it('badge returns to hidden and filter cleared after clicking chip twice', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    const badge = document.getElementById('armory-filter-badge') as HTMLElement;

    const chip = container.querySelector('[data-filter="rarity"][data-value="uncommon"]') as HTMLElement;
    chip.click();
    await vi.waitFor(() => expect(badge.textContent).toBe('1'));

    mockGetLibrary.mockClear();
    chip.click();

    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.rarity).toBeUndefined();
    expect(badge.style.display).toBe('none');
  });
});

// ── TC17 — Sort chip click sets active on clicked, removes from others ──

describe('TC17 — clicking a sort chip moves active class to that chip', () => {
  it('strikes chip becomes active after click; power chip loses active', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const powerChip = container.querySelector('[data-filter="sort"][data-value="power"]') as HTMLElement;
    const strikesChip = container.querySelector('[data-filter="sort"][data-value="strikes"]') as HTMLElement;

    expect(powerChip.classList.contains('active')).toBe(true);

    strikesChip.click();

    await vi.waitFor(() => expect(strikesChip.classList.contains('active')).toBe(true));
    expect(powerChip.classList.contains('active')).toBe(false);
  });
});

// ── TC18 — Empty state shows Forge CTA ───────────────────────

describe('TC18 — empty state renders Forge a Reference CTA button', () => {
  it('armory-cards contains "Forge a Reference" button when getLibrary returns []', async () => {
    mockGetLibrary.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const cards = document.getElementById('armory-cards')!;
    expect(cards.innerHTML).toContain('Forge a Reference');
    expect(cards.querySelector('.armory-forge-cta')).not.toBeNull();
  });
});

// ── TC19 — Clicking trending card calls openSheet ─────────────

describe('TC19 — clicking a trending card calls openSheet', () => {
  it('openSheet is called when a trending card is clicked', async () => {
    mockGetTrendingReferences.mockResolvedValue([buildTrending({ id: 'trend-click' })]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await vi.runAllTimersAsync();

    const card = document.querySelector('.armory-trending-card') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    expect(mockOpenSheet).toHaveBeenCalled();
  });
});

// ── TC20 — Backdrop click calls closeSheet ────────────────────

describe('TC20 — clicking the sheet backdrop calls closeSheet', () => {
  it('closeSheet is called when armory-sheet-backdrop is clicked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);

    const backdrop = document.getElementById('armory-sheet-backdrop') as HTMLElement;
    backdrop.click();

    expect(mockCloseSheet).toHaveBeenCalled();
  });
});

// ── TC21 — Search input debounces 320ms ───────────────────────

describe('TC21 — search input debounces calls to getLibrary by 320ms', () => {
  it('getLibrary not called immediately on input; called after 320ms timer fires with search value', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    mockGetLibrary.mockClear();

    const searchEl = container.querySelector('#armory-search') as HTMLInputElement;
    searchEl.value = 'fire';
    searchEl.dispatchEvent(new Event('input'));

    expect(mockGetLibrary).not.toHaveBeenCalled();

    vi.advanceTimersByTime(320);
    await vi.waitFor(() => expect(mockGetLibrary).toHaveBeenCalled());
    const args = mockGetLibrary.mock.calls[0][0];
    expect(args.search).toBe('fire');
  });
});

// ── TC22 — renderLibrary delegates to renderArmory ───────────

describe('TC22 — renderLibrary is a backward-compat alias that renders the full armory', () => {
  it('renderLibrary produces the search input and calls getLibrary', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderLibrary(container);

    expect(container.querySelector('#armory-search')).not.toBeNull();
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
