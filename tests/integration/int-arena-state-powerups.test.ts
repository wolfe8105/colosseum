// ============================================================
// INTEGRATOR — arena-state + powerups.overlays + powerups.types
// Boundary: EquippedItem data stored in arena-state.equippedForDebate
//           flows into powerups.overlays functions (hasMultiplier,
//           renderRevealPopup, renderShieldIndicator).
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let equippedForDebate: import('../../src/powerups.types.ts').EquippedItem[];
let activatedPowerUps: Set<string>;
let set_equippedForDebate: (v: import('../../src/powerups.types.ts').EquippedItem[]) => void;
let set_activatedPowerUps: (v: Set<string>) => void;
let set_shieldActive: (v: boolean) => void;
let resetState: () => void;

let hasMultiplier: (equipped: import('../../src/powerups.types.ts').EquippedItem[]) => boolean;
let renderRevealPopup: (equipped: import('../../src/powerups.types.ts').EquippedItem[]) => void;
let renderShieldIndicator: () => HTMLDivElement;
let removeShieldIndicator: () => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = '';

  const stateMod = await import('../../src/arena/arena-state.ts');
  // Use live module bindings via a getter proxy
  equippedForDebate = stateMod.equippedForDebate;
  activatedPowerUps = stateMod.activatedPowerUps;
  set_equippedForDebate = stateMod.set_equippedForDebate as (v: import('../../src/powerups.types.ts').EquippedItem[]) => void;
  set_activatedPowerUps = stateMod.set_activatedPowerUps;
  set_shieldActive = stateMod.set_shieldActive;
  resetState = stateMod.resetState;

  const overlaysMod = await import('../../src/powerups.overlays.ts');
  hasMultiplier = overlaysMod.hasMultiplier;
  renderRevealPopup = overlaysMod.renderRevealPopup;
  renderShieldIndicator = overlaysMod.renderShieldIndicator;
  removeShieldIndicator = overlaysMod.removeShieldIndicator;
});

// ============================================================
// TC-I1: hasMultiplier returns true when equippedForDebate has multiplier_2x
// ============================================================

describe('TC-I1: hasMultiplier with equippedForDebate data from arena-state', () => {
  it('returns true when multiplier_2x is in the equipped list', () => {
    const equipped: import('../../src/powerups.types.ts').EquippedItem[] = [
      { power_up_id: 'multiplier_2x', slot_number: 1 },
    ];
    // set_equippedForDebate wires state; pass equipped directly as hasMultiplier param
    set_equippedForDebate(equipped);
    expect(hasMultiplier(equipped)).toBe(true);
  });

  it('returns false when equipped list has no multiplier', () => {
    const equipped: import('../../src/powerups.types.ts').EquippedItem[] = [
      { power_up_id: 'shield', slot_number: 1 },
      { power_up_id: 'silence', slot_number: 2 },
    ];
    set_equippedForDebate(equipped);
    expect(hasMultiplier(equipped)).toBe(false);
  });

  it('returns false for empty equippedForDebate', () => {
    set_equippedForDebate([]);
    expect(hasMultiplier([])).toBe(false);
  });
});

// ============================================================
// TC-I2: hasMultiplier directly with EquippedItem values
// ============================================================

describe('TC-I2: hasMultiplier logic is correct for all CATALOG powerup IDs', () => {
  it('returns true for multiplier_2x', () => {
    expect(hasMultiplier([{ power_up_id: 'multiplier_2x', slot_number: 1 }])).toBe(true);
  });

  it('returns false for shield, silence, reveal', () => {
    expect(hasMultiplier([{ power_up_id: 'shield', slot_number: 1 }])).toBe(false);
    expect(hasMultiplier([{ power_up_id: 'silence', slot_number: 1 }])).toBe(false);
    expect(hasMultiplier([{ power_up_id: 'reveal', slot_number: 1 }])).toBe(false);
  });
});

// ============================================================
// TC-I3: renderRevealPopup renders CATALOG names/icons from EquippedItem list
// ============================================================

describe('TC-I3: renderRevealPopup renders equipped items using CATALOG data', () => {
  it('shows the powerup name and icon for equipped items', () => {
    const equipped: import('../../src/powerups.types.ts').EquippedItem[] = [
      { power_up_id: 'silence', slot_number: 1 },
      { power_up_id: 'shield', slot_number: 2 },
    ];
    renderRevealPopup(equipped);

    const popup = document.getElementById('powerup-reveal-popup');
    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toContain('Silence');
    expect(popup!.innerHTML).toContain('Shield');
    expect(popup!.innerHTML).toContain('🤫');
    expect(popup!.innerHTML).toContain('🛡️');
    expect(popup!.innerHTML).toContain("OPPONENT'S LOADOUT");
  });

  it('replaces a previous popup rather than stacking', () => {
    renderRevealPopup([{ power_up_id: 'reveal', slot_number: 1 }]);
    renderRevealPopup([{ power_up_id: 'silence', slot_number: 1 }]);

    const popups = document.querySelectorAll('#powerup-reveal-popup');
    expect(popups.length).toBe(1);
  });
});

// ============================================================
// TC-I4: renderRevealPopup shows empty state for no equipped items
// ============================================================

describe('TC-I4: renderRevealPopup shows empty state when no items equipped', () => {
  it('shows "No power-ups equipped" text', () => {
    renderRevealPopup([]);

    const popup = document.getElementById('powerup-reveal-popup');
    expect(popup).not.toBeNull();
    expect(popup!.textContent).toContain('No power-ups equipped');
  });
});

// ============================================================
// TC-I5: renderShieldIndicator creates element; removeShieldIndicator removes it
// ============================================================

describe('TC-I5: shield indicator DOM lifecycle', () => {
  it('renderShieldIndicator creates a shield element in the DOM', () => {
    renderShieldIndicator();
    const indicator = document.getElementById('powerup-shield-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toContain('SHIELD ACTIVE');
  });

  it('removeShieldIndicator removes the shield element', () => {
    renderShieldIndicator();
    expect(document.getElementById('powerup-shield-indicator')).not.toBeNull();
    removeShieldIndicator();
    expect(document.getElementById('powerup-shield-indicator')).toBeNull();
  });

  it('removeShieldIndicator is a no-op when indicator does not exist', () => {
    expect(() => removeShieldIndicator()).not.toThrow();
  });
});

// ============================================================
// TC-I6: resetState clears equippedForDebate and activatedPowerUps in arena-state
// ============================================================

describe('TC-I6: resetState clears powerup-related arena-state fields', () => {
  it('clears equippedForDebate array and activatedPowerUps set', async () => {
    set_equippedForDebate([{ power_up_id: 'shield', slot_number: 1 }]);
    set_activatedPowerUps(new Set(['shield']));
    set_shieldActive(true);

    resetState();

    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.equippedForDebate).toHaveLength(0);
    expect(stateMod.activatedPowerUps.size).toBe(0);
    expect(stateMod.shieldActive).toBe(false);
  });
});

// ============================================================
// ARCH — arena-state.ts imports powerups only as a type
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-state.ts imports from powerups only via import type', () => {
  it('powerups import in arena-state is type-only (no runtime dependency)', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-state.ts'),
      'utf-8'
    );
    const powerupsImportLines = source.split('\n')
      .filter(l => l.includes('powerups'));
    // All powerups imports must be 'import type'
    for (const line of powerupsImportLines) {
      if (line.trimStart().startsWith('import ')) {
        expect(line, `Expected type-only powerups import: ${line}`).toMatch(/import\s+type/);
      }
    }
  });
});
