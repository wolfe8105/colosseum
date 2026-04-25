// ============================================================
// GATEKEEPER — F-47 Moderator Scoring
// Source:   src/auth.moderator.ts
// Spec:     docs/product/F-47-moderator-marketplace.md
//
// Tests prove the code does what the spec says.
// Source of truth: F-47 spec sections 1 and 5.
//
// TESTABLE CLAIMS:
//   TC1:  toggleModerator — calls safeRpc('toggle_moderator_status', { p_enabled }) [Spec §1]
//   TC2:  toggleModerator — placeholder mutates is_moderator without RPC [Spec §1]
//   TC3:  toggleModerator — disabling also clears mod_available on profile [Spec §1]
//   TC4:  toggleModerator — notifies listeners via _notify on success [Spec §1]
//   TC5:  toggleModerator — returns { success: false, error } on RPC error [Spec §1]
//   TC6:  toggleModAvailable — calls safeRpc('toggle_mod_available', { p_available }) [Spec §1 Notes]
//   TC7:  scoreModerator — calls safeRpc('score_moderator', { p_debate_id, p_score }) [Spec §5]
//   TC8:  scoreModerator — FAIR thumbs-up sends p_score=25 [Spec §5]
//   TC9:  scoreModerator — UNFAIR thumbs-down sends p_score=0 [Spec §5]
//   TC10: scoreModerator — placeholder returns { success: true } without RPC [Spec §5]
//   TC11: scoreModerator — returns { success: false, error } on RPC error [Spec §5]
//   TC12: scoreModerator — returns { success: true } on null data fallback [Spec §5]
//   TC13: assignModerator — non-UUID moderatorId returns error before RPC [Spec §1/DB contract]
//   TC14: assignModerator — null moderatorId skips UUID check and calls RPC [Spec §1]
//   TC15: assignModerator — defaults moderator_type to 'human' when omitted [Spec §1 Notes]
//   TC16: ARCH — src/auth.moderator.ts only imports from allowed modules
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must precede vi.mock factories) ────────────

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
  scoreModerator,
  assignModerator,
} from '../src/auth.moderator.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
  mockGetCurrentProfile.mockReturnValue(null);
  mockNotify.mockReset();
  mockIsUUID.mockImplementation((s: string) => /^[0-9a-f-]{36}$/.test(s));
});

// ────────────────────────────────────────────────────────────
// TC1 — toggleModerator calls toggle_moderator_status RPC
// Spec §1: "calls safeRpc('toggle_moderator_status', { p_enabled })"
// ────────────────────────────────────────────────────────────

describe('TC1 — toggleModerator: calls toggle_moderator_status with p_enabled', () => {
  it('sends correct RPC name and parameter when enabling', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModerator(true);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_moderator_status', { p_enabled: true });
  });

  it('sends p_enabled=false when disabling', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModerator(false);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_moderator_status', { p_enabled: false });
  });
});

// ────────────────────────────────────────────────────────────
// TC2 — toggleModerator placeholder mutates profile without RPC
// Spec §1: "On success, update currentProfile.is_moderator"
// ────────────────────────────────────────────────────────────

describe('TC2 — toggleModerator: placeholder mutates is_moderator without calling RPC', () => {
  it('sets is_moderator=true on profile and skips safeRpc', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: Record<string, unknown> = { is_moderator: false, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(profile);

    const result = await toggleModerator(true);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(profile.is_moderator).toBe(true);
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// TC3 — toggleModerator disabling clears mod_available
// Spec §1: "conditionally clears mod_available when disabling"
// ────────────────────────────────────────────────────────────

describe('TC3 — toggleModerator: disabling clears mod_available on profile', () => {
  it('sets mod_available=false in placeholder mode when enabled=false', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile: Record<string, unknown> = { is_moderator: true, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(profile);

    await toggleModerator(false);

    expect(profile.mod_available).toBe(false);
  });

  it('sets mod_available=false via RPC path when enabled=false', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    const profile: Record<string, unknown> = { is_moderator: true, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(profile);

    await toggleModerator(false);

    expect(profile.mod_available).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// TC4 — toggleModerator notifies listeners via _notify
// Spec §1: "ToggleFn: update currentProfile.is_moderator" → triggers auth change
// ────────────────────────────────────────────────────────────

describe('TC4 — toggleModerator: notifies listeners via _notify after success', () => {
  it('calls _notify in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockGetCurrentProfile.mockReturnValue({ is_moderator: false });

    await toggleModerator(true);

    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('calls _notify on RPC success', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModerator(true);

    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────
// TC5 — toggleModerator returns failure on RPC error
// Spec §1 flow: error path → renderLobby is NOT called
// ────────────────────────────────────────────────────────────

describe('TC5 — toggleModerator: returns { success: false, error } on RPC error', () => {
  it('surfaces error message from RPC', async () => {
    mockSafeRpc.mockResolvedValue({
      data: null,
      error: { message: 'toggle_moderator_status: not authorized' },
    });

    const result = await toggleModerator(true);

    expect(result.success).toBe(false);
    expect(result.error).toContain('toggle_moderator_status');
  });
});

// ────────────────────────────────────────────────────────────
// TC6 — toggleModAvailable calls toggle_mod_available RPC
// Spec §1 Notes: "calls toggleModAvailable() at auth.ts:844 and toggle_mod_available RPC"
// ────────────────────────────────────────────────────────────

describe('TC6 — toggleModAvailable: calls toggle_mod_available with p_available', () => {
  it('sends correct RPC name and p_available=true', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModAvailable(true);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_mod_available', { p_available: true });
  });

  it('sends p_available=false when hiding from queue', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await toggleModAvailable(false);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_mod_available', { p_available: false });
  });
});

// ────────────────────────────────────────────────────────────
// TC7 — scoreModerator calls score_moderator with correct params
// Spec §5: "calls safeRpc('score_moderator', { p_debate_id, p_score })"
// ────────────────────────────────────────────────────────────

describe('TC7 — scoreModerator: calls score_moderator with p_debate_id and p_score', () => {
  it('sends the exact RPC name and both named params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-gk-01', 25);

    expect(mockSafeRpc).toHaveBeenCalledWith('score_moderator', {
      p_debate_id: 'debate-gk-01',
      p_score: 25,
    });
  });

  it('threads debate ID through to RPC without mutation', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-xyz-unique', 12);

    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_debate_id).toBe('debate-xyz-unique');
  });
});

// ────────────────────────────────────────────────────────────
// TC8 — scoreModerator FAIR thumbs-up sends p_score=25
// Spec §5: "debaters see thumbs-up (score=25)"
// ────────────────────────────────────────────────────────────

describe('TC8 — scoreModerator: FAIR thumbs-up sends p_score=25', () => {
  it('passes p_score=25 for a thumbs-up rating', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc8', 25);

    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_score).toBe(25);
  });
});

// ────────────────────────────────────────────────────────────
// TC9 — scoreModerator UNFAIR thumbs-down sends p_score=0
// Spec §5: "thumbs-down (score=0)"
// ────────────────────────────────────────────────────────────

describe('TC9 — scoreModerator: UNFAIR thumbs-down sends p_score=0', () => {
  it('passes p_score=0 and value is non-negative', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc9', 0);

    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_score).toBe(0);
    expect(args.p_score).toBeGreaterThanOrEqual(0);
  });
});

// ────────────────────────────────────────────────────────────
// TC10 — scoreModerator placeholder returns success without RPC
// Spec §5 renders scoring UI only when debate.moderatorId is present;
// placeholder mode bypasses the RPC entirely.
// ────────────────────────────────────────────────────────────

describe('TC10 — scoreModerator: placeholder returns { success: true } without RPC', () => {
  it('skips safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await scoreModerator('debate-tc10', 25);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// TC11 — scoreModerator returns { success: false, error } on RPC error
// Spec §5: RPC validates role, range, debate state — server can reject
// ────────────────────────────────────────────────────────────

describe('TC11 — scoreModerator: returns { success: false, error } on RPC error', () => {
  it('surfaces error from RPC rejection', async () => {
    mockSafeRpc.mockResolvedValue({
      data: null,
      error: { message: 'Permission denied: not a participant' },
    });

    const result = await scoreModerator('debate-tc11', 25);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});

// ────────────────────────────────────────────────────────────
// TC12 — scoreModerator null data fallback returns { success: true }
// Spec §5: RPC returns {success, role, score, new_approval} — but null is
// a valid no-op return; function must not crash on null data
// ────────────────────────────────────────────────────────────

describe('TC12 — scoreModerator: null data fallback returns { success: true }', () => {
  it('returns success=true when RPC data is null but no error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    const result = await scoreModerator('debate-tc12', 25);

    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// TC13 — assignModerator rejects non-UUID moderatorId before RPC
// Spec §1 / DB contract: UUIDs must be validated before PostgREST filters
// ────────────────────────────────────────────────────────────

describe('TC13 — assignModerator: non-UUID moderatorId returns error without RPC call', () => {
  it('returns { success: false, error } and does not call safeRpc', async () => {
    mockIsUUID.mockReturnValue(false);

    const result = await assignModerator('debate-1', 'not-a-uuid');

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });
});

// ────────────────────────────────────────────────────────────
// TC14 — assignModerator null moderatorId skips UUID check
// Spec §1: removing a moderator (null) is a valid path
// ────────────────────────────────────────────────────────────

describe('TC14 — assignModerator: null moderatorId skips UUID check and calls RPC', () => {
  it('calls assign_moderator with p_moderator_id=null', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await assignModerator('debate-1', null);

    expect(mockSafeRpc).toHaveBeenCalledWith('assign_moderator', expect.objectContaining({
      p_moderator_id: null,
    }));
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// TC15 — assignModerator defaults moderator_type to 'human'
// Spec §1: when a human moderator is assigned from the marketplace,
// type is 'human' (not 'ai') unless explicitly overridden
// ────────────────────────────────────────────────────────────

describe('TC15 — assignModerator: defaults moderator_type to human when not supplied', () => {
  it('sends p_moderator_type=human when argument is omitted', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    mockIsUUID.mockReturnValue(true);

    await assignModerator('debate-1', validUuid);

    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_moderator_type).toBe('human');
  });

  it('sends placeholder return with moderator_type=ai when in placeholder mode and no type given', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    mockIsUUID.mockReturnValue(true);

    const result = await assignModerator('debate-1', validUuid);

    expect(result.moderator_type).toBe('ai');
  });
});

// ────────────────────────────────────────────────────────────
// TC16 — ARCH: only imports from allowed modules
// ────────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.moderator.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './auth.rpc.ts', './auth.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/auth.moderator.ts'), 'utf-8');
    const importLines = source.split('\n').filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
