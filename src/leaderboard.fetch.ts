/**
 * THE MODERATOR — Leaderboard Fetch
 * fetchLeaderboard, setTab, setTime, loadMore, getData, PLACEHOLDER_DATA.
 */

import { safeRpc, getCurrentUser, getSupabaseClient, getIsPlaceholderMode } from './auth.ts';
import {
  currentTab, liveData, isLoading, currentOffset, hasMore, PAGE_SIZE,
  setCurrentTab, setLiveData, setMyRank, setIsLoading, setCurrentOffset, setHasMore,
} from './leaderboard.state.ts';
import type { LeaderboardTab, LeaderboardTimeFilter, LeaderboardEntry, LeaderboardRpcRow } from './leaderboard.types.ts';

export const PLACEHOLDER_DATA: LeaderboardEntry[] = [
  { rank: 1, user: 'SHARPMIND',    elo: 1847, wins: 142, losses: 38, streak: 12, level: 24, tier: 'champion' },
  { rank: 2, user: 'SHARPSHOOTER', elo: 1792, wins: 128, losses: 45, streak: 5,  level: 22, tier: 'creator' },
  { rank: 3, user: 'QUICKTHINKER', elo: 1754, wins: 115, losses: 41, streak: 8,  level: 20, tier: 'champion' },
  { rank: 4, user: 'TECHBRO_NO',   elo: 1690, wins: 98,  losses: 52, streak: 3,  level: 18, tier: 'contender' },
  { rank: 5, user: 'FACTCHECKER',  elo: 1654, wins: 91,  losses: 55, streak: 2,  level: 17, tier: 'contender' },
  { rank: 6, user: 'HOOPHEAD',     elo: 1620, wins: 87,  losses: 60, streak: 4,  level: 16, tier: 'free' },
  { rank: 7, user: 'POLICYwonk',   elo: 1590, wins: 83,  losses: 58, streak: 1,  level: 15, tier: 'contender' },
  { rank: 8, user: 'BOLDCLAIM',    elo: 1545, wins: 76,  losses: 64, streak: 6,  level: 14, tier: 'free' },
  { rank: 9, user: 'FILMTAKES',    elo: 1510, wins: 71,  losses: 61, streak: 0,  level: 13, tier: 'free' },
  { rank: 10, user: 'BEATDROP',    elo: 1488, wins: 67,  losses: 63, streak: 2,  level: 12, tier: 'free' },
];

export function getData(): LeaderboardEntry[] {
  return liveData ?? PLACEHOLDER_DATA;
}

export async function fetchLeaderboard(append = false): Promise<void> {
  if (isLoading) return;
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;

  setIsLoading(true);
  try {
    const sortCol =
      currentTab === 'elo' ? 'elo_rating' :
      currentTab === 'wins' ? 'wins' : 'current_streak';

    const { data, error } = await safeRpc<LeaderboardRpcRow[]>('get_leaderboard', {
      p_sort_by: sortCol, p_limit: PAGE_SIZE, p_offset: currentOffset,
    });

    if (error || !data || (data as LeaderboardRpcRow[]).length === 0) {
      if (!append) setLiveData(null);
      setHasMore(false);
    } else {
      const rows = (data as LeaderboardRpcRow[]).map((p, i) => ({
        rank: currentOffset + i + 1,
        id: p.id,
        username: p.username ?? '',
        user: (p.username ?? p.display_name ?? 'ANON').toUpperCase(),
        elo: Number(p.elo_rating) || 1200,
        wins: Number(p.wins) || 0,
        losses: Number(p.losses) || 0,
        streak: Number(p.current_streak) || 0,
        level: Number(p.level) || 1,
        tier: p.subscription_tier ?? 'free',
        debates: Number(p.debates_completed) || 0,
        verified_gladiator: p.verified_gladiator ?? false,
      }));

      setHasMore(rows.length === PAGE_SIZE);
      setLiveData(append ? [...(liveData ?? []), ...rows] : rows);

      const me = getCurrentUser()?.id;
      if (me && !append) {
        const idx = (liveData ?? []).findIndex(p => p.id === me);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    }
  } catch (e) {
    console.error('Leaderboard fetch failed:', e);
    if (!append) setLiveData(null);
    setHasMore(false);
  }
  setIsLoading(false);
}

export async function setTab(tab: LeaderboardTab): Promise<void> {
  setCurrentTab(tab);
  setCurrentOffset(0);
  setHasMore(false);
  setLiveData(null);
  const { render } = await import('./leaderboard.render.ts');
  render();
  await fetchLeaderboard();
  render();
}

export function setTime(_time: LeaderboardTimeFilter): void {
  setCurrentOffset(0);
  setHasMore(false);
  // NOTE: Week/month time filters require time-bucketed stats not yet in schema.
  import('./leaderboard.render.ts').then(({ render }) => render());
}

export async function loadMore(): Promise<void> {
  if (isLoading || !hasMore) return;
  setCurrentOffset(currentOffset + PAGE_SIZE);
  await fetchLeaderboard(true);
  const { renderList } = await import('./leaderboard.list.ts');
  const lbList = document.getElementById('lb-list');
  if (lbList) lbList.innerHTML = renderList();
}
