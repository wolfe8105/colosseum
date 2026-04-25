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

// DOM helper — build the create-group modal skeleton that groups.create.ts expects
function buildCreateDOM(): void {
  document.body.innerHTML = `
    <div id="create-modal">
      <input id="group-name" type="text" />
      <input id="group-desc-input" type="text" />
      <select id="group-category"><option value="general">general</option></select>
      <div class="emoji-opt selected" data-emoji="🔥"></div>
      <div class="emoji-opt" data-emoji="⚡"></div>
      <button id="create-submit-btn">CREATE GROUP</button>
    </div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  buildCreateDOM();
});

// TC-01 (ARCH): groups.create.ts imports create_group from rpc-schemas
describe('TC-01 — ARCH: rpc-schemas import present in groups.create.ts', () => {
  it('imports create_group from contracts/rpc-schemas', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.create.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaImport = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaImport).toBeTruthy();
    expect(schemaImport).toContain('create_group');
  });
});

// TC-02: create_group schema accepts a valid response with group_id
describe('TC-02 — create_group schema validates a valid response', () => {
  it('parses { group_id: "abc-123" } without throwing', async () => {
    const { create_group } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_group.safeParse({ group_id: 'abc-123' });
    expect(result.success).toBe(true);
  });

  it('parses a success response with all optional fields', async () => {
    const { create_group } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_group.safeParse({ group_id: 'grp-uuid', success: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.group_id).toBe('grp-uuid');
      expect(result.data.success).toBe(true);
    }
  });
});

// TC-03: create_group schema rejects wrong type for group_id
describe('TC-03 — create_group schema rejects wrong types', () => {
  it('rejects group_id as a number', async () => {
    const { create_group } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_group.safeParse({ group_id: 12345 });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (all fields are optional)', async () => {
    const { create_group } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_group.safeParse({});
    expect(result.success).toBe(true);
  });
});

// TC-04: create_group schema uses passthrough — extra fields are preserved
describe('TC-04 — create_group schema passthrough preserves extra fields', () => {
  it('preserves extra fields not declared in schema', async () => {
    const { create_group } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_group.safeParse({ group_id: 'grp-1', extra_field: 'keep-me' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe('keep-me');
    }
  });
});

// TC-05: submitCreateGroup calls safeRpc('create_group') with correct params and triggers
//        the _openGroup callback on success
describe('TC-05 — submitCreateGroup calls safeRpc with correct params and opens group on success', () => {
  it('calls create_group RPC with p_name, p_description, p_category, p_is_public, p_avatar_emoji', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'create_group')
        return Promise.resolve({ data: { group_id: 'new-group-id' }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { submitCreateGroup, setCreateOpenGroupCallback } = await import('../../src/pages/groups.create.ts');

    const openGroupMock = vi.fn();
    setCreateOpenGroupCallback(openGroupMock);

    const nameInput = document.getElementById('group-name') as HTMLInputElement;
    nameInput.value = 'Test Group';

    await submitCreateGroup();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const createCall = rpcCalls.find(([name]) => name === 'create_group');
    expect(createCall).toBeTruthy();
    expect(createCall![1]).toMatchObject({
      p_name: 'Test Group',
      p_category: 'general',
      p_is_public: true,
    });
    expect(openGroupMock).toHaveBeenCalledWith('new-group-id');
  });
});

// TC-06: submitCreateGroup guards short names — does NOT call safeRpc when name < 2 chars
describe('TC-06 — submitCreateGroup guards against short group names', () => {
  it('does not call safeRpc when name is empty', async () => {
    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');

    const nameInput = document.getElementById('group-name') as HTMLInputElement;
    nameInput.value = '';

    await submitCreateGroup();

    const rpcCalls = mockRpc.mock.calls as [string, unknown][];
    const createCall = rpcCalls.find(([name]) => name === 'create_group');
    expect(createCall).toBeUndefined();
  });

  it('does not call safeRpc when name is 1 character', async () => {
    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');

    const nameInput = document.getElementById('group-name') as HTMLInputElement;
    nameInput.value = 'X';

    await submitCreateGroup();

    const rpcCalls = mockRpc.mock.calls as [string, unknown][];
    const createCall = rpcCalls.find(([name]) => name === 'create_group');
    expect(createCall).toBeUndefined();
  });
});

// TC-07: submitCreateGroup re-enables button and restores text after completion
describe('TC-07 — submitCreateGroup restores button state after RPC completes', () => {
  it('re-enables submit button with original text after successful RPC', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'create_group')
        return Promise.resolve({ data: { group_id: 'grp-xyz' }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');

    const nameInput = document.getElementById('group-name') as HTMLInputElement;
    nameInput.value = 'My Group';

    await submitCreateGroup();

    const btn = document.getElementById('create-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('CREATE GROUP');
  });

  it('re-enables submit button after RPC error', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'create_group')
        return Promise.resolve({ data: null, error: { message: 'Name already taken' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');

    const nameInput = document.getElementById('group-name') as HTMLInputElement;
    nameInput.value = 'My Group';

    await submitCreateGroup();

    const btn = document.getElementById('create-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('CREATE GROUP');
  });
});
