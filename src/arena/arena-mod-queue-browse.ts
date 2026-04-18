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
