import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import {
  rewardLabel,
  rewardTypeLabel,
  rewardRowHtml,
  activityRowHtml,
} from '../src/pages/home.invite-html.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
});

// ── rewardLabel ────────────────────────────────────────────────

describe('TC1 — rewardLabel returns "Legendary Power-Up" for milestone 1', () => {
  it('returns correct label for 1', () => {
    expect(rewardLabel(1)).toBe('Legendary Power-Up');
  });
});

describe('TC2 — rewardLabel returns "Mythic Power-Up" for milestone 5', () => {
  it('returns correct label for 5', () => {
    expect(rewardLabel(5)).toBe('Mythic Power-Up');
  });
});

describe('TC3 — rewardLabel returns "Mythic Modifier" for milestone 25', () => {
  it('returns correct label for 25', () => {
    expect(rewardLabel(25)).toBe('Mythic Modifier');
  });
});

describe('TC4 — rewardLabel defaults to "Mythic Power-Up" for unknown milestones', () => {
  it('returns fallback for unknown milestone', () => {
    expect(rewardLabel(999)).toBe('Mythic Power-Up');
  });
});

// ── rewardTypeLabel ────────────────────────────────────────────

describe('TC5 — rewardTypeLabel maps legendary_powerup', () => {
  it('returns emoji label for legendary_powerup', () => {
    expect(rewardTypeLabel('legendary_powerup')).toContain('Legendary');
  });
});

describe('TC6 — rewardTypeLabel maps mythic_powerup', () => {
  it('returns emoji label for mythic_powerup', () => {
    expect(rewardTypeLabel('mythic_powerup')).toContain('Mythic Power-Up');
  });
});

describe('TC7 — rewardTypeLabel maps mythic_modifier', () => {
  it('returns emoji label for mythic_modifier', () => {
    expect(rewardTypeLabel('mythic_modifier')).toContain('Modifier');
  });
});

// ── rewardRowHtml ──────────────────────────────────────────────

function buildReward(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reward-1',
    reward_type: 'legendary_powerup' as const,
    milestone: 1,
    awarded_at: '2024-01-15T00:00:00Z',
    pending_review: false,
    ...overrides,
  };
}

describe('TC8 — rewardRowHtml renders invite-reward-row with reward id', () => {
  it('data-reward-id attribute contains reward id', () => {
    const html = rewardRowHtml(buildReward({ id: 'reward-abc' }) as never);
    expect(html).toContain('reward-abc');
  });
});

describe('TC9 — rewardRowHtml shows CLAIM button for non-pending reward', () => {
  it('button label is CLAIM when pending_review is false', () => {
    const html = rewardRowHtml(buildReward({ pending_review: false }) as never);
    expect(html).toContain('CLAIM');
    expect(html).not.toContain('disabled');
  });
});

describe('TC10 — rewardRowHtml shows PENDING REVIEW for pending reward', () => {
  it('button label is PENDING REVIEW and is disabled', () => {
    const html = rewardRowHtml(buildReward({ pending_review: true }) as never);
    expect(html).toContain('PENDING REVIEW');
    expect(html).toContain('disabled');
  });
});

describe('TC11 — rewardRowHtml calls escapeHTML for reward id', () => {
  it('escapeHTML is called during render', () => {
    rewardRowHtml(buildReward() as never);
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC12 — rewardRowHtml includes milestone number', () => {
  it('HTML contains milestone value', () => {
    const html = rewardRowHtml(buildReward({ milestone: 5 }) as never);
    expect(html).toContain('5');
  });
});

// ── activityRowHtml ────────────────────────────────────────────

function buildActivity(overrides: Record<string, unknown> = {}) {
  return {
    status: 'converted',
    username: 'PatW',
    event_at: '2024-01-20T00:00:00Z',
    ...overrides,
  };
}

describe('TC13 — activityRowHtml renders invite-activity-row', () => {
  it('HTML contains invite-activity-row class', () => {
    const html = activityRowHtml(buildActivity() as never);
    expect(html).toContain('invite-activity-row');
  });
});

describe('TC14 — activityRowHtml shows converted message', () => {
  it('completed their first debate text for converted status', () => {
    const html = activityRowHtml(buildActivity({ status: 'converted' }) as never);
    expect(html).toContain('completed their first debate');
  });
});

describe('TC15 — activityRowHtml shows clicked message', () => {
  it('clicked your link text for clicked status', () => {
    const html = activityRowHtml(buildActivity({ status: 'clicked' }) as never);
    expect(html).toContain('clicked your link');
  });
});

describe('TC16 — activityRowHtml shows signed_up message', () => {
  it('signed up text for signed_up status', () => {
    const html = activityRowHtml(buildActivity({ status: 'signed_up' }) as never);
    expect(html).toContain('signed up');
  });
});

describe('TC17 — activityRowHtml uses "Someone" when username is null', () => {
  it('fallback name Someone when username is null', () => {
    const html = activityRowHtml(buildActivity({ username: null }) as never);
    expect(html).toContain('Someone');
  });
});

describe('TC18 — activityRowHtml calls escapeHTML on username', () => {
  it('escapeHTML is called with username', () => {
    activityRowHtml(buildActivity({ username: 'PatW' }) as never);
    expect(mockEscapeHTML).toHaveBeenCalledWith('PatW');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — home.invite-html.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './home.invite-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite-html.ts'),
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
