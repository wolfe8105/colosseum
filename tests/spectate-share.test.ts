import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { wireShareButtons } from '../src/pages/spectate.share.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildDebate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'debate-1',
    topic: 'Climate Change',
    spectator_count: 5,
    status: 'live',
    mode: 'live_audio',
    category: 'politics',
    ...overrides,
  } as never;
}

function mountButtons() {
  document.body.innerHTML = `
    <button id="share-copy">📋 Copy Link</button>
    <button id="share-x">X</button>
    <button id="share-wa">WhatsApp</button>
    <button id="share-native">Share</button>`;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ── wireShareButtons ───────────────────────────────────────────

describe('TC1 — wireShareButtons copy button calls clipboard.writeText', () => {
  it('navigator.clipboard.writeText called with current URL on copy click', async () => {
    mountButtons();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    wireShareButtons(buildDebate());
    (document.getElementById('share-copy') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});

describe('TC2 — wireShareButtons copy button shows "Copied!" text on success', () => {
  it('button textContent changes to "✓ Copied!" after successful copy', async () => {
    mountButtons();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    vi.useFakeTimers();

    wireShareButtons(buildDebate());
    (document.getElementById('share-copy') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.getElementById('share-copy')!.textContent).toBe('✓ Copied!');
    });
    vi.useRealTimers();
  });
});

describe('TC3 — wireShareButtons X button opens window with encoded URL', () => {
  it('window.open called with x.com/intent/tweet URL', () => {
    mountButtons();
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    wireShareButtons(buildDebate({ topic: 'Climate Change' }));
    (document.getElementById('share-x') as HTMLButtonElement).click();

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('x.com/intent/tweet'),
      '_blank'
    );
  });
});

describe('TC4 — wireShareButtons WhatsApp button opens wa.me URL', () => {
  it('window.open called with wa.me URL', () => {
    mountButtons();
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    wireShareButtons(buildDebate());
    (document.getElementById('share-wa') as HTMLButtonElement).click();

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('wa.me'),
      '_blank'
    );
  });
});

describe('TC5 — wireShareButtons native share uses navigator.share when available', () => {
  it('navigator.share called when available', async () => {
    mountButtons();
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    wireShareButtons(buildDebate({ topic: 'Test Topic' }));
    (document.getElementById('share-native') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockShare).toHaveBeenCalled());
  });
});

describe('TC6 — wireShareButtons social proof text includes spectator count', () => {
  it('X share URL contains spectator count when > 1', () => {
    mountButtons();
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    wireShareButtons(buildDebate({ spectator_count: 10 }));
    (document.getElementById('share-x') as HTMLButtonElement).click();

    const url = mockOpen.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('10 watching');
  });
});

describe('TC7 — wireShareButtons no spectator proof when count is 1', () => {
  it('X share URL has no spectator count text when spectator_count <= 1', () => {
    mountButtons();
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    wireShareButtons(buildDebate({ spectator_count: 1 }));
    (document.getElementById('share-x') as HTMLButtonElement).click();

    const url = mockOpen.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).not.toContain('watching');
  });
});

describe('TC8 — wireShareButtons is a no-op when share buttons not in DOM', () => {
  it('does not throw when share button elements are absent', () => {
    expect(() => wireShareButtons(buildDebate())).not.toThrow();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — spectate.share.ts only imports from allowed modules', () => {
  it('has no non-type imports', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.share.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import ') && !line.includes('import type'));
    expect(importLines).toHaveLength(0);
  });
});
