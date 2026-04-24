import { safeRpc, getCurrentProfile } from '../auth.ts';
import { showToast, escapeHTML } from '../config.ts';
import {
  view, screenEl, modQueuePollTimer,
  set_view, set_modQueuePollTimer,
} from './arena-state.ts';
import type { ModQueueItem } from './arena-types-moderator.ts';
import { showModDebatePicker } from './arena-mod-debate-picker.ts';

// LANDMINE [LM-MODQUEUE-001]: row.topic, row.category, row.mode, nameA, nameB are
// rendered into innerHTML without escapeHTML() — potential XSS on user-supplied content.

export function showModQueue(): void {
  set_view('modQueue');
  history.pushState({ arenaView: 'modQueue' }, '');
  if (screenEl) {
    screenEl.innerHTML = '';
  }

  const profile = getCurrentProfile();
  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Mod Queue</div>
      <div class="arena-hero-sub">Debates waiting for a moderator</div>
    </div>
    <div style="padding:0 16px 16px;">
      <button class="arena-secondary-btn" id="mod-queue-back" style="width:100%;margin-bottom:16px;">← BACK</button>
      ${profile?.is_moderator ? `<button class="arena-secondary-btn" id="mod-queue-create-debate" style="width:100%;margin-bottom:16px;border-color:var(--mod-accent-primary);color:var(--mod-accent-primary);">⚔️ CREATE DEBATE</button>` : ''}
      <div id="mod-invite-section" style="display:none;margin-bottom:16px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-accent);text-transform:uppercase;margin-bottom:8px;">⚖️ INVITED TO MODERATE</div>
        <div id="mod-invite-list"></div>
      </div>
      <div id="mod-queue-list"></div>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-queue-back')?.addEventListener('click', async () => {
    stopModQueuePoll();
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  });

  document.getElementById('mod-queue-create-debate')?.addEventListener('click', () => {
    stopModQueuePoll();
    showModDebatePicker();
  });

  void loadModQueue();
  void loadPendingModInvites();
  startModQueuePoll();
}

export async function loadModQueue(): Promise<void> {
  const listEl = document.getElementById('mod-queue-list');
  if (!listEl) return;

  const { data, error } = await safeRpc<ModQueueItem[]>('browse_mod_queue');

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes('Not an available moderator')) {
      listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-secondary);font-family:var(--mod-font-ui);font-size:13px;">You're not set to Available.<br>Toggle in Settings to receive requests.</div>`;
    } else {
      showToast(msg);
    }
    return;
  }

  const rows = (data as ModQueueItem[]) ?? [];

  if (rows.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-secondary);font-family:var(--mod-font-ui);font-size:13px;">No debates waiting for a moderator right now.</div>`;
    return;
  }

  listEl.innerHTML = rows.map(row => {
    const waitMs = Date.now() - new Date(row.created_at).getTime();
    const waitMin = Math.floor(waitMs / 60000);
    const waitSec = Math.floor((waitMs % 60000) / 1000);
    const waitStr = waitMin > 0 ? `${waitMin}m ${waitSec}s` : `${waitSec}s`;
    const nameA = row.debater_a_name ?? 'Unknown';
    const nameB = row.debater_b_name ?? 'TBD';
    return `
      <div style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:14px 16px;margin-bottom:12px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:6px;">${escapeHTML(row.category)} · ${escapeHTML(row.mode)}</div>
        <div style="font-family:var(--mod-font-body);font-size:15px;font-weight:600;color:var(--mod-text-primary);margin-bottom:8px;">${escapeHTML(row.topic)}</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:12px;">${escapeHTML(nameA)} vs ${escapeHTML(nameB)} · waiting ${waitStr}</div>
        <button class="arena-secondary-btn mod-queue-claim-btn" data-debate-id="${escapeHTML(row.debate_id)}" style="width:100%;background:var(--mod-accent-primary);color:var(--mod-text-on-accent);border-color:var(--mod-accent-primary);">REQUEST TO MOD</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll<HTMLButtonElement>('.mod-queue-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const debateId = btn.dataset.debateId!;
      void claimModRequest(debateId, btn);
    });
  });
}

export async function claimModRequest(debateId: string, btn: HTMLButtonElement): Promise<void> {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'REQUESTING…';

  try {
    const { error } = await safeRpc('request_to_moderate', { p_debate_id: debateId });

    if (error) {
      showToast('Another mod got there first — queue refreshed');
      void loadModQueue();
      return;
    }

    stopModQueuePoll();

    const listEl = document.getElementById('mod-queue-list');
    if (listEl) {
      listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;">Request sent.<br><span style="font-weight:400;color:var(--mod-text-secondary);font-size:13px;">Waiting for the debaters to accept.</span></div>`;
    }
  } catch {
    showToast('Request failed. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'REQUEST TO MOD';
  }
}

export function startModQueuePoll(): void {
  if (modQueuePollTimer) clearInterval(modQueuePollTimer);
  set_modQueuePollTimer(setInterval(() => {
    if (view !== 'modQueue') {
      clearInterval(modQueuePollTimer!);
      set_modQueuePollTimer(null);
      return;
    }
    void loadModQueue();
  }, 5000));
}

export function stopModQueuePoll(): void {
  if (modQueuePollTimer) {
    clearInterval(modQueuePollTimer);
    set_modQueuePollTimer(null);
  }
}

export async function loadPendingModInvites(): Promise<void> {
  const section = document.getElementById('mod-invite-section');
  const listEl = document.getElementById('mod-invite-list');
  if (!section || !listEl) return;

  try {
    const { data, error } = await safeRpc<{
      debate_id: string;
      topic: string;
      category: string;
      mode: string;
      inviter_id: string;
      inviter_name: string;
      created_at: string;
    }[]>('get_pending_mod_invites');

    if (error || !data || !(data as unknown[]).length) {
      section.style.display = 'none';
      return;
    }

    const invites = data as { debate_id: string; topic: string; category: string; mode: string; inviter_id: string; inviter_name: string; created_at: string }[];
    section.style.display = 'block';

    listEl.innerHTML = invites.map(inv => `
      <div class="mod-invite-card" data-debate-id="${escapeHTML(inv.debate_id)}" style="background:var(--mod-bg-card);border:1px solid var(--mod-accent);border-radius:var(--mod-radius-md);padding:14px 16px;margin-bottom:10px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:6px;">${escapeHTML(inv.category)} · ${escapeHTML(inv.mode)}</div>
        <div style="font-family:var(--mod-font-body);font-size:15px;font-weight:600;color:var(--mod-text-primary);margin-bottom:4px;">${escapeHTML(inv.topic || 'Untitled Debate')}</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:12px;">Invited by ${escapeHTML(inv.inviter_name)}</div>
        <div style="display:flex;gap:8px;">
          <button class="arena-secondary-btn mod-invite-accept-btn" data-debate-id="${escapeHTML(inv.debate_id)}" style="flex:1;background:var(--mod-accent-primary);color:var(--mod-text-on-accent);border-color:var(--mod-accent-primary);">ACCEPT</button>
          <button class="arena-secondary-btn mod-invite-decline-btn" data-debate-id="${escapeHTML(inv.debate_id)}" style="flex:1;">DECLINE</button>
          <button class="arena-secondary-btn mod-invite-block-btn" data-debate-id="${escapeHTML(inv.debate_id)}" data-inviter-id="${escapeHTML(inv.inviter_id)}" data-inviter-name="${escapeHTML(inv.inviter_name)}" style="padding:8px 10px;opacity:0.6;" title="Block this user">🚫</button>
        </div>
      </div>
    `).join('');

    // Wire accept buttons
    listEl.querySelectorAll<HTMLButtonElement>('.mod-invite-accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '⏳';
        try {
          const { error } = await safeRpc('respond_mod_invite', { p_debate_id: btn.dataset.debateId, p_accept: true });
          if (error) { showToast('Could not accept — try again'); btn.disabled = false; btn.textContent = 'ACCEPT'; return; }
          btn.closest('.mod-invite-card')?.remove();
          showToast('✅ Accepted! You\'re the moderator.', 'success');
          if (!listEl.querySelector('.mod-invite-card')) section.style.display = 'none';
        } catch { showToast('Could not accept — try again'); btn.disabled = false; btn.textContent = 'ACCEPT'; }
      });
    });

    // Wire decline buttons
    listEl.querySelectorAll<HTMLButtonElement>('.mod-invite-decline-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '⏳';
        try {
          await safeRpc('respond_mod_invite', { p_debate_id: btn.dataset.debateId, p_accept: false });
          btn.closest('.mod-invite-card')?.remove();
          showToast('Declined — debate is now open to any moderator');
          if (!listEl.querySelector('.mod-invite-card')) section.style.display = 'none';
        } catch { showToast('Could not decline — try again'); btn.disabled = false; btn.textContent = 'DECLINE'; }
      });
    });

    // Wire block buttons
    listEl.querySelectorAll<HTMLButtonElement>('.mod-invite-block-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const inviterId = btn.dataset.inviterId!;
        const inviterName = btn.dataset.inviterName || 'this user';
        const debateId = btn.dataset.debateId!;
        const confirmed = window.confirm(`Block ${inviterName}? They won't be able to invite or message you.`);
        if (!confirmed) return;
        btn.disabled = true;
        btn.textContent = '⏳';
        await safeRpc('respond_mod_invite', { p_debate_id: debateId, p_accept: false }).catch(() => {});
        const { error } = await safeRpc('block_user', { p_blocked_id: inviterId });
        if (!error) {
          btn.closest('.mod-invite-card')?.remove();
          showToast(`${inviterName} blocked`);
          if (!listEl.querySelector('.mod-invite-card')) section.style.display = 'none';
        } else {
          btn.disabled = false;
          btn.textContent = '🚫';
          showToast('Could not block — try again');
        }
      });
    });

  } catch { section.style.display = 'none'; }
}
