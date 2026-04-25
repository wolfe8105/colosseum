// ============================================================
// PLINKO INVITE NUDGE — tests/plinko-invite-nudge.test.ts
// Source: src/pages/plinko-invite-nudge.ts
//
// CLASSIFICATION:
//   injectInviteNudge(): DOM behavioral — async, dynamic import
//
// IMPORTS:
//   { get_my_invite_link } from '../contracts/rpc-schemas.ts'
//   dynamic import('../auth.ts')
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { url: 'https://invite.test/abc' }, error: null }));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_my_invite_link: {},
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc:  mockSafeRpc,
  onChange: vi.fn(),
  ready:    Promise.resolve(),
  getCurrentUser: vi.fn(),
}));

import { injectInviteNudge } from '../src/pages/plinko-invite-nudge.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildDOM(withStep5 = true) {
  document.body.innerHTML = withStep5 ? '<div id="step-5"></div>' : '';
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  mockSafeRpc.mockResolvedValue({ data: { url: 'https://invite.test/abc' }, error: null });
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — injectInviteNudge does nothing when #step-5 is absent', () => {
  it('does not inject when #step-5 is not in the DOM', async () => {
    buildDOM(false);
    await injectInviteNudge();
    expect(document.getElementById('plinko-invite-nudge')).toBeNull();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — injectInviteNudge does nothing when safeRpc returns no URL', () => {
  it('no nudge injected when RPC returns null URL', async () => {
    buildDOM(true);
    mockSafeRpc.mockResolvedValue({ data: { url: null }, error: null });
    await injectInviteNudge();
    expect(document.getElementById('plinko-invite-nudge')).toBeNull();
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — injectInviteNudge injects nudge element when URL is available', () => {
  it('appends #plinko-invite-nudge to #step-5', async () => {
    buildDOM(true);
    await injectInviteNudge();
    expect(document.getElementById('plinko-invite-nudge')).not.toBeNull();
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — injectInviteNudge does not inject twice if called again', () => {
  it('second call is a no-op when nudge already exists', async () => {
    buildDOM(true);
    await injectInviteNudge();
    await injectInviteNudge();
    // Only one nudge element should exist
    expect(document.querySelectorAll('#plinko-invite-nudge').length).toBe(1);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — injectInviteNudge copy button writes to clipboard', () => {
  it('calls navigator.clipboard.writeText with the invite URL', async () => {
    buildDOM(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    await injectInviteNudge();
    const btn = document.getElementById('plinko-invite-copy') as HTMLButtonElement;
    await btn.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('https://invite.test/abc'));
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/plinko-invite-nudge.ts only imports from allowed modules', () => {
  it('has no static imports outside the allowed list', () => {
    const allowed = ['../contracts/rpc-schemas.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-invite-nudge.ts'),
      'utf-8'
    );
    // Only check static imports (not dynamic import(...)  calls)
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import ') && !l.includes('await import'));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
