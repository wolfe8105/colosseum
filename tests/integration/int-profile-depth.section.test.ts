/**
 * Integration tests — Seam #306
 * src/pages/profile-depth.section.ts → tokens
 * (checkProfileMilestones, claim_milestone RPC, save_profile_depth, increment_questions_answered, claim_section_reward)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoist mocks ─────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

// Hoisted controllable auth state
const mockCurrentUser = vi.hoisted(() => ({ value: null as { id: string } | null }));
const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

vi.mock('../../src/auth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/auth.ts')>();
  return {
    ...actual,
    getCurrentUser: vi.fn(() => mockCurrentUser.value),
    getIsPlaceholderMode: vi.fn(() => mockIsPlaceholder.value),
    safeRpc: mockSafeRpc,
    onChange: vi.fn(),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="question-panel"></div>
    <div id="reward-toast"></div>
    <span id="reward-icon"></span>
    <span id="reward-text"></span>
    <span id="reward-desc"></span>
    <div class="section-grid"></div>
  `;
  // jsdom does not implement scrollIntoView — stub it globally
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

/** Minimal section fixture matching the Section type used in production code. */
function makeSection(id: string, questionCount = 1) {
  return {
    id,
    name: `Section ${id}`,
    icon: '📝',
    reward: { powerUpId: 'reveal', text: 'Reveal power-up' },
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `${id}_q${i}`,
      text: `Question ${i}`,
      type: 'text',
    })),
  };
}

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockSafeRpc.mockReset();

  // Default RPC response
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockSafeRpc.mockResolvedValue({ data: null, error: null });

  // Default: no user
  mockCurrentUser.value = null;
  mockIsPlaceholder.value = false;

  buildDOM();

  // Clear relevant localStorage keys
  localStorage.removeItem('colosseum_profile_depth');
  localStorage.removeItem('colosseum_depth_complete');
});

// ── ARCH filter ───────────────────────────────────────────────────────────────

describe('TC-ARCH — import lines in profile-depth.section.ts', () => {
  it('imports checkProfileMilestones from tokens', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasTokensImport = importLines.some(
      l => l.includes('checkProfileMilestones') && l.includes('tokens'),
    );
    expect(hasTokensImport).toBe(true);
  });

  it('calls safeRpc for save_profile_depth, increment_questions_answered, claim_section_reward', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    expect(src).toContain("safeRpc('save_profile_depth'");
    expect(src).toContain("safeRpc('increment_questions_answered'");
    expect(src).toContain("safeRpc('claim_section_reward'");
  });
});

// ── TC1 — showReward sets DOM and adds .show to toast ────────────────────────

describe('TC1 — showReward updates DOM elements and shows toast', () => {
  it('sets reward-icon, reward-text, reward-desc and adds .show class to reward-toast', async () => {
    const { showReward } = await import('../../src/pages/profile-depth.section.ts');

    showReward({ powerUpId: 'shield', text: 'Shield power-up' });

    expect(document.getElementById('reward-icon')?.textContent).toBe('🛡️');
    expect(document.getElementById('reward-text')?.textContent).toBe('POWER-UP EARNED');
    expect(document.getElementById('reward-desc')?.textContent).toBe('Shield power-up');
    expect(document.getElementById('reward-toast')?.classList.contains('show')).toBe(true);
  });
});

// ── TC2 — showReward toast auto-hides after 2.5 s ────────────────────────────

describe('TC2 — showReward removes .show after 2500 ms', () => {
  it('removes .show class from reward-toast after timer fires', async () => {
    const { showReward } = await import('../../src/pages/profile-depth.section.ts');

    showReward({ powerUpId: 'reveal', text: 'Reveal power-up' });
    expect(document.getElementById('reward-toast')?.classList.contains('show')).toBe(true);

    await vi.advanceTimersByTimeAsync(2500);
    expect(document.getElementById('reward-toast')?.classList.contains('show')).toBe(false);
  });
});

// ── TC3 — saveSection (unauthenticated) no RPCs fired ──────────────────────

describe('TC3 — saveSection unauthenticated: no safeRpc calls', () => {
  it('does not call safeRpc when no user is signed in', async () => {
    mockCurrentUser.value = null;

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('hobbies', 1) as any;
    setAnswer(section.questions[0].id, 'running');

    await saveSection(section, () => {});

    expect(mockSafeRpc.mock.calls.length).toBe(0);
  });
});

// ── TC4 — saveSection (authenticated) calls save_profile_depth ───────────────

describe('TC4 — saveSection authenticated: calls save_profile_depth', () => {
  it('invokes safeRpc with save_profile_depth and correct params', async () => {
    mockCurrentUser.value = { id: 'user-uuid-123' };
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('interests', 1) as any;
    setAnswer(section.questions[0].id, 'coding');

    await saveSection(section, () => {});

    const calls = mockSafeRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('save_profile_depth');

    const saveCall = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'save_profile_depth');
    expect(saveCall?.[1]).toMatchObject({ p_section_id: 'interests' });
  });
});

// ── TC5 — saveSection calls increment_questions_answered for newly answered ──

describe('TC5 — saveSection: increment_questions_answered called for new answers', () => {
  it('calls increment_questions_answered with p_count = number of newly answered questions', async () => {
    mockCurrentUser.value = { id: 'user-uuid-456' };
    mockSafeRpc.mockResolvedValue({
      data: { ok: true, questions_answered: 5 },
      error: null,
    });

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('values', 2) as any;
    // Answer both questions as new (previouslyAnsweredIds is empty on fresh module)
    setAnswer(section.questions[0].id, 'honesty');
    setAnswer(section.questions[1].id, 'courage');

    await saveSection(section, () => {});

    const incCall = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'increment_questions_answered');
    expect(incCall).toBeDefined();
    expect(incCall?.[1]).toMatchObject({ p_count: 2 });
  });
});

// ── TC6 — saveSection calls claim_section_reward when allAnswered ─────────────

describe('TC6 — saveSection: claim_section_reward called when section fully answered', () => {
  it('calls claim_section_reward with p_section_id when all questions answered', async () => {
    mockCurrentUser.value = { id: 'user-uuid-789' };
    mockSafeRpc.mockResolvedValue({
      data: { success: true, power_up_name: 'reveal' },
      error: null,
    });

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('goals', 1) as any;
    setAnswer(section.questions[0].id, 'world peace');

    await saveSection(section, () => {});

    const claimCall = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'claim_section_reward');
    expect(claimCall).toBeDefined();
    expect(claimCall?.[1]).toMatchObject({ p_section_id: 'goals' });
  });
});

// ── TC7 — saveSection allAnswered: panel closes after 2 s ───────────────────

describe('TC7 — saveSection allAnswered: panel closes after 2000 ms timeout', () => {
  it('removes .open class from #question-panel after 2 s', async () => {
    mockCurrentUser.value = null;

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('lifestyle', 1) as any;
    setAnswer(section.questions[0].id, 'minimalist');

    // Add .open class before calling saveSection
    const panel = document.getElementById('question-panel')!;
    panel.classList.add('open');

    await saveSection(section, () => {});

    // Panel should still be open immediately
    expect(panel.classList.contains('open')).toBe(true);

    // Advance past the 2000 ms delay
    await vi.advanceTimersByTimeAsync(2001);

    expect(panel.classList.contains('open')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #418 — profile-depth.section.ts → profile-depth.state
// ═══════════════════════════════════════════════════════════════════════════════

// ── ARCH #418 — import lines ──────────────────────────────────────────────────

describe('TC-ARCH-418 — profile-depth.section imports state symbols', () => {
  it('imports setAnswer, setActiveSection, addCompletedSection, hasAnswer from profile-depth.state', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    // The import may span multiple lines — find the entire import block for profile-depth.state
    const stateBlockMatch = src.match(/import\s+\{[^}]*\}\s+from\s+['"]\.\/profile-depth\.state\.ts['"]/s);
    expect(stateBlockMatch).not.toBeNull();
    const stateBlock = stateBlockMatch![0];
    expect(stateBlock).toContain('setAnswer');
    expect(stateBlock).toContain('setActiveSection');
    expect(stateBlock).toContain('addCompletedSection');
    expect(stateBlock).toContain('hasAnswer');
  });
});

// ── TC418-1 — setActiveSection called with sectionId in openSection ──────────

describe('TC418-1 — openSection calls setActiveSection with the given sectionId', () => {
  it('sets active section state to the passed sectionId', async () => {
    const { openSection } = await import('../../src/pages/profile-depth.section.ts');
    const { activeSection } = await import('../../src/pages/profile-depth.state.ts');

    // 'basics' is the first section in SECTIONS data
    document.getElementById('question-panel')!.id = 'question-panel';

    openSection('basics', () => {});

    // Re-import state to see updated value (module state is shared in same module graph)
    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.activeSection).toBe('basics');
  });
});

// ── TC418-2 — setAnswer updates answers state via input event ─────────────────

describe('TC418-2 — wireQuestions: .q-input input event calls setAnswer', () => {
  it('updates state.answers[qid] when an input fires', async () => {
    const { wireQuestions } = await import('../../src/pages/profile-depth.section.ts');

    const input = document.createElement('input');
    input.className = 'q-input';
    input.dataset.qid = 'test_q1';
    input.value = 'hello';
    document.body.appendChild(input);

    wireQuestions();
    input.dispatchEvent(new Event('input'));

    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.answers['test_q1']).toBe('hello');
  });
});

// ── TC418-3 — addCompletedSection called when all questions answered ──────────

describe('TC418-3 — saveSection: addCompletedSection called when all questions answered', () => {
  it('completedSections contains section id after full save', async () => {
    mockCurrentUser.value = null;

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('full_sec', 1) as any;
    setAnswer(section.questions[0].id, 'answered');

    await saveSection(section, () => {});

    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.completedSections.has('full_sec')).toBe(true);
  });
});

// ── TC418-4 — hasAnswer returns false for empty / undefined / empty array ─────

describe('TC418-4 — hasAnswer: falsy values', () => {
  it('returns false for undefined, empty string, null, and empty array', async () => {
    const { hasAnswer } = await import('../../src/pages/profile-depth.state.ts');

    expect(hasAnswer(undefined)).toBe(false);
    expect(hasAnswer('')).toBe(false);
    expect(hasAnswer(null as any)).toBe(false);
    expect(hasAnswer([])).toBe(false);
  });
});

// ── TC418-5 — hasAnswer returns true for valid values ─────────────────────────

describe('TC418-5 — hasAnswer: truthy values', () => {
  it('returns true for non-empty string, number, and non-empty array', async () => {
    const { hasAnswer } = await import('../../src/pages/profile-depth.state.ts');

    expect(hasAnswer('text')).toBe(true);
    expect(hasAnswer(5)).toBe(true);
    expect(hasAnswer(['a'])).toBe(true);
  });
});

// ── TC418-6 — setServerQuestionsAnswered invoked after increment succeeds ─────

describe('TC418-6 — saveSection: setServerQuestionsAnswered updated from RPC response', () => {
  it('serverQuestionsAnswered reflects the value returned by increment_questions_answered', async () => {
    mockCurrentUser.value = { id: 'user-state-test' };
    mockSafeRpc.mockResolvedValue({
      data: { ok: true, questions_answered: 42 },
      error: null,
    });

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('increment_sec', 1) as any;
    setAnswer(section.questions[0].id, 'fresh answer');

    await saveSection(section, () => {});

    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.serverQuestionsAnswered).toBe(42);
  });
});

// ── TC418-7 — saveSection partial: addCompletedSection NOT called ─────────────

describe('TC418-7 — saveSection: addCompletedSection NOT called when some questions unanswered', () => {
  it('completedSections does not contain section id when not all questions answered', async () => {
    mockCurrentUser.value = null;

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');

    // Section with 2 questions, only answer one
    const section = makeSection('partial_sec', 2) as any;
    // Do NOT call setAnswer — both questions left unanswered

    await saveSection(section, () => {});

    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.completedSections.has('partial_sec')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #419 — profile-depth.section.ts → profile-depth.data
// ═══════════════════════════════════════════════════════════════════════════════

// ── ARCH #419 — import lines ──────────────────────────────────────────────────

describe('TC-ARCH-419 — profile-depth.section imports SECTIONS from profile-depth.data', () => {
  it('imports SECTIONS from profile-depth.data', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const dataImport = importLines.find(l => l.includes('profile-depth.data'));
    expect(dataImport).toBeDefined();
    expect(dataImport).toContain('SECTIONS');
  });
});

// ── TC419-1 — SECTIONS has 20 entries ─────────────────────────────────────────

describe('TC419-1 — SECTIONS has exactly 20 sections', () => {
  it('exports SECTIONS array with length 20', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    expect(SECTIONS).toHaveLength(20);
  });
});

// ── TC419-2 — first section is basics ─────────────────────────────────────────

describe('TC419-2 — SECTIONS[0] has id "basics"', () => {
  it('first section is the basics section', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    expect(SECTIONS[0].id).toBe('basics');
    expect(SECTIONS[0].name).toBe('THE BASICS');
  });
});

// ── TC419-3 — DEPTH_MILESTONES has 4 entries ──────────────────────────────────

describe('TC419-3 — DEPTH_MILESTONES has 4 threshold entries', () => {
  it('exports DEPTH_MILESTONES with thresholds 25, 50, 75, 100', async () => {
    const { DEPTH_MILESTONES } = await import('../../src/pages/profile-depth.data.ts');
    expect(DEPTH_MILESTONES).toHaveLength(4);
    expect(DEPTH_MILESTONES.map((m: { threshold: number }) => m.threshold)).toEqual([25, 50, 75, 100]);
  });
});

// ── TC419-4 — openSection no-ops if section not in SECTIONS ───────────────────

describe('TC419-4 — openSection: panel not opened for unknown sectionId', () => {
  it('panel does not gain .open class when section id is not in SECTIONS', async () => {
    const { openSection } = await import('../../src/pages/profile-depth.section.ts');

    const panel = document.getElementById('question-panel')!;
    expect(panel.classList.contains('open')).toBe(false);

    openSection('nonexistent_section_xyz', () => {});

    // section not found → returns early before panel.classList.add('open')
    expect(panel.classList.contains('open')).toBe(false);
  });
});

// ── TC419-5 — total question count across all SECTIONS is 100 ─────────────────

describe('TC419-5 — SECTIONS total question count is 100', () => {
  it('all questions in all sections sum to 100', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    const total = SECTIONS.reduce((sum: number, s: { questions: unknown[] }) => sum + s.questions.length, 0);
    expect(total).toBe(100);
  });
});

// ── TC419-6 — every section has a reward with powerUpId ───────────────────────

describe('TC419-6 — every section in SECTIONS has a reward.powerUpId', () => {
  it('all sections define a reward with a non-empty powerUpId', async () => {
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');
    for (const section of SECTIONS) {
      expect(section.reward).toBeDefined();
      expect(typeof section.reward.powerUpId).toBe('string');
      expect(section.reward.powerUpId.length).toBeGreaterThan(0);
    }
  });
});

// ── TC419-7 — openSection uses SECTIONS to render panel HTML ─────────────────

describe('TC419-7 — openSection renders panel content using SECTIONS data', () => {
  it('panel innerHTML contains the section name after openSection is called', async () => {
    const { openSection } = await import('../../src/pages/profile-depth.section.ts');

    openSection('politics', () => {});

    const panel = document.getElementById('question-panel')!;
    expect(panel.classList.contains('open')).toBe(true);
    expect(panel.innerHTML).toContain('POLITICS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #505 — profile-depth.section.ts → profile-depth.tier
// (renderTierBannerUI, updateMilestoneBar)
// ═══════════════════════════════════════════════════════════════════════════════

// ── ARCH #505 — import lines ──────────────────────────────────────────────────

describe('TC-ARCH-505 — profile-depth.section imports tier helpers', () => {
  it('imports renderTierBannerUI and updateMilestoneBar from profile-depth.tier', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const tierImport = importLines.find(l => l.includes('profile-depth.tier'));
    expect(tierImport).toBeDefined();
    expect(tierImport).toContain('renderTierBannerUI');
    expect(tierImport).toContain('updateMilestoneBar');
  });
});

// ── TC505-1 — updateMilestoneBar renders percentage into #milestone-bar ───────

describe('TC505-1 — updateMilestoneBar: renders correct percentage', () => {
  it('milestone-bar innerHTML shows "50 of 100" and "50%" when serverQuestionsAnswered is 50', async () => {
    document.body.innerHTML += '<div id="milestone-bar"></div>';

    const { setServerQuestionsAnswered } = await import('../../src/pages/profile-depth.state.ts');
    setServerQuestionsAnswered(50);

    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');
    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('50 of 100');
    expect(bar.innerHTML).toContain('50%');
  });
});

// ── TC505-2 — updateMilestoneBar marks earned milestones ──────────────────────

describe('TC505-2 — updateMilestoneBar: earned class applied when threshold met', () => {
  it('milestone pip at threshold 25 gets class "earned" when answered >= 25', async () => {
    document.body.innerHTML += '<div id="milestone-bar"></div>';

    const { setServerQuestionsAnswered } = await import('../../src/pages/profile-depth.state.ts');
    setServerQuestionsAnswered(30);

    const { updateMilestoneBar } = await import('../../src/pages/profile-depth.tier.ts');
    updateMilestoneBar();

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('milestone-pip earned');
  });
});

// ── TC505-3 — renderTierBannerUI no-op when window.getTier is undefined ────────

describe('TC505-3 — renderTierBannerUI: early return when getTier is not on window', () => {
  it('does not modify #tier-banner when window.getTier is undefined', async () => {
    document.body.innerHTML += '<div id="tier-banner" style="display:none">UNCHANGED</div>';

    const w = window as unknown as Record<string, unknown>;
    const saved = w.getTier;
    delete w.getTier;

    const { renderTierBannerUI } = await import('../../src/pages/profile-depth.tier.ts');
    renderTierBannerUI(10);

    const banner = document.getElementById('tier-banner')!;
    expect(banner.innerHTML).toBe('UNCHANGED');

    if (saved !== undefined) w.getTier = saved;
  });
});

// ── TC505-4 — renderTierBannerUI renders when window.getTier is defined ────────

describe('TC505-4 — renderTierBannerUI: renders tier content when getTier is defined', () => {
  it('sets tier-banner innerHTML and display:block when getTier is set on window', async () => {
    document.body.innerHTML += '<div id="tier-banner" style="display:none"></div>';

    const w = window as unknown as Record<string, unknown>;
    const savedGetTier = w.getTier;
    const savedGetNextTier = w.getNextTier;
    const savedRenderTierBadge = w.renderTierBadge;
    const savedRenderTierProgress = w.renderTierProgress;

    w.getTier = (_qa: number) => ({ maxStake: 100, slots: 2, name: 'Silver' });
    w.getNextTier = (_qa: number) => ({ questionsNeeded: 10, name: 'Gold' });
    w.renderTierBadge = (_qa: number) => '<span class="badge">Silver</span>';
    w.renderTierProgress = (_qa: number) => '<div class="progress">70%</div>';

    const { renderTierBannerUI } = await import('../../src/pages/profile-depth.tier.ts');
    renderTierBannerUI(40);

    const banner = document.getElementById('tier-banner')!;
    expect(banner.style.display).toBe('block');
    expect(banner.innerHTML).toContain('RANK:');

    if (savedGetTier !== undefined) w.getTier = savedGetTier;
    else delete w.getTier;
    if (savedGetNextTier !== undefined) w.getNextTier = savedGetNextTier;
    else delete w.getNextTier;
    if (savedRenderTierBadge !== undefined) w.renderTierBadge = savedRenderTierBadge;
    else delete w.renderTierBadge;
    if (savedRenderTierProgress !== undefined) w.renderTierProgress = savedRenderTierProgress;
    else delete w.renderTierProgress;
  });
});

// ── TC505-5 — saveSection always calls updateMilestoneBar ─────────────────────

describe('TC505-5 — saveSection: updateMilestoneBar invoked unconditionally', () => {
  it('milestone-bar is rendered even when user is not signed in', async () => {
    mockCurrentUser.value = null;

    document.body.innerHTML += '<div id="milestone-bar"></div>';

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('lifestyle2', 1) as any;
    setAnswer(section.questions[0].id, 'vegan');

    await saveSection(section, () => {});

    const bar = document.getElementById('milestone-bar')!;
    expect(bar.innerHTML).toContain('milestone-label');
  });
});

// ── TC505-6 — saveSection calls renderTierBannerUI after increment success ─────

describe('TC505-6 — saveSection: renderTierBannerUI called after increment_questions_answered ok', () => {
  it('tier-banner display becomes block after increment returns ok:true and getTier is on window', async () => {
    mockCurrentUser.value = { id: 'user-tier-test' };
    mockSafeRpc.mockResolvedValue({
      data: { ok: true, questions_answered: 15 },
      error: null,
    });

    document.body.innerHTML += '<div id="tier-banner" style="display:none"></div>';
    document.body.innerHTML += '<div id="milestone-bar"></div>';

    const w = window as unknown as Record<string, unknown>;
    const savedGetTier = w.getTier;
    w.getTier = (_qa: number) => ({ maxStake: 0, slots: 0, name: 'Bronze' });

    const { saveSection } = await import('../../src/pages/profile-depth.section.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');

    const section = makeSection('tier_test_sec', 1) as any;
    setAnswer(section.questions[0].id, 'fresh');

    await saveSection(section, () => {});

    const banner = document.getElementById('tier-banner')!;
    expect(banner.style.display).toBe('block');

    if (savedGetTier !== undefined) w.getTier = savedGetTier;
    else delete w.getTier;
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #506 — profile-depth.section.ts → profile-depth.render
// ═══════════════════════════════════════════════════════════════════════════════

// ── ARCH #506 — import lines ──────────────────────────────────────────────────

describe('TC-ARCH-506 — profile-depth.section imports renderQuestion and renderGrid from profile-depth.render', () => {
  it('imports renderQuestion and renderGrid from profile-depth.render.ts', () => {
    const src = readFileSync(
      resolve('src/pages/profile-depth.section.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const renderImport = importLines.find(l => l.includes('profile-depth.render'));
    expect(renderImport).toBeDefined();
    expect(renderImport).toContain('renderQuestion');
    expect(renderImport).toContain('renderGrid');
  });
});

// ── TC506-1 — openSection calls renderGrid: grid contains section tiles ────────

describe('TC506-1 — openSection calls renderGrid: section-grid is populated', () => {
  it('after openSection, #section-grid contains at least one .section-tile', async () => {
    document.body.innerHTML += '<div id="section-grid"></div>';
    const { openSection } = await import('../../src/pages/profile-depth.section.ts');

    openSection('basics', () => {});

    const grid = document.getElementById('section-grid')!;
    expect(grid.querySelectorAll('.section-tile').length).toBeGreaterThan(0);
  });
});

// ── TC506-2 — openSection calls renderQuestion: panel contains .question-card ──

describe('TC506-2 — openSection calls renderQuestion: panel contains .question-card elements', () => {
  it('panel innerHTML contains .question-card markup after openSection', async () => {
    const { openSection } = await import('../../src/pages/profile-depth.section.ts');

    openSection('basics', () => {});

    const panel = document.getElementById('question-panel')!;
    expect(panel.querySelectorAll('.question-card').length).toBeGreaterThan(0);
  });
});

// ── TC506-3 — renderGrid tiles have correct data-section attributes ────────────

describe('TC506-3 — renderGrid sets data-section on each tile', () => {
  it('every .section-tile has a non-empty data-section matching a known section id', async () => {
    document.body.innerHTML += '<div id="section-grid"></div>';
    const { renderGrid } = await import('../../src/pages/profile-depth.render.ts');
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');

    renderGrid(() => {});

    const tiles = document.querySelectorAll('.section-tile');
    expect(tiles.length).toBe(SECTIONS.length);
    const validIds = new Set(SECTIONS.map((s: { id: string }) => s.id));
    tiles.forEach(tile => {
      const sectionId = (tile as HTMLElement).dataset.section;
      expect(sectionId).toBeDefined();
      expect(validIds.has(sectionId!)).toBe(true);
    });
  });
});

// ── TC506-4 — renderQuestion for type input renders q-input with data-qid ─────

describe('TC506-4 — renderQuestion: input type produces .q-input with data-qid', () => {
  it('renders an <input class="q-input"> with correct data-qid attribute', async () => {
    const { renderQuestion } = await import('../../src/pages/profile-depth.render.ts');

    const question = { id: 'test_input_q', label: 'Test label', type: 'input' as const, placeholder: 'Enter text' };
    const html = renderQuestion(question);

    expect(html).toContain('class="q-input"');
    expect(html).toContain('data-qid="test_input_q"');
  });
});

// ── TC506-5 — sectionPct returns 0 when no answers, 100 when all answered ──────

describe('TC506-5 — sectionPct: returns correct completion percentage', () => {
  it('returns 0 with empty answers and 100 with all questions answered', async () => {
    const { sectionPct } = await import('../../src/pages/profile-depth.render.ts');
    const { setAnswer } = await import('../../src/pages/profile-depth.state.ts');
    const { SECTIONS } = await import('../../src/pages/profile-depth.data.ts');

    // Use the first section (basics, 5 questions)
    const section = SECTIONS[0];

    // No answers set — expect 0%
    const pct0 = sectionPct(section);
    expect(pct0).toBe(0);

    // Answer all questions
    section.questions.forEach((q: { id: string }) => setAnswer(q.id, 'answered'));
    const pct100 = sectionPct(section);
    expect(pct100).toBe(100);
  });
});

// ── TC506-6 — ringSVG returns SVG string with stroke-dashoffset ────────────────

describe('TC506-6 — ringSVG: returns an SVG string containing stroke-dashoffset', () => {
  it('ringSVG(50) returns a string with <svg> and stroke-dashoffset', async () => {
    const { ringSVG } = await import('../../src/pages/profile-depth.render.ts');

    const svg = ringSVG(50);
    expect(svg).toContain('<svg>');
    expect(svg).toContain('stroke-dashoffset');
    // At 50%, offset should be half the circumference (2 * PI * 9 / 2 ≈ 28.27)
    expect(svg).toContain('stroke-dasharray');
  });
});
