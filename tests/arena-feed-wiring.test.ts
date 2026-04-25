import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockChallengesRemaining = vi.hoisted(() => ({ value: 3 }));

const mockFEED_SCORE_BUDGET = vi.hoisted(() => ({ 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 }));
const mockFEED_MAX_CHALLENGES = vi.hoisted(() => 3);

const mockWireDebaterControls = vi.hoisted(() => vi.fn());
const mockWireSpectatorTipButtons = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockWireModControls = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get challengesRemaining() { return mockChallengesRemaining.value; },
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  get FEED_SCORE_BUDGET() { return mockFEED_SCORE_BUDGET; },
  FEED_MAX_CHALLENGES: mockFEED_MAX_CHALLENGES,
}));

vi.mock('../src/arena/arena-feed-wiring-debater.ts', () => ({
  wireDebaterControls: mockWireDebaterControls,
}));

vi.mock('../src/arena/arena-feed-wiring-spectator.ts', () => ({
  wireSpectatorTipButtons: mockWireSpectatorTipButtons,
}));

vi.mock('../src/arena/arena-feed-wiring-mod.ts', () => ({
  wireModControls: mockWireModControls,
}));

import { renderControls } from '../src/arena/arena-feed-wiring.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  modView: false,
  spectatorView: false,
  debaterAName: 'Alice',
  debaterBName: 'Bob',
};

describe('TC1 — renderControls for mod view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="feed-controls"></div>';
  });

  it('renders mod controls HTML', () => {
    renderControls(baseDebate as never, true);
    expect(document.getElementById('feed-mod-input')).not.toBeNull();
  });

  it('calls wireModControls', () => {
    renderControls(baseDebate as never, true);
    expect(mockWireModControls).toHaveBeenCalled();
  });

  it('does not call wireDebaterControls for mod view', () => {
    renderControls(baseDebate as never, true);
    expect(mockWireDebaterControls).not.toHaveBeenCalled();
  });
});

describe('TC2 — renderControls for spectator view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="feed-controls"></div>';
  });

  it('renders tip buttons', () => {
    const spectatorDebate = { ...baseDebate, spectatorView: true };
    renderControls(spectatorDebate as never, false);
    expect(document.querySelectorAll('.feed-tip-btn').length).toBeGreaterThan(0);
  });

  it('calls wireSpectatorTipButtons', () => {
    const spectatorDebate = { ...baseDebate, spectatorView: true };
    renderControls(spectatorDebate as never, false);
    expect(mockWireSpectatorTipButtons).toHaveBeenCalled();
  });
});

describe('TC3 — renderControls for debater view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="feed-controls"></div>';
  });

  it('renders debater textarea', () => {
    renderControls(baseDebate as never, false);
    expect(document.getElementById('feed-debater-input')).not.toBeNull();
  });

  it('renders finish turn button', () => {
    renderControls(baseDebate as never, false);
    expect(document.getElementById('feed-finish-turn')).not.toBeNull();
  });

  it('calls wireDebaterControls', () => {
    renderControls(baseDebate as never, false);
    expect(mockWireDebaterControls).toHaveBeenCalledWith(baseDebate);
  });

  it('does nothing when feed-controls element is absent', () => {
    document.body.innerHTML = '';
    expect(() => renderControls(baseDebate as never, false)).not.toThrow();
    expect(mockWireDebaterControls).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-wiring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-feed-wiring-debater.ts',
      './arena-feed-wiring-spectator.ts',
      './arena-feed-wiring-mod.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-wiring.ts'),
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
