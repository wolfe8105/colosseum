/**
 * THE MODERATOR — Global Search
 * Session 281: New module. Unified search across users, debates, groups.
 * Session 296: Rewritten to match F-24 spec — unified search_all RPC,
 *   debates tab (was takes), get_trending on blank query, W/L in user rows,
 *   query-embedded no-results message.
 *
 * Core model: search_all(p_query, p_types, p_limit) RPC for all searches.
 * get_trending(p_types, p_limit) RPC for empty-state feed.
 */

import { safeRpc, getSupabaseClient, getIsPlaceholderMode } from './auth.ts';
import { escapeHTML } from './config.ts';

type SearchTab = 'users' | 'debates' | 'groups';

interface SearchUser {
  id: string;
  username: string;
  display_name: string;
  elo_rating: number;
  wins: number;
  losses: number;
}

interface SearchDebate {
  id: string;
  topic: string;
  category: string;
  created_at: string;
  vote_count: number;
}

interface SearchGroup {
  id: string;
  name: string;
  member_count: number;
  category: string;
}

let currentSearchTab: SearchTab = 'users';
let searchQuery = '';
let userResults: SearchUser[] | null = null;
let debateResults: SearchDebate[] | null = null;
let groupResults: SearchGroup[] | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let isSearching = false;

const escHtml = escapeHTML;

export function renderSearchScreen(): void {
  const container = document.getElementById('screen-search');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:16px 0 12px;">
      <div style="font-family:var(--mod-font-display);font-size:24px;letter-spacing:3px;color:var(--mod-accent);font-weight:700;">🔍 SEARCH</div>
      <div style="color:var(--mod-text-sub);font-size:13px;">Find users, debates, and groups.</div>
    </div>

    <div style="margin-bottom:12px;">
      <input id="global-search-input" type="text" placeholder="Search..." autocomplete="off" value="${escHtml(searchQuery)}" style="
        width:100%;padding:12px 16px;border-radius:var(--mod-radius-pill);
        border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);
        color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;
        outline:none;box-sizing:border-box;min-height:44px;
      ">
    </div>

    <div style="display:flex;gap:4px;margin-bottom:12px;">
      ${(['users', 'debates', 'groups'] as const).map(tab => `
        <button class="gs-tab" data-gs-tab="${tab}" style="
          flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
          font-family:var(--mod-font-ui);font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
          background:${currentSearchTab === tab ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          color:${currentSearchTab === tab ? 'var(--mod-accent)' : 'var(--mod-text-sub)'};
        ">${tab === 'users' ? '👤 Users' : tab === 'debates' ? '⚔️ Debates' : '👥 Groups'}</button>
      `).join('')}
    </div>

    <div id="global-search-results">
      ${renderResults()}
    </div>
  `;

  // Wire input
  const input = document.getElementById('global-search-input') as HTMLInputElement | null;
  if (input) {
    input.focus();
    input.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      const q = input.value.trim();
      searchQuery = q;
      if (q.length < 2) {
        clearResults();
        void loadTrending();
        return;
      }
      searchTimer = setTimeout(() => void runSearch(q), 300);
    });
  }

  // Wire tabs
  container.querySelectorAll('.gs-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSearchTab = (btn as HTMLElement).dataset.gsTab as SearchTab;
      renderSearchScreen();
      if (searchQuery.length >= 2) void runSearch(searchQuery);
      else void loadTrending();
    });
  });

  // Load trending on initial render if no query
  if (searchQuery.length < 2) {
    void loadTrending();
  }
}

function clearResults(): void {
  userResults = null;
  debateResults = null;
  groupResults = null;
}

async function loadTrending(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;

  try {
    const { data, error } = await safeRpc<unknown[]>('get_trending', {
      p_types: [currentSearchTab],
      p_limit: 10,
    });
    if (!error && data) {
      applyResults(data as unknown[], true);
    } else {
      clearResults();
    }
  } catch {
    clearResults();
  }
  updateResults();
}

async function runSearch(query: string): Promise<void> {
  if (isSearching) return;
  isSearching = true;

  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) { isSearching = false; return; }

  try {
    const { data, error } = await safeRpc<unknown[]>('search_all', {
      p_query: query,
      p_types: [currentSearchTab],
      p_limit: 10,
    });
    if (!error && data) {
      applyResults(data as unknown[], false);
    } else {
      clearResults();
    }
  } catch {
    clearResults();
  }

  isSearching = false;
  updateResults();
}

function applyResults(rows: unknown[], _trending: boolean): void {
  if (currentSearchTab === 'users') {
    userResults = (rows as SearchUser[]);
  } else if (currentSearchTab === 'debates') {
    debateResults = (rows as SearchDebate[]);
  } else {
    groupResults = (rows as SearchGroup[]);
  }
}

function updateResults(): void {
  const el = document.getElementById('global-search-results');
  if (el) el.innerHTML = renderResults();
}

function renderResults(): string {
  if (currentSearchTab === 'users') return renderUserResults();
  if (currentSearchTab === 'debates') return renderDebateResults();
  return renderGroupResults();
}

function renderUserResults(): string {
  if (!userResults) return renderSearching();
  if (userResults.length === 0) return renderEmpty();
  return userResults.map(u => {
    const wins = Number(u.wins) || 0;
    const losses = Number(u.losses) || 0;
    return `
      <a href="/u/${encodeURIComponent(u.username)}" style="
        display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;
        border-bottom:1px solid var(--mod-border-subtle);text-decoration:none;color:inherit;
      ">
        <div style="
          width:40px;height:40px;border-radius:50%;background:var(--mod-bg-card);
          border:2px solid var(--mod-border-primary);display:flex;align-items:center;justify-content:center;
          font-weight:700;color:var(--mod-text-heading);font-size:14px;flex-shrink:0;
        ">${escHtml((u.display_name || u.username || '?')[0].toUpperCase())}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(u.display_name || u.username)}</div>
          <div style="font-size:11px;color:var(--mod-text-sub);">@${escHtml(u.username)} · ELO ${Number(u.elo_rating) || 1200} · ${wins}W/${losses}L</div>
        </div>
      </a>
    `;
  }).join('');
}

function renderDebateResults(): string {
  if (!debateResults) return renderSearching();
  if (debateResults.length === 0) return renderEmpty();
  return debateResults.map(d => {
    const date = new Date(d.created_at);
    const ago = formatTimeAgo(date);
    return `
      <a href="/debate/${encodeURIComponent(d.id)}" style="
        display:block;padding:12px;border-bottom:1px solid var(--mod-border-subtle);text-decoration:none;color:inherit;cursor:pointer;
      ">
        <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);margin-bottom:4px;">${escHtml(d.topic)}</div>
        <div style="font-size:11px;color:var(--mod-text-sub);">${escHtml(d.category)} · ${ago} · ${Number(d.vote_count) || 0} votes</div>
      </a>
    `;
  }).join('');
}

function renderGroupResults(): string {
  if (!groupResults) return renderSearching();
  if (groupResults.length === 0) return renderEmpty();
  return groupResults.map(g => `
    <a href="moderator-groups.html?id=${encodeURIComponent(g.id)}" style="
      display:flex;align-items:center;justify-content:space-between;padding:14px 12px;
      border-bottom:1px solid var(--mod-border-subtle);text-decoration:none;color:inherit;cursor:pointer;
    ">
      <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);">${escHtml(g.name)}</div>
      <div style="font-size:12px;color:var(--mod-text-sub);">${Number(g.member_count) || 0} members</div>
    </a>
  `).join('');
}

function renderSearching(): string {
  return `<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:40px 0;">⏳ Searching...</div>`;
}

function renderEmpty(): string {
  if (searchQuery.length >= 2) {
    return `<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:40px 0;">No results for '${escHtml(searchQuery)}'</div>`;
  }
  return `<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:40px 0;">No trending results</div>`;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
