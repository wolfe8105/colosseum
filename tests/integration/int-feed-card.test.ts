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
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in feed-card.ts: ${path}`).toContain(path);
    }
  });
});
