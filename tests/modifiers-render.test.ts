import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import {
  tierLabel,
  timingLabel,
  categoryLabel,
  rarityClass,
  renderEffectCard,
  renderModifierRow,
  renderPowerupRow,
} from '../src/modifiers-render.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
});

// ── Fixtures ───────────────────────────────────────────────────

function buildEffect(overrides: Record<string, unknown> = {}) {
  return {
    id: 'effect-001',
    name: 'Iron Will',
    description: 'Boosts your elo gain by 10%.',
    tier_gate: 'rare' as const,
    timing: 'in_debate' as const,
    category: 'elo_xp' as const,
    mod_cost: 100,
    pu_cost: 50,
    ...overrides,
  };
}

function buildOwnedModifier(overrides: Record<string, unknown> = {}) {
  return {
    modifier_id: 'mod-001',
    name: 'Iron Will',
    description: 'Boost elo gain.',
    tier_gate: 'uncommon' as const,
    timing: 'end_of_debate' as const,
    ...overrides,
  };
}

function buildPowerUpStock(overrides: Record<string, unknown> = {}) {
  return {
    effect_id: 'pu-001',
    name: 'Surge',
    description: 'Double points next round.',
    timing: 'in_debate' as const,
    quantity: 3,
    ...overrides,
  };
}

// ── tierLabel ──────────────────────────────────────────────────

describe('TC1 — tierLabel capitalises first letter', () => {
  it('returns Capitalised form for each tier', () => {
    expect(tierLabel('common')).toBe('Common');
    expect(tierLabel('uncommon')).toBe('Uncommon');
    expect(tierLabel('rare')).toBe('Rare');
    expect(tierLabel('legendary')).toBe('Legendary');
    expect(tierLabel('mythic')).toBe('Mythic');
  });
});

// ── timingLabel ────────────────────────────────────────────────

describe('TC2 — timingLabel maps timing values', () => {
  it('returns Post-Match for end_of_debate', () => {
    expect(timingLabel('end_of_debate')).toBe('Post-Match');
  });

  it('returns In-Debate for in_debate', () => {
    expect(timingLabel('in_debate')).toBe('In-Debate');
  });
});

// ── categoryLabel ──────────────────────────────────────────────

describe('TC3 — categoryLabel maps all known categories', () => {
  it('returns correct label for every mapped category', () => {
    expect(categoryLabel('token')).toBe('Token');
    expect(categoryLabel('point')).toBe('Point');
    expect(categoryLabel('reference')).toBe('Reference');
    expect(categoryLabel('elo_xp')).toBe('Elo / XP');
    expect(categoryLabel('crowd')).toBe('Crowd');
    expect(categoryLabel('survival')).toBe('Survival');
    expect(categoryLabel('self_mult')).toBe('Multiplier');
    expect(categoryLabel('self_flat')).toBe('Flat Bonus');
    expect(categoryLabel('opponent_debuff')).toBe('Debuff');
    expect(categoryLabel('cite_triggered')).toBe('Cite');
    expect(categoryLabel('conditional')).toBe('Conditional');
    expect(categoryLabel('special')).toBe('Special');
  });

  it('falls back to the raw key for unknown categories', () => {
    expect(categoryLabel('unknown_cat' as never)).toBe('unknown_cat');
  });
});

// ── rarityClass ────────────────────────────────────────────────

describe('TC4 — rarityClass is an identity function', () => {
  it('returns the tier string unchanged', () => {
    expect(rarityClass('common')).toBe('common');
    expect(rarityClass('legendary')).toBe('legendary');
  });
});

// ── renderEffectCard ───────────────────────────────────────────

describe('TC5 — renderEffectCard includes effect name and description', () => {
  it('returns HTML containing the effect name and description', () => {
    const html = renderEffectCard(buildEffect());
    expect(html).toContain('Iron Will');
    expect(html).toContain('Boosts your elo gain by 10%.');
  });
});

describe('TC6 — renderEffectCard uses escapeHTML on user content', () => {
  it('calls escapeHTML for effect name and description', () => {
    renderEffectCard(buildEffect());
    const calls = mockEscapeHTML.mock.calls.map(c => c[0]);
    expect(calls).toContain('Iron Will');
    expect(calls).toContain('Boosts your elo gain by 10%.');
  });
});

describe('TC7 — renderEffectCard escapeHTML import contract', () => {
  it('uses escapeHTML from config (mock is called)', () => {
    renderEffectCard(buildEffect());
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC8 — renderEffectCard in_debate timing badge', () => {
  it('includes the In-Debate badge for in_debate timing', () => {
    const html = renderEffectCard(buildEffect({ timing: 'in_debate' }));
    expect(html).toContain('mod-timing-badge--live');
    expect(html).toContain('In-Debate');
  });
});

describe('TC9 — renderEffectCard end_of_debate timing badge', () => {
  it('includes the Post-Match badge for end_of_debate timing', () => {
    const html = renderEffectCard(buildEffect({ timing: 'end_of_debate' }));
    expect(html).toContain('mod-timing-badge--post');
    expect(html).toContain('Post-Match');
  });
});

describe('TC10 — renderEffectCard buy buttons are conditional', () => {
  it('includes modifier buy button when showModButton is true', () => {
    const html = renderEffectCard(buildEffect(), { showModButton: true });
    expect(html).toContain('mod-buy-btn--modifier');
  });

  it('excludes modifier buy button when showModButton is false', () => {
    const html = renderEffectCard(buildEffect(), { showModButton: false });
    expect(html).not.toContain('mod-buy-btn--modifier');
  });

  it('includes powerup buy button when showPuButton is true', () => {
    const html = renderEffectCard(buildEffect(), { showPuButton: true });
    expect(html).toContain('mod-buy-btn--powerup');
  });
});

describe('TC11 — renderEffectCard tier_gate drives rarity class', () => {
  it('includes the rarity CSS class matching tier_gate', () => {
    const html = renderEffectCard(buildEffect({ tier_gate: 'legendary' }));
    expect(html).toContain('mod-effect-card--legendary');
    expect(html).toContain('mod-rarity-badge--legendary');
  });
});

// ── renderModifierRow ──────────────────────────────────────────

describe('TC12 — renderModifierRow includes name and description', () => {
  it('returns HTML containing the modifier name and description', () => {
    const html = renderModifierRow(buildOwnedModifier());
    expect(html).toContain('Iron Will');
    expect(html).toContain('Boost elo gain.');
  });
});

describe('TC13 — renderModifierRow socket button is conditional', () => {
  it('includes socket button when showSocketButton is true', () => {
    const html = renderModifierRow(buildOwnedModifier(), { showSocketButton: true });
    expect(html).toContain('mod-socket-btn');
  });

  it('excludes socket button by default', () => {
    const html = renderModifierRow(buildOwnedModifier());
    expect(html).not.toContain('mod-socket-btn');
  });
});

describe('TC14 — renderModifierRow timing badge', () => {
  it('uses post timing badge for end_of_debate', () => {
    const html = renderModifierRow(buildOwnedModifier({ timing: 'end_of_debate' }));
    expect(html).toContain('mod-timing-badge--post');
    expect(html).toContain('Post-Match');
  });

  it('uses live timing badge for in_debate', () => {
    const html = renderModifierRow(buildOwnedModifier({ timing: 'in_debate' }));
    expect(html).toContain('mod-timing-badge--live');
  });
});

// ── renderPowerupRow ───────────────────────────────────────────

describe('TC15 — renderPowerupRow includes name and description', () => {
  it('returns HTML containing the powerup name and description', () => {
    const html = renderPowerupRow(buildPowerUpStock());
    expect(html).toContain('Surge');
    expect(html).toContain('Double points next round.');
  });
});

describe('TC16 — renderPowerupRow shows quantity', () => {
  it('includes ×N quantity display', () => {
    const html = renderPowerupRow(buildPowerUpStock({ quantity: 7 }));
    expect(html).toContain('×7');
  });
});

describe('TC17 — renderPowerupRow equip button requires both flags', () => {
  it('includes equip button when showEquipButton and debateId are both provided', () => {
    const html = renderPowerupRow(buildPowerUpStock(), { showEquipButton: true, debateId: 'debate-abc' });
    expect(html).toContain('mod-equip-btn');
    expect(html).toContain('debate-abc');
  });

  it('excludes equip button when debateId is missing', () => {
    const html = renderPowerupRow(buildPowerUpStock(), { showEquipButton: true });
    expect(html).not.toContain('mod-equip-btn');
  });
});

// ── ARCH — import structure ────────────────────────────────────

describe('ARCH — modifiers-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './modifiers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/modifiers-render.ts'),
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
