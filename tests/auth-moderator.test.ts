// ============================================================
// AUTH MODERATOR — tests/auth-moderator.test.ts
// Source: src/auth.moderator.ts
//
// CLASSIFICATION:
//   toggleModerator/toggleModAvailable/updateModCategories — RPC + notify → Integration test
//   submitReference   — URL validation + RPC → Integration test
//   ruleOnReference   — RPC wrapper → Integration test
//   scoreModerator    — RPC wrapper → Integration test
//   assignModerator   — UUID guard + RPC → Integration test
//   getAvailableModerators — RPC wrapper → Integration test
//   getDebateReferences    — RPC wrapper → Integration test
//
// IMPORTS:
//   { getIsPlaceholderMode, getCurrentUser, getCurrentProfile, isUUID, _notify } from './auth.core.ts'
//   { safeRpc } from './auth.rpc.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => ({ id: 'user-1' })));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockNotify = vi.hoisted(() => vi.fn());
const mockIsUUID = vi.hoisted(() => vi.fn((s: string) => /^[0-9a-f-]{36}$/.test(s)));

vi.mock('../src/auth.core.ts', () => ({
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  isUUID: mockIsUUID,
  _notify: mockNotify,
  onAuthStateChange: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

import {
  toggleModerator,
  toggleModAvailable,
  updateModCategories,
  submitReference,
  ruleOnReference,
  scoreModerator,
  assignModerator,
  getAvailableModerators,
  getDebateReferences,
} from '../src/auth.moderator.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
  mockGetCurrentProfile.mockReturnValue(null);
  mockNotify.mockReset();
});

// ── toggleModerator ───────────────────────────────────────────

describe('TC1 — toggleModerator: placeholder updates profile and notifies', () => {
  it('mutates profile.is_moderator without calling safeRpc', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: any = { is_moderator: false, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(profile);

    await toggleModerator(true);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(profile.is_moderator).toBe(true);
    expect(mockNotify).toHaveBeenCalled();
  });
});

describe('TC2 — toggleModerator: disabling sets mod_available to false in placeholder', () => {
  it('clears mod_available when enabled=false', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: any = { is_moderator: true, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(profile);

    await toggleModerator(false);

    expect(profile.mod_available).toBe(false);
  });
});

describe('TC3 — toggleModerator: RPC success calls safeRpc', () => {
  it('calls toggle_moderator_status with p_enabled', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModerator(true);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_moderator_status', { p_enabled: true });
  });
});

describe('TC4 — toggleModerator: RPC error returns failure', () => {
  it('returns { success: false, error } when RPC throws', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not allowed' } });

    const result = await toggleModerator(true);

    expect(result.success).toBe(false);
  });
});

// ── toggleModAvailable ────────────────────────────────────────

describe('TC5 — toggleModAvailable: placeholder mutates profile', () => {
  it('sets mod_available without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: any = { mod_available: false };
    mockGetCurrentProfile.mockReturnValue(profile);

    await toggleModAvailable(true);

    expect(profile.mod_available).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — toggleModAvailable: calls toggle_mod_available RPC', () => {
  it('passes p_available to RPC', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModAvailable(false);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_mod_available', { p_available: false });
  });
});

// ── updateModCategories ───────────────────────────────────────

describe('TC7 — updateModCategories: placeholder updates profile categories', () => {
  it('sets mod_categories on profile without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: any = {};
    mockGetCurrentProfile.mockReturnValue(profile);

    await updateModCategories(['politics', 'sports']);

    expect(profile.mod_categories).toEqual(['politics', 'sports']);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── submitReference ───────────────────────────────────────────

describe('TC8 — submitReference: rejects non-http/https URLs', () => {
  it('returns error for javascript: URL', async () => {
    const result = await submitReference('d-1', 'javascript:alert(1)', 'desc');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid url/i);
  });
});

describe('TC9 — submitReference: rejects data: URLs', () => {
  it('returns error for data: URL', async () => {
    const result = await submitReference('d-1', 'data:text/html,<h1>hi</h1>', 'desc');
    expect(result.success).toBe(false);
  });
});

describe('TC10 — submitReference: placeholder returns success with reference_id', () => {
  it('returns placeholder reference id without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await submitReference('d-1', null, null);
    expect(result.success).toBe(true);
    expect(result.reference_id).toMatch(/^placeholder-ref-/);
  });
});

describe('TC11 — submitReference: valid URL calls safeRpc', () => {
  it('calls submit_reference with https URL', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, reference_id: 'ref-1' }, error: null });

    const result = await submitReference('debate-1', 'https://example.com', 'My source');

    expect(mockSafeRpc).toHaveBeenCalledWith('submit_reference', expect.objectContaining({
      p_debate_id: 'debate-1',
      p_content: 'https://example.com',
    }));
    expect(result.success).toBe(true);
  });
});

// ── ruleOnReference ───────────────────────────────────────────

describe('TC12 — ruleOnReference: placeholder returns success', () => {
  it('skips RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await ruleOnReference('ref-1', 'valid', null);
    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC13 — ruleOnReference: calls rule_on_reference RPC', () => {
  it('passes ruling and reason to RPC', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await ruleOnReference('ref-x', 'valid', 'Good source');

    expect(mockSafeRpc).toHaveBeenCalledWith('rule_on_reference', {
      p_reference_id: 'ref-x',
      p_ruling: 'valid',
      p_reason: 'Good source',
    });
  });
});

// ── assignModerator ───────────────────────────────────────────

describe('TC14 — assignModerator: invalid UUID returns error', () => {
  it('returns { success: false, error } for non-UUID moderatorId', async () => {
    mockIsUUID.mockReturnValue(false);
    const result = await assignModerator('debate-1', 'not-a-uuid');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });
});

describe('TC15 — assignModerator: null moderatorId skips UUID check', () => {
  it('calls RPC with null moderator_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await assignModerator('debate-1', null);

    expect(mockSafeRpc).toHaveBeenCalledWith('assign_moderator', expect.objectContaining({
      p_moderator_id: null,
    }));
    expect(result.success).toBe(true);
  });
});

// ── getAvailableModerators ────────────────────────────────────

describe('TC16 — getAvailableModerators: placeholder returns 2 fake moderators', () => {
  it('returns placeholder array without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await getAvailableModerators();
    expect(result).toHaveLength(2);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC17 — getAvailableModerators: RPC error returns empty array', () => {
  it('returns [] when safeRpc throws', async () => {
    mockSafeRpc.mockRejectedValue(new Error('DB error'));
    const result = await getAvailableModerators();
    expect(result).toEqual([]);
  });
});

// ── getDebateReferences ───────────────────────────────────────

describe('TC18 — getDebateReferences: placeholder returns empty array', () => {
  it('returns [] in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await getDebateReferences('debate-1');
    expect(result).toEqual([]);
  });
});

describe('TC19 — getDebateReferences: success returns data', () => {
  it('calls RPC and returns result array', async () => {
    const refs = [{ id: 'ref-1', url: 'https://example.com' }];
    mockSafeRpc.mockResolvedValue({ data: refs, error: null });

    const result = await getDebateReferences('d-42');

    expect(result).toEqual(refs);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.moderator.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './auth.rpc.ts', './auth.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/auth.moderator.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
