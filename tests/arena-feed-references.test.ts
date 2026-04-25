import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockCiteDebateReference = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFileReferenceChallenge = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockLoadedRefs = vi.hoisted(() => ({ value: [] as { reference_id: string; claim: string; url: string; description: string; cited: boolean }[] }));
const mockOpponentCitedRefs = vi.hoisted(() => ({ value: [] as { reference_id: string; claim: string; url: string; description: string; already_challenged: boolean }[] }));
const mockChallengesRemaining = vi.hoisted(() => ({ value: 3 }));
const mockSet_loadedRefs = vi.hoisted(() => vi.fn());
const mockSet_challengesRemaining = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeRefId = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeId = vi.hoisted(() => vi.fn());

const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockUpdateCiteButtonState = vi.hoisted(() => vi.fn());
const mockUpdateChallengeButtonState = vi.hoisted(() => vi.fn());
const mockPauseFeed = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/reference-arsenal.ts', () => ({
  citeDebateReference: mockCiteDebateReference,
  fileReferenceChallenge: mockFileReferenceChallenge,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get loadedRefs() { return mockLoadedRefs.value; },
  get opponentCitedRefs() { return mockOpponentCitedRefs.value; },
  get challengesRemaining() { return mockChallengesRemaining.value; },
  set_loadedRefs: mockSet_loadedRefs,
  set_challengesRemaining: mockSet_challengesRemaining,
  set_activeChallengeRefId: mockSet_activeChallengeRefId,
  set_activeChallengeId: mockSet_activeChallengeId,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateCiteButtonState: mockUpdateCiteButtonState,
  updateChallengeButtonState: mockUpdateChallengeButtonState,
}));

vi.mock('../src/arena/arena-feed-machine-pause.ts', () => ({
  pauseFeed: mockPauseFeed,
}));

import { showCiteDropdown, showChallengeDropdown, hideDropdown, showReferencePopup } from '../src/arena/arena-feed-references.ts';

const baseDebate = { id: 'deb-1', role: 'a', modView: false };

describe('TC1 — showCiteDropdown renders refs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `<div id="feed-ref-dropdown" style="display:none;"></div>`;
    mockLoadedRefs.value = [
      { reference_id: 'ref-1', claim: 'Climate is changing', url: 'https://example.com', description: 'A study', cited: false },
    ];
    mockCurrentDebate.value = { ...baseDebate };
  });

  it('shows dropdown items', () => {
    showCiteDropdown(baseDebate as never);
    expect(document.querySelectorAll('.feed-dropdown-item').length).toBeGreaterThan(0);
  });

  it('shows toast when no uncited refs', () => {
    mockLoadedRefs.value = [];
    showCiteDropdown(baseDebate as never);
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('does nothing when feed-ref-dropdown is absent', () => {
    document.body.innerHTML = '';
    expect(() => showCiteDropdown(baseDebate as never)).not.toThrow();
  });
});

describe('TC2 — showChallengeDropdown renders challengeable refs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `<div id="feed-ref-dropdown" style="display:none;"></div>`;
    mockOpponentCitedRefs.value = [
      { reference_id: 'ref-2', claim: 'Opponent claim', url: 'https://source.com', description: 'Source', already_challenged: false },
    ];
    mockChallengesRemaining.value = 3;
    mockCurrentDebate.value = { ...baseDebate };
  });

  it('shows challenge items', () => {
    showChallengeDropdown(baseDebate as never);
    expect(document.querySelectorAll('.feed-dropdown-item').length).toBeGreaterThan(0);
  });

  it('shows toast when no challenges remaining', () => {
    mockChallengesRemaining.value = 0;
    showChallengeDropdown(baseDebate as never);
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('shows toast when no challengeable refs', () => {
    mockOpponentCitedRefs.value = [];
    showChallengeDropdown(baseDebate as never);
    expect(mockShowToast).toHaveBeenCalled();
  });
});

describe('TC3 — hideDropdown clears dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `<div id="feed-ref-dropdown"><div class="item">stuff</div></div>`;
  });

  it('clears dropdown innerHTML', () => {
    hideDropdown();
    expect(document.getElementById('feed-ref-dropdown')?.innerHTML).toBe('');
  });

  it('hides dropdown', () => {
    hideDropdown();
    expect((document.getElementById('feed-ref-dropdown') as HTMLElement)?.style.display).toBe('none');
  });
});

describe('TC4 — showReferencePopup renders popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('creates a popup element', () => {
    const el = document.createElement('div');
    el.dataset.refId = 'ref-1';
    el.dataset.url = 'https://example.com';
    el.dataset.claim = 'Some claim';
    document.body.appendChild(el);
    showReferencePopup(el);
    expect(document.getElementById('feed-ref-popup')).not.toBeNull();
  });
});

describe('ARCH — arena-feed-references.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      '../reference-arsenal.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
      './arena-feed-machine-pause.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-references.ts'),
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
