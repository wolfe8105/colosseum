// ============================================================
// PROFILE DEPTH SECTION — tests/profile-depth-section.test.ts
// Source: src/pages/profile-depth.section.ts
//
// CLASSIFICATION:
//   openSection():   DOM behavioral — populates panel, wires events
//   wireQuestions(): DOM event wiring — input/chip/slider/select events
//   saveSection():   RPC behavioral — persists answers, claims rewards
//   showReward():    DOM behavioral — populates reward toast
//
// IMPORTS:
//   { escapeHTML }         from '../config.ts'
//   { safeRpc, getCurrentUser, getIsPlaceholderMode } from '../auth.ts'
//   { increment_questions_answered, claim_section_reward } from '../contracts/rpc-schemas.ts'
//   { checkProfileMilestones } from '../tokens.ts'
//   { SECTIONS }           from './profile-depth.data.ts'
//   { renderQuestion, renderGrid } from './profile-depth.render.ts'
//   { renderTierBannerUI, updateMilestoneBar } from './profile-depth.tier.ts'
//   state setters          from './profile-depth.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc             = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentUser      = vi.hoisted(() => vi.fn(() => ({ id: 'u1' })));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockCheckProfileMilestones = vi.hoisted(() => vi.fn());
const mockRenderQuestion      = vi.hoisted(() => vi.fn((q: { id: string; label: string }) => `<input class="q-input" data-qid="${q.id}">`));
const mockRenderGrid          = vi.hoisted(() => vi.fn());
const mockRenderTierBannerUI  = vi.hoisted(() => vi.fn());
const mockUpdateMilestoneBar  = vi.hoisted(() => vi.fn());

const mockAnswers: Record<string, unknown> = {};
const mockCompletedSections = new Set<string>();
const mockPreviouslyAnsweredIds = new Set<string>();
let mockServerQuestionsAnswered = 0;
const mockSetAnswer      = vi.hoisted(() => vi.fn((id: string, val: unknown) => { mockAnswers[id] = val; }));
const mockSetActiveSection = vi.hoisted(() => vi.fn());
const mockAddCompletedSection = vi.hoisted(() => vi.fn((id: string) => mockCompletedSections.add(id)));
const mockSetServerQuestionsAnswered = vi.hoisted(() => vi.fn((n: number) => { mockServerQuestionsAnswered = n; }));
const mockHasAnswer      = vi.hoisted(() => vi.fn((v: unknown) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)));

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc:              mockSafeRpc,
  getCurrentUser:       mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  onChange:             vi.fn(),
  ready:                Promise.resolve(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  increment_questions_answered: {},
  claim_section_reward: {},
  get_my_invite_link: {},
}));

vi.mock('../src/tokens.ts', () => ({
  checkProfileMilestones: mockCheckProfileMilestones,
  init: vi.fn(),
}));

vi.mock('../src/pages/profile-depth.data.ts', () => ({
  SECTIONS: [
    {
      id: 'basics',
      icon: '👤',
      name: 'THE BASICS',
      reward: { type: 'powerup', text: 'Free power-up', powerUpId: 'reveal' },
      questions: [
        { id: 'b1', label: 'Name?', type: 'input', placeholder: 'Display name' },
        { id: 'b2', label: 'Age?',  type: 'chips', options: ['18-24', '25-34'], multi: false },
      ],
    },
  ],
  DEPTH_MILESTONES: [],
}));

vi.mock('../src/pages/profile-depth.render.ts', () => ({
  renderQuestion: mockRenderQuestion,
  renderGrid:     mockRenderGrid,
  sectionPct:     vi.fn(() => 0),
  ringSVG:        vi.fn(() => ''),
}));

vi.mock('../src/pages/profile-depth.tier.ts', () => ({
  renderTierBannerUI: mockRenderTierBannerUI,
  updateMilestoneBar: mockUpdateMilestoneBar,
}));

vi.mock('../src/pages/profile-depth.state.ts', () => ({
  get answers() { return mockAnswers; },
  get completedSections() { return mockCompletedSections; },
  get previouslyAnsweredIds() { return mockPreviouslyAnsweredIds; },
  get serverQuestionsAnswered() { return mockServerQuestionsAnswered; },
  setAnswer:      mockSetAnswer,
  setActiveSection: mockSetActiveSection,
  addCompletedSection: mockAddCompletedSection,
  setServerQuestionsAnswered: mockSetServerQuestionsAnswered,
  hasAnswer:      mockHasAnswer,
  activeSection:  null,
}));

import { openSection, wireQuestions, showReward } from '../src/pages/profile-depth.section.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="question-panel"></div>
    <div id="reward-icon"></div>
    <div id="reward-text"></div>
    <div id="reward-desc"></div>
    <div id="reward-toast"></div>
    <div id="section-grid"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockAnswers).forEach(k => delete mockAnswers[k]);
  mockCompletedSections.clear();
  mockPreviouslyAnsweredIds.clear();
  mockServerQuestionsAnswered = 0;
  // jsdom does not implement scrollIntoView
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
  buildDOM();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — openSection populates #question-panel', () => {
  it('sets panel innerHTML with question content', () => {
    openSection('basics', vi.fn());
    const panel = document.getElementById('question-panel')!;
    expect(panel.innerHTML).toContain('THE BASICS');
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openSection opens panel by adding "open" class', () => {
  it('panel has class "open" after openSection', () => {
    openSection('basics', vi.fn());
    expect(document.getElementById('question-panel')?.classList.contains('open')).toBe(true);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — openSection calls setActiveSection', () => {
  it('calls setActiveSection with the sectionId', () => {
    openSection('basics', vi.fn());
    expect(mockSetActiveSection).toHaveBeenCalledWith('basics');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — openSection returns early for unknown section', () => {
  it('does not modify panel when sectionId not found', () => {
    openSection('nonexistent', vi.fn());
    const panel = document.getElementById('question-panel')!;
    expect(panel.innerHTML).toBe('');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — wireQuestions wires input change to setAnswer', () => {
  it('calls setAnswer with qid and value on input event', () => {
    document.body.innerHTML = `<input class="q-input" data-qid="b1" value="">`;
    wireQuestions();
    const input = document.querySelector<HTMLInputElement>('.q-input')!;
    input.value = 'Alice';
    input.dispatchEvent(new Event('input'));
    expect(mockSetAnswer).toHaveBeenCalledWith('b1', 'Alice');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — wireQuestions wires chip single-select click', () => {
  it('calls setAnswer with selected chip value', () => {
    document.body.innerHTML = `
      <div class="chip-group" data-qid="b2" data-multi="false">
        <div class="chip" data-val="18-24">18-24</div>
        <div class="chip" data-val="25-34">25-34</div>
      </div>
    `;
    wireQuestions();
    (document.querySelector('[data-val="18-24"]') as HTMLElement).click();
    expect(mockSetAnswer).toHaveBeenCalledWith('b2', '18-24');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — wireQuestions wires slider input to setAnswer as integer', () => {
  it('calls setAnswer with parseInt(value) for slider', () => {
    document.body.innerHTML = `<input type="range" class="q-slider" data-qid="s1" value="7"><span id="slider-val-s1"></span>`;
    wireQuestions();
    const slider = document.querySelector<HTMLInputElement>('.q-slider')!;
    slider.value = '7';
    slider.dispatchEvent(new Event('input'));
    expect(mockSetAnswer).toHaveBeenCalledWith('s1', 7);
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — wireQuestions wires select change to setAnswer', () => {
  it('calls setAnswer with selected value on change', () => {
    document.body.innerHTML = `
      <select class="q-select" data-qid="i1">
        <option value="<$25K">&lt;$25K</option>
        <option value="$25-50K">$25-50K</option>
      </select>
    `;
    wireQuestions();
    const sel = document.querySelector<HTMLSelectElement>('.q-select')!;
    sel.value = '$25-50K';
    sel.dispatchEvent(new Event('change'));
    expect(mockSetAnswer).toHaveBeenCalledWith('i1', '$25-50K');
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — showReward populates reward DOM elements', () => {
  it('sets reward-text, reward-desc, and reward-icon', () => {
    showReward({ type: 'powerup', text: 'Free Power-Up!', powerUpId: 'reveal' });
    expect(document.getElementById('reward-icon')?.textContent).toBe('👁️');
    expect(document.getElementById('reward-text')?.textContent).toBe('POWER-UP EARNED');
    expect(document.getElementById('reward-desc')?.textContent).toBe('Free Power-Up!');
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — showReward adds "show" class to reward-toast', () => {
  it('reward-toast gets class "show" after showReward', () => {
    showReward({ type: 'powerup', text: 'Earned!', powerUpId: 'shield' });
    expect(document.getElementById('reward-toast')?.classList.contains('show')).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/profile-depth.section.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../tokens.ts',
      './profile-depth.data.ts',
      './profile-depth.render.ts',
      './profile-depth.tier.ts',
      './profile-depth.state.ts',
      './profile-depth.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/profile-depth.section.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
