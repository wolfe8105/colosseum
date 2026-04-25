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
