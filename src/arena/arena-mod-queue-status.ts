import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import {
  view, currentDebate, modStatusPollTimer, modRequestModalShown,
  set_modStatusPollTimer, set_modRequestModalShown,
} from './arena-state.ts';
import type { ModStatusResult } from './arena-types-moderator.ts';

// LANDMINE [LM-MODQUEUE-002]: modName is rendered into innerHTML without escapeHTML()
// — potential XSS if a moderator's display_name contains HTML characters.

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
