import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

const mockGetTier = vi.hoisted(() => vi.fn());
const mockGetPowerUpSlots = vi.hoisted(() => vi.fn());
const mockGetNextTier = vi.hoisted(() => vi.fn());

vi.mock('../src/tiers.ts', () => ({
  getTier: mockGetTier,
  getPowerUpSlots: mockGetPowerUpSlots,
  getNextTier: mockGetNextTier,
}));

vi.mock('../src/powerups.types.ts', () => ({
  CATALOG: {},
}));

const mockEquip = vi.hoisted(() => vi.fn());

vi.mock('../src/powerups.rpc.ts', () => ({
  equip: mockEquip,
}));

import { renderLoadout, wireLoadout } from '../src/powerups.loadout.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildInventoryItem(overrides: Record<string, unknown> = {}) {
  return {
    power_up_id: 'shield',
    icon: '🛡️',
    name: 'Shield',
    quantity: 2,
    ...overrides,
  };
}

function buildEquippedItem(overrides: Record<string, unknown> = {}) {
  return {
    power_up_id: 'shield',
    slot_number: 1,
    icon: '🛡️',
    name: 'Shield',
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetTier.mockReturnValue({ name: 'Bronze', icon: '🥉' });
  mockGetPowerUpSlots.mockReturnValue(2);
  mockGetNextTier.mockReturnValue({ questionsNeeded: 10 });
  mockEquip.mockReset();
  document.body.innerHTML = '';
});

// ── renderLoadout ──────────────────────────────────────────────

describe('TC1 — renderLoadout locked state when maxSlots is 0', () => {
  it('returns POWER-UPS locked UI when getPowerUpSlots returns 0', () => {
    mockGetPowerUpSlots.mockReturnValue(0);
    const html = renderLoadout([], [], 0, 'debate-1');
    expect(html).toContain('POWER-UPS 🔒');
    expect(html).toContain('more questions to unlock');
  });
});

describe('TC2 — renderLoadout shows POWER-UPS heading when slots > 0', () => {
  it('returns HTML with POWER-UPS heading when getPowerUpSlots returns 2', () => {
    const html = renderLoadout([], [], 20, 'debate-1');
    expect(html).toContain('POWER-UPS');
  });
});

describe('TC3 — renderLoadout shows inventory items with quantity > 0', () => {
  it('includes inventory item HTML when quantity is positive', () => {
    const html = renderLoadout([buildInventoryItem() as never], [], 20, 'debate-1');
    expect(html).toContain('powerup-inv-item');
  });
});

describe('TC4 — renderLoadout filters out inventory items with quantity 0', () => {
  it('does not render item when quantity is 0', () => {
    const html = renderLoadout([buildInventoryItem({ quantity: 0 }) as never], [], 20, 'debate-1');
    expect(html).not.toContain('powerup-inv-item');
  });
});

describe('TC5 — renderLoadout shows filled slot for equipped item', () => {
  it('renders powerup-slot filled for equipped item in slot 1', () => {
    const html = renderLoadout([], [buildEquippedItem() as never], 20, 'debate-1');
    expect(html).toContain('powerup-slot filled');
  });
});

describe('TC6 — renderLoadout uses escapeHTML (import contract)', () => {
  it('escapeHTML is called during render', () => {
    renderLoadout([buildInventoryItem() as never], [], 20, 'debate-1');
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC7 — renderLoadout uses getTier and getPowerUpSlots (import contracts)', () => {
  it('both tiers.ts imports are called', () => {
    renderLoadout([], [], 20, 'debate-1');
    expect(mockGetTier).toHaveBeenCalled();
    expect(mockGetPowerUpSlots).toHaveBeenCalled();
  });
});

// ── wireLoadout ────────────────────────────────────────────────

function mountLoadout(hasInventoryItem = true) {
  document.body.innerHTML = `
    <div class="powerup-slot empty" data-slot="1">Slot 1</div>
    <div id="powerup-inventory-picker" style="display:none;"></div>
    ${hasInventoryItem ? '<div class="powerup-inv-item" data-id="shield">Shield</div>' : ''}
    <div id="powerup-equip-error" style="display:none;"></div>`;
}

describe('TC8 — wireLoadout empty slot click shows inventory picker', () => {
  it('sets inventory picker display to block on empty slot click', () => {
    mountLoadout();
    wireLoadout('debate-1');

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();

    const picker = document.getElementById('powerup-inventory-picker');
    expect(picker?.style.display).toBe('block');
  });
});

describe('TC9 — wireLoadout inventory item click calls equip', () => {
  it('calls equip after selecting a slot then clicking an inventory item', async () => {
    mockEquip.mockResolvedValue({ success: true });
    mountLoadout();
    wireLoadout('debate-abc');

    // Select slot first
    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    // Then click inventory item
    (document.querySelector('.powerup-inv-item') as HTMLElement).click();

    await vi.waitFor(() => expect(mockEquip).toHaveBeenCalledWith('debate-abc', 'shield', 1));
  });
});

describe('TC10 — wireLoadout equip success calls onEquipped callback', () => {
  it('fires onEquipped with result on successful equip', async () => {
    const result = { success: true as const };
    mockEquip.mockResolvedValue(result);
    mountLoadout();
    const cb = vi.fn();
    wireLoadout('debate-abc', cb);

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    (document.querySelector('.powerup-inv-item') as HTMLElement).click();

    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(result));
  });
});

describe('TC11 — wireLoadout equip failure shows error element', () => {
  it('shows error message in powerup-equip-error on failure', async () => {
    mockEquip.mockResolvedValue({ success: false, error: 'Slot unavailable' });
    mountLoadout();
    wireLoadout('debate-abc');

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    (document.querySelector('.powerup-inv-item') as HTMLElement).click();

    const errorEl = document.getElementById('powerup-equip-error');
    await vi.waitFor(() => expect(errorEl?.style.display).toBe('block'));
    expect(errorEl?.textContent).toBe('Slot unavailable');
  });
});

describe('TC12 — wireLoadout inventory item click without slot selection is no-op', () => {
  it('does not call equip when no slot is selected', async () => {
    mountLoadout();
    wireLoadout('debate-abc');

    // Click inventory item without first selecting a slot
    (document.querySelector('.powerup-inv-item') as HTMLElement).click();
    await new Promise(r => setTimeout(r, 50));

    expect(mockEquip).not.toHaveBeenCalled();
  });
});

describe('TC13 — equip import contract', () => {
  it('wireLoadout calls the equip mock from powerups.rpc', async () => {
    mockEquip.mockResolvedValue({ success: true });
    mountLoadout();
    wireLoadout('debate-x');

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    (document.querySelector('.powerup-inv-item') as HTMLElement).click();

    await vi.waitFor(() => expect(mockEquip).toHaveBeenCalled());
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — powerups.loadout.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './tiers.ts', './powerups.types.ts', './powerups.rpc.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/powerups.loadout.ts'),
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
