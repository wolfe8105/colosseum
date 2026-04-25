// ============================================================
// AUTH RIVALS — tests/auth-rivals.test.ts
// Source: src/auth.rivals.ts
//
// CLASSIFICATION:
//   declareRival()  — UUID validation + RPC + placeholder guard → Contract test
//   respondRival()  — RPC + placeholder guard → Contract test
//   getMyRivals()   — RPC + placeholder guard → Contract test
//
// IMPORTS:
//   { getIsPlaceholderMode, isUUID } from './auth.core.ts'
//   { safeRpc }                       from './auth.rpc.ts'
//   import type { ... }               — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockIsUUID = vi.hoisted(() => vi.fn((s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
));
const mockSafeRpc = vi.hoisted(() => vi.fn());

const VALID_UUID = '11111111-2222-3333-4444-555555555555';

vi.mock('../src/auth.core.ts', () => ({
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  isUUID: mockIsUUID,
}));

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

import { declareRival, respondRival, getMyRivals } from '../src/auth.rivals.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockIsUUID.mockImplementation((s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
});

// ── declareRival ──────────────────────────────────────────────

describe('TC1 — declareRival: invalid UUID returns failure', () => {
  it('returns failure for non-UUID target without calling RPC', async () => {
    const result = await declareRival('not-a-uuid');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — declareRival: placeholder mode returns success stub', () => {
  it('returns success without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await declareRival(VALID_UUID);

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC3 — declareRival: calls declare_rival RPC with valid UUID', () => {
  it('calls safeRpc with target id and message', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await declareRival(VALID_UUID, 'Bring it on!');

    expect(mockSafeRpc).toHaveBeenCalledWith('declare_rival', {
      p_target_id: VALID_UUID,
      p_message: 'Bring it on!',
    });
  });
});

describe('TC4 — declareRival: null message when not provided', () => {
  it('sends p_message: null when no message is given', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await declareRival(VALID_UUID);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_message).toBeNull();
  });
});

// ── respondRival ──────────────────────────────────────────────

describe('TC5 — respondRival: calls respond_rival RPC', () => {
  it('calls safeRpc with rival id and accept flag', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await respondRival('rival-abc', true);

    expect(mockSafeRpc).toHaveBeenCalledWith('respond_rival', {
      p_rival_id: 'rival-abc',
      p_accept: true,
    });
  });
});

describe('TC6 — respondRival: placeholder mode returns success stub', () => {
  it('returns success without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await respondRival('rival-1', false);

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── getMyRivals ───────────────────────────────────────────────

describe('TC7 — getMyRivals: calls get_my_rivals RPC', () => {
  it('calls safeRpc with "get_my_rivals" (no params)', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getMyRivals();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_rivals');
  });
});

describe('TC8 — getMyRivals: placeholder mode returns empty list', () => {
  it('returns [] without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getMyRivals();

    expect(result).toEqual([]);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.rivals.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './auth.rpc.ts', './auth.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.rivals.ts'),
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
