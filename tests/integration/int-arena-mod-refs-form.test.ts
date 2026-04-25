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

// Stub @peermetrics/webrtc-stats — pulled in transitively via arena-room-ai-response → arena-room-live-poll → arena-room-end → webrtc.ts → webrtc.monitor.ts
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// TC1: showReferenceForm — no form injected when currentDebate is null
describe('TC1 — showReferenceForm noop when currentDebate is null', () => {
  it('does not inject #arena-ref-form when currentDebate is null', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate(null);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC2: showReferenceForm — form inserted after #arena-messages when present
describe('TC2 — showReferenceForm inserts form after #arena-messages', () => {
  it('places #arena-ref-form as sibling after #arena-messages', async () => {
    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-001',
      topic: 'Test topic',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-1',
      opponentUsername: 'opponent',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const form = document.getElementById('arena-ref-form');
    expect(form).not.toBeNull();

    const messages = document.getElementById('arena-messages');
    expect(messages?.nextSibling).toBe(form);
  });
});

// TC3: showReferenceForm — form appended to screenEl when #arena-messages absent
describe('TC3 — showReferenceForm falls back to screenEl', () => {
  it('appends #arena-ref-form to screenEl when no #arena-messages present', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-002',
      topic: 'Another topic',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-2',
      opponentUsername: 'opp2',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);

    const screenEl = document.getElementById('screen-main') as HTMLElement;
    state.set_screenEl(screenEl);

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const form = document.getElementById('arena-ref-form');
    expect(form).not.toBeNull();
    expect(screenEl.contains(form)).toBe(true);
  });
});

// TC4: hideReferenceForm — removes #arena-ref-form
describe('TC4 — hideReferenceForm removes the form', () => {
  it('removes #arena-ref-form from DOM', async () => {
    document.body.innerHTML = '<div id="screen-main"><div id="arena-ref-form"></div></div>';

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.hideReferenceForm();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC5: cancel button click triggers hideReferenceForm
describe('TC5 — cancel button removes the form', () => {
  it('clicking #arena-ref-cancel-btn removes #arena-ref-form', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-003',
      topic: 'Cancel test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-3',
      opponentUsername: 'opp3',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    expect(document.getElementById('arena-ref-form')).not.toBeNull();

    const cancelBtn = document.getElementById('arena-ref-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC6: assignSelectedMod — skips assignModerator when selectedModerator is null
describe('TC6 — assignSelectedMod noop when selectedModerator is null', () => {
  it('resolves without calling auth.assignModerator when selectedModerator is null', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator(null);
    state.set_currentDebate({
      id: 'debate-004',
      topic: 'No mod',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-4',
      opponentUsername: 'opp4',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    // Should resolve without throwing or calling rpc
    await expect(mod.assignSelectedMod('debate-004')).resolves.toBeUndefined();
    // No Supabase rpc calls expected for mod assignment
    expect(mockRpc).not.toHaveBeenCalledWith('assign_moderator', expect.anything());
  });
});

// TC7: addReferenceButton — is a no-op, returns without throwing
describe('TC7 — addReferenceButton is a safe no-op', () => {
  it('returns undefined without throwing', async () => {
    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    expect(() => mod.addReferenceButton()).not.toThrow();
    expect(mod.addReferenceButton()).toBeUndefined();
  });
});

// ARCH seam boundary check
describe('ARCH — seam #035 import boundary unchanged', () => {
  it('src/arena/arena-mod-refs-form.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-form.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
