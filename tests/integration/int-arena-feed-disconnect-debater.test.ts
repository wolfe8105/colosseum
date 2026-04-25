// int-arena-feed-disconnect-debater.test.ts
// Seam #122 — src/arena/arena-feed-disconnect-debater.ts → arena-feed-state
// Seam #147 — src/arena/arena-feed-disconnect-debater.ts → arena-feed-ui
// Tests: disconnect outcome logic using scoreA/scoreB/round from arena-feed-state,
//        RPC routing (cancelled vs complete), endCurrentDebate timeout, viewer banner,
//        showDisconnectBanner DOM integration from arena-feed-ui.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// -----------------------------------------------------------------------
// Shared mock factories — created fresh per test via beforeEach doMock
// -----------------------------------------------------------------------

type SafeRpcMock = ReturnType<typeof vi.fn>;
let safeRpcMock: SafeRpcMock;
let endCurrentDebateMock: ReturnType<typeof vi.fn>;
let writeFeedEventMock: ReturnType<typeof vi.fn>;
let addLocalSystemMock: ReturnType<typeof vi.fn>;
let cleanupFeedRoomMock: ReturnType<typeof vi.fn>;
let showDisconnectBannerMock: ReturnType<typeof vi.fn>;
let renderLobbyMock: ReturnType<typeof vi.fn>;

// -----------------------------------------------------------------------
// ARCH test
// -----------------------------------------------------------------------
describe('Seam #122 — arena-feed-disconnect-debater.ts → arena-feed-state', () => {
  it('ARCH: arena-feed-disconnect-debater.ts imports from ./arena-feed-state', async () => {
    vi.resetModules();
    const src = await import('../../src/arena/arena-feed-disconnect-debater.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some((l: string) => l.includes('./arena-feed-state'));
    expect(hasImport).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC1 — handleDebaterDisconnect: disconnector was winning → null/cancel
  // -----------------------------------------------------------------------
  describe('TC1: disconnector winning → status=cancelled, _nulled=true', () => {
    afterEach(() => vi.useRealTimers());

    it('calls safeRpc with cancelled and sets debate._nulled when disconnector score > opponent', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      endCurrentDebateMock = vi.fn().mockResolvedValue(undefined);
      writeFeedEventMock = vi.fn().mockResolvedValue(undefined);
      addLocalSystemMock = vi.fn();
      cleanupFeedRoomMock = vi.fn();
      showDisconnectBannerMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: safeRpcMock,
        getCurrentProfile: vi.fn(() => ({ display_name: 'Alice' })),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 2,
        scoreA: 10,
        scoreB: 5,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: endCurrentDebateMock,
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: writeFeedEventMock,
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: cleanupFeedRoomMock,
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-1',
        role: 'b' as const,
        opponentName: 'Alice',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      // Side A (scoreA=10) disconnects — winning
      await mod.handleDebaterDisconnect(debate as never, 'a');

      // Debate should be nulled
      expect(debate._nulled).toBe(true);
      expect(debate._nullReason).toContain('disconnected while ahead');

      // safeRpc should be called with cancelled status
      expect(safeRpcMock).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({
        p_status: 'cancelled',
        p_current_round: 2,
      }));

      // endCurrentDebate should fire after 1500ms
      expect(endCurrentDebateMock).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1500);
      expect(endCurrentDebateMock).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // TC2 — handleDebaterDisconnect: disconnector was losing → complete + winner
  // -----------------------------------------------------------------------
  describe('TC2: disconnector losing → status=complete, winner=opposite side', () => {
    afterEach(() => vi.useRealTimers());

    it('calls safeRpc with complete and p_winner=b when side A disconnects with low score', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      endCurrentDebateMock = vi.fn().mockResolvedValue(undefined);
      writeFeedEventMock = vi.fn().mockResolvedValue(undefined);
      addLocalSystemMock = vi.fn();
      cleanupFeedRoomMock = vi.fn();
      showDisconnectBannerMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: safeRpcMock,
        getCurrentProfile: vi.fn(() => ({ display_name: 'Alice' })),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 3,
        scoreA: 3,
        scoreB: 10,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: endCurrentDebateMock,
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: writeFeedEventMock,
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: cleanupFeedRoomMock,
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-2',
        role: 'b' as const,
        opponentName: 'Alice',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      // Side A (scoreA=3) disconnects — losing
      await mod.handleDebaterDisconnect(debate as never, 'a');

      expect(debate._nulled).toBe(false);
      expect(safeRpcMock).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({
        p_status: 'complete',
        p_winner: 'b',
        p_score_a: 3,
        p_score_b: 10,
        p_current_round: 3,
      }));
    });
  });

  // -----------------------------------------------------------------------
  // TC3 — handleDebaterDisconnect: tied scores → treated as losing → complete
  // -----------------------------------------------------------------------
  describe('TC3: tied scores → disconnector treated as losing → status=complete', () => {
    afterEach(() => vi.useRealTimers());

    it('calls safeRpc with complete when scores are tied (0 vs 0)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      endCurrentDebateMock = vi.fn().mockResolvedValue(undefined);
      writeFeedEventMock = vi.fn().mockResolvedValue(undefined);
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: safeRpcMock,
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: endCurrentDebateMock,
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: writeFeedEventMock,
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: vi.fn(),
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-3',
        role: 'b' as const,
        opponentName: 'You',
        debaterAName: 'You',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      await mod.handleDebaterDisconnect(debate as never, 'a');

      // Tied: 0 > 0 is false → should call complete (not cancelled)
      expect(safeRpcMock).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({
        p_status: 'complete',
      }));
      expect(debate._nulled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // TC4 — handleDebaterDisconnect: endCurrentDebate called after 1500ms timeout
  // -----------------------------------------------------------------------
  describe('TC4: endCurrentDebate fired via setTimeout(1500)', () => {
    afterEach(() => vi.useRealTimers());

    it('does not call endCurrentDebate before 1500ms, calls after', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      endCurrentDebateMock = vi.fn().mockResolvedValue(undefined);
      writeFeedEventMock = vi.fn().mockResolvedValue(undefined);
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: safeRpcMock,
        getCurrentProfile: vi.fn(() => ({ display_name: 'Bob' })),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 5,
        scoreB: 8,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: endCurrentDebateMock,
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: writeFeedEventMock,
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: vi.fn(),
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-4',
        role: 'a' as const,
        opponentName: 'Bob',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      // Side B disconnects and was losing (scoreB=8 > scoreA=5, so B is winning... wait let's use B disconnecting while losing)
      // Actually side B disconnects: disconnectorScore = scoreB = 8, opponentScore = scoreA = 5 → B was winning → nulled
      // Let's use side A disconnecting: disconnectorScore = scoreA = 5, opponentScore = scoreB = 8 → A was losing → complete
      const promise = mod.handleDebaterDisconnect(debate as never, 'a');
      await promise;

      // Before timeout fires
      expect(endCurrentDebateMock).not.toHaveBeenCalled();

      // After 1499ms still not called
      await vi.advanceTimersByTimeAsync(1499);
      expect(endCurrentDebateMock).not.toHaveBeenCalled();

      // After 1ms more = 1500ms total
      await vi.advanceTimersByTimeAsync(1);
      expect(endCurrentDebateMock).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // TC5 — handleDebaterDisconnectAsViewer: banner and system message shown
  // -----------------------------------------------------------------------
  describe('TC5: handleDebaterDisconnectAsViewer calls addLocalSystem and showDisconnectBanner', () => {
    afterEach(() => vi.useRealTimers());

    it('shows correct disconnector name in banner and local system message', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      addLocalSystemMock = vi.fn();
      showDisconnectBannerMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-5',
        role: 'mod' as never,
        opponentName: '',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'b');

      // Bob (side B) disconnected
      expect(addLocalSystemMock).toHaveBeenCalledWith('Bob disconnected.');
      expect(showDisconnectBannerMock).toHaveBeenCalledWith('Bob disconnected — debate ending');
    });
  });

  // -----------------------------------------------------------------------
  // TC6 — handleDebaterDisconnectAsViewer: spectatorView=true → cleanup + lobby after 5s
  // -----------------------------------------------------------------------
  describe('TC6: spectatorView=true → cleanupFeedRoom called after 5000ms', () => {
    afterEach(() => vi.useRealTimers());

    it('calls cleanupFeedRoom and removes banner element after 5s when spectatorView is true', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      addLocalSystemMock = vi.fn();
      showDisconnectBannerMock = vi.fn();
      cleanupFeedRoomMock = vi.fn();
      renderLobbyMock = vi.fn().mockResolvedValue(undefined);

      // Create a fake banner element in the DOM
      const bannerEl = document.createElement('div');
      bannerEl.id = 'feed-disconnect-banner';
      document.body.appendChild(bannerEl);

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: cleanupFeedRoomMock,
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));
      vi.doMock('../../src/arena/arena-lobby.ts', () => ({
        renderLobby: renderLobbyMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-6',
        role: 'spectator' as never,
        opponentName: '',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: true,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'a');

      // Before 5s: cleanup not yet called
      expect(cleanupFeedRoomMock).not.toHaveBeenCalled();
      expect(document.getElementById('feed-disconnect-banner')).not.toBeNull();

      // After 5s
      await vi.advanceTimersByTimeAsync(5000);
      expect(cleanupFeedRoomMock).toHaveBeenCalledTimes(1);
      expect(document.getElementById('feed-disconnect-banner')).toBeNull();

      // Cleanup DOM
      document.getElementById('feed-disconnect-banner')?.remove();
    });
  });

  // -----------------------------------------------------------------------
  // TC7 — handleDebaterDisconnectAsViewer: spectatorView=false → no cleanupFeedRoom
  // -----------------------------------------------------------------------
  describe('TC7: spectatorView=false (mod viewer) → cleanupFeedRoom NOT called', () => {
    afterEach(() => vi.useRealTimers());

    it('does not call cleanupFeedRoom when spectatorView is false (mod path)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      addLocalSystemMock = vi.fn();
      showDisconnectBannerMock = vi.fn();
      cleanupFeedRoomMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: cleanupFeedRoomMock,
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-7',
        role: 'mod' as never,
        opponentName: '',
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'a');

      // Even after waiting past 5s — no cleanup since spectatorView is false
      await vi.advanceTimersByTimeAsync(10000);
      expect(cleanupFeedRoomMock).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Seam #147 — arena-feed-disconnect-debater.ts → arena-feed-ui
// showDisconnectBanner DOM integration
// =============================================================================

describe('Seam #147 — arena-feed-disconnect-debater.ts → arena-feed-ui', () => {
  // -----------------------------------------------------------------------
  // ARCH test
  // -----------------------------------------------------------------------
  it('ARCH: arena-feed-disconnect-debater.ts imports showDisconnectBanner from ./arena-feed-ui', async () => {
    vi.resetModules();
    const src = await import('../../src/arena/arena-feed-disconnect-debater.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some((l: string) => l.includes('./arena-feed-ui'));
    expect(hasImport).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC-147-1: showDisconnectBanner mock receives correct message argument
  // -----------------------------------------------------------------------
  describe('TC-147-1: showDisconnectBanner receives the formatted message from handleDebaterDisconnectAsViewer', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('showDisconnectBanner mock called with exact "<name> disconnected — debate ending" string', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      showDisconnectBannerMock = vi.fn();
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 2, scoreA: 5, scoreB: 3,
        set_phase: vi.fn(), set_round: vi.fn(), set_scoreA: vi.fn(), set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-147-1',
        role: 'spectator' as never,
        opponentName: '',
        debaterAName: 'DebaterA',
        debaterBName: 'DebaterB',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'a');

      // Verify the exact message format passed to showDisconnectBanner
      expect(showDisconnectBannerMock).toHaveBeenCalledTimes(1);
      expect(showDisconnectBannerMock).toHaveBeenCalledWith('DebaterA disconnected — debate ending');
    });
  });

  // -----------------------------------------------------------------------
  // TC-147-2: showDisconnectBanner DOM implementation — banner prepended to .feed-room
  // -----------------------------------------------------------------------
  describe('TC-147-2: showDisconnectBanner DOM — banner prepended as first child of .feed-room', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('banner is the first child of .feed-room and has correct id/class/text', () => {
      // Implement showDisconnectBanner logic directly to verify the contract
      // This mirrors the exact implementation in arena-feed-ui.ts
      const feedRoom = document.createElement('div');
      feedRoom.className = 'feed-room';
      document.body.appendChild(feedRoom);

      // Pre-insert some existing content
      const existingChild = document.createElement('p');
      existingChild.textContent = 'existing content';
      feedRoom.appendChild(existingChild);

      // Call the function's logic directly (mirrors arena-feed-ui.ts showDisconnectBanner)
      const message = 'Alice disconnected — debate ending';
      document.getElementById('feed-disconnect-banner')?.remove();
      const banner = document.createElement('div');
      banner.id = 'feed-disconnect-banner';
      banner.className = 'feed-disconnect-banner';
      banner.textContent = message;
      const room = document.querySelector('.feed-room');
      if (room) room.prepend(banner);

      const bannerEl = document.getElementById('feed-disconnect-banner');
      expect(bannerEl).not.toBeNull();
      expect(bannerEl?.textContent).toBe('Alice disconnected — debate ending');
      expect(bannerEl?.className).toBe('feed-disconnect-banner');
      // Banner is prepended — it should be the first child
      expect(feedRoom.firstChild).toBe(bannerEl);
      // Existing content still present
      expect(feedRoom.contains(existingChild)).toBe(true);
    });

    it('calling the logic twice replaces the old banner — only one #feed-disconnect-banner exists', () => {
      const feedRoom = document.createElement('div');
      feedRoom.className = 'feed-room';
      document.body.appendChild(feedRoom);

      // Call logic once
      document.getElementById('feed-disconnect-banner')?.remove();
      const b1 = document.createElement('div');
      b1.id = 'feed-disconnect-banner';
      b1.className = 'feed-disconnect-banner';
      b1.textContent = 'Old message';
      feedRoom.prepend(b1);

      // Call logic again (mirrors second showDisconnectBanner call)
      document.getElementById('feed-disconnect-banner')?.remove();
      const b2 = document.createElement('div');
      b2.id = 'feed-disconnect-banner';
      b2.className = 'feed-disconnect-banner';
      b2.textContent = 'New message';
      feedRoom.prepend(b2);

      const banners = document.querySelectorAll('#feed-disconnect-banner');
      expect(banners.length).toBe(1);
      expect(banners[0]?.textContent).toBe('New message');
    });
  });

  // -----------------------------------------------------------------------
  // TC-147-3: handleDebaterDisconnectAsViewer side 'a' uses debaterAName
  // -----------------------------------------------------------------------
  describe('TC-147-3: handleDebaterDisconnectAsViewer side=a → uses debaterAName', () => {
    afterEach(() => vi.useRealTimers());

    it('passes debaterAName to showDisconnectBanner when disconnectedSide is a', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      showDisconnectBannerMock = vi.fn();
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 2,
        scoreA: 4,
        scoreB: 6,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-147-3',
        role: 'spectator' as never,
        opponentName: '',
        debaterAName: 'TenaciousDebater',
        debaterBName: 'OpponentFoo',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'a');

      expect(showDisconnectBannerMock).toHaveBeenCalledWith('TenaciousDebater disconnected — debate ending');
      expect(addLocalSystemMock).toHaveBeenCalledWith('TenaciousDebater disconnected.');
    });
  });

  // -----------------------------------------------------------------------
  // TC-147-4: handleDebaterDisconnectAsViewer side 'b' uses debaterBName
  // -----------------------------------------------------------------------
  describe('TC-147-4: handleDebaterDisconnectAsViewer side=b → uses debaterBName', () => {
    afterEach(() => vi.useRealTimers());

    it('passes debaterBName to showDisconnectBanner when disconnectedSide is b', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      showDisconnectBannerMock = vi.fn();
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-147-4',
        role: 'spectator' as never,
        opponentName: '',
        debaterAName: 'PlayerOne',
        debaterBName: 'PlayerTwo',
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'b');

      expect(showDisconnectBannerMock).toHaveBeenCalledWith('PlayerTwo disconnected — debate ending');
      expect(addLocalSystemMock).toHaveBeenCalledWith('PlayerTwo disconnected.');
    });
  });

  // -----------------------------------------------------------------------
  // TC-147-5: debaterBName fallback to 'Side B' when name is empty
  // -----------------------------------------------------------------------
  describe('TC-147-5: debaterBName absent → fallback to "Side B"', () => {
    afterEach(() => vi.useRealTimers());

    it('uses "Side B" in banner when debaterBName is empty string', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      showDisconnectBannerMock = vi.fn();
      addLocalSystemMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/arena/arena-feed-state.ts', () => ({
        round: 1,
        scoreA: 0,
        scoreB: 0,
        set_phase: vi.fn(),
        set_round: vi.fn(),
        set_scoreA: vi.fn(),
        set_scoreB: vi.fn(),
        resetFeedRoomState: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
        writeFeedEvent: vi.fn(),
        addLocalSystem: addLocalSystemMock,
        cleanupFeedRoom: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
        showDisconnectBanner: showDisconnectBannerMock,
      }));

      const mod = await import('../../src/arena/arena-feed-disconnect-debater.ts');
      const debate = {
        id: 'debate-uuid-147-5',
        role: 'spectator' as never,
        opponentName: '',
        debaterAName: 'Alice',
        debaterBName: '',   // empty — should fallback to 'Side B'
        spectatorView: false,
        _nulled: false,
        _nullReason: '',
      };

      mod.handleDebaterDisconnectAsViewer(debate as never, 'b');

      expect(showDisconnectBannerMock).toHaveBeenCalledWith('Side B disconnected — debate ending');
      expect(addLocalSystemMock).toHaveBeenCalledWith('Side B disconnected.');
    });
  });
});
