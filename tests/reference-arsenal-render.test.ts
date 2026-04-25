import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
}));

const mockEscapeHTML = vi.hoisted(() => vi.fn());
const mockSanitizeUrl = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  sanitizeUrl: mockSanitizeUrl,
}));

const mockCompositeScore = vi.hoisted(() => vi.fn());
const mockPowerDisplay = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.utils.ts', () => ({
  compositeScore: mockCompositeScore,
  powerDisplay: mockPowerDisplay,
}));

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: {
    primary: { label: 'Primary' },
    secondary: { label: 'Secondary' },
    statistical: { label: 'Statistical' },
    anecdotal: { label: 'Anecdotal' },
  },
  RARITY_COLORS: {
    common: '#aaa',
    uncommon: '#0f0',
    rare: '#00f',
    legendary: '#f90',
    mythic: '#f00',
  },
  CHALLENGE_STATUS_LABELS: {
    pending: 'Under Review',
    upheld: 'Upheld',
    dismissed: 'Dismissed',
  },
}));

import { renderReferenceCard, renderArsenal, rarityCardStyle, RARITY_SOCKET_COUNT } from '../src/reference-arsenal.render.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    claim_text: 'Climate is warming',
    source_title: 'IPCC Report',
    source_author: 'IPCC',
    source_date: '2023',
    locator: 'p.42',
    source_type: 'primary',
    rarity: 'common',
    seconds: 3,
    strikes: 1,
    current_power: 10,
    created_at: '2023-01-01T00:00:00Z',
    graduated: false,
    challenge_status: null,
    source_url: null,
    owner_username: null,
    sockets: null,
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockSanitizeUrl.mockImplementation((s: string) => s);
  mockCompositeScore.mockReturnValue(5);
  mockPowerDisplay.mockReturnValue('⚡10');
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
  mockSafeRpc.mockReset();
  document.body.innerHTML = '';
});

// ── RARITY_SOCKET_COUNT ────────────────────────────────────────

describe('TC1 — RARITY_SOCKET_COUNT has correct counts', () => {
  it('common=1, uncommon=2, rare=3, legendary=4, mythic=5', () => {
    expect(RARITY_SOCKET_COUNT.common).toBe(1);
    expect(RARITY_SOCKET_COUNT.uncommon).toBe(2);
    expect(RARITY_SOCKET_COUNT.rare).toBe(3);
    expect(RARITY_SOCKET_COUNT.legendary).toBe(4);
    expect(RARITY_SOCKET_COUNT.mythic).toBe(5);
  });
});

// ── rarityCardStyle ────────────────────────────────────────────

describe('TC2 — rarityCardStyle mythic returns border shorthand', () => {
  it('mythic style contains full border property', () => {
    const style = rarityCardStyle('mythic');
    expect(style).toContain('border:');
    expect(style).not.toContain('border-left:');
  });
});

describe('TC3 — rarityCardStyle non-mythic returns border-left', () => {
  it('common style contains border-left', () => {
    const style = rarityCardStyle('common');
    expect(style).toContain('border-left:');
  });
});

// ── renderReferenceCard ────────────────────────────────────────

describe('TC4 — renderReferenceCard returns ref-card with data-ref-id', () => {
  it('contains data-ref-id attribute matching ref.id', () => {
    const html = renderReferenceCard(buildRef({ id: 'ref-abc' }), false);
    expect(html).toContain('data-ref-id="ref-abc"');
  });
});

describe('TC5 — renderReferenceCard shows claim text', () => {
  it('contains claim text in quotes', () => {
    const html = renderReferenceCard(buildRef({ claim_text: 'Earth is round' }), false);
    expect(html).toContain('Earth is round');
  });
});

describe('TC6 — renderReferenceCard shows source title and author', () => {
  it('contains source title and author', () => {
    const html = renderReferenceCard(buildRef(), false);
    expect(html).toContain('IPCC Report');
    expect(html).toContain('IPCC');
  });
});

describe('TC7 — renderReferenceCard calls escapeHTML (import contract)', () => {
  it('escapeHTML is called during render', () => {
    renderReferenceCard(buildRef(), false);
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC8 — renderReferenceCard calls compositeScore and powerDisplay', () => {
  it('calls both utils during render', () => {
    renderReferenceCard(buildRef(), false);
    expect(mockCompositeScore).toHaveBeenCalled();
    expect(mockPowerDisplay).toHaveBeenCalled();
  });
});

describe('TC9 — renderReferenceCard shows second button when showSecondBtn=true', () => {
  it('includes ref-card-second-btn when showSecondBtn is true', () => {
    const html = renderReferenceCard(buildRef(), true);
    expect(html).toContain('ref-card-second-btn');
  });
});

describe('TC10 — renderReferenceCard hides second button when showSecondBtn=false', () => {
  it('does not include ref-card-second-btn when showSecondBtn is false', () => {
    const html = renderReferenceCard(buildRef(), false);
    expect(html).not.toContain('ref-card-second-btn');
  });
});

describe('TC11 — renderReferenceCard shows edit/delete buttons when showEditBtn=true', () => {
  it('includes ref-card-edit-btn and ref-card-delete-btn', () => {
    const html = renderReferenceCard(buildRef(), false, true);
    expect(html).toContain('ref-card-edit-btn');
    expect(html).toContain('ref-card-delete-btn');
  });
});

describe('TC12 — renderReferenceCard shows graduated star when ref.graduated=true', () => {
  it('contains graduated span when ref is graduated', () => {
    const html = renderReferenceCard(buildRef({ graduated: true }), false);
    expect(html).toContain('ref-card-graduated');
  });
});

describe('TC13 — renderReferenceCard shows challenge status label', () => {
  it('includes status label when challenge_status is set', () => {
    const html = renderReferenceCard(buildRef({ challenge_status: 'pending' }), false);
    expect(html).toContain('Under Review');
  });
});

describe('TC14 — renderReferenceCard shows source URL link', () => {
  it('includes View Source link when source_url is set', () => {
    const html = renderReferenceCard(buildRef({ source_url: 'https://example.com' }), false);
    expect(html).toContain('View Source');
    expect(mockSanitizeUrl).toHaveBeenCalled();
  });
});

describe('TC15 — renderReferenceCard shows owner username', () => {
  it('includes forger section when owner_username is set', () => {
    const html = renderReferenceCard(buildRef({ owner_username: 'PatW' }), false);
    expect(html).toContain('PatW');
    expect(html).toContain('ref-card-forger');
  });
});

// ── renderArsenal ──────────────────────────────────────────────

describe('TC16 — renderArsenal shows sign-in message when no user', () => {
  it('renders sign-in message when getCurrentUser returns null', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    const container = document.createElement('div');

    await renderArsenal(container);

    expect(container.innerHTML).toContain('Sign in');
  });
});

describe('TC17 — renderArsenal calls get_my_arsenal RPC', () => {
  it('calls safeRpc with "get_my_arsenal"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await renderArsenal(container);

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_my_arsenal');
  });
});

describe('TC18 — renderArsenal shows empty state when no refs', () => {
  it('renders forge button when arsenal is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await renderArsenal(container);

    expect(container.innerHTML).toContain('arsenal-forge-btn');
  });
});

describe('TC19 — renderArsenal renders ref cards when refs exist', () => {
  it('renders arsenal-grid with ref cards', async () => {
    const ref = buildRef();
    mockSafeRpc.mockResolvedValue({ data: [ref], error: null });
    const container = document.createElement('div');

    await renderArsenal(container);

    expect(container.innerHTML).toContain('arsenal-grid');
    expect(container.innerHTML).toContain('ref-card');
  });
});

describe('TC20 — renderArsenal returns refs array', () => {
  it('returns the refs from the RPC', async () => {
    const ref = buildRef();
    mockSafeRpc.mockResolvedValue({ data: [ref], error: null });
    const container = document.createElement('div');

    const result = await renderArsenal(container);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ref-1');
  });
});

describe('TC21 — renderArsenal shows error state on RPC failure', () => {
  it('renders error message when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const container = document.createElement('div');

    await renderArsenal(container);

    expect(container.innerHTML).toContain('Could not load');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './reference-arsenal.utils.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.render.ts'),
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
