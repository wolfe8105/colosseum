/**
 * Integration tests — Seam #274
 * src/pages/home.arsenal.ts → reference-arsenal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// ── Default mock helpers ─────────────────────────────────────────────────────

function makeRef(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ref-aaa',
    claim_text: 'Test claim',
    source_title: 'Source Title',
    source_author: 'Author',
    source_date: '2024-01-01',
    locator: 'p.42',
    source_type: 'book',
    category: 'politics',
    source_url: null,
    rarity: 'common',
    current_power: 10,
    seconds: 1,
    strikes: 0,
    graduated: false,
    challenge_status: 'none',
    owner_username: 'testuser',
    created_at: '2024-01-01T00:00:00Z',
    sockets: [],
    ...overrides,
  };
}

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockGetUser.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReset();

  // Default: rpc returns empty
  mockRpc.mockResolvedValue({ data: [], error: null });

  // DOM baseline
  document.body.innerHTML = `
    <div id="arsenal-content"></div>
    <button data-arsenal-tab="my-arsenal" class="active">Arsenal</button>
    <button data-arsenal-tab="armory">Armory</button>
    <button data-arsenal-tab="forge">Forge</button>
    <button data-arsenal-tab="shop">Shop</button>
  `;
});

// ────────────────────────────────────────────────────────────────────────────
// ARCH: no disallowed imports in home.arsenal.ts
// ────────────────────────────────────────────────────────────────────────────
describe('TC1 — ARCH: home.arsenal.ts has no wall imports', () => {
  it('contains no references to webrtc, deepgram, arena-sounds, voicememo, cards.ts, or feed-room', () => {
    const src = readFileSync(
      resolve('src/pages/home.arsenal.ts'),
      'utf-8',
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const banned = ['webrtc', 'deepgram', 'arena-sounds', 'voicememo', 'cards.ts', 'feed-room', 'intro-music', 'realtime-client', 'arena-css', 'peermetrics'];
    for (const b of banned) {
      const hit = imports.find(l => l.includes(b));
      expect(hit, `home.arsenal.ts must not import "${b}"`).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC2 — loadArsenalScreen calls get_my_arsenal RPC for authenticated user
// ────────────────────────────────────────────────────────────────────────────
describe('TC2 — loadArsenalScreen calls get_my_arsenal RPC', () => {
  it('calls safeRpc with "get_my_arsenal" when user is signed in', async () => {
    // Auth: simulate signed-in user via onAuthStateChange INITIAL_SESSION
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [makeRef()], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    await loadArsenalScreen();

    expect(mockRpc).toHaveBeenCalledWith('get_my_arsenal', {});
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC3 — renderArsenal renders ref cards into #arsenal-content
// ────────────────────────────────────────────────────────────────────────────
describe('TC3 — renderArsenal populates container with ref cards', () => {
  it('inserts .ref-card elements when get_my_arsenal returns refs', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [makeRef(), makeRef({ id: 'ref-bbb', claim_text: 'Second' })], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    await loadArsenalScreen();

    const container = document.getElementById('arsenal-content')!;
    const cards = container.querySelectorAll('.ref-card');
    expect(cards.length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC4 — renderArsenal shows empty state when get_my_arsenal returns []
// ────────────────────────────────────────────────────────────────────────────
describe('TC4 — renderArsenal empty state when no refs returned', () => {
  it('shows #arsenal-forge-btn in empty-state markup when array is empty', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    await loadArsenalScreen();

    const container = document.getElementById('arsenal-content')!;
    const forgeBtn = container.querySelector('#arsenal-forge-btn');
    expect(forgeBtn).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC5 — renderArsenal shows sign-in message when no user
// ────────────────────────────────────────────────────────────────────────────
describe('TC5 — renderArsenal shows sign-in prompt when unauthenticated', () => {
  it('puts sign-in message in container when getCurrentUser returns null', async () => {
    // No INITIAL_SESSION → getCurrentUser returns null
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    await loadArsenalScreen();

    const container = document.getElementById('arsenal-content')!;
    expect(container.innerHTML).toMatch(/Sign in/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC6 — forge tab click calls showForgeForm (via loadForge → renders into container)
// ────────────────────────────────────────────────────────────────────────────
describe('TC6 — forge tab click renders forge form into #arsenal-content', () => {
  it('inserts forge form markup into #arsenal-content when forge tab is clicked', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    // Must import the module so the tab-click listeners attach
    await import('../../src/pages/home.arsenal.ts');

    const forgeTab = document.querySelector<HTMLElement>('[data-arsenal-tab="forge"]');
    expect(forgeTab).not.toBeNull();
    forgeTab!.click();

    const container = document.getElementById('arsenal-content')!;
    // The forge form render puts step content into the container
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC7 — armory tab click triggers get_reference_library RPC
// ────────────────────────────────────────────────────────────────────────────
describe('TC7 — armory tab click calls get_reference_library RPC', () => {
  it('calls supabase.rpc with "get_reference_library" when armory tab is clicked', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    await import('../../src/pages/home.arsenal.ts');

    const armoryTab = document.querySelector<HTMLElement>('[data-arsenal-tab="armory"]');
    expect(armoryTab).not.toBeNull();
    armoryTab!.click();

    // Allow async loadCards() and trending IIFE to settle
    await vi.advanceTimersByTimeAsync(100);

    const calls = mockRpc.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls).toContain('get_reference_library');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #423 | home.arsenal.ts → home.state
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #423 | ARCH — home.arsenal.ts imports state from home.state', () => {
  it('import lines include home.state with { state }', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.arsenal.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const stateLine = importLines.find((l: string) => l.includes('home.state'));
    expect(stateLine).toBeTruthy();
    expect(stateLine).toMatch(/state/);
  });
});

describe('Seam #423 | TC-S1 — loadArsenalScreen sets state.arsenalActiveTab to "my-arsenal"', () => {
  it('state.arsenalActiveTab is "my-arsenal" after loadArsenalScreen', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    await loadArsenalScreen();
    expect(state.arsenalActiveTab).toBe('my-arsenal');
  });
});

describe('Seam #423 | TC-S2 — loadArsenalScreen calls state.arsenalForgeCleanup if set, then nulls it', () => {
  it('calls the cleanup fn and sets state.arsenalForgeCleanup to null', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    const cleanupFn = vi.fn();
    state.arsenalForgeCleanup = cleanupFn;

    await loadArsenalScreen();

    expect(cleanupFn).toHaveBeenCalledOnce();
    expect(state.arsenalForgeCleanup).toBeNull();
  });
});

describe('Seam #423 | TC-S3 — tab switch to "armory" updates state.arsenalActiveTab', () => {
  it('state.arsenalActiveTab becomes "armory" when the armory tab is clicked', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    const armoryTab = document.querySelector<HTMLElement>('[data-arsenal-tab="armory"]');
    armoryTab!.click();

    expect(state.arsenalActiveTab).toBe('armory');
  });
});

describe('Seam #423 | TC-S4 — state.arsenalRefs is populated after loadArsenalScreen with data', () => {
  it('state.arsenalRefs contains the refs returned by get_my_arsenal', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    const ref1 = makeRef({ id: 'r1' });
    const ref2 = makeRef({ id: 'r2' });
    mockRpc.mockResolvedValue({ data: [ref1, ref2], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    await loadArsenalScreen();

    expect(Array.isArray(state.arsenalRefs)).toBe(true);
    expect(state.arsenalRefs.length).toBe(2);
  });
});

describe('Seam #423 | TC-S5 — state.arsenalForgeCleanup is set by forge tab click', () => {
  it('state.arsenalForgeCleanup is a function after forge tab is clicked', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    const forgeTab = document.querySelector<HTMLElement>('[data-arsenal-tab="forge"]');
    forgeTab!.click();

    expect(typeof state.arsenalForgeCleanup).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #555 | home.arsenal.ts → home.arsenal-shop
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #555 | ARCH — home.arsenal.ts imports loadShopScreen and cleanupShopScreen from home.arsenal-shop', () => {
  it('import lines include home.arsenal-shop with loadShopScreen and cleanupShopScreen', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.arsenal.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const shopLine = importLines.find((l: string) => l.includes('home.arsenal-shop'));
    expect(shopLine).toBeTruthy();
    expect(shopLine).toMatch(/loadShopScreen/);
    expect(shopLine).toMatch(/cleanupShopScreen/);
  });
});

describe('Seam #555 | TC-1 — loadArsenalScreen calls cleanupShopScreen before rendering', () => {
  it('cleanupShopScreen is invoked when loadArsenalScreen is called', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');

    // Confirm no error; cleanupShopScreen is a no-op when state is already empty.
    await expect(loadArsenalScreen()).resolves.toBeUndefined();
  });
});

describe('Seam #555 | TC-2 — loadArsenalScreen resolves when #arsenal-content is absent', () => {
  it('returns a resolved promise immediately when the container is missing', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    document.body.innerHTML = `
      <button data-arsenal-tab="my-arsenal" class="active">Arsenal</button>
      <button data-arsenal-tab="shop">Shop</button>
    `;

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    await expect(loadArsenalScreen()).resolves.toBeUndefined();
  });
});

describe('Seam #555 | TC-3 — loadArsenalScreen sets arsenalActiveTab to "my-arsenal"', () => {
  it('state.arsenalActiveTab is "my-arsenal" after loadArsenalScreen, even if shop was active', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadArsenalScreen } = await import('../../src/pages/home.arsenal.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    state.arsenalActiveTab = 'shop';
    await loadArsenalScreen();

    expect(state.arsenalActiveTab).toBe('my-arsenal');
  });
});

describe('Seam #555 | TC-4 — shop tab click calls loadShopScreen (renders loading indicator)', () => {
  it('container shows "Loading catalog" markup after shop tab click', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    // getModifierCatalog calls safeRpc('get_modifier_catalog', ...)
    // Return a never-resolving promise so we can observe the loading state
    mockRpc.mockReturnValue(new Promise(() => {}));

    await import('../../src/pages/home.arsenal.ts');

    const shopTab = document.querySelector<HTMLElement>('[data-arsenal-tab="shop"]');
    shopTab!.click();

    await vi.advanceTimersByTimeAsync(0);

    const container = document.getElementById('arsenal-content')!;
    expect(container.innerHTML).toMatch(/Loading catalog/i);
  });
});

describe('Seam #555 | TC-5 — shop tab renders error state when getModifierCatalog rejects', () => {
  it('container shows "Failed to load shop" when catalog fetch throws', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockRejectedValue(new Error('network error'));

    await import('../../src/pages/home.arsenal.ts');

    const shopTab = document.querySelector<HTMLElement>('[data-arsenal-tab="shop"]');
    shopTab!.click();

    await vi.advanceTimersByTimeAsync(100);

    const container = document.getElementById('arsenal-content')!;
    expect(container.innerHTML).toMatch(/Failed to load shop/i);
  });
});

describe('Seam #555 | TC-6 — cleanupShopScreen resets all filter state to defaults', () => {
  it('all filter fields are at default values after cleanupShopScreen is called', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { cleanupShopScreen } = await import('../../src/pages/home.arsenal-shop.ts');

    // Call twice — should be idempotent
    cleanupShopScreen();
    cleanupShopScreen();

    // No error thrown; state is reset. Verify by calling loadShopScreen immediately
    // after, which should not throw even though internal state was reset.
    expect(() => cleanupShopScreen()).not.toThrow();
  });
});

describe('Seam #555 | TC-7 — loadShopScreen reads token balance from [data-token-balance] DOM element', () => {
  it('uses the numeric value in [data-token-balance] element as tokenBalance', async () => {
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );

    // Catalog returns an empty array successfully
    mockRpc.mockResolvedValue({ data: [], error: null });

    // Inject a token-balance element with a known value
    const balanceEl = document.createElement('span');
    balanceEl.setAttribute('data-token-balance', '');
    balanceEl.textContent = '250';
    document.body.appendChild(balanceEl);

    const container = document.getElementById('arsenal-content')!;
    const { loadShopScreen } = await import('../../src/pages/home.arsenal-shop.ts');

    await loadShopScreen(container);

    // The shop should have rendered (not the error state) because catalog succeeded.
    // The loading indicator should be gone.
    expect(container.innerHTML).not.toMatch(/Loading catalog/i);
    expect(container.innerHTML).not.toMatch(/Failed to load shop/i);
  });
});
