/**
 * Home — Category overlay and pull-to-refresh
 *
 * F-68: Hot takes section replaced with unified feed cards.
 * Predictions still use ModeratorAsync (separate concern).
 */
// LM-HOME-001: DOM refs are grabbed locally per file via getElementById().
// Do not share or re-export DOM elements through state.ts.

import { ModeratorAsync } from '../async.ts';
import { safeRpc, getCurrentUser } from '../auth.ts';
import { state, CATEGORIES } from './home.state.ts';
import type { Category } from './home.types.ts';
import { renderFeedCard, renderFeedEmpty } from '../feed-card.ts';
import type { UnifiedFeedCard } from '../feed-card.ts';

const overlay = document.getElementById('categoryOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayContent = document.getElementById('overlayContent');
const overlayClose = document.getElementById('overlayClose');

export function openCategoryTab(catId: string, tab: string) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  openCategory(cat);
  setTimeout(() => {
    const tabEl = document.querySelector(`.overlay-tab[data-tab="${tab}"]`) as HTMLElement | null;
    if (tabEl) tabEl.click();
  }, 50);
}

export async function openCategory(cat: Category) {
  state.currentOverlayCat = cat;
  overlayTitle!.textContent = cat.section || cat.label.replace('\n', ' ');

  const takesTab = document.getElementById('overlay-takes-tab');
  const predsTab = document.getElementById('overlay-predictions-tab');
  takesTab!.style.display = '';
  predsTab!.style.display = 'none';
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.overlay-tab[data-tab="takes"]')?.classList.add('active');

  takesTab!.innerHTML = '<div style="text-align:center;padding:30px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';
  predsTab!.innerHTML = '';

  overlay!.classList.add('open');

  // F-68: Load unified feed cards instead of hot takes
  try {
    const { data, error } = await safeRpc<UnifiedFeedCard[]>('get_unified_feed', {
      p_limit: 30,
      p_category: cat.id,
    });

    if (error || !data || (data as UnifiedFeedCard[]).length === 0) {
      takesTab!.innerHTML = renderFeedEmpty();
    } else {
      takesTab!.innerHTML = (data as UnifiedFeedCard[]).map(c => renderFeedCard(c)).join('');
    }
  } catch (e) {
    takesTab!.innerHTML = '<div class="placeholder-text"><span class="emoji">⚠️</span>Failed to load feed. Pull down to retry.</div>';
  }

  try {
    await ModeratorAsync.fetchPredictions();
    await ModeratorAsync.fetchStandaloneQuestions?.();
    ModeratorAsync.renderPredictions(predsTab!);
  } catch (e) {
    predsTab!.innerHTML = '<div class="placeholder-text"><span class="emoji">⚠️</span>Failed to load predictions.</div>';
  }
}

// Overlay tab switching
document.getElementById('overlayTabs')?.addEventListener('click', (e) => {
  const tab = (e.target as HTMLElement).closest('.overlay-tab');
  if (!tab) return;
  const tabName = (tab as HTMLElement).dataset.tab;
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('overlay-takes-tab')!.style.display = tabName === 'takes' ? '' : 'none';
  document.getElementById('overlay-predictions-tab')!.style.display = tabName === 'predictions' ? '' : 'none';
});

overlayClose!.addEventListener('click', () => { overlay!.classList.remove('open'); });
let overlayStartY = 0;
overlay!.addEventListener('touchstart', (e) => { overlayStartY = (e as TouchEvent).touches[0].clientY; }, { passive: true });
overlay!.addEventListener('touchend', (e) => { if ((e as TouchEvent).changedTouches[0].clientY - overlayStartY > 100) overlay!.classList.remove('open'); });

// LM-HOME-004: PTR lives here because it shares overlayContent, state.currentOverlayCat.
export function initPullToRefresh() {
  const PTR_THRESHOLD = 64;
  const PTR_MAX = 90;
  let ptrStartY = 0, ptrDragging = false, ptrTriggered = false;

  const ptr = document.createElement('div');
  ptr.id = 'ptr-indicator';
  ptr.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-label">Release to refresh</span>';
  ptr.style.cssText = [
    'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:center;',
    'gap:8px;padding:12px;opacity:0;transform:translateY(-100%);transition:opacity 0.2s;',
    'pointer-events:none;z-index:10;color:var(--mod-cyan);font-size:13px;font-weight:600;letter-spacing:1px;'
  ].join('');
  overlayContent!.style.position = 'relative';
  overlayContent!.insertBefore(ptr, overlayContent!.firstChild);

  const style = document.createElement('style');
  style.textContent = `
    #ptr-indicator { user-select:none; }
    .ptr-spinner { width:18px;height:18px;border-radius:50%;
      border:2px solid var(--mod-border-primary);
      border-top-color:var(--mod-cyan);
      animation:none; }
    .ptr-spinner.spinning { animation:ptrSpin 0.7s linear infinite; }
    @keyframes ptrSpin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(style);

  overlayContent!.addEventListener('touchstart', (e) => {
    if (overlayContent!.scrollTop === 0) {
      ptrStartY = (e as TouchEvent).touches[0].clientY;
      ptrDragging = true;
      ptrTriggered = false;
    }
  }, { passive: true });

  overlayContent!.addEventListener('touchmove', (e) => {
    if (!ptrDragging) return;
    const dy = Math.min((e as TouchEvent).touches[0].clientY - ptrStartY, PTR_MAX);
    if (dy <= 0) { ptrDragging = false; return; }
    const progress = Math.min(dy / PTR_THRESHOLD, 1);
    ptr.style.opacity = String(progress);
    ptr.style.transform = `translateY(${dy - 100}%)`;
    (ptr.querySelector('.ptr-label') as HTMLElement).textContent = dy >= PTR_THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
    ptrTriggered = dy >= PTR_THRESHOLD;
  }, { passive: true });

  overlayContent!.addEventListener('touchend', async () => {
    if (!ptrDragging) return;
    ptrDragging = false;
    if (!ptrTriggered || !state.currentOverlayCat) {
      ptr.style.opacity = '0';
      ptr.style.transform = 'translateY(-100%)';
      return;
    }
    (ptr.querySelector('.ptr-label') as HTMLElement).textContent = 'Refreshing…';
    (ptr.querySelector('.ptr-spinner') as HTMLElement).classList.add('spinning');
    ptr.style.transform = 'translateY(0)';
    ptr.style.opacity = '1';
    try {
      // F-68: Refresh unified feed for this category
      const cat = state.currentOverlayCat;
      const takesTab = document.getElementById('overlay-takes-tab');
      if (takesTab && cat) {
        const { data } = await safeRpc<UnifiedFeedCard[]>('get_unified_feed', {
          p_limit: 30,
          p_category: cat.id,
        });
        if (data && (data as UnifiedFeedCard[]).length > 0) {
          takesTab.innerHTML = (data as UnifiedFeedCard[]).map(c => renderFeedCard(c)).join('');
        } else {
          takesTab.innerHTML = renderFeedEmpty();
        }
      }
      await ModeratorAsync.fetchPredictions();
      await ModeratorAsync.fetchStandaloneQuestions?.();
      const predsTab = document.getElementById('overlay-predictions-tab');
      if (predsTab) ModeratorAsync.renderPredictions(predsTab);
    } catch (e) { console.warn('[Home] refresh failed:', e); }
    (ptr.querySelector('.ptr-spinner') as HTMLElement).classList.remove('spinning');
    ptr.style.opacity = '0';
    ptr.style.transform = 'translateY(-100%)';
    ptrTriggered = false;
  });
}
