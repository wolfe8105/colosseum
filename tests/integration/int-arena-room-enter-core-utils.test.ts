// int-arena-room-enter-core-utils.test.ts
// Seam #062 | src/arena/arena-room-enter.ts → arena-core.utils
// 7 TCs

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}));

describe('Seam #062 | arena-room-enter → arena-core.utils', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  // TC1 — ARCH: static import of arena-core.utils present in arena-room-enter.ts
  it('TC1 ARCH: arena-room-enter.ts has static import from arena-core.utils', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(
      process.cwd(),
      'src/arena/arena-room-enter.ts'
    );
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasUtil = importLines.some(l => l.includes('arena-core.utils'));
    expect(hasUtil).toBe(true);
  });

  // TC2 — isPlaceholder returns false when client exists and flag is false
  it('TC2: isPlaceholder() returns false when supabase client exists and isAnyPlaceholder is false', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(false);
  });

  // TC3 — isPlaceholder returns true when getSupabaseClient returns null
  it('TC3: isPlaceholder() returns true when getSupabaseClient() returns null', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => null),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // TC4 — isPlaceholder returns true when isAnyPlaceholder flag is true
  it('TC4: isPlaceholder() returns true when isAnyPlaceholder flag is true', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: true,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // TC5 — formatTimer formats seconds under 10 with leading zero
  it('TC5: formatTimer(5) returns "0:05"', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => null),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const { formatTimer } = await import('../../src/arena/arena-core.utils.ts');
    expect(formatTimer(5)).toBe('0:05');
  });

  // TC6 — formatTimer formats minutes and seconds correctly
  it('TC6: formatTimer(90) returns "1:30"', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => null),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const { formatTimer } = await import('../../src/arena/arena-core.utils.ts');
    expect(formatTimer(90)).toBe('1:30');
  });

  // TC7 — enterRoom calls isPlaceholder to gate the safeRpc call for live debates
  it('TC7: enterRoom only calls safeRpc for live mode when isPlaceholder() is false and id has no placeholder prefix', async () => {
    const mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSetView = vi.fn();
    const mockNudge = vi.fn();
    const mockEnterFeedRoom = vi.fn();
    const mockRenderRoom = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: mockSafeRpc,
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: mockSetView,
    }));
    vi.doMock('../../src/nudge.ts', () => ({
      nudge: mockNudge,
    }));
    vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
      enterFeedRoom: mockEnterFeedRoom,
    }));
    vi.doMock('../../src/arena/arena-room-render.ts', () => ({
      renderRoom: mockRenderRoom,
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      stopIntroMusic: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance.ts', () => ({
      playEntranceSequence: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-types.ts', () => ({}));

    const { enterRoom } = await import('../../src/arena/arena-room-enter.ts');

    const debate = { id: 'real-debate-id-abc', mode: 'live' } as any;
    enterRoom(debate);

    await vi.advanceTimersByTimeAsync(0);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'update_arena_debate',
      expect.objectContaining({ p_debate_id: 'real-debate-id-abc', p_status: 'live' })
    );
  });
});
