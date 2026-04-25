/**
 * Tests for src/push-notifications.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

// We need to reset module state between tests for _initialized
// Use vi.resetModules() approach with dynamic imports

beforeEach(() => {
  vi.clearAllMocks();
  // Reset window.OneSignal and related
  delete (window as any).OneSignal;
  delete (window as any).OneSignalDeferred;
  // Mock navigator.serviceWorker and PushManager
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {},
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'PushManager', {
    value: function PushManager() {},
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.resetModules();
});

describe('hasPushPermission — returns false when OneSignal not present', () => {
  it('TC1: returns false when window.OneSignal is undefined', async () => {
    const { hasPushPermission } = await import('../src/push-notifications.ts');
    expect(hasPushPermission()).toBe(false);
  });
});

describe('hasPushPermission — returns permission from OneSignal', () => {
  it('TC2: returns true when OneSignal.Notifications.permission is true', async () => {
    (window as any).OneSignal = { Notifications: { permission: true } };
    const { hasPushPermission } = await import('../src/push-notifications.ts');
    expect(hasPushPermission()).toBe(true);
  });

  it('TC3: returns false when OneSignal.Notifications.permission is false', async () => {
    (window as any).OneSignal = { Notifications: { permission: false } };
    const { hasPushPermission } = await import('../src/push-notifications.ts');
    expect(hasPushPermission()).toBe(false);
  });
});

describe('requestPushPermission — returns false when OneSignal not present', () => {
  it('TC4: returns false when ONESIGNAL_APP_ID is empty', async () => {
    const { requestPushPermission } = await import('../src/push-notifications.ts');
    const result = await requestPushPermission();
    expect(result).toBe(false);
  });
});

describe('requestPushPermission — returns false when window.OneSignal missing', () => {
  it('TC5: returns false when window.OneSignal is not defined', async () => {
    const { requestPushPermission } = await import('../src/push-notifications.ts');
    const result = await requestPushPermission();
    expect(result).toBe(false);
  });
});

describe('disablePushNotifications — no-ops when OneSignal not present', () => {
  it('TC6: resolves without error when window.OneSignal is undefined', async () => {
    const { disablePushNotifications } = await import('../src/push-notifications.ts');
    await expect(disablePushNotifications()).resolves.toBeUndefined();
  });
});

describe('disablePushNotifications — calls OneSignal.logout when present', () => {
  it('TC7: calls OneSignal.logout()', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    (window as any).OneSignal = { logout: mockLogout };
    const { disablePushNotifications } = await import('../src/push-notifications.ts');
    await disablePushNotifications();
    expect(mockLogout).toHaveBeenCalled();
  });
});

describe('initPushNotifications — no-ops when serviceWorker not in navigator', () => {
  it('TC8: returns without setting _initialized when browser lacks serviceWorker', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { initPushNotifications } = await import('../src/push-notifications.ts');
    // Should not throw
    await expect(initPushNotifications()).resolves.toBeUndefined();
  });
});

describe('ARCH — src/push-notifications.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/push-notifications.ts'),
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
