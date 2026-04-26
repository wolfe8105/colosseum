// ============================================================
// INTEGRATOR — arena-room-end-after-effects.ts → arena-types-results
// Seam #281
// Boundary: renderAfterEffects() consumes EndOfDebateBreakdown from
//           arena-types-results to produce an HTML string breakdown
//           of the modifier chain: Raw → adjustments → Final.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

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

// ============================================================
// MODULE HANDLES
// ============================================================

let renderAfterEffects: (breakdown: unknown, myRole: string) => string;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  const mod = await import('../../src/arena/arena-room-end-after-effects.ts');
  renderAfterEffects = mod.renderAfterEffects;
});

// ============================================================
// ARCH: import lines filter
// ============================================================

describe('ARCH — arena-room-end-after-effects.ts imports', () => {
  it('only mocks @supabase/supabase-js at the boundary', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-after-effects.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    // Must import EndOfDebateBreakdown from arena-types-results
    expect(importLines.some(l => l.includes('arena-types-results'))).toBe(true);
    // Must not pull in any wall modules
    const wallKeywords = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const kw of wallKeywords) {
      expect(importLines.some(l => l.includes(kw))).toBe(false);
    }
  });
});

// ============================================================
// TC-1: null guard — null breakdown returns empty string
// ============================================================

describe('TC-1 — null breakdown returns empty string', () => {
  it('returns "" when breakdown is null', () => {
    const result = renderAfterEffects(null, 'a');
    expect(result).toBe('');
  });
});

// ============================================================
// TC-2: empty adjustments + no inventory_effects returns empty string
// ============================================================

describe('TC-2 — empty adjustments and no inventory_effects returns empty string', () => {
  it('returns "" when all adjustment arrays are empty', () => {
    const breakdown = {
      debater_a: { raw_score: 10, adjustments: [], final_score: 10 },
      debater_b: { raw_score: 8,  adjustments: [], final_score: 8  },
      inventory_effects: [],
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toBe('');
  });

  it('returns "" when inventory_effects is absent and adjustments are empty', () => {
    const breakdown = {
      debater_a: { raw_score: 5, adjustments: [], final_score: 5 },
      debater_b: { raw_score: 5, adjustments: [], final_score: 5 },
    };
    const result = renderAfterEffects(breakdown, 'b');
    expect(result).toBe('');
  });
});

// ============================================================
// TC-3: positive and negative deltas render correct CSS classes
// ============================================================

describe('TC-3 — delta sign maps to ae-step CSS class', () => {
  it('renders ae-step--positive for positive delta', () => {
    const breakdown = {
      debater_a: {
        raw_score: 47,
        adjustments: [{ effect_name: 'Point Surge', delta: 2 }],
        final_score: 49,
      },
      debater_b: { raw_score: 10, adjustments: [], final_score: 10 },
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toContain('ae-step--positive');
    expect(result).toContain('+2');
    expect(result).toContain('Point Surge');
  });

  it('renders ae-step--negative for negative delta', () => {
    const breakdown = {
      debater_a: {
        raw_score: 47,
        adjustments: [{ effect_name: 'Point Siphon', delta: -1 }],
        final_score: 46,
      },
      debater_b: { raw_score: 10, adjustments: [], final_score: 10 },
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toContain('ae-step--negative');
    expect(result).toContain('-1');
    expect(result).toContain('Point Siphon');
  });
});

// ============================================================
// TC-4: XSS — effect_name is escaped via escapeHTML
// ============================================================

describe('TC-4 — escapeHTML applied to effect_name', () => {
  it('escapes < > & " \' in effect_name', () => {
    const breakdown = {
      debater_a: {
        raw_score: 10,
        adjustments: [{ effect_name: '<script>alert(1)</script>', delta: 3 }],
        final_score: 13,
      },
      debater_b: { raw_score: 5, adjustments: [], final_score: 5 },
    };
    const result = renderAfterEffects(breakdown, 'a');
    // The raw tag must not appear unescaped
    expect(result).not.toContain('<script>');
    // Escaped form should appear
    expect(result).toContain('&lt;script&gt;');
  });
});

// ============================================================
// TC-5: Number() casting applied to raw_score and final_score
// ============================================================

describe('TC-5 — numeric values appear in output', () => {
  it('renders raw_score and final_score as numbers', () => {
    const breakdown = {
      debater_a: {
        raw_score: 47,
        adjustments: [{ effect_name: 'Surge', delta: 2 }],
        final_score: 49,
      },
      debater_b: { raw_score: 10, adjustments: [], final_score: 10 },
    };
    const result = renderAfterEffects(breakdown, 'a');
    // ae-raw contains raw_score, ae-final contains final_score
    expect(result).toContain('class="ae-raw">47');
    expect(result).toContain('class="ae-final">49');
  });
});

// ============================================================
// TC-6: inventory_effects — mirror event renders correctly
// ============================================================

describe('TC-6 — inventory_effects mirror event renders ae-inv-section', () => {
  it('renders mirror label and escaped copied_effect_id', () => {
    const breakdown = {
      debater_a: {
        raw_score: 20,
        adjustments: [{ effect_name: 'Surge', delta: 5 }],
        final_score: 25,
      },
      debater_b: { raw_score: 15, adjustments: [], final_score: 15 },
      inventory_effects: [
        { effect: 'mirror', copied_effect_id: 'fire-blast', from_ref_id: 'ref-1', new_modifier_id: 'mod-99' },
      ],
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toContain('ae-inv-section');
    expect(result).toContain('Mirror');
    expect(result).toContain('fire-blast');
  });

  it('renders burn_notice label and burned_effect_id', () => {
    const breakdown = {
      debater_a: {
        raw_score: 20,
        adjustments: [{ effect_name: 'Surge', delta: 1 }],
        final_score: 21,
      },
      debater_b: { raw_score: 15, adjustments: [], final_score: 15 },
      inventory_effects: [
        { effect: 'burn_notice', burned_effect_id: 'ice-wall', from_ref_id: 'ref-2' },
      ],
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toContain('Burn Notice');
    expect(result).toContain('ice-wall');
  });

  it('renders chain_reaction label and regenerated_effect + qty', () => {
    const breakdown = {
      debater_a: {
        raw_score: 10,
        adjustments: [{ effect_name: 'Chain', delta: 0 }],
        final_score: 10,
      },
      debater_b: { raw_score: 8, adjustments: [], final_score: 8 },
      inventory_effects: [
        { effect: 'chain_reaction', regenerated_effect: 'double-down', new_powerup_qty: 2 },
      ],
    };
    const result = renderAfterEffects(breakdown, 'a');
    expect(result).toContain('Chain Reaction');
    expect(result).toContain('double-down');
    expect(result).toContain('×2');
  });
});

// ============================================================
// TC-7: myRole='b' flips perspective — debater_b is "You"
// ============================================================

describe('TC-7 — myRole=b renders debater_b as You and debater_a as Opponent', () => {
  it('labels "You" for debater_b when myRole is b', () => {
    const breakdown = {
      debater_a: { raw_score: 5,  adjustments: [{ effect_name: 'Siphon', delta: -2 }], final_score: 3  },
      debater_b: { raw_score: 12, adjustments: [{ effect_name: 'Surge',  delta: 4  }], final_score: 16 },
    };
    const resultB = renderAfterEffects(breakdown, 'b');
    // The "You" row should reflect debater_b data (final 16)
    // The "Opponent" row should reflect debater_a data (final 3)
    expect(resultB).toContain('ae-final">16');
    expect(resultB).toContain('ae-final">3');
    // You label comes before Opponent label
    const youIdx      = resultB.indexOf('>You<');
    const oppIdx      = resultB.indexOf('>Opponent<');
    expect(youIdx).toBeGreaterThan(-1);
    expect(oppIdx).toBeGreaterThan(-1);
    expect(youIdx).toBeLessThan(oppIdx);
  });
});
