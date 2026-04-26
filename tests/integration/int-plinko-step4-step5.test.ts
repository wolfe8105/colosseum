// ============================================================
// INTEGRATOR — plinko-step4-step5 + plinko-helpers
// Seam #307: plinko-step4-step5.ts → plinko-helpers
// Boundary: goToStep() and getReturnTo() from helpers used in
//           step4 moderator opt-in and step5 enter-arena flow.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// DOM HELPERS
// ============================================================

function buildStep45DOM(): void {
  document.body.innerHTML = `
    <div id="step-1" class="plinko-step"></div>
    <div id="step-2" class="plinko-step"></div>
    <div id="step-3" class="plinko-step"></div>
    <div id="step-4" class="plinko-step active">
      <button id="btn-enable-mod" type="button">ENABLE MOD</button>
      <button id="btn-skip-mod" type="button">SKIP</button>
    </div>
    <div id="step-5" class="plinko-step">
      <button id="btn-enter" type="button">ENTER THE ARENA</button>
    </div>
    <div id="progress" style="width:0%"></div>
  `;
}

// ============================================================
// ARCH FILTER — TC0: import lines point only to expected deps
// ============================================================

describe('TC0 — ARCH: plinko-step4-step5.ts import boundaries', () => {
  it('imports from plinko-helpers and no banned heavy deps', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-step4-step5.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));

    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const dep of banned) {
      expect(importLines.some(l => l.includes(dep))).toBe(false);
    }

    // Must import from plinko-helpers
    expect(importLines.some(l => l.includes('plinko-helpers'))).toBe(true);
  });
});

// ============================================================
// beforeEach
// ============================================================

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  buildStep45DOM();
  // Reset location
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: 'http://localhost/moderator-plinko.html', search: '', hash: '', pathname: '/moderator-plinko.html' },
  });
});

// ============================================================
// TC1 — btn-enable-mod calls toggleModerator(true) then goToStep(5)
// ============================================================

describe('TC1 — btn-enable-mod: calls toggleModerator RPC then advances to step 5', () => {
  it('rpc called with toggle_moderator_status and step-5 becomes active', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // toggleModerator calls rpc('toggle_moderator_status', ...)
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { attachStep4 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep4();

    const btn = document.getElementById('btn-enable-mod') as HTMLButtonElement;
    btn.click();

    await vi.advanceTimersByTimeAsync(100);

    // Step 5 becomes active
    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(true);

    // Step 4 is no longer active
    const step4 = document.getElementById('step-4');
    expect(step4?.classList.contains('active')).toBe(false);

    // RPC called for toggle_moderator_status
    const modCall = mockRpc.mock.calls.find(
      (c: unknown[]) => c[0] === 'toggle_moderator_status',
    );
    expect(modCall).toBeDefined();
  });
});

// ============================================================
// TC2 — btn-enable-mod: RPC failure still advances to step 5
// ============================================================

describe('TC2 — btn-enable-mod: toggleModerator failure is non-critical, still advances', () => {
  it('step-5 becomes active even when toggleModerator RPC rejects', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockRejectedValue(new Error('network error'));

    const { attachStep4 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep4();

    document.getElementById('btn-enable-mod')!.click();
    await vi.advanceTimersByTimeAsync(100);

    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(true);
  });
});

// ============================================================
// TC3 — btn-skip-mod: goToStep(5) without any RPC call
// ============================================================

describe('TC3 — btn-skip-mod: advances to step 5 without any RPC', () => {
  it('step-5 becomes active and no RPC fired', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { attachStep4 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep4();

    document.getElementById('btn-skip-mod')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(true);

    const modCall = mockRpc.mock.calls.find(
      (c: unknown[]) => c[0] === 'toggle_moderator_status',
    );
    expect(modCall).toBeUndefined();
  });
});

// ============================================================
// TC4 — btn-enter: getReturnTo() with no returnTo param → default arena URL
// ============================================================

describe('TC4 — btn-enter: getReturnTo() returns default arena URL when no param', () => {
  it('window.location.href is set to index.html?screen=arena', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', search: '', hash: '', pathname: '/moderator-plinko.html' },
    });

    const { attachStep5 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep5();

    document.getElementById('btn-enter')!.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(window.location.href).toBe('index.html?screen=arena');
  });
});

// ============================================================
// TC5 — btn-enter: getReturnTo() with valid returnTo param uses it
// ============================================================

describe('TC5 — btn-enter: getReturnTo() respects valid returnTo query param', () => {
  it('window.location.href is set to the returnTo value when path is safe', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        href: '',
        search: '?returnTo=/index.html%3Fscreen%3Dprofile',
        hash: '',
        pathname: '/moderator-plinko.html',
      },
    });

    const { attachStep5 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep5();

    document.getElementById('btn-enter')!.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(window.location.href).toBe('/index.html?screen=profile');
  });
});

// ============================================================
// TC6 — goToStep(5) via skip updates progress bar width
// ============================================================

describe('TC6 — goToStep(5): progress bar reflects step 5 of 5', () => {
  it('progress bar width is 100% after goToStep(5)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { attachStep4 } = await import('../../src/pages/plinko-step4-step5.ts');
    attachStep4();

    document.getElementById('btn-skip-mod')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const bar = document.getElementById('progress') as HTMLDivElement;
    // step 5 / 5 = 100%
    expect(bar.style.width).toBe('100%');
  });
});
