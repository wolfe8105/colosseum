/**
 * THE MODERATOR — Leaderboard List
 * renderList, renderShimmer.
 */

import { escapeHTML } from './config.ts';
import { vgBadge } from './badge.ts';
import { bountyDot } from './bounties.ts';
import { currentTab, liveData, isLoading, hasMore } from './leaderboard.state.ts';
import { getData } from './leaderboard.fetch.ts';

const escHtml = escapeHTML;

export function renderShimmer(): string {
  let rows = '';
  for (let i = 0; i < 6; i++) {
    rows += `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid var(--mod-border-subtle);">
        <div class="colo-shimmer" style="width:28px;height:20px;border-radius:4px;"></div>
        <div class="colo-shimmer" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
          <div class="colo-shimmer" style="width:${55 + i * 5}%;height:13px;border-radius:4px;"></div>
          <div class="colo-shimmer" style="width:${35 + i * 3}%;height:10px;border-radius:4px;"></div>
        </div>
        <div class="colo-shimmer" style="width:44px;height:20px;border-radius:4px;"></div>
      </div>`;
  }
  return rows;
}

export function renderList(): string {
  if (liveData === null && !isLoading) {
    return `<div style="text-align:center;padding:40px 20px;color:var(--mod-text-sub);font-size:14px;">
      Couldn't load rankings. Check your connection and try again.
    </div>`;
  }

  // Spread each row to avoid mutating shared objects in liveData/PLACEHOLDER_DATA.
  const data = getData().map(row => ({ ...row }));
  const sorted = [...data].sort((a, b) => {
    if (currentTab === 'elo') return b.elo - a.elo;
    if (currentTab === 'wins') return b.wins - a.wins;
    if (currentTab === 'streak') return b.streak - a.streak;
    return 0;
  });
  sorted.forEach((item, i) => { item.rank = i + 1; });

  return sorted.map((p) => {
    const stat = currentTab === 'elo' ? p.elo : currentTab === 'wins' ? p.wins : p.streak;
    const statLabel = currentTab === 'elo' ? 'ELO' : currentTab === 'wins' ? 'WINS' : '🔥';

    // LANDMINE [LM-LB-003]: medalColors and tierBorderMap contain hardcoded hex — TODO comments below.
    const medalColors: Record<number, string> = { 1: 'var(--mod-accent)', 2: '#a8a8a8', 3: '#b87333' }; // TODO: needs CSS var token — silver, bronze
    const rankColor = medalColors[p.rank] ?? '#6a7a90'; // TODO: needs CSS var token

    const tierBorderMap: Record<string, string> = {
      creator: 'var(--mod-accent)', champion: 'var(--mod-magenta)',
      contender: '#2a5aab', // TODO: needs CSS var token
      free: 'var(--mod-border-primary)',
    };
    const tierBorder = tierBorderMap[p.tier] ?? 'var(--mod-border-primary)';
    const safeUsername = escHtml(p.username ?? '');

    return `
      <div data-username="${safeUsername}" style="
        display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;
        background:${p.rank <= 3 ? 'rgba(212,168,67,0.04)' : 'transparent'};
        border-bottom:1px solid var(--mod-border-subtle);
      ">
        <div style="width:28px;text-align:center;font-family:var(--mod-font-display);font-size:16px;font-weight:700;color:${rankColor};">
          ${p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}
        </div>
        <div style="
          width:36px;height:36px;border-radius:50%;background:var(--mod-bg-card);
          border:2px solid ${tierBorder};display:flex;align-items:center;justify-content:center;
          font-weight:700;color:var(--mod-text-heading);font-size:13px;
        ">${escHtml(p.user[0] ?? '')}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(p.user)}${vgBadge(p.verified_gladiator)}${bountyDot(p.id)}</div>
          <div style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">LVL ${Number(p.level) || 1} · ${Number(p.wins) || 0}W/${Number(p.losses) || 0}L</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--mod-font-display);font-size:16px;font-weight:700;color:${currentTab === 'streak' && p.streak >= 5 ? 'var(--mod-magenta)' : 'var(--mod-accent)'};">${Number(stat) || 0}</div>
          <div style="font-size:9px;color:#6a7a90; /* TODO: needs CSS var token */letter-spacing:1px;">${statLabel}</div>
        </div>
      </div>`;
  }).join('')
  + (hasMore ? `
    <div style="text-align:center;padding:16px;">
      <button data-action="load-more" style="
        padding:10px 28px;border-radius:8px;border:1px solid var(--mod-accent-border);
        background:var(--mod-accent-muted);color:var(--mod-accent);
        font-family:var(--mod-font-ui);font-size:13px;font-weight:700;
        letter-spacing:1px;text-transform:uppercase;cursor:pointer;
      ">LOAD MORE</button>
    </div>` : '');
}
