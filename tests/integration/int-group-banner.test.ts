/**
 * Integration tests — Seam #563
 * src/pages/group-banner.ts → group-banner-upload
 *
 * Covers:
 *   TC-1  ARCH filter — no wall modules in group-banner.ts
 *   TC-2  renderGroupBanner tier-1 fallback (no URL)
 *   TC-3  renderGroupBanner tier-2 static image
 *   TC-4  renderGroupBanner tier-3 animated video
 *   TC-5  Edit button only rendered for leader
 *   TC-6  Edit button click calls openBannerUploadSheet / appends gb-backdrop
 *   TC-7  _uploadBanner file-too-large guard — showToast error, no Supabase call
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Supabase mock (only @supabase/supabase-js) ────────────────────────────────

const mockUpload        = vi.fn();
const mockCreateSigned  = vi.fn();
const mockRpc           = vi.fn();
const mockFrom          = vi.fn();
const mockStorageFrom   = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: mockStorageFrom,
    },
    rpc: mockRpc,
  }),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

import type { GroupDetail } from '../../src/pages/groups.types.ts';

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: 'group-uuid-1',
    name: 'Test Group',
    avatar_emoji: '⚔️',
    banner_tier: 1,
    banner_static_url: null,
    banner_animated_url: null,
    gvg_wins: 10,
    gvg_losses: 5,
    ...overrides,
  } as unknown as GroupDetail;
}

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// ── TC-1: ARCH filter ─────────────────────────────────────────────────────────

describe('Seam #563 – ARCH: group-banner.ts imports', () => {
  it('imports from group-banner-upload.ts and has no wall modules', async () => {
    const raw = await import('../../src/pages/group-banner.ts?raw');
    const source: string = (raw as unknown as { default: string }).default;
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));

    const wallTerms = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const term of wallTerms) {
        expect(line).not.toContain(term);
      }
    }

    const hasUploadImport = importLines.some(l => l.includes('group-banner-upload'));
    expect(hasUploadImport).toBe(true);
  });
});

// ── TC-2: Tier 1 fallback ─────────────────────────────────────────────────────

describe('Seam #563 – renderGroupBanner tier-1 fallback', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it('TC-2: renders tier-1 fallback div when no URLs', async () => {
    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');
    const group = makeGroup({ banner_tier: 1, banner_static_url: null, banner_animated_url: null });
    renderGroupBanner(container, group, false);

    const t1 = container.querySelector('.group-banner-t1');
    expect(t1).not.toBeNull();
    expect(container.querySelector('.group-banner-t2')).toBeNull();
    expect(container.querySelector('.group-banner-t3')).toBeNull();
  });
});

// ── TC-3: Tier 2 static image ─────────────────────────────────────────────────

describe('Seam #563 – renderGroupBanner tier-2 image', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it('TC-3: renders <img> with class group-banner-t2 when tier>=2 and staticUrl set', async () => {
    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');
    const group = makeGroup({ banner_tier: 2, banner_static_url: 'https://example.com/img.jpg' });
    renderGroupBanner(container, group, false);

    const img = container.querySelector<HTMLImageElement>('.group-banner-t2');
    expect(img).not.toBeNull();
    expect(img!.tagName).toBe('IMG');
    expect(img!.src).toContain('img.jpg');
    expect(container.querySelector('.group-banner-t1')).toBeNull();
  });
});

// ── TC-4: Tier 3 animated video ───────────────────────────────────────────────

describe('Seam #563 – renderGroupBanner tier-3 video', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it('TC-4: renders <video> with class group-banner-t3 when tier=3 and animatedUrl set', async () => {
    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');
    const group = makeGroup({ banner_tier: 3, banner_animated_url: 'https://example.com/vid.mp4' });
    renderGroupBanner(container, group, false);

    const vid = container.querySelector<HTMLVideoElement>('.group-banner-t3');
    expect(vid).not.toBeNull();
    expect(vid!.tagName).toBe('VIDEO');
    expect(vid!.src).toContain('vid.mp4');
    expect(vid!.loop).toBe(true);
    expect(vid!.muted).toBe(true);
  });
});

// ── TC-5 & TC-6: Edit button visibility + openBannerUploadSheet call ──────────

describe('Seam #563 – renderGroupBanner edit button', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    container = makeContainer();
    // remove any leftover backdrop
    document.getElementById('gb-backdrop')?.remove();
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
    document.getElementById('gb-backdrop')?.remove();
  });

  it('TC-5: no edit button when isLeader=false', async () => {
    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');
    const group = makeGroup();
    renderGroupBanner(container, group, false);
    expect(container.querySelector('.group-banner-edit-btn')).toBeNull();
  });

  it('TC-6: edit button present when isLeader=true; clicking opens gb-backdrop sheet', async () => {
    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');
    const group = makeGroup({ banner_tier: 2, gvg_wins: 10, gvg_losses: 5 });
    renderGroupBanner(container, group, true);

    const btn = container.querySelector<HTMLButtonElement>('.group-banner-edit-btn');
    expect(btn).not.toBeNull();

    btn!.click();

    const backdrop = document.getElementById('gb-backdrop');
    expect(backdrop).not.toBeNull();
    const sheet = backdrop!.querySelector('.gb-sheet');
    expect(sheet).not.toBeNull();
  });
});

// ── TC-7: _uploadBanner file-too-large guard ──────────────────────────────────

describe('Seam #563 – _uploadBanner file-too-large guard', () => {
  let toastCalls: Array<[string, string]>;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    toastCalls = [];
    mockStorageFrom.mockReset();
    mockRpc.mockReset();

    // Spy on showToast via config module — capture by monkey-patching globalThis
    // We intercept at the DOM level: showToast appends a .toast element, but in
    // JSDOM it silently does nothing. Instead we mock the config module.
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('gb-backdrop')?.remove();
  });

  it('TC-7: rejects file >10MB with showToast error, never calls Supabase storage', async () => {
    // We need to confirm showToast is called and Supabase storage.from is NOT called.
    // Use a spy on the config module's showToast export.
    const configMod = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configMod, 'showToast').mockImplementation((msg, kind) => {
      toastCalls.push([msg, kind as string]);
    });

    // Build a backdrop the same way openBannerUploadSheet does (tier 2 unlocked)
    const { openBannerUploadSheet } = await import('../../src/pages/group-banner-upload.ts');
    openBannerUploadSheet('group-uuid-1', 2, 10, 5);

    const backdrop = document.getElementById('gb-backdrop')!;
    expect(backdrop).not.toBeNull();

    // Simulate selecting a file > 10MB via the #gb-t2-input
    const input = backdrop.querySelector<HTMLInputElement>('#gb-t2-input')!;
    expect(input).not.toBeNull();

    const oversizedFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 });

    // Dispatch change event with the oversized file
    Object.defineProperty(input, 'files', { value: [oversizedFile], configurable: true });
    input.dispatchEvent(new Event('change'));

    // Wait for microtasks
    await Promise.resolve();
    await Promise.resolve();

    expect(toastCalls.length).toBeGreaterThan(0);
    expect(toastCalls[0][0]).toContain('10MB');
    expect(toastCalls[0][1]).toBe('error');

    // Supabase storage must NOT have been called
    expect(mockStorageFrom).not.toHaveBeenCalled();

    toastSpy.mockRestore();
  });
});
