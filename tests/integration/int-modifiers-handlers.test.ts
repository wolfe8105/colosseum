/**
 * Integration tests — seam #564
 * src/modifiers-handlers.ts → modifiers-rpc
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// ARCH filter — imports from modifiers-handlers.ts
// ---------------------------------------------------------------------------
// from './config.ts'
// from './modifiers-rpc.ts'

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js (mandatory — only this package)
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Shared mocks for config and modifiers-rpc
// ---------------------------------------------------------------------------
const mockShowToast = vi.fn();
const mockBuyModifier = vi.fn();
const mockBuyPowerup = vi.fn();
const mockEquipPowerupForDebate = vi.fn();

vi.mock('../../src/config.ts', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
  ModeratorConfig: {
    escapeHTML: (s: string) => s,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

vi.mock('../../src/modifiers-rpc.ts', () => ({
  buyModifier: (...args: unknown[]) => mockBuyModifier(...args),
  buyPowerup: (...args: unknown[]) => mockBuyPowerup(...args),
  equipPowerupForDebate: (...args: unknown[]) => mockEquipPowerupForDebate(...args),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('modifiers-handlers → modifiers-rpc seam (#564)', () => {
  let handleBuyModifier: (effectId: string, effectName: string) => Promise<boolean>;
  let handleBuyPowerup: (effectId: string, effectName: string, quantity?: number) => Promise<boolean>;
  let handleEquip: (debateId: string, effectId: string, effectName: string) => Promise<boolean>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockShowToast.mockClear();
    mockBuyModifier.mockClear();
    mockBuyPowerup.mockClear();
    mockEquipPowerupForDebate.mockClear();

    const mod = await import('../../src/modifiers-handlers.ts');
    handleBuyModifier = mod.handleBuyModifier;
    handleBuyPowerup = mod.handleBuyPowerup;
    handleEquip = mod.handleEquip;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC-1: handleBuyModifier success
  it('TC-1: handleBuyModifier returns true and shows success toast on success', async () => {
    mockBuyModifier.mockResolvedValueOnce({ success: true, modifier_id: 'mod-123', cost: 50 });

    const result = await handleBuyModifier('effect-abc', 'Speed Boost');

    expect(result).toBe(true);
    expect(mockBuyModifier).toHaveBeenCalledWith('effect-abc');
    expect(mockShowToast).toHaveBeenCalledWith('Speed Boost modifier added to inventory', 'success');
  });

  // TC-2: handleBuyModifier failure with error message
  it('TC-2: handleBuyModifier returns false and shows error toast on failure', async () => {
    mockBuyModifier.mockResolvedValueOnce({ success: false, error: 'Insufficient tokens' });

    const result = await handleBuyModifier('effect-abc', 'Speed Boost');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Insufficient tokens', 'error');
  });

  // TC-3: handleBuyModifier failure with no error message falls back to default
  it('TC-3: handleBuyModifier shows fallback "Purchase failed" when error is undefined', async () => {
    mockBuyModifier.mockResolvedValueOnce({ success: false });

    const result = await handleBuyModifier('effect-xyz', 'Power Shield');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Purchase failed', 'error');
  });

  // TC-4: handleBuyPowerup success shows quantity in toast
  it('TC-4: handleBuyPowerup returns true and shows "×quantity" in toast on success', async () => {
    mockBuyPowerup.mockResolvedValueOnce({ success: true, new_quantity: 5, cost: 30 });

    const result = await handleBuyPowerup('powerup-def', 'Double XP', 3);

    expect(result).toBe(true);
    expect(mockBuyPowerup).toHaveBeenCalledWith('powerup-def', 3);
    expect(mockShowToast).toHaveBeenCalledWith('Double XP ×3 added to inventory', 'success');
  });

  // TC-5: handleBuyPowerup failure shows error toast
  it('TC-5: handleBuyPowerup returns false and shows error toast on failure', async () => {
    mockBuyPowerup.mockResolvedValueOnce({ success: false, error: 'Out of stock' });

    const result = await handleBuyPowerup('powerup-def', 'Double XP', 2);

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Out of stock', 'error');
  });

  // TC-6: handleEquip success shows slot count in toast
  it('TC-6: handleEquip returns true and shows slot info in toast on success', async () => {
    mockEquipPowerupForDebate.mockResolvedValueOnce({ success: true, slots_used: 2 });

    const result = await handleEquip('debate-999', 'powerup-ghi', 'Time Warp');

    expect(result).toBe(true);
    expect(mockEquipPowerupForDebate).toHaveBeenCalledWith('debate-999', 'powerup-ghi');
    expect(mockShowToast).toHaveBeenCalledWith('Time Warp equipped (slot 2/3)', 'success');
  });

  // TC-7: handleEquip failure shows fallback "Equip failed" when no error message
  it('TC-7: handleEquip returns false and shows "Equip failed" fallback when error is undefined', async () => {
    mockEquipPowerupForDebate.mockResolvedValueOnce({ success: false });

    const result = await handleEquip('debate-999', 'powerup-ghi', 'Time Warp');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Equip failed', 'error');
  });
});
