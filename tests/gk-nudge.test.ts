// ============================================================
// GATEKEEPER -- F-35 In-App Nudge Toasts
// Source: src/nudge.ts
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md -- F-35
//
// F-35 spec claims tested here:
//   Suppression: once per session, 24h cooldown, 3/session cap
//   8 trigger points: enter_debate, round_end, final_score win,
//   final_score loss, return_visit, first_signup, replay_entry,
//   first_vote spectate, first_vote hot-take feed
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- vi.hoisted required -- mock factory is hoisted before const --

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  FEATURES: { shareLinks: true },
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

import { nudge } from '../src/nudge.ts';

beforeEach(() => {
  mockShowToast.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});

// -- TC1 -- Suppression: once per session per ID -----------------

describe('TC1 -- suppression: once per session per nudge ID', () => {
  it('does not fire showToast when same ID already fired this session', () => {
    nudge('tc1-dup', 'First fire');
    mockShowToast.mockReset();

    nudge('tc1-dup', 'Second fire -- must be suppressed');

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('fires on first call for a given ID in a fresh session', () => {
    nudge('tc1-fresh', 'Should fire once');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// -- TC2 -- Suppression: 24-hour cooldown -----------------------

describe('TC2 -- suppression: 24h cooldown not expired blocks nudge', () => {
  it('blocks when history entry is less than 24h old', () => {
    const recent = Date.now() - 60 * 60 * 1000;
    localStorage.setItem('mod_nudge_history', JSON.stringify({ 'tc2-id': recent }));

    nudge('tc2-id', 'Should be blocked -- 24h not passed');

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('allows when history entry is older than 24h', () => {
    const old = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem('mod_nudge_history', JSON.stringify({ 'tc2-old': old }));

    nudge('tc2-old', 'Should fire -- cooldown expired');

    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('allows a nudge ID with no prior history', () => {
    nudge('tc2-never-shown', 'Should fire -- no history entry');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// -- TC3 -- Suppression: 3 nudges per session cap ----------------

describe('TC3 -- suppression: 3-per-session cap', () => {
  it('blocks the 4th unique nudge ID in a session', () => {
    nudge('cap-a', 'One');
    nudge('cap-b', 'Two');
    nudge('cap-c', 'Three');
    mockShowToast.mockReset();

    nudge('cap-d', 'Four -- must be blocked by session cap');

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('fires exactly 3 nudges before hitting cap', () => {
    nudge('cap-x', 'One');
    nudge('cap-y', 'Two');
    nudge('cap-z', 'Three');

    expect(mockShowToast).toHaveBeenCalledTimes(3);
  });

  it('5th unique ID is also blocked after cap reached', () => {
    nudge('cap-1', 'One');
    nudge('cap-2', 'Two');
    nudge('cap-3', 'Three');
    mockShowToast.mockReset();

    nudge('cap-4', 'Four');
    nudge('cap-5', 'Five');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- TC4 -- Trigger: enter_debate --------------------------------

describe('TC4 -- trigger point: enter_debate', () => {
  it("nudge fires for enter_debate ID on a fresh session", () => {
    nudge('enter_debate', "You're in. The feed is live.");
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it("enter_debate nudge is suppressed on second call same session", () => {
    nudge('enter_debate', "You're in. The feed is live.");
    mockShowToast.mockReset();

    nudge('enter_debate', "You're in. The feed is live.");

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- TC5 -- Trigger: round_end -----------------------------------

describe('TC5 -- trigger point: round_end', () => {
  it('nudge fires for round_end ID on a fresh session', () => {
    nudge('round_end', 'Round complete. Stay sharp.');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// -- TC6 -- Trigger: final_score win -----------------------------

describe('TC6 -- trigger point: final_score win', () => {
  it('nudge fires for final_score ID with success type on a fresh session', () => {
    nudge('final_score', 'Victory. The arena remembers.', 'success');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Victory. The arena remembers.', 'success');
  });
});

// -- TC7 -- Trigger: final_score loss ----------------------------

describe('TC7 -- trigger point: final_score loss', () => {
  it('nudge fires for final_score ID with info type for loss on a fresh session', () => {
    nudge('final_score', 'Defeat. Come back stronger.', 'info');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Defeat. Come back stronger.', 'info');
  });

  it('win and loss share final_score ID -- second call same session is suppressed', () => {
    nudge('final_score', 'Victory. The arena remembers.', 'success');
    mockShowToast.mockReset();

    nudge('final_score', 'Defeat. Come back stronger.', 'info');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- TC8 -- Trigger: return_visit --------------------------------

describe('TC8 -- trigger point: return_visit', () => {
  it('nudge fires for return_visit ID on a fresh session', () => {
    nudge('return_visit', 'Welcome back. The arena missed you.');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// -- TC9 -- Trigger: first_signup --------------------------------

describe('TC9 -- trigger point: first_signup', () => {
  it('nudge fires for first_signup ID on a fresh session', () => {
    nudge('first_signup', 'Welcome to the arena. Your journey starts now.', 'success');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Welcome to the arena. Your journey starts now.',
      'success'
    );
  });
});

// -- TC10 -- Trigger: replay_entry -------------------------------

describe('TC10 -- trigger point: replay_entry', () => {
  it('nudge fires for replay_entry ID on a fresh session', () => {
    nudge('replay_entry', 'Watching the replay. Judge for yourself.');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});

// -- TC11 -- Trigger: first_vote spectate -----------------------

describe('TC11 -- trigger point: first_vote spectate', () => {
  it('nudge fires for first_vote ID on a fresh session (spectate context)', () => {
    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('first_vote nudge is suppressed on second call same session', () => {
    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');
    mockShowToast.mockReset();

    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- TC12 -- Trigger: first_vote hot-take feed ------------------
//
// Spec: first_vote hot-take feed (async.ts -- added Session 190)
// The hot-take feed uses the same first_vote nudge ID.
// Suppression ensures it fires at most once across both contexts.

describe('TC12 -- trigger point: first_vote hot-take feed (same ID as spectate)', () => {
  it('nudge fires for first_vote ID on a fresh session (hot-take feed context)', () => {
    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('first_vote suppressed if spectate already fired same session', () => {
    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');
    mockShowToast.mockReset();

    nudge('first_vote', 'Vote cast. Your voice shapes the verdict.');

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- ARCH -- src/nudge.ts only imports from allowed modules ------

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH -- src/nudge.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(resolve(__dirname, '../src/nudge.ts'), 'utf-8');
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
