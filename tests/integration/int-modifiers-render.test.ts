/**
 * Integration tests — src/modifiers-render.ts
 * Seam #162 | modifiers-render → modifiers (types only)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// modifiers-render.ts has no Supabase usage — it's a pure render helper.
// Mock @supabase/supabase-js per mandatory pattern even though it isn't used.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn(), getUser: vi.fn() },
  })),
}));

// ARCH filter: verify no wall imports
describe('ARCH — modifiers-render.ts import wall check', () => {
  it('does not import any wall modules', async () => {
    const src = await import('../../src/modifiers-render.ts?raw');
    const importLines = src.default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));

    const WALL = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];

    for (const line of importLines) {
      for (const wall of WALL) {
        expect(line, `wall import "${wall}" found`).not.toContain(wall);
      }
    }
  });
});

// ----------------------------------------------------------------
// TC-1: tierLabel capitalises first letter
// ----------------------------------------------------------------
describe('tierLabel', () => {
  let tierLabel: (tier: string) => string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    tierLabel = mod.tierLabel;
  });

  it('capitalises "common"', () => {
    expect(tierLabel('common')).toBe('Common');
  });

  it('capitalises "uncommon"', () => {
    expect(tierLabel('uncommon')).toBe('Uncommon');
  });

  it('capitalises "legendary"', () => {
    expect(tierLabel('legendary')).toBe('Legendary');
  });

  it('capitalises "mythic"', () => {
    expect(tierLabel('mythic')).toBe('Mythic');
  });
});

// ----------------------------------------------------------------
// TC-2: timingLabel returns correct display string
// ----------------------------------------------------------------
describe('timingLabel', () => {
  let timingLabel: (timing: string) => string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    timingLabel = mod.timingLabel;
  });

  it('maps end_of_debate → Post-Match', () => {
    expect(timingLabel('end_of_debate')).toBe('Post-Match');
  });

  it('maps in_debate → In-Debate', () => {
    expect(timingLabel('in_debate')).toBe('In-Debate');
  });
});

// ----------------------------------------------------------------
// TC-3: categoryLabel maps all known categories and falls back
// ----------------------------------------------------------------
describe('categoryLabel', () => {
  let categoryLabel: (cat: string) => string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    categoryLabel = mod.categoryLabel;
  });

  it('maps elo_xp → Elo / XP', () => {
    expect(categoryLabel('elo_xp')).toBe('Elo / XP');
  });

  it('maps opponent_debuff → Debuff', () => {
    expect(categoryLabel('opponent_debuff')).toBe('Debuff');
  });

  it('maps crowd → Crowd', () => {
    expect(categoryLabel('crowd')).toBe('Crowd');
  });

  it('falls back to raw value for unknown category', () => {
    expect(categoryLabel('unknown_cat')).toBe('unknown_cat');
  });
});

// ----------------------------------------------------------------
// TC-4: renderEffectCard — default (no buttons)
// ----------------------------------------------------------------
describe('renderEffectCard — default', () => {
  let renderEffectCard: Function;

  const effect = {
    id: 'eff-001',
    effect_num: 1,
    name: 'Fire Boost',
    description: 'Boosts fire damage',
    category: 'point' as const,
    timing: 'in_debate' as const,
    tier_gate: 'rare' as const,
    mod_cost: 50,
    pu_cost: 20,
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    renderEffectCard = mod.renderEffectCard;
  });

  it('includes data-effect-id attribute', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('data-effect-id="eff-001"');
  });

  it('includes escaped name', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('Fire Boost');
  });

  it('includes escaped description', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('Boosts fire damage');
  });

  it('includes rarity badge with tier class', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('mod-rarity-badge--rare');
  });

  it('includes category tag with Point label', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('mod-category-tag');
    expect(html).toContain('Point');
  });

  it('includes in-debate timing badge', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('mod-timing-badge--live');
    expect(html).toContain('In-Debate');
  });

  it('does not include buy buttons by default', () => {
    const html = renderEffectCard(effect);
    expect(html).not.toContain('mod-buy-btn');
  });

  it('escapes XSS in name', () => {
    const xssEffect = { ...effect, name: '<script>alert(1)</script>' };
    const html = renderEffectCard(xssEffect);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ----------------------------------------------------------------
// TC-5: renderEffectCard — with showModButton and custom label
// ----------------------------------------------------------------
describe('renderEffectCard — with mod button', () => {
  let renderEffectCard: Function;

  const effect = {
    id: 'eff-002',
    effect_num: 2,
    name: 'Ice Shield',
    description: 'Blocks damage',
    category: 'survival' as const,
    timing: 'end_of_debate' as const,
    tier_gate: 'uncommon' as const,
    mod_cost: 30,
    pu_cost: 15,
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    renderEffectCard = mod.renderEffectCard;
  });

  it('includes mod-buy-btn--modifier when showModButton is true', () => {
    const html = renderEffectCard(effect, { showModButton: true });
    expect(html).toContain('mod-buy-btn--modifier');
  });

  it('uses custom modButtonLabel when provided', () => {
    const html = renderEffectCard(effect, { showModButton: true, modButtonLabel: 'Test Buy' });
    expect(html).toContain('Test Buy');
  });

  it('uses default label with mod_cost when no custom label', () => {
    const html = renderEffectCard(effect, { showModButton: true });
    expect(html).toContain('30');
    expect(html).toContain('tokens');
  });

  it('includes mod button data-effect-id', () => {
    const html = renderEffectCard(effect, { showModButton: true });
    expect(html).toContain('data-effect-id="eff-002"');
  });

  it('includes pu button when showPuButton is true', () => {
    const html = renderEffectCard(effect, { showPuButton: true });
    expect(html).toContain('mod-buy-btn--powerup');
  });

  it('shows post-match timing badge for end_of_debate', () => {
    const html = renderEffectCard(effect);
    expect(html).toContain('mod-timing-badge--post');
    expect(html).toContain('Post-Match');
  });
});

// ----------------------------------------------------------------
// TC-6: renderModifierRow — with and without socket button
// ----------------------------------------------------------------
describe('renderModifierRow', () => {
  let renderModifierRow: Function;

  const mod = {
    modifier_id: 'mod-abc',
    effect_id: 'eff-003',
    name: 'Thunder Strike',
    description: 'Adds thunder',
    category: 'point' as const,
    timing: 'in_debate' as const,
    tier_gate: 'legendary' as const,
    acquired_at: '2026-01-01',
    acquisition_type: 'purchase' as const,
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const modMod = await import('../../src/modifiers-render.ts');
    renderModifierRow = modMod.renderModifierRow;
  });

  it('includes mod-inventory-row with data-modifier-id', () => {
    const html = renderModifierRow(mod);
    expect(html).toContain('mod-inventory-row');
    expect(html).toContain('data-modifier-id="mod-abc"');
  });

  it('includes escaped name', () => {
    const html = renderModifierRow(mod);
    expect(html).toContain('Thunder Strike');
  });

  it('includes rarity badge for legendary tier', () => {
    const html = renderModifierRow(mod);
    expect(html).toContain('mod-rarity-badge--legendary');
    expect(html).toContain('Legendary');
  });

  it('includes in-debate timing badge', () => {
    const html = renderModifierRow(mod);
    expect(html).toContain('mod-timing-badge--live');
    expect(html).toContain('In-Debate');
  });

  it('does not include socket button by default', () => {
    const html = renderModifierRow(mod);
    expect(html).not.toContain('mod-socket-btn');
  });

  it('includes socket button with data-modifier-id when showSocketButton is true', () => {
    const html = renderModifierRow(mod, { showSocketButton: true });
    expect(html).toContain('mod-socket-btn');
    expect(html).toContain('data-modifier-id="mod-abc"');
    expect(html).toContain('Socket');
  });

  it('escapes XSS in description', () => {
    const xssMod = { ...mod, description: '<img onerror="evil()">' };
    const html = renderModifierRow(xssMod);
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;img');
  });
});

// ----------------------------------------------------------------
// TC-7: renderPowerupRow — equip button logic
// ----------------------------------------------------------------
describe('renderPowerupRow', () => {
  let renderPowerupRow: Function;

  const pu = {
    effect_id: 'eff-pu-001',
    name: 'Speed Surge',
    description: 'Boost speed',
    category: 'self_flat' as const,
    timing: 'in_debate' as const,
    tier_gate: 'common' as const,
    quantity: 3,
    pu_cost: 10,
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/modifiers-render.ts');
    renderPowerupRow = mod.renderPowerupRow;
  });

  it('includes mod-powerup-row with data-effect-id', () => {
    const html = renderPowerupRow(pu);
    expect(html).toContain('mod-powerup-row');
    expect(html).toContain('data-effect-id="eff-pu-001"');
  });

  it('shows quantity as ×3 using Number()', () => {
    const html = renderPowerupRow(pu);
    expect(html).toContain('×3');
  });

  it('includes escaped name', () => {
    const html = renderPowerupRow(pu);
    expect(html).toContain('Speed Surge');
  });

  it('does not include equip button by default', () => {
    const html = renderPowerupRow(pu);
    expect(html).not.toContain('mod-equip-btn');
  });

  it('does not include equip button when showEquipButton=true but no debateId', () => {
    const html = renderPowerupRow(pu, { showEquipButton: true });
    expect(html).not.toContain('mod-equip-btn');
  });

  it('includes equip button with data-debate-id when both showEquipButton and debateId provided', () => {
    const html = renderPowerupRow(pu, { showEquipButton: true, debateId: 'debate-abc' });
    expect(html).toContain('mod-equip-btn');
    expect(html).toContain('data-debate-id="debate-abc"');
    expect(html).toContain('data-effect-id="eff-pu-001"');
  });

  it('escapes debateId in equip button to prevent XSS', () => {
    const html = renderPowerupRow(pu, { showEquipButton: true, debateId: '<bad>"id"' });
    expect(html).not.toContain('"<bad>"');
    expect(html).toContain('&lt;bad&gt;');
  });

  it('includes timing badge for in_debate', () => {
    const html = renderPowerupRow(pu);
    expect(html).toContain('mod-timing-badge--live');
  });

  it('includes timing badge for end_of_debate', () => {
    const puPost = { ...pu, timing: 'end_of_debate' as const };
    const html = renderPowerupRow(puPost);
    expect(html).toContain('mod-timing-badge--post');
  });
});
