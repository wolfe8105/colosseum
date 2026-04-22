import { safeRpc, getCurrentUser } from '../auth.ts';
import { get_my_groups } from '../contracts/rpc-schemas.ts';
import { escapeHTML, showToast, friendlyError } from '../config.ts';
import {
  _pendingPrivateType, selectedCategory, selectedRanked, selectedRuleset,
  selectedRounds,
  set__pendingPrivateType,
} from './arena-state.ts';
import { isPlaceholder, pushArenaState } from './arena-core.utils.ts';
import { roundPickerCSS, roundPickerHTML, wireRoundPicker } from './arena-config-round-picker.ts';
import { showModeSelect } from './arena-config-mode-select.ts';
import { createAndWaitPrivateLobby } from './arena-private-lobby.ts';

export function showPrivateLobbyPicker(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'arena-private-overlay';
  overlay.innerHTML = `
    <style>
      #arena-private-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-private-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-private-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      .arena-private-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-private-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:6px; }
      .arena-private-sub { font-size:13px;color:var(--mod-text-body);text-align:center;margin-bottom:20px; }
      .arena-private-card { display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;margin-bottom:10px;transition:background 0.15s; }
      .arena-private-card:active { background:var(--mod-bg-card-hover); }
      .arena-private-card-icon { font-size:26px;flex-shrink:0; }
      .arena-private-card-name { font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:0.5px;color:var(--mod-text-primary); }
      .arena-private-card-desc { font-size:12px;color:var(--mod-text-muted);margin-top:2px; }
      .arena-private-cancel { width:100%;padding:12px;border-radius:var(--mod-radius-pill);border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:4px; }
      ${roundPickerCSS()}
    </style>
    <div class="arena-private-backdrop" id="arena-private-backdrop"></div>
    <div class="arena-private-sheet">
      <div class="arena-private-handle"></div>
      <div class="arena-private-title">Private Debate</div>
      <div class="arena-private-sub">Pick who can join</div>
      <div class="arena-private-card" id="arena-private-username">
        <div class="arena-private-card-icon">\u2694\uFE0F</div>
        <div>
          <div class="arena-private-card-name">CHALLENGE BY USERNAME</div>
          <div class="arena-private-card-desc">Send a direct challenge to one specific user</div>
        </div>
      </div>
      <div class="arena-private-card" id="arena-private-group">
        <div class="arena-private-card-icon">\uD83D\uDEE1\uFE0F</div>
        <div>
          <div class="arena-private-card-name">GROUP MEMBERS ONLY</div>
          <div class="arena-private-card-desc">Any member of one of your groups can join</div>
        </div>
      </div>
      <div class="arena-private-card" id="arena-private-code">
        <div class="arena-private-card-icon">\uD83D\uDD11</div>
        <div>
          <div class="arena-private-card-name">SHAREABLE JOIN CODE</div>
          <div class="arena-private-card-desc">Get a 5-character code — share it anywhere</div>
        </div>
      </div>
      ${roundPickerHTML()}
      <button class="arena-private-cancel" id="arena-private-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('privatePicker');
  wireRoundPicker(overlay);

  document.getElementById('arena-private-username')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('username');
  });
  document.getElementById('arena-private-group')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('group');
  });
  document.getElementById('arena-private-code')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('code');
  });
  document.getElementById('arena-private-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-private-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}

export function showModeSelectThen(privateType: 'username' | 'group' | 'code'): void {
  set__pendingPrivateType(privateType);
  showModeSelect();
}

export function maybeRoutePrivate(mode: string, topic: string): boolean {
  if (!_pendingPrivateType) return false;
  const type = _pendingPrivateType;
  set__pendingPrivateType(null);
  if (mode === 'ai') return false; // AI can't be private
  if (type === 'username') showUserSearchPicker(mode, topic);
  else if (type === 'group') void showGroupLobbyPicker(mode, topic);
  else if (type === 'code') void createAndWaitPrivateLobby(mode, topic, 'code');
  return true;
}

export function showUserSearchPicker(mode: string, topic: string): void {
  const overlay = document.createElement('div');
  overlay.id = 'arena-user-search-overlay';
  overlay.innerHTML = `
    <style>
      #arena-user-search-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-user-search-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-user-search-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;max-height:70vh;display:flex;flex-direction:column;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      .arena-user-search-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-user-search-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:16px; }
      .arena-user-search-input { width:100%;padding:12px 16px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;margin-bottom:12px;min-height:44px; }
      .arena-user-search-input:focus { border-color:var(--mod-accent-border); }
      .arena-user-search-results { flex:1;overflow-y:auto; }
      .arena-user-row { display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--mod-radius-md);cursor:pointer;transition:background 0.1s; }
      .arena-user-row:active { background:var(--mod-bg-card); }
      .arena-user-avatar { width:40px;height:40px;border-radius:50%;border:2px solid var(--mod-bar-secondary);background:var(--mod-bg-card);font-family:var(--mod-font-ui);font-size:16px;font-weight:700;color:var(--mod-bar-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
      .arena-user-name { font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-primary); }
      .arena-user-elo { font-size:11px;color:var(--mod-text-muted); }
      .arena-user-search-cancel { width:100%;padding:12px;border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:8px;flex-shrink:0; }
    </style>
    <div class="arena-user-search-backdrop" id="arena-user-search-backdrop"></div>
    <div class="arena-user-search-sheet">
      <div class="arena-user-search-handle"></div>
      <div class="arena-user-search-title">Challenge by Username</div>
      <input class="arena-user-search-input" id="arena-user-search-input" type="text" placeholder="Search username..." autocomplete="off">
      <div class="arena-user-search-results" id="arena-user-search-results">
        <div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Type to search</div>
      </div>
      <button class="arena-user-search-cancel" id="arena-user-search-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('userSearch');

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const input = document.getElementById('arena-user-search-input') as HTMLInputElement;
  const results = document.getElementById('arena-user-search-results')!;

  input.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 1) {
      results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Type to search</div>';
      return;
    }
    results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">\u23F3 Searching...</div>';
    searchTimer = setTimeout(async () => {
      try {
        const { data, error } = await safeRpc<{ id: string; username: string; display_name: string; elo_rating: number }[]>(
          'search_users_by_username', { p_query: q }
        );
        if (error || !data || (data as unknown[]).length === 0) {
          results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">No users found</div>';
          return;
        }
        results.innerHTML = (data as { id: string; username: string; display_name: string; elo_rating: number }[]).map(u => `
          <div class="arena-user-row" data-uid="${escapeHTML(u.id)}" data-uname="${escapeHTML(u.display_name || u.username)}">
            <div class="arena-user-avatar">${(u.display_name || u.username || '?')[0].toUpperCase()}</div>
            <div>
              <div class="arena-user-name">${escapeHTML(u.display_name || u.username)}</div>
              <div class="arena-user-elo">${Number(u.elo_rating)} ELO</div>
            </div>
          </div>
        `).join('');
        let _userPicked = false;
        results.querySelectorAll('.arena-user-row').forEach(row => {
          row.addEventListener('click', () => {
            if (_userPicked) return;
            _userPicked = true;
            const uid = (row as HTMLElement).dataset.uid!;
            const uname = (row as HTMLElement).dataset.uname!;
            overlay.remove();
            void createAndWaitPrivateLobby(mode, topic, 'private', uid, uname);
          });
        });
      } catch {
        results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Search failed — try again</div>';
      }
    }, 350);
  });

  document.getElementById('arena-user-search-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-user-search-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}

export async function showGroupLobbyPicker(mode: string, topic: string): Promise<void> {
  const overlay = document.createElement('div');
  overlay.id = 'arena-group-pick-overlay';
  overlay.innerHTML = `
    <style>
      #arena-group-pick-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-group-pick-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-group-pick-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;max-height:70vh;overflow-y:auto;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      .arena-group-pick-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-group-pick-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:16px; }
      .arena-group-row { display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;margin-bottom:10px;transition:background 0.1s; }
      .arena-group-row:active { background:var(--mod-bg-card-hover); }
      .arena-group-row-name { font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-primary); }
      .arena-group-row-count { font-size:11px;color:var(--mod-text-muted); }
      .arena-group-pick-cancel { width:100%;padding:12px;border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:4px; }
    </style>
    <div class="arena-group-pick-backdrop" id="arena-group-pick-backdrop"></div>
    <div class="arena-group-pick-sheet">
      <div class="arena-group-pick-handle"></div>
      <div class="arena-group-pick-title">Select Your Group</div>
      <div id="arena-group-pick-list">\u23F3 Loading...</div>
      <button class="arena-group-pick-cancel" id="arena-group-pick-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('groupPick');

  const listEl = document.getElementById('arena-group-pick-list')!;

  try {
    const { data, error } = await safeRpc<{ id: string; name: string; member_count: number }[]>('get_my_groups', {}, get_my_groups);
    if (error || !data || (data as unknown[]).length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">You\'re not in any groups yet</div>';
    } else {
      listEl.innerHTML = (data as { id: string; name: string; member_count: number }[]).map(g => `
        <div class="arena-group-row" data-gid="${escapeHTML(g.id)}" data-gname="${escapeHTML(g.name)}">
          <div class="arena-group-row-name">${escapeHTML(g.name)}</div>
          <div class="arena-group-row-count">${Number(g.member_count)} members</div>
        </div>
      `).join('');
      let _groupPicked = false;
      listEl.querySelectorAll('.arena-group-row').forEach(row => {
        row.addEventListener('click', () => {
          if (_groupPicked) return;
          _groupPicked = true;
          const gid = (row as HTMLElement).dataset.gid!;
          overlay.remove();
          void createAndWaitPrivateLobby(mode, topic, 'group', undefined, undefined, gid);
        });
      });
    }
  } catch {
    listEl.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Failed to load groups</div>';
  }

  document.getElementById('arena-group-pick-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-group-pick-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}
