/**
 * Integration test: src/pages/profile-depth.section.ts → src/contracts/rpc-schemas.ts
 * Seam #075
 *
 * Covers:
 *  TC-01 ARCH   — profile-depth.section.ts statically imports increment_questions_answered
 *                 and claim_section_reward from contracts/rpc-schemas
 *  TC-02        — increment_questions_answered schema accepts { ok: true, questions_answered: 5 }
 *  TC-03        — increment_questions_answered schema accepts partial (ok only)
 *  TC-04        — increment_questions_answered schema accepts error path { ok: false, error: '...' }
 *  TC-05        — claim_section_reward schema accepts { success: true, power_up_name: 'shield' }
 *  TC-06        — claim_section_reward schema accepts partial (success only)
 *  TC-07        — claim_section_reward schema accepts error path { success: false, error: '...' }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
    from: mockFrom,
  })),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ── TC-01: ARCH ───────────────────────────────────────────────────────────────
describe('TC-01 ARCH — profile-depth.section.ts imports rpc-schemas exports', () => {
  it('has import lines referencing increment_questions_answered and claim_section_reward from rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/profile-depth.section.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaLine = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaLine).toBeDefined();
    expect(schemaLine).toContain('increment_questions_answered');
    expect(schemaLine).toContain('claim_section_reward');
  });
});

// ── TC-02: increment_questions_answered schema — full ok shape ────────────────
describe('TC-02 — increment_questions_answered schema accepts { ok: true, questions_answered: 5 }', () => {
  it('parses a complete success response without throwing', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({
      ok: true,
      questions_answered: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(true);
      expect(result.data.questions_answered).toBe(5);
    }
  });
});

// ── TC-03: increment_questions_answered schema — partial (ok only) ────────────
describe('TC-03 — increment_questions_answered schema accepts partial response (ok only)', () => {
  it('parses a response with only the ok field (all fields optional)', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({ ok: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(false);
    }
  });
});

// ── TC-04: increment_questions_answered schema — error path ──────────────────
describe('TC-04 — increment_questions_answered schema accepts error path', () => {
  it('parses { ok: false, error: "unauthorized" } without throwing', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({
      ok: false,
      error: 'unauthorized',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(false);
      expect(result.data.error).toBe('unauthorized');
    }
  });
});

// ── TC-05: claim_section_reward schema — success with power_up_name ──────────
describe('TC-05 — claim_section_reward schema accepts { success: true, power_up_name: "shield" }', () => {
  it('parses a valid claim success response', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { claim_section_reward } = await import('../../src/contracts/rpc-schemas.ts');
    const result = claim_section_reward.safeParse({
      success: true,
      power_up_name: 'shield',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.power_up_name).toBe('shield');
    }
  });
});

// ── TC-06: claim_section_reward schema — partial (success only) ───────────────
describe('TC-06 — claim_section_reward schema accepts partial response (success only)', () => {
  it('parses a response with only the success field', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { claim_section_reward } = await import('../../src/contracts/rpc-schemas.ts');
    const result = claim_section_reward.safeParse({ success: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });
});

// ── TC-07: claim_section_reward schema — error path ──────────────────────────
describe('TC-07 — claim_section_reward schema accepts error path', () => {
  it('parses { success: false, error: "already claimed" } without throwing', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { claim_section_reward } = await import('../../src/contracts/rpc-schemas.ts');
    const result = claim_section_reward.safeParse({
      success: false,
      error: 'already claimed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('already claimed');
    }
  });
});
