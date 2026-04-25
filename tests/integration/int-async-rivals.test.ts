/**
 * Integration tests — seam #239
 * src/async.rivals.ts → async.state
 *
 * Tests: renderRivals container guard, wiring dedup via state.wiredContainers,
 * empty-rivals render, rival list render, error fallback,
 * pending/received ACCEPT button, refreshRivals DOM delegation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Shared module refs ──────────────────────────────────────────────────────

let renderRivals: typeof import('../../src/async.rivals.ts').renderRivals;
let refreshRivals: typeof import('../../src/async.rivals.ts').refreshRivals;
let _registerRivalWiring: typeof import('../../src/async.rivals.ts')._registerRivalWiring;

let getMyRivalsMock: ReturnType<typeof vi.fn>;
let escapeHTMLMock: ReturnType<typeof vi.fn>;

// Shared wiredContainers set used across the module under test
let wiredContainers: Set<HTMLElement>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRival(overrides: Partial<{
  id: string;
  rival_id: string;
  rival_username: string;
  rival_display_name: string;
  rival_elo: number;
  rival_wins: number;
  rival_losses: number;
  status: 'pending' | 'active';
  direction: 'sent' | 'received';
}> = {}) {
  return {
    id: 'row-uuid-001',
    rival_id: 'rival-uuid-001',
    rival_username: 'testuser',
    rival_display_name: 'Test User',
    rival_elo: 1350,
    rival_wins: 10,
    rival_losses: 3,
    status: 'active' as const,
    direction: 'sent' as const,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('seam #239 | async.rivals.ts → async.state', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    getMyRivalsMock = vi.fn().mockResolvedValue([]);
    // escapeHTML returns its input unchanged for simplicity in assertions
    escapeHTMLMock = vi.fn().mockImplementation((s: unknown) => String(s ?? ''));
    wiredContainers = new Set<HTMLElement>();

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        wiredContainers,
        predictions: [],
        standaloneQuestions: [],
        predictingInFlight: new Set(),
      },
    }));

    vi.doMock('../../src/async.types.ts', () => ({}));

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: escapeHTMLMock,
      ModeratorConfig: { escapeHTML: escapeHTMLMock },
    }));

    vi.doMock('../../src/auth.ts', () => ({
      getMyRivals: getMyRivalsMock,
    }));

    const mod = await import('../../src/async.rivals.ts');
    renderRivals = mod.renderRivals;
    refreshRivals = mod.refreshRivals;
    _registerRivalWiring = mod._registerRivalWiring;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: null/falsy container guard ──────────────────────────────────────

  it('TC1: renderRivals returns early without calling getMyRivals when container is null', async () => {
    await renderRivals(null as unknown as HTMLElement);
    expect(getMyRivalsMock).not.toHaveBeenCalled();
  });

  // ── TC2: wiring dedup via state.wiredContainers ───────────────────────────

  it('TC2: _wireRivals callback is called once per container and container is tracked in state.wiredContainers', async () => {
    const wireFn = vi.fn();
    _registerRivalWiring(wireFn);

    const container = document.createElement('div');

    // First render — should wire
    await renderRivals(container);
    expect(wireFn).toHaveBeenCalledTimes(1);
    expect(wireFn).toHaveBeenCalledWith(container);
    expect(wiredContainers.has(container)).toBe(true);

    // Second render — already wired, should not call again
    await renderRivals(container);
    expect(wireFn).toHaveBeenCalledTimes(1);
  });

  // ── TC3: empty rivals array renders empty-state message ──────────────────

  it('TC3: when getMyRivals returns empty array, empty-state HTML is rendered', async () => {
    getMyRivalsMock.mockResolvedValue([]);

    const container = document.createElement('div');
    await renderRivals(container);

    expect(getMyRivalsMock).toHaveBeenCalledTimes(1);
    // Should render the "no rivals" empty state
    expect(container.innerHTML).toContain('No rivals yet');
  });

  // ── TC4: rival list renders display name and ELO stats ───────────────────

  it('TC4: when getMyRivals returns rivals, each rival name and ELO stats are rendered', async () => {
    const rival = makeRival({
      rival_display_name: 'EliteDebater',
      rival_elo: 1500,
      rival_wins: 20,
      rival_losses: 5,
      status: 'active',
    });
    getMyRivalsMock.mockResolvedValue([rival]);

    const container = document.createElement('div');
    await renderRivals(container);

    expect(getMyRivalsMock).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toContain('ELITEDEBATER');
    expect(container.innerHTML).toContain('1500');
    expect(container.innerHTML).toContain('20W-5L');
    expect(container.innerHTML).toContain('ACTIVE');
  });

  // ── TC5: getMyRivals throwing renders error fallback ─────────────────────

  it('TC5: when getMyRivals throws, error fallback HTML is rendered', async () => {
    getMyRivalsMock.mockRejectedValue(new Error('network failure'));

    const container = document.createElement('div');
    await renderRivals(container);

    expect(container.innerHTML).toContain('Could not load rivals');
  });

  // ── TC6: pending/received rival renders ACCEPT button ────────────────────

  it('TC6: a pending received rival renders an ACCEPT button with correct data-id', async () => {
    const rival = makeRival({
      id: 'row-id-pending-001',
      status: 'pending',
      direction: 'received',
    });
    getMyRivalsMock.mockResolvedValue([rival]);

    const container = document.createElement('div');
    await renderRivals(container);

    expect(container.innerHTML).toContain('accept-rival');
    expect(container.innerHTML).toContain('row-id-pending-001');
    expect(container.innerHTML).toContain('ACCEPT');
  });

  // ── TC7: refreshRivals delegates to renderRivals via #rivals-feed ─────────

  it('TC7: refreshRivals renders into #rivals-feed element when present', async () => {
    const feedEl = document.createElement('div');
    feedEl.id = 'rivals-feed';
    document.body.appendChild(feedEl);

    const rival = makeRival({ rival_display_name: 'Nemesis' });
    getMyRivalsMock.mockResolvedValue([rival]);

    await refreshRivals();

    expect(getMyRivalsMock).toHaveBeenCalledTimes(1);
    expect(feedEl.innerHTML).toContain('NEMESIS');

    document.body.removeChild(feedEl);
  });

  // ── TC8: refreshRivals exits silently when #rivals-feed is absent ─────────

  it('TC8: refreshRivals does nothing when #rivals-feed is not in DOM', async () => {
    // Ensure element is not present
    const existing = document.getElementById('rivals-feed');
    if (existing) document.body.removeChild(existing);

    await refreshRivals();

    expect(getMyRivalsMock).not.toHaveBeenCalled();
  });
});
