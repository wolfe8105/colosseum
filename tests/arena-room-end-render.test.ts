import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn().mockReturnValue({ id: 'user-1' }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ is_moderator: false }));
const mockDeclareRival = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockShowUserProfile = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockShareResult = vi.hoisted(() => vi.fn());
const mockNudge = vi.hoisted(() => vi.fn());

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockSet_selectedRanked = vi.hoisted(() => vi.fn());

const mockEnterQueue = vi.hoisted(() => vi.fn());
const mockRenderModScoring = vi.hoisted(() => vi.fn());
const mockRenderAIScorecard = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockInjectAdSlot = vi.hoisted(() => vi.fn());
const mockRenderAfterEffects = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockAttachTranscriptHandler = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  declareRival: mockDeclareRival,
  showUserProfile: mockShowUserProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/share.ts', () => ({
  shareResult: mockShareResult,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  set_selectedRanked: mockSet_selectedRanked,
}));

vi.mock('../src/arena/arena-queue.ts', () => ({
  enterQueue: mockEnterQueue,
}));

vi.mock('../src/arena/arena-mod-scoring.ts', () => ({
  renderModScoring: mockRenderModScoring,
}));

vi.mock('../src/arena/arena-room-ai-scoring.ts', () => ({
  renderAIScorecard: mockRenderAIScorecard,
}));

vi.mock('../src/arena/arena-ads.ts', () => ({
  injectAdSlot: mockInjectAdSlot,
}));

vi.mock('../src/arena/arena-room-end-after-effects.ts', () => ({
  renderAfterEffects: mockRenderAfterEffects,
}));

vi.mock('../src/arena/arena-room-end-transcript.ts', () => ({
  attachTranscriptHandler: mockAttachTranscriptHandler,
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: vi.fn(),
}));

import { renderPostDebate } from '../src/arena/arena-room-end-render.ts';

const baseDebate = {
  id: 'debate-1',
  topic: 'Test topic',
  role: 'a' as const,
  mode: 'text' as const,
  round: 3,
  totalRounds: 3,
  opponentName: 'Bob',
  opponentId: 'opp-uuid',
  opponentElo: 1100,
  ranked: true,
  ruleset: 'standard',
  modView: false,
  messages: [],
};

const baseCtx = {
  scoreA: 80,
  scoreB: 60,
  winner: 'a',
  aiScores: null,
  eloChangeMe: 15,
  endOfDebateBreakdown: null,
  myName: 'Alice',
};

describe('TC1 — renderPostDebate renders post-debate screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('renders arena-post div', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(document.querySelector('.arena-post')).not.toBeNull();
  });

  it('calls injectAdSlot twice', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockInjectAdSlot).toHaveBeenCalledTimes(2);
  });

  it('calls attachTranscriptHandler', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockAttachTranscriptHandler).toHaveBeenCalled();
  });

  it('calls renderAfterEffects', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockRenderAfterEffects).toHaveBeenCalled();
  });
});

describe('TC2 — renderPostDebate shows correct verdict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('shows VICTORY when winner matches role', () => {
    renderPostDebate({ ...baseDebate, role: 'a' }, { ...baseCtx, winner: 'a' });
    expect(document.querySelector('.arena-post-title')?.textContent).toBe('VICTORY');
  });

  it('shows DEFEAT when winner does not match role', () => {
    renderPostDebate({ ...baseDebate, role: 'a' }, { ...baseCtx, winner: 'b' });
    expect(document.querySelector('.arena-post-title')?.textContent).toBe('DEFEAT');
  });

  it('shows DRAW on draw', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx, winner: 'draw' });
    expect(document.querySelector('.arena-post-title')?.textContent).toBe('DRAW');
  });
});

describe('TC3 — renderPostDebate nudges non-moderators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls nudge when user is not moderator', () => {
    mockGetCurrentProfile.mockReturnValueOnce({ is_moderator: false });
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockNudge).toHaveBeenCalledWith('become_moderator_post_debate', expect.any(String));
  });

  it('does not call nudge when no current user', () => {
    mockGetCurrentUser.mockReturnValueOnce(null);
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockNudge).not.toHaveBeenCalled();
  });
});

describe('TC4 — renderPostDebate rematch button calls enterQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls set_selectedRanked and enterQueue on rematch click', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    document.getElementById('arena-rematch')?.click();
    expect(mockSet_selectedRanked).toHaveBeenCalledWith(true);
    expect(mockEnterQueue).toHaveBeenCalledWith('text', 'Test topic');
  });
});

describe('TC5 — renderPostDebate share button calls shareResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls shareResult on share button click', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    document.getElementById('arena-share-result')?.click();
    expect(mockShareResult).toHaveBeenCalled();
  });
});

describe('TC6 — renderPostDebate mod scoring when moderator assigned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls renderModScoring when debate has moderatorId', () => {
    renderPostDebate({ ...baseDebate, moderatorId: 'mod-1', moderatorName: 'Judge' }, { ...baseCtx });
    expect(mockRenderModScoring).toHaveBeenCalled();
  });

  it('does not call renderModScoring without moderatorId', () => {
    renderPostDebate({ ...baseDebate }, { ...baseCtx });
    expect(mockRenderModScoring).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-room-end-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../share.ts',
      '../nudge.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-ai-scoring.ts',
      './arena-types-results.ts',
      './arena-queue.ts',
      './arena-mod-scoring.ts',
      './arena-room-ai-scoring.ts',
      './arena-ads.ts',
      './arena-room-end-after-effects.ts',
      './arena-room-end-transcript.ts',
      './arena-lobby.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-render.ts'),
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
