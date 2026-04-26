/**
 * Integration tests for src/notifications.deeplink.ts → navigation
 * SEAM #315
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (only required mock per MANDATORY rules) ──────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeNotification(type: string, data?: Record<string, unknown>) {
  return {
    id: 'test-notif-id',
    type,
    title: 'Test',
    body: 'Test body',
    read: false,
    data,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('SEAM #315 — notifications.deeplink → navigation', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    document.body.innerHTML = '';

    // jsdom does not implement CSS.escape — polyfill it
    if (typeof CSS === 'undefined' || !CSS.escape) {
      (globalThis as any).CSS = {
        escape: (value: string) =>
          value.replace(/([^\w-])/g, '\\$1'),
      };
    }
  });

  // ── ARCH: import lines check ───────────────────────────────────────────────
  it('TC1 ARCH: only imports from navigation (not barrel webrtc/deepgram etc)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/notifications.deeplink.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const staticImports = importLines.filter(l => !l.trimStart().startsWith('//'));

    // Must import navigateTo from navigation
    expect(staticImports.some(l => l.includes('navigation'))).toBe(true);

    // Must NOT import any wall modules
    const wallModules = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts',
      'deepgram', 'realtime-client', 'voicememo',
      'arena-css', 'arena-room-live-audio', 'arena-sounds',
      'arena-sounds-core', 'peermetrics',
    ];
    for (const mod of wallModules) {
      const hasWall = staticImports.some(l => l.includes(mod));
      expect(hasWall, `Should not import wall module: ${mod}`).toBe(false);
    }
  });

  // ── TC2: mod_invite navigates to arena ────────────────────────────────────
  it('TC2: mod_invite → navigateTo("arena") is called', async () => {
    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate, navigateTo } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('mod_invite') as any);

    expect(navSpy).toHaveBeenCalledWith('arena');
    expect(navSpy).toHaveBeenCalledTimes(1);
  });

  // ── TC3: mod_accepted navigates to arena ──────────────────────────────────
  it('TC3: mod_accepted → navigateTo("arena"), then scrolls to debate card', async () => {
    const debateId = 'debate-abc-123';

    // Set up DOM card
    const card = document.createElement('div');
    card.setAttribute('data-debate-id', debateId);
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);

    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('mod_accepted', { debate_id: debateId }) as any);

    expect(navSpy).toHaveBeenCalledWith('arena');

    // Advance past the 400ms timeout
    await vi.advanceTimersByTimeAsync(500);

    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  // ── TC4: mod_declined navigates to arena ──────────────────────────────────
  it('TC4: mod_declined → navigateTo("arena"), then scrolls to debate card', async () => {
    const debateId = 'debate-xyz-456';

    const card = document.createElement('div');
    card.setAttribute('data-debate-id', debateId);
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);

    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('mod_declined', { debate_id: debateId }) as any);

    expect(navSpy).toHaveBeenCalledWith('arena');

    await vi.advanceTimersByTimeAsync(500);

    expect(card.scrollIntoView).toHaveBeenCalled();
  });

  // ── TC5: challenge → navigateTo("arena") + scroll to section ──────────────
  it('TC5: challenge → navigateTo("arena"), then scrolls to pending challenges section', async () => {
    const section = document.createElement('div');
    section.id = 'arena-pending-challenges-section';
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('challenge') as any);

    expect(navSpy).toHaveBeenCalledWith('arena');

    await vi.advanceTimersByTimeAsync(400);

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  // ── TC6: challenged → same as challenge ───────────────────────────────────
  it('TC6: challenged → navigateTo("arena"), then scrolls to pending challenges section', async () => {
    const section = document.createElement('div');
    section.id = 'arena-pending-challenges-section';
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('challenged') as any);

    expect(navSpy).toHaveBeenCalledWith('arena');

    await vi.advanceTimersByTimeAsync(400);

    expect(section.scrollIntoView).toHaveBeenCalled();
  });

  // ── TC7: debate_start → navigateTo("arena") ───────────────────────────────
  it('TC7: debate_start → navigateTo("arena")', async () => {
    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('debate_start') as any);

    expect(navSpy).toHaveBeenCalledWith('arena');
    expect(navSpy).toHaveBeenCalledTimes(1);
  });

  // ── TC8: result → navigateTo("arena") ─────────────────────────────────────
  it('TC8: result → navigateTo("arena")', async () => {
    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('result') as any);

    expect(navSpy).toHaveBeenCalledWith('arena');
    expect(navSpy).toHaveBeenCalledTimes(1);
  });

  // ── TC9: follow with no follower_id → no navigateTo call ──────────────────
  it('TC9: follow (no followerId) → no navigateTo call', async () => {
    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('follow') as any);

    expect(navSpy).not.toHaveBeenCalled();
  });

  // ── TC10: default/unknown type → no navigateTo call ───────────────────────
  it('TC10: unknown type → no navigateTo call', async () => {
    const { handleDeepLink } = await import('../../src/notifications.deeplink.ts');
    const { registerNavigate } = await import('../../src/navigation.ts');

    const navSpy = vi.fn();
    registerNavigate(navSpy);

    handleDeepLink(makeNotification('reaction') as any);

    expect(navSpy).not.toHaveBeenCalled();
  });
});
