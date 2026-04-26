/**
 * Integration tests — src/profile-debate-archive.filter.ts → profile-debate-archive.state
 * SEAM: #415
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

// ── Describe block ────────────────────────────────────────────────────────────
describe('SEAM #415 | profile-debate-archive.filter.ts → profile-debate-archive.state', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC 1: ARCH filter ──────────────────────────────────────────────────────
  it('TC1: profile-debate-archive.filter.ts imports entries/filterCat/filterResult/filterSearch from state', () => {
    const filePath = path.resolve('src/profile-debate-archive.filter.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.find(l => l.includes('profile-debate-archive.state'));
    expect(stateImport).toBeTruthy();
    expect(stateImport).toContain('entries');
    expect(stateImport).toContain('filterCat');
    expect(stateImport).toContain('filterResult');
    expect(stateImport).toContain('filterSearch');
  });

  // ── TC 2: filtered() returns all entries when filters are at defaults ───────
  it('TC2: filtered() returns all entries when filterCat=all, filterResult=all, filterSearch empty', async () => {
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    const e1 = makeEntry({ debate_id: 'a', category: 'tech', is_win: true });
    const e2 = makeEntry({ debate_id: 'b', category: 'sports', is_win: false });
    stateMod.setEntries([e1, e2] as never[]);
    // defaults: filterCat='all', filterResult='all', filterSearch=''

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result).toHaveLength(2);
  });

  // ── TC 3: filtered() filters by category ──────────────────────────────────
  it('TC3: filtered() returns only entries matching filterCat when not "all"', async () => {
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    const e1 = makeEntry({ debate_id: 'a', category: 'tech' });
    const e2 = makeEntry({ debate_id: 'b', category: 'sports' });
    const e3 = makeEntry({ debate_id: 'c', category: 'tech' });
    stateMod.setEntries([e1, e2, e3] as never[]);
    stateMod.setFilterCat('tech');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result).toHaveLength(2);
    expect(result.every(e => e.category === 'tech')).toBe(true);
  });

  // ── TC 4: filtered() filters by result=win ────────────────────────────────
  it('TC4: filtered() with filterResult="win" returns only winning entries', async () => {
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    const winner = makeEntry({ debate_id: 'w1', is_win: true });
    const loser  = makeEntry({ debate_id: 'l1', is_win: false });
    stateMod.setEntries([winner, loser] as never[]);
    stateMod.setFilterResult('win');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('w1');
  });

  // ── TC 5: filtered() filters by result=loss ───────────────────────────────
  it('TC5: filtered() with filterResult="loss" returns only losing entries', async () => {
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    const winner = makeEntry({ debate_id: 'w1', is_win: true });
    const loser  = makeEntry({ debate_id: 'l1', is_win: false });
    stateMod.setEntries([winner, loser] as never[]);
    stateMod.setFilterResult('loss');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('l1');
  });

  // ── TC 6: filtered() filters by search term (topic) ───────────────────────
  it('TC6: filtered() with filterSearch matches on topic text (case-insensitive)', async () => {
    const stateMod = await import('../../src/profile-debate-archive.state.ts');
    const e1 = makeEntry({ debate_id: 'a', topic: 'AI will take all jobs' });
    const e2 = makeEntry({ debate_id: 'b', topic: 'Climate change debate' });
    stateMod.setEntries([e1, e2] as never[]);
    stateMod.setFilterSearch('climate');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('b');
  });

  // ── TC 7: archiveUrl() routes ai mode to auto-debate, others to spectate ───
  it('TC7: archiveUrl returns auto-debate URL for debate_mode="ai" and spectate for others', async () => {
    const { archiveUrl } = await import('../../src/profile-debate-archive.filter.ts');

    const aiEntry  = makeEntry({ debate_id: 'ai-debate-1', debate_mode: 'ai' });
    const liveEntry = makeEntry({ debate_id: 'live-debate-1', debate_mode: 'live_audio' });

    expect(archiveUrl(aiEntry as never)).toContain('/moderator-auto-debate.html');
    expect(archiveUrl(aiEntry as never)).toContain('ai-debate-1');
    expect(archiveUrl(liveEntry as never)).toContain('/moderator-spectate.html');
    expect(archiveUrl(liveEntry as never)).toContain('live-debate-1');
  });
});
