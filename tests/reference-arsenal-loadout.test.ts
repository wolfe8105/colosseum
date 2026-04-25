import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

const mockPowerDisplay = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.utils.ts', () => ({
  powerDisplay: mockPowerDisplay,
}));

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: {
    primary: { label: 'Primary' },
    secondary: { label: 'Secondary' },
  },
  RARITY_COLORS: {
    common: '#aaa',
    uncommon: '#0f0',
    rare: '#00f',
    legendary: '#f90',
    mythic: '#f00',
  },
}));

const mockSaveDebateLoadout = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.debate.ts', () => ({
  saveDebateLoadout: mockSaveDebateLoadout,
}));

import { renderLoadoutPicker } from '../src/reference-arsenal.loadout.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    claim_text: 'Climate is warming',
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023',
    source_type: 'primary',
    rarity: 'common',
    current_power: 10,
    created_at: '2023-01-01T00:00:00Z',
    challenge_status: null,
    sockets: null,
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockPowerDisplay.mockReturnValue('⚡10');
  mockSafeRpc.mockReset();
  mockSaveDebateLoadout.mockReset();
  mockSaveDebateLoadout.mockResolvedValue(undefined);
  document.body.innerHTML = '';
});

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// ── renderLoadoutPicker ────────────────────────────────────────

describe('TC1 — renderLoadoutPicker shows loading state initially', () => {
  it('sets loading text before RPC resolves', async () => {
    let resolveRpc!: (v: unknown) => void;
    mockSafeRpc.mockReturnValue(new Promise(r => { resolveRpc = r; }));
    const container = makeContainer();

    const promise = renderLoadoutPicker(container, 'debate-1');
    expect(container.innerHTML).toContain('Loading arsenal');

    resolveRpc({ data: [], error: null });
    await promise;
  });
});

describe('TC2 — renderLoadoutPicker calls get_my_arsenal RPC', () => {
  it('calls safeRpc with "get_my_arsenal"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_my_arsenal');
  });
});

describe('TC3 — renderLoadoutPicker shows empty state when no refs', () => {
  it('renders empty message when arsenal is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(container.innerHTML).toContain('ref-loadout-empty');
  });
});

describe('TC4 — renderLoadoutPicker shows empty state on RPC error', () => {
  it('renders empty when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(container.innerHTML).toContain('ref-loadout-empty');
  });
});

describe('TC5 — renderLoadoutPicker filters frozen refs', () => {
  it('does not render frozen refs in the loadout grid', async () => {
    const frozen = buildRef({ id: 'frozen-ref', challenge_status: 'frozen' });
    const normal = buildRef({ id: 'normal-ref', challenge_status: null });
    mockSafeRpc.mockResolvedValue({ data: [frozen, normal], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(container.innerHTML).toContain('normal-ref');
    expect(container.innerHTML).not.toContain('frozen-ref');
  });
});

describe('TC6 — renderLoadoutPicker renders ref-loadout-grid with cards', () => {
  it('renders grid with at least one ref-loadout-card', async () => {
    mockSafeRpc.mockResolvedValue({ data: [buildRef()], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(container.innerHTML).toContain('ref-loadout-grid');
    expect(container.innerHTML).toContain('ref-loadout-card');
  });
});

describe('TC7 — renderLoadoutPicker shows count as 0/5 initially', () => {
  it('ref-loadout-count shows 0/5 when no initialRefs', async () => {
    mockSafeRpc.mockResolvedValue({ data: [buildRef()], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(container.innerHTML).toContain('0/5');
  });
});

describe('TC8 — renderLoadoutPicker pre-selects initialRefs', () => {
  it('ref-loadout-count shows 1/5 when one initialRef matches', async () => {
    const ref = buildRef({ id: 'ref-abc' });
    mockSafeRpc.mockResolvedValue({ data: [ref], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1', ['ref-abc']);

    expect(container.innerHTML).toContain('1/5');
  });
});

describe('TC9 — renderLoadoutPicker clicking a card selects it', async () => {
  it('card gets selected class after click and count increments', async () => {
    mockSafeRpc.mockResolvedValue({ data: [buildRef({ id: 'ref-1' })], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    const card = container.querySelector('.ref-loadout-card') as HTMLElement;
    card.click();

    expect(container.innerHTML).toContain('1/5');
    expect(container.querySelector('.ref-loadout-card.selected')).not.toBeNull();
  });
});

describe('TC10 — renderLoadoutPicker clicking selected card deselects it', async () => {
  it('selected card becomes unselected after second click', async () => {
    const ref = buildRef({ id: 'ref-sel' });
    mockSafeRpc.mockResolvedValue({ data: [ref], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1', ['ref-sel']);

    const card = container.querySelector('.ref-loadout-card.selected') as HTMLElement;
    card.click();

    expect(container.innerHTML).toContain('0/5');
  });
});

describe('TC11 — renderLoadoutPicker clicking card calls saveDebateLoadout', async () => {
  it('saveDebateLoadout is called with debateId and selected ids after click', async () => {
    mockSafeRpc.mockResolvedValue({ data: [buildRef({ id: 'ref-1' })], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-xyz');

    (container.querySelector('.ref-loadout-card') as HTMLElement).click();

    await vi.waitFor(() => expect(mockSaveDebateLoadout).toHaveBeenCalledWith('debate-xyz', ['ref-1']));
  });
});

describe('TC12 — renderLoadoutPicker uses escapeHTML (import contract)', () => {
  it('escapeHTML is called during render', async () => {
    mockSafeRpc.mockResolvedValue({ data: [buildRef()], error: null });
    const container = makeContainer();

    await renderLoadoutPicker(container, 'debate-1');

    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.loadout.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './reference-arsenal.utils.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.debate.ts',
      './reference-arsenal.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.loadout.ts'),
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
