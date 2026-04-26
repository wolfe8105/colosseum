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
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ruleOnReference lives in auth.ts — mock it so no Supabase calls leak
const mockRuleOnReference = vi.hoisted(() => vi.fn());
vi.mock('../../src/auth.ts', () => ({
  ruleOnReference: mockRuleOnReference,
  safeRpc: vi.fn(),
}));

// addSystemMessage lives in arena-room-live-messages.ts — mock to avoid DOM deps
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRuleOnReference.mockReset();
  mockAddSystemMessage.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockRuleOnReference.mockResolvedValue({ data: null, error: null });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// ─── TC-1: showRulingPanel renders the overlay with correct content ───────────

describe('TC-1 — showRulingPanel renders overlay with correct content', () => {
  it('appends #mod-ruling-overlay with escapeHTML submitter name and round number', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = {
      id: 'ref-001',
      round: 2,
      supports_side: 'a' as const,
      submitter_name: 'Alice<>&',
      url: 'https://example.com',
      description: 'A test reference',
    };

    showRulingPanel(ref as any);

    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).not.toBeNull();
    // submitter name must be escaped
    expect(overlay!.innerHTML).toContain('Alice&lt;&gt;&amp;');
    // round number rendered via Number()
    expect(overlay!.innerHTML).toContain('ROUND 2');
    // sideLabel
    expect(overlay!.innerHTML).toContain('Side A');
    // countdown timer initial text
    const timerEl = overlay!.querySelector('#mod-ruling-timer');
    expect(timerEl?.textContent).toContain('60s auto-allow');
  });
});

// ─── TC-2: showRulingPanel replaces existing overlay ─────────────────────────

describe('TC-2 — showRulingPanel replaces pre-existing overlay', () => {
  it('removes old #mod-ruling-overlay before inserting a new one', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const refA = { id: 'ref-A', round: 1, supports_side: 'b' as const, submitter_name: 'Bob', url: null, description: 'first' };
    const refB = { id: 'ref-B', round: 3, supports_side: 'neutral' as const, submitter_name: 'Carol', url: null, description: 'second' };

    showRulingPanel(refA as any);
    showRulingPanel(refB as any);

    const overlays = document.querySelectorAll('#mod-ruling-overlay');
    expect(overlays.length).toBe(1);
    // The new overlay should reflect refB's content
    expect(overlays[0].innerHTML).toContain('ROUND 3');
  });
});

// ─── TC-3: Auto-allow countdown fires ruleOnReference after 60 ticks ─────────

describe('TC-3 — auto-allow countdown calls ruleOnReference after 60 seconds', () => {
  it('calls ruleOnReference(ref.id, allowed, auto-allow message) after countdown', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-auto', round: 1, supports_side: 'a' as const, submitter_name: 'Dave', url: null, description: null };
    showRulingPanel(ref as any);

    // Advance 60 ticks of 1000ms
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-auto', 'allowed', 'Auto-allowed (moderator timeout)');

    // Overlay should be removed after auto-allow
    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).toBeNull();

    vi.useRealTimers();
  });
});

// ─── TC-4: Allow button calls ruleOnReference with 'allowed' ─────────────────

describe('TC-4 — Allow button calls ruleOnReference(allowed) and removes overlay', () => {
  it('fires ruleOnReference with allowed verdict and removes overlay on success', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-allow', round: 2, supports_side: 'b' as const, submitter_name: 'Eve', url: null, description: null };
    showRulingPanel(ref as any);

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    expect(allowBtn).not.toBeNull();

    allowBtn.click();
    await Promise.resolve(); // flush microtasks

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-allow', 'allowed', '');

    // Overlay removed after success
    await Promise.resolve();
    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).toBeNull();
  });
});

// ─── TC-5: Deny button calls ruleOnReference with 'denied' ───────────────────

describe('TC-5 — Deny button calls ruleOnReference(denied) and removes overlay', () => {
  it('fires ruleOnReference with denied verdict and removes overlay on success', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-deny', round: 1, supports_side: 'a' as const, submitter_name: 'Frank', url: null, description: null };
    showRulingPanel(ref as any);

    const denyBtn = document.getElementById('mod-ruling-deny') as HTMLButtonElement;
    expect(denyBtn).not.toBeNull();

    // Fill in a reason
    const reasonEl = document.getElementById('mod-ruling-reason') as HTMLTextAreaElement;
    reasonEl.value = 'Irrelevant source';

    denyBtn.click();
    await Promise.resolve();

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-deny', 'denied', 'Irrelevant source');

    await Promise.resolve();
    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).toBeNull();
  });
});

// ─── TC-6: stopReferencePoll clears timer and resets pendingReferences ────────

describe('TC-6 — stopReferencePoll clears timer and resets pending references', () => {
  it('nulls referencePollTimer and empties pendingReferences after stop', async () => {
    const { stopReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    const state = await import('../../src/arena/arena-state.ts');

    // Seed a fake poll timer via setter
    const fakeTimer = setInterval(() => {/* no-op */}, 9999);
    state.set_referencePollTimer(fakeTimer);
    state.set_pendingReferences([{ id: 'x' }]);

    stopReferencePoll();

    expect(state.referencePollTimer).toBeNull();
    expect(state.pendingReferences).toEqual([]);
  });
});

// ─── ARCH: seam #034 import boundary ─────────────────────────────────────────

describe('ARCH — seam #034 import boundary unchanged', () => {
  it('src/arena/arena-mod-refs-ruling.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-ruling.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SEAM #223 — arena-mod-refs-ruling → arena-room-live-messages (addSystemMessage)
// ═════════════════════════════════════════════════════════════════════════════

describe('SEAM #223 TC-1 — allow success posts "Evidence ALLOWED" system message', () => {
  it('addSystemMessage called with ALLOWED text on successful allow ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-allow', round: 1, supports_side: 'a' as const, submitter_name: 'Alice', url: null, description: null };
    showRulingPanel(ref as any);

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Evidence ALLOWED by moderator'),
    );

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-2 — deny success posts "Evidence DENIED" system message', () => {
  it('addSystemMessage called with DENIED text on successful deny ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-deny', round: 2, supports_side: 'b' as const, submitter_name: 'Bob', url: null, description: null };
    showRulingPanel(ref as any);

    const denyBtn = document.getElementById('mod-ruling-deny') as HTMLButtonElement;
    denyBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Evidence DENIED by moderator'),
    );

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-3 — allow with reason appends reason to system message', () => {
  it('addSystemMessage includes the reason text when provided on allow', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-reason', round: 3, supports_side: 'a' as const, submitter_name: 'Carol', url: null, description: null };
    showRulingPanel(ref as any);

    const reasonEl = document.getElementById('mod-ruling-reason') as HTMLTextAreaElement;
    reasonEl.value = 'Solid source';

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Solid source'),
    );

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-4 — ruleOnReference error on allow posts "Ruling failed" system message', () => {
  it('addSystemMessage called with Ruling failed when ruleOnReference returns error on allow', async () => {
    mockRuleOnReference.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });

    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-err-allow', round: 1, supports_side: 'a' as const, submitter_name: 'Dave', url: null, description: null };
    showRulingPanel(ref as any);

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Ruling failed'),
    );

    // Overlay stays visible when ruling fails
    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).not.toBeNull();

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-5 — ruleOnReference error on deny posts "Ruling failed" system message', () => {
  it('addSystemMessage called with Ruling failed when ruleOnReference returns error on deny', async () => {
    mockRuleOnReference.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-err-deny', round: 1, supports_side: 'b' as const, submitter_name: 'Eve', url: null, description: null };
    showRulingPanel(ref as any);

    const denyBtn = document.getElementById('mod-ruling-deny') as HTMLButtonElement;
    denyBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Ruling failed'),
    );

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-6 — ruleOnReference throw on allow posts unexpected error message', () => {
  it('addSystemMessage called with unexpected error when ruleOnReference throws on allow', async () => {
    mockRuleOnReference.mockRejectedValueOnce(new Error('network error'));

    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = { id: 'ref-s223-throw-allow', round: 2, supports_side: 'a' as const, submitter_name: 'Frank', url: null, description: null };
    showRulingPanel(ref as any);

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Ruling failed: unexpected error'),
    );

    vi.useRealTimers();
  });
});

describe('SEAM #223 TC-7 — ARCH: arena-mod-refs-ruling imports addSystemMessage from arena-room-live-messages', () => {
  it('import boundary from seam #223 is present in source', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-ruling.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-room-live-messages'))).toBe(true);
    expect(importLines.some(l => l.includes('addSystemMessage'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SEAM #282 — arena-mod-refs-ruling → arena-types-results (ReferenceItem)
// ═════════════════════════════════════════════════════════════════════════════

describe('SEAM #282 TC-1 — ReferenceItem.id is passed to ruleOnReference', () => {
  it('ruleOnReference receives ref.id as first argument on allow', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = {
      id: 's282-id-check',
      round: 1,
      supports_side: 'a' as const,
      submitter_name: 'Tester',
      url: null,
      description: null,
    };

    showRulingPanel(ref as any);

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRuleOnReference).toHaveBeenCalledWith('s282-id-check', 'allowed', expect.any(String));
  });
});

describe('SEAM #282 TC-2 — ReferenceItem.supports_side drives sideLabel: a → Side A', () => {
  it('overlay contains "Side A" when supports_side is "a"', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = {
      id: 'ref-side-a',
      round: 1,
      supports_side: 'a' as const,
      submitter_name: 'Alpha',
      url: null,
      description: null,
    };

    showRulingPanel(ref as any);

    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.innerHTML).toContain('Side A');
    expect(overlay!.innerHTML).not.toContain('Side B');
    expect(overlay!.innerHTML).not.toContain('Neutral');
  });
});

describe('SEAM #282 TC-3 — ReferenceItem.supports_side drives sideLabel: b → Side B, else → Neutral', () => {
  it('overlay contains "Side B" for supports_side b and "Neutral" for anything else', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    // Side B
    showRulingPanel({ id: 'ref-b', round: 1, supports_side: 'b', submitter_name: 'Beta', url: null, description: null } as any);
    const overlayB = document.getElementById('mod-ruling-overlay');
    expect(overlayB!.innerHTML).toContain('Side B');

    // Neutral (unknown side)
    showRulingPanel({ id: 'ref-n', round: 2, supports_side: 'neutral', submitter_name: 'Gamma', url: null, description: null } as any);
    const overlayN = document.getElementById('mod-ruling-overlay');
    expect(overlayN!.innerHTML).toContain('Neutral');
  });
});

describe('SEAM #282 TC-4 — ReferenceItem.submitter_name is escapeHTML-escaped in overlay', () => {
  it('XSS-unsafe chars in submitter_name are entity-encoded in innerHTML', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = {
      id: 'ref-xss',
      round: 1,
      supports_side: 'a' as const,
      submitter_name: '<script>alert(1)</script>',
      url: null,
      description: null,
    };

    showRulingPanel(ref as any);

    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).not.toBeNull();
    // Raw script tag must NOT appear
    expect(overlay!.innerHTML).not.toContain('<script>');
    // Escaped form must appear
    expect(overlay!.innerHTML).toContain('&lt;script&gt;');
  });
});

describe('SEAM #282 TC-5 — ReferenceItem.url renders conditionally', () => {
  it('url div rendered when url is present, omitted when url is falsy', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    // With URL
    showRulingPanel({ id: 'ref-url-yes', round: 1, supports_side: 'a', submitter_name: 'A', url: 'https://example.com', description: null } as any);
    const overlayYes = document.getElementById('mod-ruling-overlay');
    expect(overlayYes!.querySelector('.mod-ruling-ref-url')).not.toBeNull();
    expect(overlayYes!.innerHTML).toContain('https://example.com');

    // Without URL
    showRulingPanel({ id: 'ref-url-no', round: 1, supports_side: 'a', submitter_name: 'B', url: null, description: null } as any);
    const overlayNo = document.getElementById('mod-ruling-overlay');
    expect(overlayNo!.querySelector('.mod-ruling-ref-url')).toBeNull();
  });
});

describe('SEAM #282 TC-6 — ReferenceItem.round is cast with Number() before innerHTML', () => {
  it('round is rendered as Number(round) — numeric coercion prevents injection', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    const ref = {
      id: 'ref-round',
      round: 5,
      supports_side: 'a' as const,
      submitter_name: 'Tester',
      url: null,
      description: null,
    };

    showRulingPanel(ref as any);

    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay!.innerHTML).toContain('ROUND 5');

    // Non-numeric round should render as 0 (Number(undefined) === NaN → || '?' fallback)
    showRulingPanel({ id: 'ref-round-nan', round: undefined, supports_side: 'a', submitter_name: 'X', url: null, description: null } as any);
    const overlayNaN = document.getElementById('mod-ruling-overlay');
    // Number(undefined) is NaN which is falsy, so fallback '?' is used
    expect(overlayNaN!.innerHTML).toContain('ROUND ?');
  });
});

describe('SEAM #282 TC-7 — ARCH: arena-mod-refs-ruling imports ReferenceItem from arena-types-results', () => {
  it('import boundary for seam #282 (arena-types-results) is present in source', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-ruling.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-results'))).toBe(true);
    // Must be a type-only import (ReferenceItem is an interface)
    const arenaTypesLine = importLines.find(l => l.includes('arena-types-results'));
    expect(arenaTypesLine).toMatch(/import\s+type/);
  });
});
