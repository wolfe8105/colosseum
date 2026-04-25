/**
 * Tests for src/notifications.deeplink.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockNavigateTo = vi.hoisted(() => vi.fn());

vi.mock('../src/navigation.ts', () => ({
  navigateTo: mockNavigateTo,
}));

// Dynamic imports inside the source are fire-and-forget — we don't need to resolve them
vi.mock('../src/arena/arena-mod-queue-browse.ts', () => ({
  showModQueue: vi.fn(),
}));

vi.mock('../src/auth.profile.ts', () => ({
  showUserProfile: vi.fn(),
}));

import type { Notification } from '../src/notifications.types.ts';
import { handleDeepLink } from '../src/notifications.deeplink.ts';

function makeNotification(type: string, data: Record<string, unknown> = {}): Notification {
  return { id: 'n1', type, data, read: false, created_at: '', user_id: '' } as unknown as Notification;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('handleDeepLink — mod_invite navigates to arena', () => {
  it('TC1: calls navigateTo("arena") for mod_invite', () => {
    handleDeepLink(makeNotification('mod_invite'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — mod_accepted navigates to arena', () => {
  it('TC2: calls navigateTo("arena") for mod_accepted', () => {
    handleDeepLink(makeNotification('mod_accepted'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — mod_declined navigates to arena', () => {
  it('TC3: calls navigateTo("arena") for mod_declined', () => {
    handleDeepLink(makeNotification('mod_declined'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — challenge navigates to arena', () => {
  it('TC4: calls navigateTo("arena") for challenge', () => {
    handleDeepLink(makeNotification('challenge'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — challenged navigates to arena', () => {
  it('TC5: calls navigateTo("arena") for challenged', () => {
    handleDeepLink(makeNotification('challenged'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — debate_start navigates to arena', () => {
  it('TC6: calls navigateTo("arena") for debate_start', () => {
    handleDeepLink(makeNotification('debate_start'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — result navigates to arena', () => {
  it('TC7: calls navigateTo("arena") for result', () => {
    handleDeepLink(makeNotification('result'));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('handleDeepLink — follow does NOT navigate', () => {
  it('TC8: does not call navigateTo for follow type', () => {
    handleDeepLink(makeNotification('follow', { follower_id: 'abc' }));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});

describe('handleDeepLink — unknown type does not navigate', () => {
  it('TC9: does not call navigateTo for unknown type', () => {
    handleDeepLink(makeNotification('unknown_type'));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});

describe('handleDeepLink — mod_accepted with debateId scrolls card after timeout', () => {
  it('TC10: queries debate card after 400ms timeout', () => {
    // CSS.escape not available in jsdom — polyfill it
    if (!globalThis.CSS) (globalThis as any).CSS = {};
    if (!(globalThis as any).CSS.escape) {
      (globalThis as any).CSS.escape = (s: string) => s.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
    }
    const mockCard = { scrollIntoView: vi.fn(), style: { transition: '', boxShadow: '' } };
    const spy = vi.spyOn(document, 'querySelector').mockReturnValue(mockCard as unknown as Element);

    handleDeepLink(makeNotification('mod_accepted', { debate_id: 'debate-123' }));
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');

    vi.advanceTimersByTime(400);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('ARCH — src/notifications.deeplink.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./notifications.types.ts', './navigation.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/notifications.deeplink.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
