/**
 * THE MODERATOR — Leaderboard Module (TypeScript)
 *
 * Refactored: split into types, state, fetch, list, render, elo sub-modules.
 *
 * Migration: Session 127 (Phase 3), Session 138 (ES imports).
 */

import { FEATURES } from './config.ts';
import { ready } from './auth.ts';
import { render } from './leaderboard.render.ts';
import { fetchLeaderboard, setTab, setTime, loadMore, searchLeaderboard, clearSearch } from './leaderboard.fetch.ts';
import { showEloExplainer } from './leaderboard.elo.ts';
import type { LeaderboardTab, LeaderboardTimeFilter } from './leaderboard.types.ts';

export type { LeaderboardTab, LeaderboardTimeFilter };
export type { LeaderboardEntry, LeaderboardTier } from './leaderboard.types.ts';
export { render, setTab, setTime, loadMore, showEloExplainer, searchLeaderboard, clearSearch };

export function init(): void {
  if (!FEATURES.leaderboard) return;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    const screen = document.getElementById('screen-leaderboard');
    if (screen?.classList.contains('active') && screen.children.length === 0) {
      observer.disconnect();
      render();
      void fetchLeaderboard().then(() => render()).catch(e => console.error('[leaderboard] fetch failed', e));
    }
  });
  const screen = document.getElementById('screen-leaderboard');
  if (screen) observer.observe(screen, { attributes: true, attributeFilter: ['class'] });

  // Delegated search input listener (survives re-renders)
  document.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'lb-search-input') return;
    if (searchTimer) clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      clearSearch();
      render();
      return;
    }
    searchTimer = setTimeout(async () => {
      await searchLeaderboard(q);
      render();
      // Restore focus + cursor position after re-render
      const restored = document.getElementById('lb-search-input') as HTMLInputElement | null;
      if (restored) { restored.focus(); restored.selectionStart = restored.selectionEnd = restored.value.length; }
    }, 300);
  });
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  switch (el.dataset.action) {
    case 'set-tab':      setTab(el.dataset.tab as LeaderboardTab); break;
    case 'show-elo-explainer': e.stopPropagation(); showEloExplainer(); break;
    case 'set-time':     setTime(el.dataset.time as LeaderboardTimeFilter); break;
    case 'close-elo-explainer': document.getElementById('elo-explainer-modal')?.remove(); break;
    case 'load-more':    void loadMore(); break;
  }
});

export const ModeratorLeaderboard = { render, setTab, setTime, loadMore, showEloExplainer, searchLeaderboard, clearSearch } as const;

ready.then(() => init());
