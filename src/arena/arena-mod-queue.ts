import { safeRpc, getCurrentProfile } from '../auth.ts';
import { showToast, friendlyError, escapeHTML } from '../config.ts';
import {
  view, screenEl, currentDebate, modQueuePollTimer,
  modStatusPollTimer, modRequestModalShown,
  set_view, set_modQueuePollTimer, set_modStatusPollTimer,
  set_modRequestModalShown,
} from './arena-state.ts';
import type { ArenaView } from './arena-types.ts';
import type { ModQueueItem, ModStatusResult } from './arena-types-moderator.ts';
import { showModDebatePicker } from './arena-mod-debate.ts';
import { enterRoom } from './arena-room-enter.ts';

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
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:6px;">${row.category} · ${row.mode}</div>
        <div style="font-family:var(--mod-font-body);font-size:15px;font-weight:600;color:var(--mod-text-primary);margin-bottom:8px;">${row.topic}</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:12px;">${nameA} vs ${nameB} · waiting ${waitStr}</div>
        <button class="arena-secondary-btn mod-queue-claim-btn" data-debate-id="${row.debate_id}" style="width:100%;background:var(--mod-accent-primary);color:var(--mod-text-on-accent);border-color:var(--mod-accent-primary);">REQUEST TO MOD</button>
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
  btn.disabled = true;
  btn.textContent = 'REQUESTING…';

  const { error } = await safeRpc('request_to_moderate', { p_debate_id: debateId });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'REQUEST TO MOD';
    showToast('Another mod got there first — queue refreshed');
    void loadModQueue();
    return;
  }

  stopModQueuePoll();

  const listEl = document.getElementById('mod-queue-list');
  if (listEl) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;">Request sent.<br><span style="font-weight:400;color:var(--mod-text-secondary);font-size:13px;">Waiting for the debaters to accept.</span></div>`;
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

export function startModStatusPoll(debateId: string): void {
  stopModStatusPoll();
  set_modRequestModalShown(false);
  set_modStatusPollTimer(setInterval(async () => {
    if (view !== 'room') {
      stopModStatusPoll();
      return;
    }
    try {
      const { data, error } = await safeRpc<ModStatusResult>('get_debate_mod_status', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as ModStatusResult;
      if (result.mod_status === 'requested' && !modRequestModalShown) {
        showModRequestModal(result.moderator_display_name, result.moderator_id ?? '', debateId);
      } else if (result.mod_status === 'claimed' || result.mod_status === 'none') {
        document.getElementById('mod-request-modal')?.remove();
        stopModStatusPoll();
      }
    } catch { /* retry next tick */ }
  }, 4000));
}

export function stopModStatusPoll(): void {
  if (modStatusPollTimer) {
    clearInterval(modStatusPollTimer);
    set_modStatusPollTimer(null);
  }
}

export function showModRequestModal(modName: string, modId: string, debateId: string): void {
  set_modRequestModalShown(true);
  document.getElementById('mod-request-modal')?.remove();

  let secondsLeft = 30;
  const modal = document.createElement('div');
  modal.id = 'mod-request-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--mod-bg-overlay);';
  modal.innerHTML = `
    <div style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-lg);padding:28px 24px;max-width:320px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">🧑‍⚖️</div>
      <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Moderator Request</div>
      <div style="font-family:var(--mod-font-body);font-size:16px;font-weight:600;color:var(--mod-text-primary);margin-bottom:6px;">${modName}</div>
      <div style="font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-secondary);margin-bottom:20px;">wants to moderate this debate</div>
      <div id="mod-req-countdown" style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);margin-bottom:20px;">Auto-declining in ${secondsLeft}s</div>
      <div style="display:flex;gap:10px;">
        <button id="mod-req-decline" style="flex:1;padding:12px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:transparent;color:var(--mod-text-body);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">DECLINE</button>
        <button id="mod-req-accept" style="flex:1;padding:12px;border-radius:var(--mod-radius-pill);border:none;background:var(--mod-accent-primary);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">ACCEPT</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const countdownTimer = setInterval(() => {
    secondsLeft--;
    const cdEl = document.getElementById('mod-req-countdown');
    if (cdEl) cdEl.textContent = `Auto-declining in ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      void handleModResponse(false, debateId, modal, modId, modName);
    }
  }, 1000);

  document.getElementById('mod-req-accept')?.addEventListener('click', () => {
    clearInterval(countdownTimer);
    void handleModResponse(true, debateId, modal, modId, modName);
  });

  document.getElementById('mod-req-decline')?.addEventListener('click', () => {
    clearInterval(countdownTimer);
    void handleModResponse(false, debateId, modal, modId, modName);
  });
}

export async function handleModResponse(accept: boolean, debateId: string, modal: HTMLElement, modId: string, modName: string): Promise<void> {
  const acceptBtn = document.getElementById('mod-req-accept') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mod-req-decline') as HTMLButtonElement | null;
  if (acceptBtn) acceptBtn.disabled = true;
  if (declineBtn) declineBtn.disabled = true;

  const { error } = await safeRpc('respond_to_mod_request', { p_debate_id: debateId, p_accept: accept });

  if (error) {
    modal.remove();
    set_modRequestModalShown(false);
    return;
  }

  modal.remove();
  if (accept) {
    stopModStatusPoll();
    if (currentDebate) {
      currentDebate.moderatorId = modId;
      currentDebate.moderatorName = modName;
    }
    showToast('Moderator accepted — debate is now moderated');
  } else {
    set_modRequestModalShown(false);
    // poll continues — mod_status reset to 'waiting' by RPC
  }
}
