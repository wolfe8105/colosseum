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
import { fetchLeaderboard, setTab, setTime, loadMore } from './leaderboard.fetch.ts';
import { showEloExplainer } from './leaderboard.elo.ts';
import type { LeaderboardTab, LeaderboardTimeFilter } from './leaderboard.types.ts';

export type { LeaderboardTab, LeaderboardTimeFilter };
export type { LeaderboardEntry, LeaderboardTier } from './leaderboard.types.ts';
export { render, setTab, setTime, loadMore, showEloExplainer };

export function init(): void {
  if (!FEATURES.leaderboard) return;
  const observer = new MutationObserver(() => {
    const screen = document.getElementById('screen-leaderboard');
    if (screen?.classList.contains('active') && screen.children.length === 0) {
      observer.disconnect();
      render();
      void fetchLeaderboard().then(() => render());
    }
  });
  const screen = document.getElementById('screen-leaderboard');
  if (screen) observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
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

export const ModeratorLeaderboard = { render, setTab, setTime, loadMore, showEloExplainer } as const;

ready.then(() => init());
