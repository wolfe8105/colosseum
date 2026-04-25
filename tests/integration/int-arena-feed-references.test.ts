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
// SEAM #110 — arena-feed-references → arena-feed-state
// Focuses on: `round` read from arena-feed-state and passed
// through to citeDebateReference / fileReferenceChallenge RPCs.
// ============================================================

describe('TC-110-1: showCiteDropdown passes round from arena-feed-state to cite RPC', () => {
  it('uses current round value when user clicks a ref item', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Set round to 3 in arena-feed-state
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(3);

    // set_loadedRefs with one uncited ref
    set_loadedRefs([
      { reference_id: 'ref-cite-round', claim: 'Round test claim', author: 'Auth', current_power: 2, cited: false },
    ]);

    // safeRpc calls supabase.rpc — capture it
    mockRpc.mockResolvedValue({ data: { success: true, new_power: 3 }, error: null });

    const debate = { id: 'debate-round', role: 'b', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('block');

    // Click the dropdown item
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    // Allow async handler to run
    await vi.runAllTimersAsync();

    // The RPC should have been called with p_round = 3
    expect(mockRpc).toHaveBeenCalledWith(
      'cite_debate_reference',
      expect.objectContaining({ p_round: 3 }),
    );

    vi.useRealTimers();
  });
});

describe('TC-110-2: showChallengeDropdown passes round from arena-feed-state to challenge RPC', () => {
  it('uses current round value when user clicks a challenge item', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Set round to 2
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(2);

    set_opponentCitedRefs([
      { reference_id: 'oref-challenge-round', claim: 'Opp claim R2', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(3);

    // fileReferenceChallenge blocked=true path (no pauseFeed call needed)
    mockRpc.mockResolvedValue({
      data: { blocked: true, challenges_remaining: 3, challenge_id: null },
      error: null,
    });

    const debate = { id: 'debate-chal-round', role: 'a', opponentName: 'Opp', messages: [] };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenCalledWith(
      'file_reference_challenge',
      expect.objectContaining({ p_round: 2 }),
    );

    vi.useRealTimers();
  });
});

describe('TC-110-3: round live binding — set_round updates value seen by showCiteDropdown', () => {
  it('reflects updated round after set_round is called', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(1);

    set_loadedRefs([
      { reference_id: 'ref-live', claim: 'Live binding claim', author: 'X', current_power: 1, cited: false },
    ]);
    mockRpc.mockResolvedValue({ data: { success: true, new_power: 2 }, error: null });

    // First cite — should use round 1
    const debate = { id: 'debate-live', role: 'a', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);
    const dropdown = document.getElementById('feed-ref-dropdown')!;
    (dropdown.querySelector('.feed-dropdown-item') as HTMLElement).click();
    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenLastCalledWith(
      'cite_debate_reference',
      expect.objectContaining({ p_round: 1 }),
    );

    // Now advance round to 4 — reload refs (cite marks cited:true)
    feedStateMod.set_round(4);
    set_loadedRefs([
      { reference_id: 'ref-live-2', claim: 'Second claim', author: 'Y', current_power: 1, cited: false },
    ]);

    showCiteDropdown(debate);
    const dropdown2 = document.getElementById('feed-ref-dropdown')!;
    (dropdown2.querySelector('.feed-dropdown-item') as HTMLElement).click();
    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenLastCalledWith(
      'cite_debate_reference',
      expect.objectContaining({ p_round: 4 }),
    );

    vi.useRealTimers();
  });
});

describe('TC-110-4: resetFeedRoomState resets round to 1', () => {
  it('round returns to 1 after resetFeedRoomState()', async () => {
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(5);
    expect(feedStateMod.round).toBe(5);

    feedStateMod.resetFeedRoomState();
    expect(feedStateMod.round).toBe(1);
  });
});

describe('TC-110-5: arena-feed-state exports round getter and set_round setter', () => {
  it('round starts at 1 and set_round mutates the live binding', async () => {
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    // After resetModules + re-import it starts at module default (1)
    feedStateMod.set_round(1);
    expect(feedStateMod.round).toBe(1);
    feedStateMod.set_round(7);
    expect(feedStateMod.round).toBe(7);
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

// ============================================================
// SEAM #127 — arena-feed-references → arena-feed-ui
// Focuses on: updateCiteButtonState and updateChallengeButtonState
// are called from arena-feed-references after successful RPCs,
// and that the DOM elements they control reflect correct state.
// ============================================================

describe('TC-127-1: updateCiteButtonState called after cite — button disabled when all refs cited', () => {
  it('disables feed-cite-btn after all refs become cited via showCiteDropdown click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Set up DOM: cite button + dropdown
    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-cite-btn">📄 CITE</button>
    `;

    mockRpc.mockResolvedValue({ data: { success: true, new_power: 2 }, error: null });

    // One uncited ref — after cite it becomes cited, so updateCiteButtonState disables the button
    set_loadedRefs([
      { reference_id: 'ref-127-1', claim: 'Single uncited ref', author: 'Auth', current_power: 2, cited: false },
    ]);

    const debate = { id: 'debate-127', role: 'a', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.runAllTimersAsync();

    // After cite: set_loadedRefs marks it cited, updateCiteButtonState runs
    // With no uncited refs remaining, the button should be disabled
    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    vi.useRealTimers();
  });
});

describe('TC-127-2: updateCiteButtonState called after cite — button text updated to ALL CITED', () => {
  it('sets button text to ALL CITED after last uncited ref is cited', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-cite-btn">📄 CITE</button>
    `;

    mockRpc.mockResolvedValue({ data: { success: true, new_power: 2 }, error: null });

    set_loadedRefs([
      { reference_id: 'ref-127-2', claim: 'Only ref', author: 'Auth', current_power: 1, cited: false },
    ]);

    const debate = { id: 'debate-127-2', role: 'a', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    (dropdown.querySelector('.feed-dropdown-item') as HTMLElement).click();

    await vi.runAllTimersAsync();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    // updateCiteButtonState sets textContent to '📄 ALL CITED' when all refs are cited
    expect(btn.textContent).toContain('ALL CITED');

    vi.useRealTimers();
  });
});

describe('TC-127-3: updateChallengeButtonState called after non-blocked challenge — button text reflects new count', () => {
  it('updates challenge button text with decremented challengesRemaining after successful challenge', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-challenge-btn">⚔️ CHALLENGE (3)</button>
    `;

    // Non-blocked result — challenge filed, 2 remaining
    mockRpc.mockResolvedValue({
      data: { blocked: false, challenges_remaining: 2, challenge_id: 'chid-1' },
      error: null,
    });

    // Need pauseFeed to not blow up — it needs feed state setup
    // We use the arena-state setters already imported via beforeEach
    set_opponentCitedRefs([
      { reference_id: 'oref-127-3', claim: 'Challengeable claim', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(3);

    // Set up currentDebate so pauseFeed won't crash on null access
    set_currentDebate({ id: 'debate-127-3', role: 'a', opponentName: 'Opp', messages: [], modView: false });

    const debate = { id: 'debate-127-3', role: 'a', opponentName: 'Opp', messages: [], modView: false };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.runAllTimersAsync();

    // updateChallengeButtonState should have run and set text to CHALLENGE (2)
    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('CHALLENGE (2)');

    vi.useRealTimers();
  });
});

describe('TC-127-4: updateChallengeButtonState NOT called when challenge is blocked by shield', () => {
  it('challenge button text unchanged when result.blocked is true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-challenge-btn">⚔️ CHALLENGE (3)</button>
    `;

    // Blocked result — shield absorbed it
    mockRpc.mockResolvedValue({
      data: { blocked: true, challenges_remaining: 3, challenge_id: null },
      error: null,
    });

    set_opponentCitedRefs([
      { reference_id: 'oref-127-4', claim: 'Blocked challenge', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(3);

    const debate = { id: 'debate-127-4', role: 'a', opponentName: 'Opp', messages: [] };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    (dropdown.querySelector('.feed-dropdown-item') as HTMLElement).click();

    await vi.runAllTimersAsync();

    // updateChallengeButtonState was NOT called (blocked path skips it)
    // button text stays as original set value
    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('CHALLENGE (3)');

    vi.useRealTimers();
  });
});

describe('TC-127-5: updateCiteButtonState respects feedPaused — disables cite button when feed is paused', () => {
  it('cite button is disabled when feedPaused is true even during my turn', async () => {
    const stateMod = await import('../../src/arena/arena-state.ts');
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-cite-btn">📄 CITE</button>
    `;

    // Set up: it's player a's turn (speaker_a phase), role is 'a', and feed is paused
    stateMod.set_currentDebate({ id: 'debate-127-5', role: 'a', opponentName: 'Opp', messages: [], modView: false });
    stateMod.set_feedPaused(true);
    stateMod.set_loadedRefs([
      { reference_id: 'ref-127-5', claim: 'Pauseable ref', author: 'Auth', current_power: 1, cited: false },
    ]);
    feedStateMod.set_phase('speaker_a');

    const { updateCiteButtonState } = await import('../../src/arena/arena-feed-ui.ts');
    updateCiteButtonState();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    // Cleanup
    stateMod.set_feedPaused(false);
  });
});

describe('TC-127-6: updateChallengeButtonState reflects challengesRemaining in button text', () => {
  it('sets button text to CHALLENGE (N) where N is current challengesRemaining', async () => {
    const stateMod = await import('../../src/arena/arena-state.ts');

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-challenge-btn">⚔️ CHALLENGE (3)</button>
    `;

    stateMod.set_challengesRemaining(1);
    stateMod.set_opponentCitedRefs([
      { reference_id: 'oref-127-6', claim: 'Ref for count test', domain: 'x.com', already_challenged: false },
    ]);

    const { updateChallengeButtonState } = await import('../../src/arena/arena-feed-ui.ts');
    updateChallengeButtonState();

    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('CHALLENGE (1)');
  });
});

describe('TC-127-7: ARCH — arena-feed-ui.ts imports only allowed modules', () => {
  it('contains no wall imports', () => {
    // Exact module name substrings that must not appear as import paths.
    // Note: 'arena-types-feed-room' is a types-only file and is permitted.
    // We match against the extracted import path strings, not raw lines.
    const wallModules = [
      'webrtc', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics', 'arena-feed-room',
    ];
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-ui.ts'),
      'utf-8'
    );
    const importPaths = source.split('\n')
      .filter(l => /from\s+['"]/.test(l))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const wall of wallModules) {
      for (const path of importPaths) {
        expect(path, `arena-feed-ui.ts imports wall module "${wall}": ${path}`).not.toContain(wall);
      }
    }
  });
});

// ============================================================
// SEAM #240 — arena-feed-references → reference-arsenal
// Focuses on: citeDebateReference and fileReferenceChallenge
// are called from reference-arsenal.debate.ts with exact params,
// results update arena-state correctly, and errors surface via
// showToast.
// ============================================================

describe('TC-240-1: showCiteDropdown click fires cite_debate_reference RPC with all params', () => {
  it('calls cite_debate_reference with p_debate_id, p_reference_id, p_round, p_side', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(2);

    set_loadedRefs([
      { reference_id: 'ref-240-1', claim: 'Seam 240 claim', author: 'AuthA', current_power: 3, cited: false },
    ]);

    mockRpc.mockResolvedValue({ data: { success: true, new_power: 4 }, error: null });

    const debate = { id: 'debate-240-1', role: 'b', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('block');

    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.advanceTimersByTimeAsync(50);

    expect(mockRpc).toHaveBeenCalledWith(
      'cite_debate_reference',
      expect.objectContaining({
        p_debate_id: 'debate-240-1',
        p_reference_id: 'ref-240-1',
        p_round: 2,
        p_side: 'b',
      }),
    );

    vi.useRealTimers();
  });
});

describe('TC-240-2: citeDebateReference RPC error surfaces via showToast and does not update loadedRefs', () => {
  it('shows error toast and refs remain unchanged when RPC returns error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(1);

    const initialRefs = [
      { reference_id: 'ref-240-2', claim: 'Error path ref', author: 'Auth', current_power: 2, cited: false },
    ];
    set_loadedRefs(initialRefs);

    // Simulate RPC error
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Cite limit reached' } });

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <div id="toast-container"></div>
    `;

    const debate = { id: 'debate-240-2', role: 'a', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.advanceTimersByTimeAsync(50);

    // Verify RPC was called with cite_debate_reference
    expect(mockRpc).toHaveBeenCalledWith('cite_debate_reference', expect.any(Object));

    // The ref should still be uncited (state not mutated on error)
    const stateMod = await import('../../src/arena/arena-state.ts');
    const refs = stateMod.loadedRefs;
    expect(refs.some((r: { cited: boolean }) => r.cited)).toBe(false);

    vi.useRealTimers();
  });
});

describe('TC-240-3: showChallengeDropdown click fires file_reference_challenge RPC with all params', () => {
  it('calls file_reference_challenge with p_debate_id, p_reference_id, p_round, p_side', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(3);

    set_opponentCitedRefs([
      { reference_id: 'oref-240-3', claim: 'Opp 240 claim', domain: 'science.org', already_challenged: false },
    ]);
    set_challengesRemaining(2);

    // Blocked=true to avoid pauseFeed side-effects
    mockRpc.mockResolvedValue({
      data: { blocked: true, challenges_remaining: 2, challenge_id: null },
      error: null,
    });

    const debate = { id: 'debate-240-3', role: 'a', opponentName: 'Opp', messages: [] };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    expect(dropdown.style.display).toBe('block');

    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.advanceTimersByTimeAsync(50);

    expect(mockRpc).toHaveBeenCalledWith(
      'file_reference_challenge',
      expect.objectContaining({
        p_debate_id: 'debate-240-3',
        p_reference_id: 'oref-240-3',
        p_round: 3,
        p_side: 'a',
      }),
    );

    vi.useRealTimers();
  });
});

describe('TC-240-4: non-blocked challenge decrements challengesRemaining in arena-state', () => {
  it('calls set_challengesRemaining with challenges_remaining from RPC result', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(1);

    set_opponentCitedRefs([
      { reference_id: 'oref-240-4', claim: 'Decrement claim', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(3);

    // Non-blocked — server says 2 remaining, challenge_id set
    mockRpc.mockResolvedValue({
      data: { blocked: false, challenges_remaining: 2, challenge_id: 'chid-240' },
      error: null,
    });

    // Set currentDebate so pauseFeed internal checks don't throw
    set_currentDebate({ id: 'debate-240-4', role: 'a', opponentName: 'Opp', messages: [], modView: false });

    document.body.innerHTML = `
      <div id="feed-ref-dropdown" style="display:none"></div>
      <button id="feed-challenge-btn">⚔️ CHALLENGE (3)</button>
      <div id="arena-feed-room"></div>
    `;

    const debate = { id: 'debate-240-4', role: 'a', opponentName: 'Opp', messages: [], modView: false };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.advanceTimersByTimeAsync(100);

    // challengesRemaining in state should now be 2 (from RPC result)
    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.challengesRemaining).toBe(2);

    vi.useRealTimers();
  });
});

describe('TC-240-5: blocked challenge does NOT change challengesRemaining and shows shield toast', () => {
  it('challengesRemaining stays at 3 and no set_challengesRemaining mutation on blocked result', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(1);

    set_opponentCitedRefs([
      { reference_id: 'oref-240-5', claim: 'Shield blocked ref', domain: 'ex.com', already_challenged: false },
    ]);
    set_challengesRemaining(3);

    mockRpc.mockResolvedValue({
      data: { blocked: true, challenges_remaining: 3, challenge_id: null },
      error: null,
    });

    const debate = { id: 'debate-240-5', role: 'a', opponentName: 'Opp', messages: [] };
    showChallengeDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();

    await vi.advanceTimersByTimeAsync(50);

    // RPC called
    expect(mockRpc).toHaveBeenCalledWith('file_reference_challenge', expect.any(Object));

    // State unchanged at 3 (blocked path skips set_challengesRemaining)
    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.challengesRemaining).toBe(3);

    vi.useRealTimers();
  });
});

describe('TC-240-6: successful cite marks ref as cited:true in loadedRefs state', () => {
  it('after cite_debate_reference success the ref.cited becomes true in arena-state', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    feedStateMod.set_round(1);

    set_loadedRefs([
      { reference_id: 'ref-240-6', claim: 'Citeable ref', author: 'Auth', current_power: 2, cited: false },
    ]);

    mockRpc.mockResolvedValue({ data: { success: true, new_power: 3 }, error: null });

    const debate = { id: 'debate-240-6', role: 'a', opponentName: 'Opp', messages: [] };
    showCiteDropdown(debate);

    const dropdown = document.getElementById('feed-ref-dropdown')!;
    const item = dropdown.querySelector('.feed-dropdown-item') as HTMLElement;
    item.click();

    await vi.advanceTimersByTimeAsync(50);

    const stateMod = await import('../../src/arena/arena-state.ts');
    const refs = stateMod.loadedRefs as Array<{ reference_id: string; cited: boolean }>;
    const citedRef = refs.find(r => r.reference_id === 'ref-240-6');
    expect(citedRef).toBeDefined();
    expect(citedRef!.cited).toBe(true);

    vi.useRealTimers();
  });
});

describe('TC-240-7: ARCH — reference-arsenal.debate.ts uses safeRpc and does not call supabase directly', () => {
  it('all RPC calls in debate file route through safeRpc (no direct .rpc() in debate file)', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.debate.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const importPaths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));

    // Must import safeRpc (from auth.ts)
    expect(importPaths.some(p => p.includes('auth'))).toBe(true);

    // Must NOT import @supabase/supabase-js directly
    expect(importPaths.some(p => p.includes('@supabase/supabase-js'))).toBe(false);

    // Must NOT call supabase.rpc() directly — no raw .rpc( in the debate file body
    const bodyLines = source.split('\n').filter(l => !l.trimStart().startsWith('//'));
    const rawRpcCalls = bodyLines.filter(l => /supabase\s*\.\s*rpc\s*\(/.test(l));
    expect(rawRpcCalls.length).toBe(0);
  });
});
