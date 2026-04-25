// ============================================================
// INTEGRATOR — arena-feed-references + arena-state + arena-feed-state
// Seam #022 | score: 53
// Boundary: showCiteDropdown reads loadedRefs from arena-state.
//           showChallengeDropdown reads opponentCitedRefs + challengesRemaining.
//           Both read round from arena-feed-state.
//           showReferencePopup uses escapeHTML from config.
//           hideDropdown — DOM cleanup.
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

let showCiteDropdown: (debate: unknown) => void;
let showChallengeDropdown: (debate: unknown) => void;
let hideDropdown: () => void;
let showReferencePopup: (el: HTMLElement) => void;

let set_currentDebate: (v: unknown) => void;
let set_loadedRefs: (v: unknown[]) => void;
let set_opponentCitedRefs: (v: unknown[]) => void;
let set_challengesRemaining: (v: number) => void;

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

  document.body.innerHTML = '<div id="feed-ref-dropdown" style="display:none"></div>';

  const refsMod = await import('../../src/arena/arena-feed-references.ts');
  showCiteDropdown = refsMod.showCiteDropdown as (debate: unknown) => void;
  showChallengeDropdown = refsMod.showChallengeDropdown as (debate: unknown) => void;
  hideDropdown = refsMod.hideDropdown;
  showReferencePopup = refsMod.showReferencePopup;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_loadedRefs = stateMod.set_loadedRefs as (v: unknown[]) => void;
  set_opponentCitedRefs = stateMod.set_opponentCitedRefs as (v: unknown[]) => void;
  set_challengesRemaining = stateMod.set_challengesRemaining;
});

// ============================================================
// TC-I1: showCiteDropdown — renders loadedRefs from arena-state
// ============================================================

describe('TC-I1: showCiteDropdown renders loadedRefs from arena-state', () => {
  it('shows uncited refs in the dropdown', () => {
    set_loadedRefs([
      { reference_id: 'ref-1', claim: 'Climate data', author: 'Smith', current_power: 3, cited: false },
      { reference_id: 'ref-2', claim: 'Other study', author: 'Jones', current_power: 2, cited: false },
    ]);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('block');
    expect(dropdown.innerHTML).toContain('Climate data');
    expect(dropdown.innerHTML).toContain('Other study');
  });

  it('does not show already-cited refs', () => {
    set_loadedRefs([
      { reference_id: 'ref-1', claim: 'Cited ref', author: 'Smith', current_power: 3, cited: true },
      { reference_id: 'ref-2', claim: 'Uncited ref', author: 'Jones', current_power: 2, cited: false },
    ]);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.innerHTML).not.toContain('Cited ref');
    expect(dropdown.innerHTML).toContain('Uncited ref');
  });

  it('escapes HTML in ref claim (XSS protection)', () => {
    set_loadedRefs([
      { reference_id: 'ref-xss', claim: '<script>alert(1)</script>', author: 'Hacker', current_power: 1, cited: false },
    ]);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.innerHTML).not.toContain('<script>');
    expect(dropdown.innerHTML).toContain('&lt;script&gt;');
  });
});

// ============================================================
// TC-I2: showCiteDropdown — no-op when no uncited refs
// ============================================================

describe('TC-I2: showCiteDropdown shows toast when no uncited refs remain', () => {
  it('does not open dropdown when all refs are cited', () => {
    set_loadedRefs([
      { reference_id: 'ref-1', claim: 'Already cited', author: 'Smith', current_power: 3, cited: true },
    ]);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    // Dropdown stays hidden (no block)
    expect(dropdown.style.display).not.toBe('block');
  });
});

// ============================================================
// TC-I3: showChallengeDropdown — renders opponentCitedRefs from arena-state
// ============================================================

describe('TC-I3: showChallengeDropdown renders challengeable refs from arena-state', () => {
  it('shows challengeable opponent refs in the dropdown', () => {
    set_opponentCitedRefs([
      { reference_id: 'oref-1', claim: 'Opponent claim', domain: 'example.com', already_challenged: false },
    ]);
    set_challengesRemaining(2);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('block');
    expect(dropdown.innerHTML).toContain('Opponent claim');
  });

  it('does not show already-challenged refs', () => {
    set_opponentCitedRefs([
      { reference_id: 'oref-1', claim: 'Already challenged', domain: 'ex.com', already_challenged: true },
      { reference_id: 'oref-2', claim: 'Open challenge', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(2);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.innerHTML).not.toContain('Already challenged');
    expect(dropdown.innerHTML).toContain('Open challenge');
  });
});

// ============================================================
// TC-I4: showChallengeDropdown — no-op when challengesRemaining is 0
// ============================================================

describe('TC-I4: showChallengeDropdown does not open when no challenges remain', () => {
  it('stays hidden when challengesRemaining is 0', () => {
    set_opponentCitedRefs([
      { reference_id: 'oref-1', claim: 'Open', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(0);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };

    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).not.toBe('block');
  });
});

// ============================================================
// TC-I5: hideDropdown — clears and hides the dropdown
// ============================================================

describe('TC-I5: hideDropdown hides and empties the dropdown element', () => {
  it('sets display:none and clears innerHTML', () => {
    set_loadedRefs([
      { reference_id: 'ref-1', claim: 'Test', author: 'A', current_power: 1, cited: false },
    ]);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [] };
    showCiteDropdown(debate);
    expect(document.getElementById('feed-ref-dropdown')!.style.display).toBe('block');

    hideDropdown();

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('none');
    expect(dropdown.innerHTML).toBe('');
  });
});

// ============================================================
// TC-I6: showReferencePopup — renders claim and metadata with XSS escaping
// ============================================================

describe('TC-I6: showReferencePopup renders reference metadata with escapeHTML', () => {
  it('creates a popup with the reference claim and source info', () => {
    const cite = document.createElement('span');
    cite.dataset.url = 'https://example.com';
    cite.dataset.sourceTitle = 'Science Journal';
    cite.dataset.sourceType = 'peer_reviewed';
    cite.textContent = '"Climate warming is accelerating"';
    document.body.appendChild(cite);

    showReferencePopup(cite);

    const popup = document.getElementById('feed-ref-popup');
    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toContain('Science Journal');
    expect(popup!.innerHTML).toContain('peer reviewed');
    expect(popup!.innerHTML).toContain('Open source');
  });

  it('escapes XSS in claim text', () => {
    const cite = document.createElement('span');
    cite.dataset.sourceTitle = '<img onerror=alert(1)>';
    cite.textContent = '<script>xss</script>';
    document.body.appendChild(cite);

    showReferencePopup(cite);

    const popup = document.getElementById('feed-ref-popup')!;
    expect(popup.innerHTML).not.toContain('<script>');
    expect(popup.innerHTML).not.toContain('<img onerror');
  });

  it('replaces previous popup rather than stacking', () => {
    const cite = document.createElement('span');
    cite.textContent = 'Claim 1';
    document.body.appendChild(cite);

    showReferencePopup(cite);
    showReferencePopup(cite);

    const popups = document.querySelectorAll('#feed-ref-popup');
    expect(popups.length).toBe(1);
  });
});

// ============================================================
// ARCH — arena-feed-references.ts import boundaries
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-feed-references.ts imports only from allowed modules', () => {
  it('imports only from config, reference-arsenal, arena-state, arena-types, arena-feed-state, arena-feed-ui, arena-feed-machine-pause', () => {
    const allowed = new Set([
      '../config.ts',
      '../reference-arsenal.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
      './arena-feed-machine-pause.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-references.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => /from\s+['"]/.test(l))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-feed-references.ts: ${path}`).toContain(path);
    }
  });
});
