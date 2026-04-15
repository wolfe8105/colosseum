/**
 * THE MODERATOR — Leaderboard Render
 * render — the main leaderboard screen HTML builder.
 */

import { escapeHTML } from './config.ts';
import { getCurrentProfile } from './auth.ts';
import { currentTab, myRank, isLoading } from './leaderboard.state.ts';
import { renderList, renderShimmer } from './leaderboard.list.ts';

const escHtml = escapeHTML;

export function render(): void {
  const container = document.getElementById('screen-leaderboard');
  if (!container) return;

  const profile = getCurrentProfile();
  const myElo = Number(profile?.elo_rating) || 1200;
  const myWins = Number(profile?.wins) || 0;
  const myName = escHtml((profile?.username ?? 'YOU').toUpperCase());
  const rankDisplay = myRank ? `#${myRank}` : '#--';

  container.innerHTML = `
    <div style="padding:4px 0;">
      <div style="text-align:center;padding:16px 0 12px;">
        <div style="font-family:var(--mod-font-display);font-size:24px;letter-spacing:3px;color:var(--mod-accent);font-weight:700;">🏆 RANKINGS</div>
        <div style="color:var(--mod-text-sub);font-size:13px;">The numbers speak for themselves.</div>
      </div>

      <div style="
        background:linear-gradient(135deg,var(--mod-accent-muted) 0%,rgba(204,41,54,0.08) 100%);
        border:1px solid var(--mod-accent-border);border-radius:12px;padding:14px;margin-bottom:16px;
        display:flex;align-items:center;gap:12px;
      ">
        <div style="
          width:40px;height:40px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-accent);
          display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--mod-accent);font-size:14px;
        ">${myName[0] ?? ''}</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);">${myName}</div>
          <div style="font-size:12px;color:var(--mod-text-sub);">ELO ${myElo} · ${myWins}W</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--mod-font-display);font-size:20px;color:var(--mod-accent);font-weight:700;">${rankDisplay}</div>
          <div style="font-size:10px;color:#6a7a90; /* TODO: needs CSS var token */">YOUR RANK</div>
        </div>
      </div>

      <div style="display:flex;gap:4px;margin-bottom:8px;">
        ${(['elo', 'wins', 'streak'] as const).map(tab => `
          <button class="lb-tab ${currentTab === tab ? 'active' : ''}" data-action="set-tab" data-tab="${tab}" style="
            flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
            font-family:var(--mod-font-ui);font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
            background:${currentTab === tab ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
            color:${currentTab === tab ? 'var(--mod-accent)' : 'var(--mod-text-sub)'};
          ">${tab === 'elo' ? 'ELO' : tab === 'wins' ? 'WINS' : '🔥 STREAK'}${
            tab === 'elo' ? `<span data-action="show-elo-explainer" style="
              display:inline-block;width:16px;height:16px;border-radius:50%;
              background:var(--mod-accent-border);color:var(--mod-accent);
              font-size:10px;line-height:16px;text-align:center;
              margin-left:6px;cursor:pointer;vertical-align:middle;font-family:serif;font-weight:700;
            ">?</span>` : ''
          }</button>`).join('')}
      </div>

      <!-- Session 222: ECON-BUG-5 — Week/Month tabs removed. Re-add when time-bucketed stats exist. -->

      <div id="lb-list">
        ${isLoading ? renderShimmer() : renderList()}
      </div>
    </div>
  `;

  const lbList = document.getElementById('lb-list');
  if (lbList) {
    lbList.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('[data-username]') as HTMLElement | null;
      if (row?.dataset['username']) {
        window.location.href = '/u/' + encodeURIComponent(row.dataset['username']);
      }
    });
  }
}
