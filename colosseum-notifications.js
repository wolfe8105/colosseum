// ============================================================
// COLOSSEUM NOTIFICATIONS — Notification Center (Item 6.2.6.2)
// Slide-down panel, filters, mark read, polling.
// Items: 14.5.2.1, 14.5.2.5
//
// SESSION 17: Migrated writes to .rpc() calls.
// - notifications.update (mark read) → rpc('mark_notifications_read')
// - SELECT reads remain as .from() (RLS allows reads)
// SESSION 65 SECURITY AUDIT (Session 16): 3 bugs fixed
//   - BUG 1 (MEDIUM): n.id unescaped in data-id HTML attribute — attribute breakout
//   - BUG 2 (MEDIUM): n.time unescaped in innerHTML
//   - BUG 3 (LOW): No destroy() method — polling setInterval runs forever (memory leak)
// SESSION 120: Orange Dot Integration
//   - 4 new types: stake_won, stake_lost, power_up, tier_up
//   - Fixed n.time bug — table has created_at, not time. Added _timeAgo() formatter.
//   - Added Economy filter button for staking/power-up/tier notifications
// ============================================================

window.ColosseumNotifications = (() => {

  let notifications = [];
  let unreadCount = 0;
  let pollInterval = null;
  let panelOpen = false;

  const escHtml = ColosseumConfig.escapeHTML;

  const TYPES = {
    challenge: { icon: '⚔️', label: 'Challenge' },
    debate_start: { icon: '🔴', label: 'Debate Starting' },
    result: { icon: '🏆', label: 'Result' },
    rank_up: { icon: '📈', label: 'Rank Up' },
    follow: { icon: '👤', label: 'New Follower' },
    reaction: { icon: '🔥', label: 'Reaction' },
    system: { icon: '📢', label: 'System' },
    stake_won: { icon: '🪙', label: 'Stake Won' },
    stake_lost: { icon: '💸', label: 'Stake Lost' },
    power_up: { icon: '⚡', label: 'Power-Up' },
    tier_up: { icon: '🏅', label: 'Tier Up' },
  };

  // Economy filter matches these types
  const ECONOMY_TYPES = new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']);

  // --- Relative time formatter ---
  function _timeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      const now = Date.now();
      const then = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - then) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + 'm ago';
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return diffHr + 'h ago';
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 30) return diffDay + 'd ago';
      return Math.floor(diffDay / 30) + 'mo ago';
    } catch (e) {
      return '';
    }
  }

  function init() {
    _createPanel();
    _bindBellButton();

    // Placeholder notifications for demo
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.isPlaceholderMode) {
      notifications = _getPlaceholderNotifs();
      unreadCount = notifications.filter(n => !n.read).length;
      _updateBadge();
    } else {
      _startPolling();
    }
  }

  function _getPlaceholderNotifs() {
    return [
      { id: '1', type: 'challenge', title: 'IRONMIND challenged you', body: '"LeBron is NOT the GOAT" — accept?', time: '2m ago', read: false },
      { id: '2', type: 'reaction', title: '🔥 Your hot take is on fire', body: '247 reactions on "NBA play-in is the best thing..."', time: '15m ago', read: false },
      { id: '3', type: 'result', title: 'Debate result: YOU WON', body: 'vs FACTCHECKER — ELO +18 (now 1,218)', time: '1h ago', read: false },
      { id: '4', type: 'stake_won', title: '🪙 Stake Won!', body: 'You won 45 tokens on "Is crypto dead?"', time: '3h ago', read: false },
      { id: '5', type: 'tier_up', title: '🏅 Tier Up!', body: 'You reached Spectator+! New perks unlocked.', time: '4h ago', read: false },
      { id: '6', type: 'follow', title: 'SHARPSHOOTER followed you', body: 'ELO 1,654 — 42 wins', time: '5h ago', read: true },
      { id: '7', type: 'system', title: 'Welcome to The Colosseum', body: 'Post a hot take, watch a debate, or start one.', time: '1d ago', read: true },
    ];
  }

  // --- Panel UI ---
  function _createPanel() {
    if (document.getElementById('notif-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;
      display:none;flex-direction:column;
    `;
    panel.innerHTML = `
      <div id="notif-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
      <div id="notif-drawer" style="
        position:relative;z-index:1;background:#132240;
        border-bottom-left-radius:16px;border-bottom-right-radius:16px;
        max-height:70vh;display:flex;flex-direction:column;
        transform:translateY(-100%);transition:transform 0.3s ease;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        padding-top:env(safe-area-inset-top,0px);
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:#d4a843;">NOTIFICATIONS</div>
          <div style="display:flex;gap:8px;">
            <button id="notif-mark-all" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#a0a8b8;font-size:11px;padding:6px 10px;border-radius:6px;cursor:pointer;">Mark all read</button>
            <button id="notif-close" style="background:none;border:none;color:#a0a8b8;font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
          </div>
        </div>
        <div id="notif-filters" style="display:flex;gap:6px;padding:8px 16px;overflow-x:auto;flex-shrink:0;">
          <button class="notif-filter active" data-filter="all" style="background:rgba(212,168,67,0.15);color:#d4a843;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">All</button>
          <button class="notif-filter" data-filter="challenge" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">⚔️ Challenges</button>
          <button class="notif-filter" data-filter="result" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🏆 Results</button>
          <button class="notif-filter" data-filter="reaction" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🔥 Reactions</button>
          <button class="notif-filter" data-filter="economy" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🪙 Economy</button>
        </div>
        <div id="notif-list" style="overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;padding:8px 0;"></div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('notif-backdrop').addEventListener('click', close);
    document.getElementById('notif-close').addEventListener('click', close);
    document.getElementById('notif-mark-all').addEventListener('click', markAllRead);

    document.querySelectorAll('.notif-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.notif-filter').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.color = '#a0a8b8';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(212,168,67,0.15)';
        btn.style.color = '#d4a843';
        _renderList(btn.dataset.filter);
      });
    });
  }

  function _renderList(filter = 'all') {
    const list = document.getElementById('notif-list');
    if (!list) return;

    let filtered;
    if (filter === 'all') {
      filtered = notifications;
    } else if (filter === 'economy') {
      filtered = notifications.filter(n => ECONOMY_TYPES.has(n.type));
    } else {
      filtered = notifications.filter(n => n.type === filter);
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px 16px;color:#a0a8b8;">
          <div style="font-size:32px;margin-bottom:8px;">🔕</div>
          <div style="font-size:14px;">No notifications yet</div>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(n => {
      const typeInfo = TYPES[n.type] || TYPES.system;
      const unreadDot = !n.read ? '<div style="width:8px;height:8px;background:#cc2936;border-radius:50%;flex-shrink:0;"></div>' : '';
      // SESSION 120: Use created_at with _timeAgo(), fall back to n.time for placeholders
      const displayTime = n.created_at ? _timeAgo(n.created_at) : (n.time || '');
      // BUG 1+2 FIX: Escape ALL user-sourced values including id and time
      return `
        <div class="notif-item" data-id="${escHtml(n.id)}" style="
          display:flex;gap:12px;align-items:flex-start;padding:12px 16px;cursor:pointer;
          background:${n.read ? 'transparent' : 'rgba(204,41,54,0.04)'};
          border-bottom:1px solid rgba(255,255,255,0.03);
        ">
          <div style="font-size:20px;flex-shrink:0;margin-top:2px;">${typeInfo.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:13px;color:#f0f0f0;margin-bottom:2px;">${escHtml(n.title)}</div>
            <div style="font-size:12px;color:#a0a8b8;line-height:1.4;">${escHtml(n.body)}</div>
            <div style="font-size:11px;color:#6a7a90;margin-top:4px;">${escHtml(displayTime)}</div>
          </div>
          ${unreadDot}
        </div>`;
    }).join('');

    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => markRead(item.dataset.id));
    });
  }

  // --- Open / Close ---
  function open() {
    const panel = document.getElementById('notif-panel');
    const drawer = document.getElementById('notif-drawer');
    if (!panel) return;

    _renderList();
    panel.style.display = 'flex';
    requestAnimationFrame(() => {
      drawer.style.transform = 'translateY(0)';
    });
    panelOpen = true;
  }

  function close() {
    const panel = document.getElementById('notif-panel');
    const drawer = document.getElementById('notif-drawer');
    if (!panel) return;

    drawer.style.transform = 'translateY(-100%)';
    setTimeout(() => { panel.style.display = 'none'; }, 300);
    panelOpen = false;
  }

  // --- Actions (SESSION 17: migrated to RPC) ---
  function markRead(id) {
    const n = notifications.find(n => n.id === id);
    if (n && !n.read) {
      n.read = true;
      unreadCount = Math.max(0, unreadCount - 1);
      _updateBadge();
      _renderList();

      // Server-side mark read via RPC
      if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
        ColosseumAuth.safeRpc('mark_notifications_read', {
          p_notification_ids: [id]
        }).then(({ error }) => {
          if (error) console.error('mark_notifications_read error:', error);
        });
      }
    }
  }

  function markAllRead() {
    notifications.forEach(n => n.read = true);
    unreadCount = 0;
    _updateBadge();
    _renderList();

    // Server-side mark all read via RPC (null = all unread)
    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      ColosseumAuth.safeRpc('mark_notifications_read', {
        p_notification_ids: null
      }).then(({ error }) => {
        if (error) console.error('mark_notifications_read (all) error:', error);
      });
    }
  }

  // --- Badge ---
  function _updateBadge() {
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
  }

  // --- Polling (30s) — SELECT reads are fine with new RLS ---
  function _startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(_fetchNotifications, 30000);
    _fetchNotifications();
  }

  // BUG 3 FIX: Expose destroy() to stop polling on logout / teardown
  function destroy() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    notifications = [];
    unreadCount = 0;
    panelOpen = false;
    _updateBadge();
  }

  async function _fetchNotifications() {
    if (!ColosseumAuth?.supabase || ColosseumAuth.isPlaceholderMode || !ColosseumAuth.currentUser) return;

    try {
      const { data, error } = await ColosseumAuth.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ColosseumAuth.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      notifications = data || [];
      unreadCount = notifications.filter(n => !n.read).length;
      _updateBadge();
      if (panelOpen) _renderList();
    } catch (e) {
      console.error('Notifications fetch error:', e);
    }
  }

  // --- Bell Button ---
  function _bindBellButton() {
    const btn = document.getElementById('notif-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (panelOpen) close(); else open();
      });
    }
  }

  // --- Auto-init (waits for auth ready) ---
  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ready) {
    ColosseumAuth.ready.then(() => init());
  } else {
    setTimeout(init, 100);
  }

  return { open, close, markRead, markAllRead, destroy };

})();
