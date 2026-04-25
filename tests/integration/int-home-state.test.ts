// ============================================================
// INTEGRATOR — home.state.ts → reference-arsenal
// Seam #178 | score: 11
// Boundary: home.state holds arsenalRefs: ArsenalReference[] typed
//           from reference-arsenal. renderArsenal (reference-arsenal.render)
//           calls safeRpc('get_my_arsenal') and populates arsenalRefs.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

let mockCurrentUser: { id: string; email: string } | null = null;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

// ============================================================
// ARCH FILTER — verify home.state.ts only type-imports from reference-arsenal
// ============================================================

describe('ARCH — home.state.ts import boundary (seam #178)', () => {
  it('only imports a type from reference-arsenal (no runtime coupling)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.state.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    // All imports from reference-arsenal must be `import type`
    const runtimeArsenalImports = importLines.filter(
      l => l.includes('reference-arsenal') && !l.includes('import type')
    );
    expect(runtimeArsenalImports).toHaveLength(0);
  });

  it('imports ArsenalReference as a type from reference-arsenal', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.state.ts'),
      'utf8'
    );
    expect(src).toMatch(/import type \{[^}]*ArsenalReference[^}]*\} from ['"]\.\.\/reference-arsenal/);
  });
});

// ============================================================
// MODULE HANDLES
// ============================================================

type StateShape = {
  currentOverlayCat: unknown;
  currentScreen: string;
  arsenalForgeCleanup: (() => void) | null;
  arsenalActiveTab: string;
  arsenalRefs: unknown[];
};

type CategoryShape = {
  id: string;
  icon: string;
  label: string;
  section: string;
  count: string;
  hasLive: boolean;
};

let state: StateShape;
let CATEGORIES: CategoryShape[];

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockCurrentUser = null;

  mockRpc.mockResolvedValue({ data: null, error: null });

  const mod = await import('../../src/pages/home.state.ts');
  state = mod.state as StateShape;
  CATEGORIES = mod.CATEGORIES as CategoryShape[];
});

// ============================================================
// TC1: state object has correct initial shape
// ============================================================

describe('TC1 — home.state exports state object with correct initial values', () => {
  it('state.currentScreen is "home" initially', () => {
    expect(state.currentScreen).toBe('home');
  });

  it('state.arsenalRefs is an empty array initially', () => {
    expect(state.arsenalRefs).toEqual([]);
  });

  it('state.arsenalActiveTab is "my-arsenal" initially', () => {
    expect(state.arsenalActiveTab).toBe('my-arsenal');
  });

  it('state.arsenalForgeCleanup is null initially', () => {
    expect(state.arsenalForgeCleanup).toBeNull();
  });

  it('state.currentOverlayCat is null initially', () => {
    expect(state.currentOverlayCat).toBeNull();
  });
});

// ============================================================
// TC2: CATEGORIES export shape
// ============================================================

describe('TC2 — CATEGORIES export has expected structure', () => {
  it('exports 6 categories', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it('each category has required fields: id, icon, label, section, count, hasLive', () => {
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('section');
      expect(cat).toHaveProperty('count');
      expect(typeof cat.hasLive).toBe('boolean');
    }
  });

  it('contains politics category with hasLive: true', () => {
    const politics = CATEGORIES.find(c => c.id === 'politics');
    expect(politics).toBeDefined();
    expect(politics!.hasLive).toBe(true);
  });

  it('contains trending category with hasLive: false', () => {
    const trending = CATEGORIES.find(c => c.id === 'trending');
    expect(trending).toBeDefined();
    expect(trending!.hasLive).toBe(false);
  });
});

// ============================================================
// TC3: renderArsenal — calls get_my_arsenal when user is present
// ============================================================

describe('TC3 — renderArsenal calls get_my_arsenal RPC when user is logged in', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockCurrentUser = { id: 'user-123', email: 'test@test.com' };

    // Mock getCurrentUser to return a user
    vi.doMock('../../src/auth.ts', async (importActual) => {
      const actual = await importActual() as Record<string, unknown>;
      return {
        ...actual,
        getCurrentUser: vi.fn(() => mockCurrentUser),
        safeRpc: mockRpc,
      };
    });

    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('calls get_my_arsenal and returns refs array', async () => {
    const mockRefs = [
      {
        id: 'ref-001',
        user_id: 'user-123',
        source_title: 'Test Source',
        source_author: 'Jane Doe',
        source_date: '2024-01-01',
        locator: 'p.42',
        claim_text: 'Test claim',
        source_type: 'book',
        category: 'politics',
        source_url: null,
        seconds: 3,
        strikes: 1,
        rarity: 'common',
        current_power: 2,
        graduated: false,
        challenge_status: 'none',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockRpc.mockResolvedValueOnce({ data: mockRefs, error: null });

    const container = document.createElement('div');
    const { renderArsenal } = await import('../../src/reference-arsenal.render.ts');
    const refs = await renderArsenal(container);

    expect(mockRpc).toHaveBeenCalledWith('get_my_arsenal', {});
    expect(refs).toHaveLength(1);
    expect(refs[0]).toHaveProperty('id', 'ref-001');
  });
});

// ============================================================
// TC4: renderArsenal — shows sign-in message when no user
// ============================================================

describe('TC4 — renderArsenal shows sign-in prompt when no user is logged in', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockCurrentUser = null;

    vi.doMock('../../src/auth.ts', async (importActual) => {
      const actual = await importActual() as Record<string, unknown>;
      return {
        ...actual,
        getCurrentUser: vi.fn(() => null),
        safeRpc: mockRpc,
      };
    });
  });

  it('sets innerHTML to sign-in message and does not call RPC', async () => {
    const container = document.createElement('div');
    const { renderArsenal } = await import('../../src/reference-arsenal.render.ts');
    const refs = await renderArsenal(container);

    expect(refs).toEqual([]);
    expect(container.innerHTML).toContain('Sign in');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC5: renderArsenal — shows empty state when get_my_arsenal returns []
// ============================================================

describe('TC5 — renderArsenal shows empty state when arsenal has no refs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockCurrentUser = { id: 'user-456', email: 'empty@test.com' };

    vi.doMock('../../src/auth.ts', async (importActual) => {
      const actual = await importActual() as Record<string, unknown>;
      return {
        ...actual,
        getCurrentUser: vi.fn(() => mockCurrentUser),
        safeRpc: mockRpc,
      };
    });

    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('returns empty array and renders empty state with forge button', async () => {
    const container = document.createElement('div');
    const { renderArsenal } = await import('../../src/reference-arsenal.render.ts');
    const refs = await renderArsenal(container);

    expect(refs).toEqual([]);
    expect(container.innerHTML).toContain('arsenal-empty');
    expect(container.querySelector('#arsenal-forge-btn')).not.toBeNull();
  });
});

// ============================================================
// TC6: renderArsenal — renders ref cards and forge button when refs returned
// ============================================================

describe('TC6 — renderArsenal renders ref cards into DOM when get_my_arsenal returns data', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockCurrentUser = { id: 'user-789', email: 'full@test.com' };

    vi.doMock('../../src/auth.ts', async (importActual) => {
      const actual = await importActual() as Record<string, unknown>;
      return {
        ...actual,
        getCurrentUser: vi.fn(() => mockCurrentUser),
        safeRpc: mockRpc,
      };
    });
  });

  it('renders .ref-card elements for each returned reference', async () => {
    const mockRefs = [
      {
        id: 'ref-a',
        user_id: 'user-789',
        source_title: 'Source A',
        source_author: 'Author A',
        source_date: '2024-01-01',
        locator: 'p.1',
        claim_text: 'Claim A',
        source_type: 'book',
        category: 'politics',
        source_url: null,
        seconds: 1,
        strikes: 0,
        rarity: 'common',
        current_power: 1,
        graduated: false,
        challenge_status: 'none',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'ref-b',
        user_id: 'user-789',
        source_title: 'Source B',
        source_author: 'Author B',
        source_date: '2024-06-01',
        locator: 'ch.2',
        claim_text: 'Claim B',
        source_type: 'news',
        category: 'sports',
        source_url: 'https://example.com',
        seconds: 5,
        strikes: 2,
        rarity: 'rare',
        current_power: 3,
        graduated: true,
        challenge_status: 'none',
        created_at: '2024-06-01T00:00:00Z',
      },
    ];

    mockRpc.mockResolvedValueOnce({ data: mockRefs, error: null });

    const container = document.createElement('div');
    const { renderArsenal } = await import('../../src/reference-arsenal.render.ts');
    const refs = await renderArsenal(container);

    expect(refs).toHaveLength(2);
    const cards = container.querySelectorAll('.ref-card');
    expect(cards).toHaveLength(2);
    expect(container.querySelector('#arsenal-forge-btn')).not.toBeNull();
  });
});

// ============================================================
// TC7: state.arsenalRefs can be assigned ArsenalReference[] values
// ============================================================

describe('TC7 — state.arsenalRefs is mutable and accepts ArsenalReference[] values', () => {
  it('state.arsenalRefs can be updated directly', async () => {
    const mockRef = {
      id: 'ref-state-001',
      user_id: 'u1',
      source_title: 'My Title',
      source_author: 'My Author',
      source_date: '2025-01-01',
      locator: 'p.10',
      claim_text: 'My claim',
      source_type: 'primary',
      category: 'politics',
      source_url: null,
      seconds: 2,
      strikes: 0,
      rarity: 'uncommon',
      current_power: 2,
      graduated: false,
      challenge_status: 'none',
      created_at: '2025-01-01T00:00:00Z',
    };

    expect(state.arsenalRefs).toEqual([]);
    state.arsenalRefs = [mockRef];
    expect(state.arsenalRefs).toHaveLength(1);
    expect(state.arsenalRefs[0]).toHaveProperty('id', 'ref-state-001');

    // Cleanup
    state.arsenalRefs = [];
  });

  it('state.arsenalActiveTab can be updated to any tab name', () => {
    expect(state.arsenalActiveTab).toBe('my-arsenal');
    state.arsenalActiveTab = 'forge';
    expect(state.arsenalActiveTab).toBe('forge');
    state.arsenalActiveTab = 'my-arsenal';
  });
});
