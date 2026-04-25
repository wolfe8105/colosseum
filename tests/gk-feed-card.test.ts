// ============================================================
// GK F-61 / F-62 — FEED CARD GATEKEEPER TESTS
// tests/gk-feed-card.test.ts
// Source: src/feed-card.ts
//
// F-61: Debate Card Expiration + Creator Cancel
//   Spec (Punch List row F-61, SHIPPED S295):
//   - 30-min auto-expire on unmatched open cards
//   - Countdown timer on all open cards
//   - CANCEL button on creator's own open card
//   - New statuses 'cancelled' and 'expired' excluded from feed
//   - startFeedCountdowns / stopFeedCountdowns expose destroyable timer
//
// F-62: Link Card Debates (Reddit-style OG Preview)
//   Spec (Punch List row F-62, SHIPPED S293):
//   - link_url + link_preview.image_url renders preview block
//   - Preview anchor: href=link_url, target="_blank", rel="noopener"
//   - Domain label rendered when link_preview.domain present
//   - No preview when link_url null or image_url absent
//   - Broken link = snapshot renders (image_url present = renders, dead URL = still renders)
//   - Preview renders on all card statuses (open, live, voting, complete)
//   - Tap = open URL in new tab; click does not propagate to card
//   - User content escaped (XSS protection)
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockEscapeHTML     = vi.hoisted(() => vi.fn((s: string) => s));
const mockVgBadge        = vi.hoisted(() => vi.fn(() => ''));
const mockBountyDot      = vi.hoisted(() => vi.fn(() => ''));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
}));

vi.mock('../src/badge.ts', () => ({
  vgBadge: mockVgBadge,
}));

vi.mock('../src/bounties.ts', () => ({
  bountyDot: mockBountyDot,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  onAuthStateChange: vi.fn(),
}));

import {
  renderFeedCard,
  startFeedCountdowns,
  stopFeedCountdowns,
  type UnifiedFeedCard,
} from '../src/feed-card.ts';

// ── Fixture ───────────────────────────────────────────────────

const makeCard = (overrides: Partial<UnifiedFeedCard> = {}): UnifiedFeedCard => ({
  id: 'gk-card-1',
  topic: 'GK test topic',
  content: 'GK test content',
  category: 'tech',
  status: 'open',
  mode: 'text',
  ruleset: 'amplified',
  current_round: null,
  total_rounds: null,
  score_a: null,
  score_b: null,
  vote_count_a: null,
  vote_count_b: null,
  reaction_count: 0,
  link_url: null,
  link_preview: null,
  ranked: false,
  created_at: new Date().toISOString(),
  debater_a: 'user-abc',
  debater_b: null,
  debater_a_username: 'tester',
  debater_a_name: 'Tester',
  elo_a: 1200,
  verified_a: false,
  debater_b_username: null,
  debater_b_name: null,
  elo_b: null,
  verified_b: null,
  ...overrides,
});

const cardWithLink = (status: string, extra: Partial<UnifiedFeedCard> = {}): UnifiedFeedCard =>
  makeCard({
    status,
    link_url: 'https://example.com/article',
    link_preview: { image_url: 'https://example.com/img.jpg', domain: 'example.com' },
    debater_b: 'user-2',
    debater_b_name: 'Bob',
    debater_b_username: 'bob',
    current_round: 1,
    total_rounds: 4,
    ...extra,
  });

beforeEach(() => {
  vi.useFakeTimers();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockVgBadge.mockReturnValue('');
  mockBountyDot.mockReturnValue('');
  mockGetCurrentUser.mockReturnValue(null);
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  stopFeedCountdowns();
  vi.useRealTimers();
});

// ============================================================
// F-61: COUNTDOWN TIMER
// ============================================================

// TC-F61-1: Open card HTML contains countdown element
describe('TC-F61-1 — F-61: open card has .feed-card-countdown element with data-expires', () => {
  it('rendered HTML contains feed-card-countdown class and data-expires attribute', () => {
    const card = makeCard({ status: 'open' });
    const html = renderFeedCard(card);
    expect(html).toContain('feed-card-countdown');
    expect(html).toContain('data-expires=');
  });
});

// TC-F61-2: Countdown format MM:SS left for recently created card
describe('TC-F61-2 — F-61: countdown shows MM:SS left format for card created now', () => {
  it('countdown text matches MM:SS left format (card not yet expired)', () => {
    const card = makeCard({ status: 'open', created_at: new Date().toISOString() });
    const html = renderFeedCard(card);
    expect(html).toMatch(/\d{1,2}:\d{2} left/);
  });
});

// TC-F61-3: Card created 31 minutes ago shows "expired"
describe('TC-F61-3 — F-61: card created 31 minutes ago shows "expired" countdown text', () => {
  it('countdown text is "expired" when card is 31 minutes old', () => {
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const card = makeCard({ status: 'open', created_at: thirtyOneMinutesAgo });
    const html = renderFeedCard(card);
    expect(html).toContain('expired');
  });
});

// TC-F61-4: data-expires attribute equals card.created_at
describe('TC-F61-4 — F-61: data-expires on countdown element equals card.created_at', () => {
  it('data-expires attribute value matches created_at exactly', () => {
    const createdAt = '2026-04-25T10:00:00.000Z';
    const card = makeCard({ status: 'open', created_at: createdAt });
    const html = renderFeedCard(card);
    expect(html).toContain(`data-expires="${createdAt}"`);
  });
});

// ============================================================
// F-61: CANCEL BUTTON — creator's own open card
// ============================================================

// TC-F61-5: CANCEL button appears on creator's own open card
describe('TC-F61-5 — F-61: CANCEL button rendered on creator\'s own open card', () => {
  it('HTML contains CANCEL button when current user is debater_a', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });
    const card = makeCard({ status: 'open', debater_a: 'user-abc' });
    const html = renderFeedCard(card);
    expect(html).toContain('CANCEL');
    expect(html).toContain('data-action="cancel-card"');
  });
});

// TC-F61-6: CANCEL button has data-action=cancel-card and data-id matching card ID
describe('TC-F61-6 — F-61: CANCEL button data-id matches the card ID', () => {
  it('data-action="cancel-card" and data-id="<card.id>" appear in HTML', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-abc' });
    const card = makeCard({ id: 'debate-xyz-123', status: 'open', debater_a: 'user-abc' });
    const html = renderFeedCard(card);
    expect(html).toContain('data-action="cancel-card"');
    expect(html).toContain('data-id="debate-xyz-123"');
  });
});

// TC-F61-7: Non-creator sees CHALLENGE button, not CANCEL
describe('TC-F61-7 — F-61: non-creator sees CHALLENGE button and no CANCEL button', () => {
  it('HTML has CHALLENGE button and no cancel-card data-action when user is not creator', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'other-user-999' });
    const card = makeCard({ status: 'open', debater_a: 'user-abc' });
    const html = renderFeedCard(card);
    expect(html).toContain('CHALLENGE');
    expect(html).not.toContain('cancel-card');
  });
});

// TC-F61-8: Guest (null user) sees CHALLENGE, not CANCEL
describe('TC-F61-8 — F-61: guest user (null) sees CHALLENGE button and no CANCEL button', () => {
  it('HTML has CHALLENGE button and no cancel-card when getCurrentUser returns null', () => {
    mockGetCurrentUser.mockReturnValue(null);
    const card = makeCard({ status: 'open', debater_a: 'user-abc' });
    const html = renderFeedCard(card);
    expect(html).toContain('CHALLENGE');
    expect(html).not.toContain('cancel-card');
  });
});

// ============================================================
// F-61: EXCLUDED STATUSES (cancelled, expired)
// ============================================================

// TC-F61-9: status='cancelled' → renderFeedCard returns ''
describe('TC-F61-9 — F-61: status=cancelled returns empty string (excluded from feed)', () => {
  it('renderFeedCard returns "" for cancelled status', () => {
    const html = renderFeedCard(makeCard({ status: 'cancelled' }));
    expect(html).toBe('');
  });
});

// TC-F61-10: status='expired' → renderFeedCard returns ''
describe('TC-F61-10 — F-61: status=expired returns empty string (excluded from feed)', () => {
  it('renderFeedCard returns "" for expired status', () => {
    const html = renderFeedCard(makeCard({ status: 'expired' }));
    expect(html).toBe('');
  });
});

// ============================================================
// F-61: COUNTDOWN INTERVAL — startFeedCountdowns / stopFeedCountdowns
// ============================================================

// TC-F61-11: startFeedCountdowns updates countdown elements on each 1-second tick
describe('TC-F61-11 — F-61: startFeedCountdowns updates .feed-card-countdown elements each second', () => {
  it('countdown element text changes after 1 second interval tick', () => {
    const createdAt = new Date().toISOString();
    document.body.innerHTML = `
      <span class="feed-card-countdown" data-expires="${createdAt}">old text</span>
    `;
    startFeedCountdowns();
    vi.advanceTimersByTime(1000);
    const el = document.querySelector('.feed-card-countdown') as HTMLElement;
    expect(el.textContent).not.toBe('old text');
    expect(el.textContent).toMatch(/\d{1,2}:\d{2} left|expired/);
  });
});

// TC-F61-12: stopFeedCountdowns halts interval (destroy pattern)
describe('TC-F61-12 — F-61: stopFeedCountdowns stops the interval (setInterval destroy pattern)', () => {
  it('countdown element stops updating after stopFeedCountdowns is called', () => {
    const createdAt = new Date().toISOString();
    document.body.innerHTML = `
      <span class="feed-card-countdown" data-expires="${createdAt}">old text</span>
    `;
    startFeedCountdowns();
    vi.advanceTimersByTime(1000);

    stopFeedCountdowns();
    const el = document.querySelector('.feed-card-countdown') as HTMLElement;
    el.textContent = 'frozen sentinel';
    vi.advanceTimersByTime(5000);

    expect(el.textContent).toBe('frozen sentinel');
  });
});

// ============================================================
// F-62: LINK PREVIEW — PRESENCE
// ============================================================

// TC-F62-1: Link preview renders when both link_url and link_preview.image_url present
describe('TC-F62-1 — F-62: link preview renders when link_url and image_url are both present', () => {
  it('rendered HTML contains the link_url and image_url', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://espn.com/story',
      link_preview: { image_url: 'https://espn.com/thumb.jpg', domain: 'espn.com' },
    });
    const html = renderFeedCard(card);
    expect(html).toContain('https://espn.com/story');
    expect(html).toContain('https://espn.com/thumb.jpg');
  });
});

// TC-F62-2: Preview anchor has href=link_url, target="_blank", rel="noopener"
describe('TC-F62-2 — F-62: link preview anchor has correct href, target="_blank", rel="noopener"', () => {
  it('preview <a> tag attributes are present and correct', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://espn.com/story',
      link_preview: { image_url: 'https://espn.com/thumb.jpg', domain: 'espn.com' },
    });
    const html = renderFeedCard(card);
    expect(html).toContain('href="https://espn.com/story"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });
});

// TC-F62-3: Domain label rendered when link_preview.domain present
describe('TC-F62-3 — F-62: domain label rendered when link_preview.domain is set', () => {
  it('domain text appears in rendered card HTML', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://espn.com/story',
      link_preview: { image_url: 'https://espn.com/thumb.jpg', domain: 'espn.com' },
    });
    const html = renderFeedCard(card);
    expect(html).toContain('espn.com');
  });
});

// TC-F62-4: No preview when domain is absent but image_url present — domain pill absent
describe('TC-F62-4 — F-62: no domain pill rendered when link_preview.domain is absent', () => {
  it('domain pill text absent when link_preview.domain is not set', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/story',
      link_preview: { image_url: 'https://example.com/thumb.jpg' },
    });
    const html = renderFeedCard(card);
    // Preview block renders (image present) but no domain pill
    expect(html).toContain('https://example.com/thumb.jpg');
    // domain pill uses a <span> with the domain text — it should be absent
    expect(html).not.toContain('bottom:6px;left:10px');
  });
});

// TC-F62-5: No link preview when link_url is null
describe('TC-F62-5 — F-62: no link preview rendered when link_url is null', () => {
  it('background-image absent from card HTML when link_url is null', () => {
    const card = makeCard({
      status: 'open',
      link_url: null,
      link_preview: { image_url: 'https://example.com/thumb.jpg', domain: 'example.com' },
    });
    const html = renderFeedCard(card);
    expect(html).not.toContain('background-image');
  });
});

// TC-F62-6: No link preview when image_url absent (broken snapshot with no image)
describe('TC-F62-6 — F-62: no link preview when link_preview.image_url absent (og_title only)', () => {
  it('background-image absent when link_preview has no image_url', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/story',
      link_preview: { og_title: 'Some Title', domain: 'example.com' },
    });
    const html = renderFeedCard(card);
    expect(html).not.toContain('background-image');
  });
});

// TC-F62-7: No link preview when link_preview is null entirely
describe('TC-F62-7 — F-62: no link preview when link_preview is null', () => {
  it('background-image absent when link_preview is null', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/story',
      link_preview: null,
    });
    const html = renderFeedCard(card);
    expect(html).not.toContain('background-image');
  });
});

// ============================================================
// F-62: LINK PREVIEW ON ALL CARD STATUSES
// ============================================================

// TC-F62-8: Link preview renders on open cards
describe('TC-F62-8 — F-62: link preview renders on open card', () => {
  it('open card HTML contains link preview image URL', () => {
    const html = renderFeedCard(cardWithLink('open'));
    expect(html).toContain('https://example.com/img.jpg');
  });
});

// TC-F62-9: Link preview renders on live cards
describe('TC-F62-9 — F-62: link preview renders on live card', () => {
  it('live card HTML contains link preview image URL', () => {
    const html = renderFeedCard(cardWithLink('live'));
    expect(html).toContain('https://example.com/img.jpg');
  });
});

// TC-F62-10: Link preview renders on voting cards
describe('TC-F62-10 — F-62: link preview renders on voting card', () => {
  it('voting card HTML contains link preview image URL', () => {
    const html = renderFeedCard(cardWithLink('voting'));
    expect(html).toContain('https://example.com/img.jpg');
  });
});

// TC-F62-11: Link preview renders on complete/verdict cards
describe('TC-F62-11 — F-62: link preview renders on complete card', () => {
  it('complete card HTML contains link preview image URL', () => {
    const html = renderFeedCard(cardWithLink('complete', { score_a: 3, score_b: 1 }));
    expect(html).toContain('https://example.com/img.jpg');
  });
});

// ============================================================
// F-62: CLICK PROPAGATION STOP
// ============================================================

// TC-F62-12: Link preview anchor stops click propagation to card
describe('TC-F62-12 — F-62: link preview anchor has stopPropagation to prevent card tap', () => {
  it('stopPropagation appears in link anchor onclick handler', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/article',
      link_preview: { image_url: 'https://example.com/img.jpg', domain: 'example.com' },
    });
    const html = renderFeedCard(card);
    expect(html).toContain('stopPropagation');
  });
});

// ============================================================
// F-62: XSS — USER CONTENT ESCAPED IN LINK PREVIEW
// ============================================================

// TC-F62-13: link_url passed through escapeHTML
describe('TC-F62-13 — F-62: link_url is passed through escapeHTML (XSS protection)', () => {
  it('escapeHTML is called with link_url value', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/<evil>',
      link_preview: { image_url: 'https://example.com/img.jpg', domain: 'example.com' },
    });
    renderFeedCard(card);
    const allArgs = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(allArgs).toContain('https://example.com/<evil>');
  });
});

// TC-F62-14: domain passed through escapeHTML
describe('TC-F62-14 — F-62: domain is passed through escapeHTML (XSS protection)', () => {
  it('escapeHTML is called with domain value', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/article',
      link_preview: {
        image_url: 'https://example.com/img.jpg',
        domain: '<script>alert(1)</script>',
      },
    });
    renderFeedCard(card);
    const allArgs = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(allArgs).toContain('<script>alert(1)</script>');
  });
});

// TC-F62-15: image_url passed through escapeHTML
describe('TC-F62-15 — F-62: image_url is passed through escapeHTML (XSS protection)', () => {
  it('escapeHTML is called with image_url value', () => {
    const card = makeCard({
      status: 'open',
      link_url: 'https://example.com/article',
      link_preview: { image_url: 'https://example.com/img<xss>.jpg', domain: 'example.com' },
    });
    renderFeedCard(card);
    const allArgs = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(allArgs).toContain('https://example.com/img<xss>.jpg');
  });
});

// ============================================================
// STEP 4 — ARCHITECTURE TEST
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/feed-card.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './badge.ts', './bounties.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/feed-card.ts'),
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
