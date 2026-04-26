import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// ARCH FILTER — verify imports in source
// ============================================================
const src = readFileSync(resolve(__dirname, '../../src/share.ui.ts'), 'utf8');
const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));

// ============================================================
// MOCKS — only @supabase/supabase-js
// ============================================================
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// SETUP
// ============================================================
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '';
});

// ============================================================
// TC1: modal appends to body when FEATURES.shareLinks is true
// ============================================================
describe('TC1 — showPostDebatePrompt appends modal when FEATURES.shareLinks is true', () => {
  it('creates #post-debate-share modal in document.body', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'Is pineapple on pizza acceptable?' });

    const modal = document.getElementById('post-debate-share');
    expect(modal).not.toBeNull();
    expect(document.body.contains(modal)).toBe(true);
  });
});

// ============================================================
// TC2: modal is NOT created when FEATURES.shareLinks is false
// ============================================================
describe('TC2 — showPostDebatePrompt does nothing when FEATURES.shareLinks is false', () => {
  it('does not append modal when feature flag is off', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = false;

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'AI will replace all jobs' });

    const modal = document.getElementById('post-debate-share');
    expect(modal).toBeNull();
  });
});

// ============================================================
// TC3: skip button removes the modal
// ============================================================
describe('TC3 — skip button removes the modal', () => {
  it('clicking #post-debate-skip-btn removes #post-debate-share from DOM', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'Remote work is better' });

    const skipBtn = document.getElementById('post-debate-skip-btn') as HTMLButtonElement;
    expect(skipBtn).not.toBeNull();
    skipBtn.click();

    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

// ============================================================
// TC4: clicking the backdrop (modal container itself) dismisses
// ============================================================
describe('TC4 — clicking backdrop removes modal', () => {
  it('click on the outer modal element removes it', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'Tabs vs spaces' });

    const modal = document.getElementById('post-debate-share') as HTMLElement;
    expect(modal).not.toBeNull();

    // Simulate click on the backdrop (target is the modal itself)
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

// ============================================================
// TC5: share button calls shareResult with stored params and removes modal
// ============================================================
describe('TC5 — share button calls shareResult and removes modal', () => {
  it('clicking #post-debate-share-btn invokes shareResult and removes modal', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    // Mock navigator.share to be available and succeed
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    const shareMod = await import('../../src/share.ts');
    const shareResultSpy = vi.spyOn(shareMod, 'shareResult');

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    const params = { debateId: 'abc123', topic: 'Best OS ever', winner: 'Alice' };
    showPostDebatePrompt(params);

    const shareBtn = document.getElementById('post-debate-share-btn') as HTMLButtonElement;
    expect(shareBtn).not.toBeNull();
    shareBtn.click();

    expect(shareResultSpy).toHaveBeenCalledWith(params);
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

// ============================================================
// TC6: invite button calls inviteFriend and removes modal
// ============================================================
describe('TC6 — invite button calls inviteFriend and removes modal', () => {
  it('clicking #post-debate-invite-btn invokes inviteFriend and removes modal', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    const shareMod = await import('../../src/share.ts');
    const inviteFriendSpy = vi.spyOn(shareMod, 'inviteFriend').mockImplementation(() => {});

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'Pineapple belongs on pizza' });

    const inviteBtn = document.getElementById('post-debate-invite-btn') as HTMLButtonElement;
    expect(inviteBtn).not.toBeNull();
    inviteBtn.click();

    expect(inviteFriendSpy).toHaveBeenCalledOnce();
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

// ============================================================
// TC7: calling showPostDebatePrompt twice replaces old modal
// ============================================================
describe('TC7 — second call replaces existing modal', () => {
  it('calling showPostDebatePrompt twice results in exactly one #post-debate-share', async () => {
    const configMod = await import('../../src/config.ts');
    (configMod.FEATURES as Record<string, unknown>).shareLinks = true;

    const { showPostDebatePrompt } = await import('../../src/share.ui.ts');
    showPostDebatePrompt({ topic: 'First topic' });
    showPostDebatePrompt({ topic: 'Second topic' });

    const modals = document.querySelectorAll('#post-debate-share');
    expect(modals.length).toBe(1);
  });
});

// ============================================================
// ARCH: import lines reference expected modules
// ============================================================
describe('ARCH — share.ui.ts import structure', () => {
  it('imports shareResult and inviteFriend from share.ts', () => {
    expect(importLines.some(l => l.includes('./share.ts') && l.includes('shareResult'))).toBe(true);
    expect(importLines.some(l => l.includes('./share.ts') && l.includes('inviteFriend'))).toBe(true);
  });

  it('imports FEATURES from config.ts', () => {
    expect(importLines.some(l => l.includes('./config.ts') && l.includes('FEATURES'))).toBe(true);
  });

  it('does not import from banned modules', () => {
    const banned = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const b of banned) {
      expect(importLines.some(l => l.includes(b))).toBe(false);
    }
  });
});
