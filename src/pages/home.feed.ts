/**
 * THE MODERATOR — Home: Unified Feed
 *
 * Fetches all card states via get_unified_feed RPC.
 * Renders with feed-card.ts unified renderer.
 * Replaces the old dual-fetch (fetchLiveDebates + fetchTakes) pattern.
 * Part of F-68 (Session 294).
 */
import { safeRpc, getCurrentUser, getIsPlaceholderMode, getSupabaseClient } from '../auth.ts';
import { create_debate_card, cancel_debate_card, react_debate_card } from '../contracts/rpc-schemas.ts';
import { clampVercel } from '../contracts/dependency-clamps.ts';
import { escapeHTML, showToast } from '../config.ts';
import {
  renderFeedCard,
  renderFeedEmpty,
  renderModeratorCard,
  injectOpenCardCSS,
  startFeedCountdowns,
} from '../feed-card.ts';
import type { UnifiedFeedCard } from '../feed-card.ts';

// ============================================================
// STATE
// ============================================================

let currentCategory: string | null = null;
let feedCards: UnifiedFeedCard[] = [];

// ============================================================
// CATEGORIES
// ============================================================

const CATEGORY_PILLS = [
  { id: null, label: 'ALL' },
  { id: 'sports', label: 'Sports' },
  { id: 'politics', label: 'Politics' },
  { id: 'music', label: 'Music' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'couples_court', label: 'Couples Court' },
  { id: 'trending', label: 'Trending' },
] as const;

// ============================================================
// FETCH
// ============================================================

async function fetchUnifiedFeed(category?: string | null): Promise<UnifiedFeedCard[]> {
  if (getIsPlaceholderMode()) return [];
  try {
    const params: Record<string, unknown> = { p_limit: 100 };
    if (category) params.p_category = category;
    const { data, error } = await safeRpc<UnifiedFeedCard[]>('get_unified_feed', params);
    if (error || !data) return [];
    return data as UnifiedFeedCard[];
  } catch (e) {
    console.error('[Feed] fetch error:', e);
    return [];
  }
}

async function enrichReactions(cards: UnifiedFeedCard[]): Promise<void> {
  const userId = getCurrentUser()?.id;
  if (!userId) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  const openIds = cards.filter(c => c.status === 'open').map(c => c.id);
  if (openIds.length === 0) return;
  try {
    const { data } = await (sb as any)
      .from('debate_reactions')
      .select('debate_id')
      .eq('user_id', userId)
      .in('debate_id', openIds);
    if (data) {
      const reactedIds = new Set((data as { debate_id: string }[]).map(r => r.debate_id));
      cards.forEach(c => { c.userReacted = reactedIds.has(c.id); });
    }
  } catch { /* non-critical */ }
}

// ============================================================
// COMPOSER
// ============================================================

function getComposerHTML(): string {
  const user = getCurrentUser();
  if (!user) {
    return `<div style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:16px;text-align:center;">
      <div style="font-size:13px;color:var(--mod-text-sub);margin-bottom:8px;">Sign up to share your opinion</div>
      <button data-action="composer-signup" style="background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:8px;padding:8px 20px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:1px;cursor:pointer;min-height:var(--mod-touch-min);">JOIN</button>
    </div>`;
  }
  return `<div style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:16px;">
    <textarea id="feed-composer-input" placeholder="Let your opinion be heard..." style="
      width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-secondary);border-radius:10px;
      color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:60px;
      font-family:var(--mod-font-ui);margin-bottom:8px;box-sizing:border-box;
    " maxlength="280"></textarea>
    <div id="feed-composer-link-row" style="margin-bottom:8px;">
      <input id="feed-composer-link" type="url" placeholder="Paste a link (optional)" style="
        width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--mod-border-secondary);
        background:var(--mod-bg-card);color:var(--mod-text-heading);font-size:13px;
        font-family:var(--mod-font-ui);box-sizing:border-box;
      ">
    </div>
    <div id="feed-composer-link-preview" style="display:none;margin-bottom:8px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div id="feed-composer-count" style="font-size:11px;color:var(--mod-text-sub);">0 / 280</div>
      <button data-action="post-debate-card" style="
        background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:8px;
        padding:8px 20px;font-family:var(--mod-font-display);font-size:14px;
        letter-spacing:1px;cursor:pointer;min-height:var(--mod-touch-min);
      ">POST</button>
    </div>
  </div>`;
}

// ============================================================
// POST
// ============================================================

async function postDebateCard(): Promise<void> {
  const input = document.getElementById('feed-composer-input') as HTMLTextAreaElement | null;
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    input.style.borderColor = 'var(--mod-magenta)';
    setTimeout(() => { input.style.borderColor = 'var(--mod-border-secondary)'; }, 1500);
    return;
  }
  if (!getCurrentUser()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  const linkInput = document.getElementById('feed-composer-link') as HTMLInputElement | null;
  const linkUrl = linkInput?.value?.trim() || null;

  // Scrape OG if link provided
  let linkPreview: Record<string, string> | null = null;
  if (linkUrl) {
    try {
      const res = await fetch('/api/scrape-og?url=' + encodeURIComponent(linkUrl));
      clampVercel('/api/scrape-og', res);
      if (res.ok) linkPreview = await res.json();
    } catch { /* proceed without preview */ }
  }

  const btn = document.querySelector('[data-action="post-debate-card"]') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    const params: Record<string, unknown> = {
      p_content: text,
      p_category: currentCategory || 'trending',
    };
    if (linkUrl) params.p_link_url = linkUrl;
    if (linkPreview) params.p_link_preview = linkPreview;

    const { error } = await safeRpc('create_debate_card', params, create_debate_card);
    if (error) {
      showToast('Post failed — try again', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
      return;
    }
    input.value = '';
    if (linkInput) linkInput.value = '';
    const countEl = document.getElementById('feed-composer-count');
    if (countEl) countEl.textContent = '0 / 280';
    const previewEl = document.getElementById('feed-composer-link-preview');
    if (previewEl) previewEl.style.display = 'none';
    showToast('🔥 Posted', 'success');

    // Claim tokens
    try {
      const { claimActionTokens, claimMilestone } = await import('../tokens.claims.ts');
      void claimActionTokens?.('hot_take', '');
      void claimMilestone?.('first_hot_take');
    } catch { /* non-critical */ }

    void refreshFeed();
  } catch {
    showToast('Connection lost — try again', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
}

// ============================================================
// REACT
// ============================================================

async function reactToCard(debateId: string, btn: HTMLElement): Promise<void> {
  if (!getCurrentUser()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  btn.style.pointerEvents = 'none';
  try {
    const { data, error } = await safeRpc('react_debate_card', {
      p_debate_id: debateId,
    }, react_debate_card);
    if (error) { showToast('React failed', 'error'); return; }
    const result = data as { reacted: boolean; reaction_count: number };
    btn.style.background = result.reacted ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)';
    btn.style.color = result.reacted ? 'var(--mod-magenta)' : 'var(--mod-text-sub)';
    btn.innerHTML = `🔥 ${Number(result.reaction_count)}`;

    // Claim reaction token
    if (result.reacted) {
      try {
        const { claimActionTokens } = await import('../tokens.claims.ts');
        void claimActionTokens?.('reaction', debateId);
      } catch { /* non-critical */ }
    }
  } catch {
    showToast('Connection lost', 'error');
  }
  btn.style.pointerEvents = '';
}

// ============================================================
// CHALLENGE
// ============================================================

async function challengeCard(debateId: string): Promise<void> {
  if (!getCurrentUser()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  const { navigateTo } = await import('../navigation.ts');
  navigateTo('arena', { challengeDebateId: debateId });
}

// F-61: Creator cancel own open card
async function cancelCard(debateId: string): Promise<void> {
  if (!confirm('Cancel this post? It will be removed from the feed.')) return;

  try {
    const { data, error } = await safeRpc('cancel_debate_card', { p_debate_id: debateId }, cancel_debate_card);
    if (error) {
      showToast('Cancel failed', 'error');
      return;
    }
    const result = data as { success?: boolean; error?: string } | null;
    if (result && result.success === false) {
      showToast(result.error || 'Cancel failed', 'error');
      return;
    }
    // Remove card from local state and re-render
    feedCards = feedCards.filter(c => c.id !== debateId);
    renderCards();
    showToast('Post cancelled', 'success');
  } catch (e) {
    console.warn('[Feed] cancel_debate_card error:', e);
    showToast('Cancel failed', 'error');
  }
}

// ============================================================
// RENDER
// ============================================================

async function refreshFeed(): Promise<void> {
  feedCards = await fetchUnifiedFeed(currentCategory);
  await enrichReactions(feedCards);
  renderCards();
}

function renderCards(): void {
  const feedEl = document.getElementById('unified-feed');
  if (!feedEl) return;

  if (feedCards.length === 0) {
    feedEl.innerHTML = renderFeedEmpty();
    return;
  }

  const rendered = feedCards.map(c => renderFeedCard(c));

  // Insert moderator recruitment card at position 3
  const user = getCurrentUser();
  const profile = (globalThis as any).__moderatorProfile;
  if (!profile?.is_moderator && rendered.length >= 3) {
    rendered.splice(3, 0, renderModeratorCard(!user));
  }

  feedEl.innerHTML = rendered.join('');
}

// ============================================================
// CATEGORY PILLS
// ============================================================

function renderCategoryPills(): string {
  const esc = escapeHTML;
  return `<div id="feed-category-pills" style="display:flex;gap:8px;padding:0 0 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
    ${CATEGORY_PILLS.map(p => {
      const active = (p.id ?? null) === currentCategory;
      return `<button data-action="filter-category" data-cat="${esc(p.id ?? '')}" style="
        background:${active ? 'var(--mod-magenta)' : 'var(--mod-bg-subtle)'};
        color:${active ? 'var(--mod-text-on-accent)' : 'var(--mod-text-sub)'};
        border:none;padding:6px 14px;border-radius:20px;font-size:12px;
        font-weight:600;white-space:nowrap;cursor:pointer;min-height:var(--mod-touch-min);
        font-family:var(--mod-font-ui);letter-spacing:0.5px;
      ">${esc(p.label)}</button>`;
    }).join('')}
  </div>`;
}

// ============================================================
// MAIN ENTRY — renderFeed()
// ============================================================

export async function renderFeed(): Promise<void> {
  injectOpenCardCSS();

  const homeScreen = document.getElementById('screen-home');
  if (!homeScreen) return;

  let feedEl = document.getElementById('home-feed-container');
  if (!feedEl) {
    feedEl = document.createElement('div');
    feedEl.id = 'home-feed-container';
    feedEl.style.cssText = 'width:100%;';
    homeScreen.appendChild(feedEl);
  }

  feedEl.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';

  feedCards = await fetchUnifiedFeed(currentCategory);
  await enrichReactions(feedCards);

  let html = '';
  html += renderCategoryPills();
  html += getComposerHTML();
  html += '<div id="unified-feed"></div>';
  feedEl.innerHTML = html;

  // Wire composer char count
  const input = document.getElementById('feed-composer-input') as HTMLTextAreaElement | null;
  const counter = document.getElementById('feed-composer-count');
  if (input && counter) {
    input.addEventListener('input', () => {
      counter.textContent = input.value.length + ' / 280';
    });
  }

  renderCards();
  startFeedCountdowns();
  _wireFeedDelegation(feedEl);
}

// ============================================================
// EVENT DELEGATION
// ============================================================

function _wireFeedDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    // Post
    if (target.closest('[data-action="post-debate-card"]')) {
      void postDebateCard();
      return;
    }

    // Guest signup from composer
    if (target.closest('[data-action="composer-signup"]')) {
      window.location.href = 'moderator-plinko.html';
      return;
    }

    // React
    const reactBtn = target.closest('[data-action="react-card"]') as HTMLElement | null;
    if (reactBtn) {
      const id = reactBtn.dataset.id;
      if (id) void reactToCard(id, reactBtn);
      return;
    }

    // Challenge
    const challengeBtn = target.closest('[data-action="challenge-card"]') as HTMLElement | null;
    if (challengeBtn) {
      const id = challengeBtn.dataset.id;
      if (id) void challengeCard(id);
      return;
    }

    // F-61: Cancel own open card
    const cancelBtn = target.closest('[data-action="cancel-card"]') as HTMLElement | null;
    if (cancelBtn) {
      const id = cancelBtn.dataset.id;
      if (id) void cancelCard(id);
      return;
    }

    // Category filter
    const catBtn = target.closest('[data-action="filter-category"]') as HTMLElement | null;
    if (catBtn) {
      const cat = catBtn.dataset.cat || null;
      currentCategory = cat || null;
      const pillsContainer = document.getElementById('feed-category-pills');
      if (pillsContainer) {
        pillsContainer.outerHTML = renderCategoryPills();
      }
      void refreshFeed();
      return;
    }

    // Live card → spectate
    const liveCard = target.closest('.arena-card.card-live[data-debate-id]') as HTMLElement | null;
    if (liveCard) {
      import('../arena/arena-feed-room.ts').then(m => m.enterFeedRoomAsSpectator(liveCard.dataset.debateId!)).catch(e => console.error('[home.feed] spectate:', e));
      return;
    }

    // Verdict/voting card → navigate
    const linkCard = target.closest('.arena-card[data-link]') as HTMLElement | null;
    if (linkCard) {
      window.location.href = linkCard.dataset.link!;
      return;
    }

    // Profile click
    const profileEl = target.closest('[data-action="profile"]') as HTMLElement | null;
    if (profileEl) {
      const username = profileEl.dataset.username;
      if (username) window.location.href = '/u/' + encodeURIComponent(username);
      return;
    }

    // Moderator recruitment
    if (target.closest('[data-action="become-mod"]')) {
      void (async () => {
        const { toggleModerator } = await import('../auth.ts');
        const result = await toggleModerator(true);
        if (!result.error) {
          showToast('🧑‍⚖️ You are now a Moderator!', 'success');
          void renderFeed();
        } else {
          showToast('Could not enable moderator mode', 'error');
        }
      })();
      return;
    }
    if (target.closest('[data-action="mod-signup"]')) {
      window.location.href = 'moderator-plinko.html';
      return;
    }
  });
}
