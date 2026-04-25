// ============================================================
// INTEGRATOR — feed-card + auth + badge + bounties.dot
// Boundary: renderFeedCard() calls getCurrentUser() (auth.core),
//           vgBadge() (badge), bountyDot() (bounties.dot)
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
// HELPERS
// ============================================================

function makeCard(overrides: Partial<import('../../src/feed-card.ts').UnifiedFeedCard> = {}): import('../../src/feed-card.ts').UnifiedFeedCard {
  return {
    id: 'card-abc-123',
    topic: 'AI will replace developers',
    content: 'AI will replace developers',
    category: 'tech',
    status: 'open',
    mode: null,
    ruleset: null,
    current_round: null,
    total_rounds: null,
    score_a: null,
    score_b: null,
    vote_count_a: null,
    vote_count_b: null,
    reaction_count: 5,
    link_url: null,
    link_preview: null,
    ranked: null,
    created_at: new Date().toISOString(),
    debater_a: 'user-uuid-aaa',
    debater_b: null,
    debater_a_username: 'alice',
    debater_a_name: 'Alice',
    elo_a: 1200,
    verified_a: false,
    debater_b_username: null,
    debater_b_name: null,
    elo_b: null,
    verified_b: false,
    userReacted: false,
    ...overrides,
  };
}

// ============================================================
// MODULE RE-IMPORT PER TEST
// ============================================================

let renderFeedCard: (card: import('../../src/feed-card.ts').UnifiedFeedCard) => string;
let loadBountyDotSet: () => Promise<void>;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();

  // Default: auth resolves with no session (guest)
  mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: null) => void) => {
    setTimeout(() => cb('INITIAL_SESSION', null), 0);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mockRpc.mockResolvedValue({ data: null, error: null });

  const feedCardMod = await import('../../src/feed-card.ts');
  renderFeedCard = feedCardMod.renderFeedCard;

  const bountiesMod = await import('../../src/bounties.dot.ts');
  loadBountyDotSet = bountiesMod.loadBountyDotSet;
});

// ============================================================
// TC-I1: Guest views open card → challenge button present, no cancel
// ============================================================

describe('TC-I1: open card rendered for guest (non-owner)', () => {
  it('shows CHALLENGE button and no CANCEL button when getCurrentUser() is null', async () => {
    // Auth is guest (no session) — getCurrentUser() returns null
    // Card owned by 'user-uuid-aaa', not by current user
    const card = makeCard({ debater_a: 'user-uuid-aaa' });
    const html = renderFeedCard(card);

    expect(html).toContain('CHALLENGE');
    expect(html).not.toContain('CANCEL');
    expect(html).toContain('data-action="challenge-card"');
    expect(html).toContain('data-action="react-card"');
  });
});

// ============================================================
// TC-I2: Authenticated user views their own open card → cancel, no challenge
// ============================================================

describe('TC-I2: open card rendered for owner', () => {
  it('shows CANCEL button and no CHALLENGE button when getCurrentUser().id matches debater_a', async () => {
    // Re-import with a signed-in user
    vi.resetModules();
    mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: { user: { id: string; email: string } } | null) => void) => {
      const mockUser = { id: 'user-uuid-aaa', email: 'alice@test.com' };
      setTimeout(() => cb('INITIAL_SESSION', { user: mockUser } as any), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    // Profile load RPC
    mockRpc.mockResolvedValue({ data: { id: 'user-uuid-aaa', username: 'alice' }, error: null });

    const feedCardMod = await import('../../src/feed-card.ts');
    renderFeedCard = feedCardMod.renderFeedCard;

    // Wait for auth to resolve (setTimeout 0 in INITIAL_SESSION handler)
    await new Promise(r => setTimeout(r, 10));

    const card = makeCard({ debater_a: 'user-uuid-aaa' });
    const html = renderFeedCard(card);

    expect(html).toContain('CANCEL');
    expect(html).not.toContain('CHALLENGE');
    expect(html).toContain('data-action="cancel-card"');
  });
});

// ============================================================
// TC-I3: vgBadge integration — verified debater shows badge HTML
// ============================================================

describe('TC-I3: vgBadge integration — verified user badge appears in open card', () => {
  it('includes vg-badge span when verified_a is true', () => {
    const card = makeCard({ verified_a: true });
    const html = renderFeedCard(card);

    expect(html).toContain('class="vg-badge"');
    expect(html).toContain('🎖️');
    expect(html).toContain('Verified Gladiator');
  });

  it('does not include vg-badge span when verified_a is false', () => {
    const card = makeCard({ verified_a: false });
    const html = renderFeedCard(card);

    expect(html).not.toContain('class="vg-badge"');
    expect(html).not.toContain('🎖️');
  });
});

// ============================================================
// TC-I4: bountyDot integration — debater with loaded bounty set gets dot
// ============================================================

describe('TC-I4: bountyDot integration — active bounty dot appears in live card', () => {
  it('shows bounty dot for debater_a when loadBountyDotSet has populated the set', async () => {
    // Mock the RPC to return debater_a as a bounty user
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }],
      error: null,
    });

    await loadBountyDotSet();

    const card = makeCard({
      status: 'live',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_username: 'alice',
      debater_b_username: 'bob',
    });
    const html = renderFeedCard(card);

    expect(html).toContain('class="bounty-dot"');
    expect(html).toContain('🟡');
    expect(html).toContain('Active bounty');
  });

  it('does not show bounty dot for debater_b when only debater_a is in bounty set', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }],
      error: null,
    });

    await loadBountyDotSet();

    const card = makeCard({
      status: 'live',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_username: 'alice',
      debater_b_username: 'bob',
    });
    const html = renderFeedCard(card);

    // bounty dot appears once (for debater_a), not twice
    const dotCount = (html.match(/class="bounty-dot"/g) || []).length;
    expect(dotCount).toBe(1);
  });
});

// ============================================================
// TC-I5: Live card renders VS pill + debater names
// ============================================================

describe('TC-I5: live card structure — debater names and VS pill', () => {
  it('renders both debater names and VS pill in a live card', () => {
    const card = makeCard({
      status: 'live',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_name: 'Alice Smith',
      debater_b_name: 'Bob Jones',
    });
    const html = renderFeedCard(card);

    expect(html).toContain('Alice Smith');
    expect(html).toContain('Bob Jones');
    expect(html).toContain('VS');
    expect(html).toContain('SPECTATE');
    expect(html).toContain('data-status="live"');
  });
});

// ============================================================
// TC-I6: Verdict card shows winner checkmark
// ============================================================

describe('TC-I6: verdict card — winner checkmark from real score comparison', () => {
  it('adds ✓ to the higher-scoring side', () => {
    const card = makeCard({
      status: 'complete',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      score_a: 3,
      score_b: 1,
      vote_count_a: 10,
      vote_count_b: 5,
    });
    const html = renderFeedCard(card);

    expect(html).toContain('Alice ✓');
    expect(html).not.toContain('Bob ✓');
    expect(html).toContain('3–1');
    expect(html).toContain('VIEW');
  });

  it('adds ✓ to side B when side B has higher score', () => {
    const card = makeCard({
      status: 'complete',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      score_a: 1,
      score_b: 4,
      vote_count_a: 5,
      vote_count_b: 20,
    });
    const html = renderFeedCard(card);

    expect(html).not.toContain('Alice ✓');
    expect(html).toContain('Bob ✓');
    expect(html).toContain('1–4');
  });
});

// ============================================================
// TC-I7: escapeHTML from config is real — XSS neutralized
// ============================================================

describe('TC-I7: escapeHTML from config.ts is wired — XSS payload neutralized', () => {
  it('escapes < > & in card content before inserting into HTML', () => {
    const card = makeCard({
      content: '<script>alert("xss")</script>',
      debater_a_name: '<b>evil</b>',
    });
    const html = renderFeedCard(card);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>evil</b>');
    expect(html).toContain('&lt;b&gt;evil&lt;/b&gt;');
  });
});

// ============================================================
// ARCH — import boundaries have not changed
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — feed-card.ts import boundaries', () => {
  it('src/feed-card.ts only imports from config, badge, bounties, auth', () => {
    const allowed = new Set(['./config.ts', './badge.ts', './bounties.ts', './auth.ts']);
    const source = readFileSync(resolve(__dirname, '../../src/feed-card.ts'), 'utf-8');
    const paths = source.split('\n')
      .filter(l => /from\s+['"]/.test(l))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in feed-card.ts: ${path}`).toContain(path);
    }
  });
});

// ============================================================
// SEAM #132: feed-card → bounties (bountyDot integration)
// ============================================================

describe('TC-B1: bountyDot returns empty when set is unloaded (null userId)', () => {
  it('bountyDot(null) returns empty string regardless of set state', async () => {
    const { bountyDot } = await import('../../src/bounties.dot.ts');
    expect(bountyDot(null)).toBe('');
  });

  it('bountyDot(undefined) returns empty string', async () => {
    const { bountyDot } = await import('../../src/bounties.dot.ts');
    expect(bountyDot(undefined)).toBe('');
  });
});

describe('TC-B2: bountyDot returns empty before loadBountyDotSet is called', () => {
  it('no bounty dot in live card before set is loaded', async () => {
    // _bountyDotSet starts empty after vi.resetModules() in beforeEach
    const { renderFeedCard } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'live',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_username: 'alice',
      debater_b_username: 'bob',
    });
    const html = renderFeedCard(card);
    expect(html).not.toContain('class="bounty-dot"');
    expect(html).not.toContain('🟡');
  });
});

describe('TC-B3: both debaters get bounty dots when both in set', () => {
  it('live card shows two bounty dots when both debater_a and debater_b are in bounty set', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }, { user_id: 'user-uuid-bbb' }],
      error: null,
    });

    const { loadBountyDotSet } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'live',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_username: 'alice',
      debater_b_username: 'bob',
    });
    const html = rfc(card);
    const dotCount = (html.match(/class="bounty-dot"/g) || []).length;
    expect(dotCount).toBe(2);
  });
});

describe('TC-B4: bountyDot appears in voting card', () => {
  it('voting card shows bounty dot for debater with active bounty', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-bbb' }],
      error: null,
    });

    const { loadBountyDotSet } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'voting',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_username: 'alice',
      debater_b_username: 'bob',
      vote_count_a: 3,
      vote_count_b: 7,
    });
    const html = rfc(card);
    expect(html).toContain('class="bounty-dot"');
    expect(html).toContain('🟡');
  });
});

describe('TC-B5: bountyDot appears in verdict card', () => {
  it('complete card shows bounty dot for winning debater', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }],
      error: null,
    });

    const { loadBountyDotSet } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'complete',
      debater_a: 'user-uuid-aaa',
      debater_b: 'user-uuid-bbb',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      score_a: 3,
      score_b: 1,
      vote_count_a: 10,
      vote_count_b: 4,
    });
    const html = rfc(card);
    expect(html).toContain('class="bounty-dot"');
    expect(html).toContain('🟡');
    expect(html).toContain('Alice ✓');
  });
});

describe('TC-B6: loadBountyDotSet swallows RPC errors silently', () => {
  it('does not throw when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('DB connection failed'),
    });

    const { loadBountyDotSet } = await import('../../src/bounties.dot.ts');
    // Should not throw
    await expect(loadBountyDotSet()).resolves.toBeUndefined();
  });

  it('bountyDot returns empty after a failed loadBountyDotSet', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('network error'),
    });

    const { loadBountyDotSet, bountyDot } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    expect(bountyDot('user-uuid-aaa')).toBe('');
  });
});

describe('TC-B7: userHasBountyDot reflects loaded set state', () => {
  it('returns false for any userId before loadBountyDotSet is called', async () => {
    const { userHasBountyDot } = await import('../../src/bounties.dot.ts');
    expect(userHasBountyDot('user-uuid-aaa')).toBe(false);
    expect(userHasBountyDot('any-user')).toBe(false);
  });

  it('returns true for userId present in set after load', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }],
      error: null,
    });

    const { loadBountyDotSet, userHasBountyDot } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    expect(userHasBountyDot('user-uuid-aaa')).toBe(true);
    expect(userHasBountyDot('user-uuid-bbb')).toBe(false);
  });

  it('returns false for empty string userId', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'user-uuid-aaa' }],
      error: null,
    });

    const { loadBountyDotSet, userHasBountyDot } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    expect(userHasBountyDot('')).toBe(false);
  });
});

// ============================================================
// SEAM #202: feed-card → badge (vgBadge integration)
// ============================================================

describe('SEAM #202 TC-202-1: vgBadge(true) returns correct badge HTML', () => {
  it('returns span with class vg-badge and 🎖️ emoji for verified=true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { vgBadge } = await import('../../src/badge.ts');
    const result = vgBadge(true);
    expect(result).toContain('class="vg-badge"');
    expect(result).toContain('🎖️');
    expect(result).toContain('Verified Gladiator');
    expect(result).toContain('display:inline-block');
    vi.useRealTimers();
  });
});

describe('SEAM #202 TC-202-2: vgBadge returns empty string for falsy values', () => {
  it('vgBadge(false) returns empty string', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { vgBadge } = await import('../../src/badge.ts');
    expect(vgBadge(false)).toBe('');
    vi.useRealTimers();
  });

  it('vgBadge(null) returns empty string', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { vgBadge } = await import('../../src/badge.ts');
    expect(vgBadge(null)).toBe('');
    vi.useRealTimers();
  });

  it('vgBadge(undefined) returns empty string', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { vgBadge } = await import('../../src/badge.ts');
    expect(vgBadge(undefined)).toBe('');
    vi.useRealTimers();
  });
});

describe('SEAM #202 TC-202-3: badge adjacent to debater_a name in open card', () => {
  it('vg-badge span appears after debater_a display name in rendered open card', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({ verified_a: true, debater_a_name: 'Alice' });
    const html = rfc(card);
    // The badge should appear after the name within the avatar-name span
    const nameIdx = html.indexOf('Alice');
    const badgeIdx = html.indexOf('vg-badge');
    expect(nameIdx).toBeGreaterThan(-1);
    expect(badgeIdx).toBeGreaterThan(nameIdx);
    vi.useRealTimers();
  });
});

describe('SEAM #202 TC-202-4: vgBadge not used in voting/live/verdict paths', () => {
  it('voting card does not contain vg-badge even when verified_a is true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'voting',
      verified_a: true,
      verified_b: true,
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      vote_count_a: 5,
      vote_count_b: 3,
    });
    const html = rfc(card);
    expect(html).not.toContain('vg-badge');
    vi.useRealTimers();
  });

  it('live card does not contain vg-badge even when verified_a is true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'live',
      verified_a: true,
      verified_b: true,
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
    });
    const html = rfc(card);
    expect(html).not.toContain('vg-badge');
    vi.useRealTimers();
  });

  it('complete card does not contain vg-badge even when verified_a is true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      status: 'complete',
      verified_a: true,
      verified_b: true,
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      score_a: 3,
      score_b: 1,
      vote_count_a: 10,
      vote_count_b: 5,
    });
    const html = rfc(card);
    expect(html).not.toContain('vg-badge');
    vi.useRealTimers();
  });
});

describe('SEAM #202 TC-202-5: ARCH — badge.ts has no imports', () => {
  it('src/badge.ts contains no from-import lines', () => {
    const source = readFileSync(resolve(__dirname, '../../src/badge.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines).toHaveLength(0);
  });
});

describe('SEAM #202 TC-202-6: open card with verified_a=null yields no badge', () => {
  it('no vg-badge in open card when verified_a is null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({ verified_a: null });
    const html = rfc(card);
    expect(html).not.toContain('vg-badge');
    vi.useRealTimers();
  });
});

describe('SEAM #202 TC-202-7: vgBadge output is appended after escaped name — XSS safe', () => {
  it('XSS payload in debater_a_name is escaped and badge HTML is still valid', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { renderFeedCard: rfc } = await import('../../src/feed-card.ts');
    const card = makeCard({
      verified_a: true,
      debater_a_name: '<script>evil()</script>',
    });
    const html = rfc(card);
    // Malicious tag is escaped
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    // Badge is still present (appended after the escaped name)
    expect(html).toContain('class="vg-badge"');
    expect(html).toContain('🎖️');
    vi.useRealTimers();
  });
});
