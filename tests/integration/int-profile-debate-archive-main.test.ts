/**
 * Integration tests — src/profile-debate-archive.ts → profile-debate-archive.state
 * SEAM: #414
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const rpcMock = vi.fn();
  const supabase = {
    rpc: rpcMock,
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    createClient: vi.fn(() => supabase),
    __supabase: supabase,
    __rpcMock: rpcMock,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    entry_id: 'entry-uuid-1',
    debate_id: 'debate-uuid-1',
    custom_name: null,
    custom_desc: null,
    hide_from_public: false,
    entry_created_at: '2026-01-01T00:00:00Z',
    topic: 'AI will take all jobs',
    category: 'tech',
    debate_created_at: '2026-01-01T00:00:00Z',
    opponent_id: 'opp-uuid',
    opponent_name: 'Opponent',
    opponent_username: 'opponent',
    my_side: 'pro',
    winner: 'pro',
    my_score: 80,
    opp_score: 60,
    is_win: true,
    debate_mode: 'live_audio',
    ...overrides,
  };
}

async function getRpcMock() {
  const mod = await import('@supabase/supabase-js');
  return (mod as unknown as { __rpcMock: ReturnType<typeof vi.fn> }).__rpcMock;
}

// ── Describe block ────────────────────────────────────────────────────────────
describe('SEAM #414 | profile-debate-archive.ts → profile-debate-archive.state', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC 1: ARCH filter ─────────────────────────────────────────────────────
  it('TC1: profile-debate-archive.ts imports setEntries, setIsOwner, resetFilters from state', () => {
    const filePath = path.resolve('src/profile-debate-archive.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.find(l => l.includes('profile-debate-archive.state'));
    expect(stateImport).toBeTruthy();
    expect(stateImport).toContain('setEntries');
    expect(stateImport).toContain('setIsOwner');
    expect(stateImport).toContain('resetFilters');
  });

  // ── TC 2: loadPublicDebateArchive resets state before fetching ─────────────
  it('TC2: loadPublicDebateArchive calls resetFilters — state.entries is empty at start of call', async () => {
    const rpcMock = await getRpcMock();
    // Intercept the RPC so we can inspect state mid-flight
    let stateEntriesAtCallTime: unknown[] | undefined;
    rpcMock.mockImplementationOnce(async () => {
      const stateMod = await import('../../src/profile-debate-archive.state.ts');
      stateEntriesAtCallTime = stateMod.entries;
      return { data: [], error: null };
    });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-1');

    // resetFilters() should have cleared entries before the RPC was called
    expect(stateEntriesAtCallTime).toEqual([]);
  });

  // ── TC 3: loadPublicDebateArchive success — setEntries populates state ──────
  it('TC3: loadPublicDebateArchive on success sets state.entries to returned data', async () => {
    const rpcMock = await getRpcMock();
    const debateEntries = [makeEntry({ debate_id: 'debate-state-1' }), makeEntry({ debate_id: 'debate-state-2' })];
    rpcMock.mockResolvedValueOnce({ data: debateEntries, error: null });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-1');

    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    expect(stateMod.entries).toHaveLength(2);
    expect(stateMod.entries[0].debate_id).toBe('debate-state-1');
    expect(stateMod.entries[1].debate_id).toBe('debate-state-2');
  });

  // ── TC 4: loadPublicDebateArchive error — entries stay empty ────────────────
  it('TC4: loadPublicDebateArchive on RPC error leaves state.entries empty', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'forbidden' } });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-bad');

    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    expect(stateMod.entries).toEqual([]);
    expect(container.innerHTML).toContain('Archive unavailable');
  });

  // ── TC 5: loadDebateArchive(owner=true) sets isOwner=true in state ─────────
  it('TC5: loadDebateArchive with isOwner=true sets state.isOwner to true', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    const { loadDebateArchive } = await import('../../src/profile-debate-archive.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadDebateArchive(container, true);

    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    expect(stateMod.isOwner).toBe(true);
  });

  // ── TC 6: loadPublicDebateArchive always sets isOwner=false in state ────────
  it('TC6: loadPublicDebateArchive always sets state.isOwner to false', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    // Pre-seed state as owner
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    stateMod.setIsOwner(true);
    expect(stateMod.isOwner).toBe(true);

    vi.resetModules();

    const rpcMock2 = await getRpcMock();
    rpcMock2.mockResolvedValueOnce({ data: [], error: null });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-1');

    const stateMod2 = await import('../../src/profile-debate-archive.state.ts');
    expect(stateMod2.isOwner).toBe(false);
  });
});
