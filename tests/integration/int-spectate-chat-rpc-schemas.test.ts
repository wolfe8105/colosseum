import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
});

// TC1: ARCH — spectate.chat.ts imports get_spectator_chat and send_spectator_chat from rpc-schemas
describe('TC1 — ARCH: spectate.chat.ts imports both rpc-schemas exports', () => {
  it('source contains import of get_spectator_chat and send_spectator_chat from rpc-schemas', () => {
    const source = readFileSync(resolve(__dirname, '../../src/pages/spectate.chat.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const rpcSchemaImport = importLines.find(l => l.includes('rpc-schemas'));
    expect(rpcSchemaImport).toBeDefined();
    expect(rpcSchemaImport).toContain('get_spectator_chat');
    expect(rpcSchemaImport).toContain('send_spectator_chat');
  });
});

// TC2: get_spectator_chat schema validates a well-formed chat message array
describe('TC2 — get_spectator_chat validates a well-formed array', () => {
  it('parses array with required nullable fields successfully', async () => {
    const { get_spectator_chat } = await import('../../src/contracts/rpc-schemas.ts');
    const input = [
      {
        id: 'msg-001',
        user_id: 'user-abc',
        display_name: 'Alice',
        avatar_url: null,
        message: 'Great point!',
        created_at: '2026-04-25T10:00:00Z',
      },
    ];
    const result = get_spectator_chat.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].display_name).toBe('Alice');
    }
  });
});

// TC3: get_spectator_chat rejects non-array input
describe('TC3 — get_spectator_chat rejects non-array input', () => {
  it('returns failure when passed a plain object', async () => {
    const { get_spectator_chat } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_spectator_chat.safeParse({ user_id: 'u1', message: 'hi' });
    expect(result.success).toBe(false);
  });
});

// TC4: send_spectator_chat schema validates success response
describe('TC4 — send_spectator_chat validates a success response', () => {
  it('parses { success: true, display_name: "Bob" } correctly', async () => {
    const { send_spectator_chat } = await import('../../src/contracts/rpc-schemas.ts');
    const result = send_spectator_chat.safeParse({ success: true, display_name: 'Bob' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.display_name).toBe('Bob');
    }
  });
});

// TC5: send_spectator_chat validates an error response
describe('TC5 — send_spectator_chat validates an error response', () => {
  it('parses { success: false, error: "Slow down" } correctly', async () => {
    const { send_spectator_chat } = await import('../../src/contracts/rpc-schemas.ts');
    const result = send_spectator_chat.safeParse({ success: false, error: 'Slow down' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('Slow down');
    }
  });
});

// TC6: send_spectator_chat passes through extra keys via .passthrough()
describe('TC6 — send_spectator_chat passes through unknown extra keys', () => {
  it('preserves extra fields not declared in schema', async () => {
    const { send_spectator_chat } = await import('../../src/contracts/rpc-schemas.ts');
    const result = send_spectator_chat.safeParse({ success: true, extra_field: 'should survive' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe('should survive');
    }
  });
});

// TC7: startChatPolling polls safeRpc('get_spectator_chat') on interval and stopChatPolling clears it
describe('TC7 — startChatPolling polls get_spectator_chat and stopChatPolling halts it', () => {
  it('fires get_spectator_chat RPC after interval elapses, then stops on stopChatPolling', async () => {
    // Set up minimal DOM and spectate.state requirements
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-xyz';
    stateModule.state.chatMessages = [];
    stateModule.state.lastChatMessageAt = null;
    stateModule.state.chatPollTimer = null;

    // Return a valid chat array on first poll
    const freshMsg = {
      id: 'msg-fresh',
      user_id: 'u2',
      display_name: 'Charlie',
      avatar_url: null,
      message: 'Hello arena',
      created_at: '2026-04-25T11:00:00Z',
    };
    mockRpc.mockResolvedValue({ data: [freshMsg], error: null });

    const chatMod = await import('../../src/pages/spectate.chat.ts');

    chatMod.startChatPolling();

    // Advance past the 6000ms poll interval
    await vi.advanceTimersByTimeAsync(6100);

    expect(mockRpc).toHaveBeenCalledWith(
      'get_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-xyz', p_limit: 100 }),
    );

    chatMod.stopChatPolling();
    const callCountAfterStop = mockRpc.mock.calls.length;

    // Advancing further should not produce more calls
    await vi.advanceTimersByTimeAsync(12000);
    expect(mockRpc.mock.calls.length).toBe(callCountAfterStop);
  });
});
