/**
 * Tests for src/arena/arena-ads.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  delete (window as any).adsbygoogle;
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

async function getModule() {
  return import('../src/arena/arena-ads.ts');
}

describe('injectAdSlot — appends ad element to container', () => {
  it('TC1: appends a wrapper with .adsbygoogle inside the container', async () => {
    const { injectAdSlot } = await getModule();
    const container = document.createElement('div');
    document.body.appendChild(container);
    injectAdSlot(container);
    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
  });

  it('TC2: pushes to window.adsbygoogle', async () => {
    const { injectAdSlot } = await getModule();
    (window as any).adsbygoogle = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    injectAdSlot(container);
    expect((window as any).adsbygoogle.length).toBe(1);
  });

  it('TC3: applies custom style to wrapper when provided', async () => {
    const { injectAdSlot } = await getModule();
    const container = document.createElement('div');
    document.body.appendChild(container);
    injectAdSlot(container, { margin: '0' });
    const wrap = container.querySelector('div') as HTMLDivElement;
    expect(wrap.style.margin).toBeTruthy();
  });
});

describe('showAdInterstitial — appends overlay to body and calls onDone', () => {
  it('TC4: appends #structural-ad-interstitial overlay to document.body', async () => {
    const { showAdInterstitial } = await getModule();
    const onDone = vi.fn();
    showAdInterstitial(onDone, 2, 1);
    expect(document.getElementById('structural-ad-interstitial')).not.toBeNull();
    onDone.mockClear();
    vi.advanceTimersByTime(2000);
  });

  it('TC5: calls onDone after totalSec expires', async () => {
    const { showAdInterstitial } = await getModule();
    const onDone = vi.fn();
    showAdInterstitial(onDone, 3, 1);
    vi.advanceTimersByTime(3000);
    expect(onDone).toHaveBeenCalled();
  });

  it('TC6: removes overlay from DOM after auto-dismiss', async () => {
    const { showAdInterstitial } = await getModule();
    const onDone = vi.fn();
    showAdInterstitial(onDone, 2, 1);
    vi.advanceTimersByTime(2000);
    expect(document.getElementById('structural-ad-interstitial')).toBeNull();
  });
});

describe('destroy — cancels running interstitial', () => {
  it('TC7: calling destroy clears the countdown and calls onDone', async () => {
    const { showAdInterstitial, destroy } = await getModule();
    const onDone = vi.fn();
    showAdInterstitial(onDone, 10, 2);
    destroy();
    expect(onDone).toHaveBeenCalled();
  });

  it('TC8: calling destroy when no interstitial is safe (no throw)', async () => {
    const { destroy } = await getModule();
    expect(() => destroy()).not.toThrow();
  });
});

describe('ARCH — src/arena/arena-ads.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-ads.ts'),
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
