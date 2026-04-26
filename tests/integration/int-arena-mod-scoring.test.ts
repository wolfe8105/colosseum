import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockScoreModerator    = vi.hoisted(() => vi.fn());
const mockInjectAdSlot      = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

vi.mock('../../src/auth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/auth.ts')>();
  return {
    ...actual,
    getCurrentProfile: mockGetCurrentProfile,
    scoreModerator:    mockScoreModerator,
    safeRpc:           vi.fn(),
    supabase: {
      rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(),
      auth: { onAuthStateChange: vi.fn() },
    },
  };
});

vi.mock('../../src/config.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config.ts')>();
  return {
    ...actual,
    SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
    escapeHTML:   (s: string) => s,
    friendlyError: (e: unknown) => String(e),
    ModeratorConfig: {
      ...actual.ModeratorConfig,
      escapeHTML:    (s: string) => s,
      showToast:     vi.fn(),
      friendlyError: (e: unknown) => String(e),
    },
  };
});

vi.mock('../../src/arena/arena-ads.ts', () => ({
  injectAdSlot:      mockInjectAdSlot,
  showAdInterstitial: vi.fn(),
  destroy:           vi.fn(),
}));

// ─── ARCH filter ────────────────────────────────────────────────────────────
describe('ARCH: arena-mod-scoring imports', () => {
  it('only imports from allowed modules', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-mod-scoring.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const allowed = ['../auth.ts', '../config.ts', './arena-types.ts', './arena-ads.ts'];
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        expect(allowed).toContain(match[1]);
      }
    }
  });
});

// ─── Fixtures ───────────────────────────────────────────────────────────────
const MOD_ID      = 'mod-uuid-001';
const DEBATER_A   = 'debater-a-uuid';
const DEBATER_B   = 'debater-b-uuid';
const SPECTATOR   = 'spectator-uuid-999';
const DEBATE_ID   = 'debate-uuid-abc';
const MOD_NAME    = 'Great Moderator';

const makeDebate = (overrides: Record<string, unknown> = {}) => ({
  id:           DEBATE_ID,
  moderatorId:  MOD_ID,
  moderatorName: MOD_NAME,
  debater_a:    DEBATER_A,
  debater_b:    DEBATER_B,
  ...overrides,
});

const makeContainer = () => document.createElement('div');

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('renderModScoring', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockGetCurrentProfile.mockReset();
    mockScoreModerator.mockReset();
    mockInjectAdSlot.mockReset();
    document.body.innerHTML = '';
  });

  // TC1: returns early when moderatorId is falsy
  it('TC1: no DOM appended when debate.moderatorId is missing', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: SPECTATOR, username: 'spec' });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    renderModScoring(makeDebate({ moderatorId: null }) as never, container);
    expect(container.children).toHaveLength(0);
  });

  // TC2: returns early when getCurrentProfile() returns null
  it('TC2: no DOM appended when getCurrentProfile returns null', async () => {
    mockGetCurrentProfile.mockReturnValue(null);
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    renderModScoring(makeDebate() as never, container);
    expect(container.children).toHaveLength(0);
  });

  // TC3: returns early when profile is the moderator (cannot score yourself)
  it('TC3: no DOM appended when current user is the moderator', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: MOD_ID, username: 'themod' });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    renderModScoring(makeDebate() as never, container);
    expect(container.children).toHaveLength(0);
  });

  // TC4: debater sees thumbs buttons, not a slider
  it('TC4: debater sees .mod-score-btn buttons, no slider', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: DEBATER_A, username: 'da' });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    document.body.appendChild(container);
    renderModScoring(makeDebate() as never, container);
    const btns   = container.querySelectorAll('.mod-score-btn');
    const slider = container.querySelector('#mod-score-slider');
    expect(btns.length).toBe(2);
    expect(slider).toBeNull();
  });

  // TC5: spectator sees slider and submit button
  it('TC5: spectator (not debater, not mod) sees slider and submit button', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: SPECTATOR, username: 'spec' });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    document.body.appendChild(container);
    renderModScoring(makeDebate() as never, container);
    const slider = container.querySelector('#mod-score-slider');
    const submit = container.querySelector('#mod-score-submit');
    expect(slider).not.toBeNull();
    expect(submit).not.toBeNull();
  });

  // TC6: injectAdSlot is called with the container
  it('TC6: injectAdSlot is called after section is appended', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: SPECTATOR, username: 'spec' });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    document.body.appendChild(container);
    renderModScoring(makeDebate() as never, container);
    expect(mockInjectAdSlot).toHaveBeenCalledOnce();
    expect(mockInjectAdSlot).toHaveBeenCalledWith(container);
  });

  // TC7: clicking a .mod-score-btn calls scoreModerator with debate.id and numeric score
  it('TC7: clicking happy (.mod-score-btn[data-score="25"]) calls scoreModerator(debateId, 25)', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: DEBATER_B, username: 'db' });
    mockScoreModerator.mockResolvedValue({ error: null });
    const { renderModScoring } = await import('../../src/arena/arena-mod-scoring.ts');
    const container = makeContainer();
    document.body.appendChild(container);
    renderModScoring(makeDebate() as never, container);
    const happyBtn = container.querySelector('.mod-score-btn.happy') as HTMLButtonElement;
    expect(happyBtn).not.toBeNull();
    happyBtn.click();
    await vi.runAllTimersAsync();
    expect(mockScoreModerator).toHaveBeenCalledWith(DEBATE_ID, 25);
  });
});
