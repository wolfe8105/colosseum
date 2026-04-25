import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

const mockRewardLabel     = vi.hoisted(() => vi.fn());
const mockRewardRowHtml   = vi.hoisted(() => vi.fn());
const mockActivityRowHtml = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/home.invite-html.ts', () => ({
  rewardLabel:     mockRewardLabel,
  rewardRowHtml:   mockRewardRowHtml,
  activityRowHtml: mockActivityRowHtml,
}));

const mockWireInviteScreen = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/home.invite-wiring.ts', () => ({
  wireInviteScreen: mockWireInviteScreen,
}));

import { renderInvite } from '../src/pages/home.invite-render.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildStats(overrides: Record<string, unknown> = {}) {
  return {
    invite_url: 'https://themoderator.app/i/abc',
    total_converts: 3,
    total_signups: 5,
    total_clicks: 20,
    next_milestone: 5,
    unclaimed_rewards: [],
    activity: [],
    ...overrides,
  } as never;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockRewardLabel.mockReset();
  mockRewardLabel.mockReturnValue('Mythic Power-Up');
  mockRewardRowHtml.mockReset();
  mockRewardRowHtml.mockReturnValue('<div class="invite-reward-row"></div>');
  mockActivityRowHtml.mockReset();
  mockActivityRowHtml.mockReturnValue('<div class="invite-activity-row"></div>');
  mockWireInviteScreen.mockReset();
  document.body.innerHTML = '';
});

// ── renderInvite ───────────────────────────────────────────────

describe('TC1 — renderInvite calls wireInviteScreen', () => {
  it('wireInviteScreen called with container, stats, and onClaim', () => {
    const container = document.createElement('div');
    const stats = buildStats();
    const onClaim = vi.fn();

    renderInvite(container, stats, onClaim);

    expect(mockWireInviteScreen).toHaveBeenCalledWith(container, stats, onClaim);
  });
});

describe('TC2 — renderInvite renders invite-wrap container', () => {
  it('container innerHTML contains invite-wrap', () => {
    const container = document.createElement('div');
    renderInvite(container, buildStats(), vi.fn());
    expect(container.innerHTML).toContain('invite-wrap');
  });
});

describe('TC3 — headline shows "X of Y invites" when converts < 25', () => {
  it('converts < next_milestone uses rewardLabel for text', () => {
    mockRewardLabel.mockReturnValue('Legendary Power-Up');
    const container = document.createElement('div');
    renderInvite(container, buildStats({ total_converts: 3, next_milestone: 5 }), vi.fn());
    expect(container.innerHTML).toContain('3 of 5 invites');
  });
});

describe('TC4 — headline shows milestone message when converts === 25', () => {
  it('exact 25 converts shows mythic modifier earned text', () => {
    const container = document.createElement('div');
    renderInvite(
      container,
      buildStats({ total_converts: 25, next_milestone: 25 }),
      vi.fn(),
    );
    expect(container.innerHTML).toContain('Mythic Modifier earned');
  });
});

describe('TC5 — headline shows repeating count when converts > 25', () => {
  it('50 converts shows successful invites count', () => {
    const container = document.createElement('div');
    renderInvite(
      container,
      buildStats({ total_converts: 50, next_milestone: 25 }),
      vi.fn(),
    );
    expect(container.innerHTML).toContain('50 successful invites');
  });
});

describe('TC6 — progress fill width reflects percentage', () => {
  it('3 of 5 converts → 60.0% width', () => {
    const container = document.createElement('div');
    renderInvite(
      container,
      buildStats({ total_converts: 3, next_milestone: 5 }),
      vi.fn(),
    );
    expect(container.innerHTML).toContain('width:60.0%');
  });
});

describe('TC7 — stats numbers rendered via Number() cast', () => {
  it('converts, signups, and clicks appear in container', () => {
    const container = document.createElement('div');
    renderInvite(
      container,
      buildStats({ total_converts: 3, total_signups: 5, total_clicks: 20 }),
      vi.fn(),
    );
    expect(container.innerHTML).toContain('3 successful');
    expect(container.innerHTML).toContain('5 signed up');
    expect(container.innerHTML).toContain('20 clicks');
  });
});

describe('TC8 — unclaimed rewards section shown when rewards present', () => {
  it('UNCLAIMED REWARDS section appears when unclaimed_rewards is non-empty', () => {
    const reward = { id: 'r1', reward_type: 'legendary_powerup', milestone: 1, awarded_at: '', pending_review: false };
    const container = document.createElement('div');
    renderInvite(container, buildStats({ unclaimed_rewards: [reward] }), vi.fn());
    expect(container.innerHTML).toContain('UNCLAIMED REWARDS');
  });
});

describe('TC9 — empty activity text when activity is empty', () => {
  it('shows "No invite activity yet" when activity array is empty', () => {
    const container = document.createElement('div');
    renderInvite(container, buildStats({ activity: [] }), vi.fn());
    expect(container.innerHTML).toContain('No invite activity yet');
  });
});

describe('TC10 — rewardRowHtml called for each unclaimed reward', () => {
  it('rewardRowHtml called once per reward', () => {
    const reward1 = { id: 'r1', reward_type: 'legendary_powerup', milestone: 1, awarded_at: '', pending_review: false };
    const reward2 = { id: 'r2', reward_type: 'mythic_powerup',    milestone: 5, awarded_at: '', pending_review: false };
    const container = document.createElement('div');
    renderInvite(container, buildStats({ unclaimed_rewards: [reward1, reward2] }), vi.fn());
    expect(mockRewardRowHtml).toHaveBeenCalledTimes(2);
  });
});

describe('TC11 — activityRowHtml called for each activity item', () => {
  it('activityRowHtml called once per activity', () => {
    const act = { status: 'converted', username: 'Pat', event_at: '' };
    const container = document.createElement('div');
    renderInvite(container, buildStats({ activity: [act, act] }), vi.fn());
    expect(mockActivityRowHtml).toHaveBeenCalledTimes(2);
  });
});

describe('TC12 — escapeHTML called on headline text', () => {
  it('escapeHTML is called during renderInvite', () => {
    const container = document.createElement('div');
    renderInvite(container, buildStats(), vi.fn());
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC13 — no invite link section when invite_url is null', () => {
  it('shows "Complete your profile" message when invite_url is null', () => {
    const container = document.createElement('div');
    renderInvite(container, buildStats({ invite_url: null }), vi.fn());
    expect(container.innerHTML).toContain('Complete your profile');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — home.invite-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './home.invite-types.ts',
      './home.invite-html.ts',
      './home.invite-wiring.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite-render.ts'),
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
