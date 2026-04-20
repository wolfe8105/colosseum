/**
 * THE MODERATOR — Global Search
 * Session 281: New module. Unified search across users, hot takes, groups.
 *
 * Uses existing `search_users_by_username` RPC for user search.
 * Hot take search via direct Supabase query (ILIKE on body).
 * Group search via direct Supabase query (ILIKE on name).
 */

import { safeRpc, getSupabaseClient, getIsPlaceholderMode } from './auth.ts';
import { escapeHTML } from './config.ts';

type SearchTab = 'users' | 'takes' | 'groups';

interface SearchUser {
  id: string;
  username: string;
  display_name: string;
  elo_rating: number;
}

interface SearchTake {
  id: string;
  body: string;
  username: string;
  created_at: string;
}

interface SearchGroup {
  id: string;
  name: string;
  member_count: number;
}

let currentSearchTab: SearchTab = 'users';
let searchQuery = '';
let userResults: SearchUser[] | null = null;
let takeResults: SearchTake[] | null = null;
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
      <div style="color:var(--mod-text-sub);font-size:13px;">Find users, hot takes, and groups.</div>
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
      ${(['users', 'takes', 'groups'] as const).map(tab => `
        <button class="gs-tab" data-gs-tab="${tab}" style="
          flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
          font-family:var(--mod-font-ui);font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
          background:${currentSearchTab === tab ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          color:${currentSearchTab === tab ? 'var(--mod-accent)' : 'var(--mod-text-sub)'};
        ">${tab === 'users' ? '👤 Users' : tab === 'takes' ? '🔥 Takes' : '👥 Groups'}</button>
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
        updateResults();
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
    });
  });
}

function clearResults(): void {
  userResults = null;
  takeResults = null;
  groupResults = null;
}

async function runSearch(query: string): Promise<void> {
  if (isSearching) return;
  isSearching = true;

  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) { isSearching = false; return; }

  try {
    if (currentSearchTab === 'users') {
      const { data, error } = await safeRpc<SearchUser[]>('search_users_by_username', { p_query: query });
      userResults = (!error && data) ? data as SearchUser[] : [];
    } else if (currentSearchTab === 'takes') {
      const { data, error } = await sb
        .from('hot_takes')
        .select('id, body, created_at, profiles!hot_takes_user_id_fkey(username)')
        .ilike('body', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(15);
      if (!error && data) {
        takeResults = (data as unknown[]).map((row: unknown) => {
          const r = row as Record<string, unknown>;
          const prof = r.profiles as Record<string, unknown> | null;
          return {
            id: r.id as string,
            body: r.body as string,
            username: (prof?.username as string) ?? 'anon',
            created_at: r.created_at as string,
          };
        });
      } else {
        takeResults = [];
      }
    } else if (currentSearchTab === 'groups') {
      const { data, error } = await sb
        .from('groups')
        .select('id, name, member_count')
        .ilike('name', `%${query}%`)
        .order('member_count', { ascending: false })
        .limit(15);
      groupResults = (!error && data) ? data as SearchGroup[] : [];
    }
  } catch {
    if (currentSearchTab === 'users') userResults = [];
    if (currentSearchTab === 'takes') takeResults = [];
    if (currentSearchTab === 'groups') groupResults = [];
  }

  isSearching = false;
  updateResults();
}

function updateResults(): void {
  const el = document.getElementById('global-search-results');
  if (el) el.innerHTML = renderResults();
}

function renderResults(): string {
  if (searchQuery.length < 2) {
    return `<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:40px 0;">Type at least 2 characters to search</div>`;
  }

  if (currentSearchTab === 'users') return renderUserResults();
  if (currentSearchTab === 'takes') return renderTakeResults();
  return renderGroupResults();
}

function renderUserResults(): string {
  if (!userResults) return renderSearching();
  if (userResults.length === 0) return renderEmpty();
  return userResults.map(u => `
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
        <div style="font-size:11px;color:var(--mod-text-sub);">@${escHtml(u.username)}</div>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:16px;font-weight:700;color:var(--mod-accent);">${Number(u.elo_rating) || 1200}</div>
    </a>
  `).join('');
}

function renderTakeResults(): string {
  if (!takeResults) return renderSearching();
  if (takeResults.length === 0) return renderEmpty();
  return takeResults.map(t => {
    const date = new Date(t.created_at);
    const ago = formatTimeAgo(date);
    return `
      <div style="padding:12px;border-bottom:1px solid var(--mod-border-subtle);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-weight:700;font-size:12px;color:var(--mod-text-heading);">@${escHtml(t.username)}</span>
          <span style="font-size:11px;color:var(--mod-text-muted);">${ago}</span>
        </div>
        <div style="font-size:13px;color:var(--mod-text-body);line-height:1.4;">${escHtml(t.body.substring(0, 200))}${t.body.length > 200 ? '…' : ''}</div>
      </div>
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
  return `<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:40px 0;">No results found</div>`;
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
