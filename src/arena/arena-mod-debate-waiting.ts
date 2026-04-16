import { escapeHTML } from '../config.ts';
import { screenEl, set_view } from './arena-state.ts';
import type { DebateMode } from './arena-types.ts';
import { startModDebatePoll, stopModDebatePoll, cancelModDebate } from './arena-mod-debate-poll.ts';

export function showModDebateWaitingMod(debateId: string, joinCode: string, topic: string, mode: DebateMode, ranked: boolean): void {
  set_view('modDebateWaiting');
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Debaters</div>
      <div class="arena-hero-sub">${escapeHTML(topic)}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:10px;">Join Code</div>
      <div style="font-family:var(--mod-font-display);font-size:40px;font-weight:700;color:var(--mod-accent-primary);letter-spacing:6px;margin-bottom:6px;">${escapeHTML(joinCode)}</div>
      <div style="font-family:var(--mod-font-body);font-size:13px;color:var(--mod-text-secondary);margin-bottom:24px;">Share this code with your two debaters</div>
      <div id="mod-debate-slots" style="margin-bottom:24px;">
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:6px;">Debater A: <span id="slot-a-name" style="color:var(--mod-text-muted);">waiting…</span></div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);">Debater B: <span id="slot-b-name" style="color:var(--mod-text-muted);">waiting…</span></div>
      </div>
      <button class="arena-secondary-btn" id="mod-debate-cancel-btn" style="width:100%;">CANCEL</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-cancel-btn')?.addEventListener('click', () => {
    void cancelModDebate(debateId);
  });

  startModDebatePoll(debateId, mode, ranked);
}

export function showModDebateWaitingDebater(debateId: string, topic: string, mode: DebateMode, ranked: boolean): void {
  set_view('modDebateWaiting');
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Opponent</div>
      <div class="arena-hero-sub">${escapeHTML(topic || 'Open Debate')}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-secondary);margin-bottom:24px;">You're in. Waiting for the second debater to join…</div>
      <button class="arena-secondary-btn" id="mod-debate-debater-cancel-btn" style="width:100%;">LEAVE</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-debater-cancel-btn')?.addEventListener('click', async () => {
    stopModDebatePoll();
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  });

  startModDebatePoll(debateId, mode, ranked);
}
