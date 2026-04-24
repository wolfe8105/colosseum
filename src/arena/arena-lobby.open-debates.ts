/**
 * arena-lobby.open-debates.ts
 *
 * Loads and renders the creator's own pending/open debates in the lobby.
 * Each card shows topic, mode, waiting status, and a re-entry button
 * that drops them back into the privateLobbyWaiting screen with the
 * existing debate_id already polling.
 *
 * Also handles cancel from this view.
 */

import { safeRpc, getCurrentUser } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import {
  set_selectedMode,
  set_selectedRuleset,
  set_selectedRounds,
} from './arena-state.ts';
import type { DebateMode } from './arena-types.ts';

interface OpenDebate {
  debate_id: string;
  topic: string;
  mode: string;
  ruleset: string;
  total_rounds: number;
  visibility: string;
  join_code: string | null;
  invited_user_name: string | null;
  mod_invite_status: string | null;
  mod_invited_name: string | null;
  created_at: string;
}

export async function loadMyOpenDebates(): Promise<void> {
  if (isPlaceholder() || !getCurrentUser()) return;

  const section = document.getElementById('arena-my-open-section');
  const feed = document.getElementById('arena-my-open-feed');
  if (!section || !feed) return;

  try {
    const { data, error } = await safeRpc<OpenDebate[]>('get_my_open_debates', {});
    if (error || !data) return;

    const debates = data as OpenDebate[];
    if (debates.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';

    feed.innerHTML = debates.map(d => {
      const topic = escapeHTML(d.topic || 'No topic set');
      const mode = escapeHTML(d.mode.toUpperCase());
      const ruleset = d.ruleset === 'unplugged' ? ' · 🎸 UNPLUGGED' : '';
      const rounds = d.total_rounds !== 4 ? ` · ${d.total_rounds}R` : '';

      let statusLine = 'Waiting for a challenger...';
      if (d.visibility === 'private' && d.invited_user_name) {
        statusLine = `Waiting for ${escapeHTML(d.invited_user_name)} to accept`;
      } else if (d.visibility === 'group') {
        statusLine = 'Waiting for a group member to join';
      } else if (d.visibility === 'code' && d.join_code) {
        statusLine = `Join code: <strong style="color:var(--mod-accent);letter-spacing:4px;">${escapeHTML(d.join_code)}</strong>`;
      }

      const modLine = d.mod_invite_status === 'pending' && d.mod_invited_name
        ? `<div style="font-size:11px;color:var(--mod-text-muted);margin-top:4px;">⚖️ Mod invite pending: ${escapeHTML(d.mod_invited_name)}</div>`
        : '';

      return `
        <div class="arena-card" style="border-left:3px solid var(--mod-accent);position:relative;" data-open-debate-id="${escapeHTML(d.debate_id)}" data-mode="${escapeHTML(d.mode)}" data-topic="${escapeHTML(d.topic || '')}" data-ruleset="${escapeHTML(d.ruleset)}" data-rounds="${Number(d.total_rounds)}">
          <div class="arena-card-top">
            <span class="arena-card-badge" style="background:rgba(204,41,54,0.15);color:var(--mod-accent);border:1px solid rgba(204,41,54,0.3);">⏳ WAITING</span>
            <span class="arena-card-meta">${mode}${ruleset}${rounds}</span>
          </div>
          <div class="arena-card-topic">${topic}</div>
          <div style="font-size:12px;color:var(--mod-text-muted);margin:6px 0 10px;">${statusLine}</div>
          ${modLine}
          <div class="arena-card-action" style="gap:8px;display:flex;">
            <button class="arena-card-btn open-debate-reenter-btn" style="flex:1;border-color:var(--mod-accent-border);color:var(--mod-accent);">↩ RE-ENTER LOBBY</button>
            <button class="arena-card-btn open-debate-cancel-btn" style="padding:8px 12px;opacity:0.6;">✕</button>
          </div>
        </div>`;
    }).join('');

    // Wire re-enter buttons
    feed.querySelectorAll<HTMLButtonElement>('.open-debate-reenter-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-open-debate-id]') as HTMLElement;
        const debateId = card.dataset.openDebateId!;
        const mode = card.dataset.mode || 'text';
        const topic = card.dataset.topic || '';
        const ruleset = (card.dataset.ruleset || 'amplified') as 'amplified' | 'unplugged';
        const rounds = Number(card.dataset.rounds) || 4;

        // Restore arena state so the polling screen works correctly
        set_selectedMode(mode as DebateMode);
        set_selectedRuleset(ruleset);
        set_selectedRounds(rounds);

        // Jump straight into the waiting screen with this existing debate_id
        const { startPrivateLobbyPoll, createAndWaitPrivateLobby: _ } = await import('./arena-private-lobby.ts');
        const { set_privateLobbyDebateId, set_view, screenEl } = await import('./arena-state.ts');
        const { pushArenaState } = await import('./arena-core.utils.ts');

        set_view('privateLobbyWaiting');
        pushArenaState('privateLobbyWaiting');
        if (screenEl) screenEl.innerHTML = '';

        // Re-render the waiting UI
        const waiting = document.createElement('div');
        waiting.className = 'arena-queue arena-fade-in';
        waiting.id = 'arena-private-waiting';
        waiting.innerHTML = `
          <div class="arena-queue-search-ring" id="arena-private-ring">
            <div class="arena-queue-icon">🔒</div>
          </div>
          <div class="arena-queue-title" id="arena-private-title">LOBBY OPEN</div>
          <div class="arena-queue-status" id="arena-private-status">Waiting for your opponent...</div>
          <div id="arena-private-code-display"></div>
          <button class="arena-queue-cancel" id="arena-private-cancel-btn">✕ CANCEL</button>
        `;
        screenEl?.appendChild(waiting);

        set_privateLobbyDebateId(debateId);

        // Show join code if applicable
        const joinCode = card.querySelector('strong')?.textContent;
        if (joinCode) {
          const codeDisplay = document.getElementById('arena-private-code-display');
          const titleEl = document.getElementById('arena-private-title');
          const statusEl = document.getElementById('arena-private-status');
          if (titleEl) titleEl.textContent = 'SHARE THIS CODE';
          if (statusEl) statusEl.textContent = 'Waiting for someone to join...';
          if (codeDisplay) codeDisplay.innerHTML = `
            <div style="margin:16px 0;padding:20px 32px;border-radius:var(--mod-radius-md);border:2px solid var(--mod-accent-border);background:var(--mod-accent-muted);text-align:center;">
              <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:3px;color:var(--mod-text-muted);margin-bottom:8px;">JOIN CODE</div>
              <div style="font-family:var(--mod-font-ui);font-size:40px;font-weight:700;color:var(--mod-accent);letter-spacing:8px;">${escapeHTML(joinCode)}</div>
            </div>
            <button id="arena-challenge-link-btn" style="margin-top:4px;padding:12px 24px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1.5px;cursor:pointer;width:100%;text-transform:uppercase;">🔗 Copy Challenge Link</button>
          `;
          document.getElementById('arena-challenge-link-btn')?.addEventListener('click', () => {
            const link = `https://themoderator.app/challenge?code=${encodeURIComponent(joinCode)}`;
            navigator.clipboard.writeText(link)
              .then(() => showToast('Challenge link copied!'))
              .catch(() => showToast(link));
          });
        }

        document.getElementById('arena-private-cancel-btn')?.addEventListener('click', () => {
          import('./arena-private-lobby.ts').then(({ cancelPrivateLobby }) => {
            void cancelPrivateLobby();
          });
        });

        startPrivateLobbyPoll(debateId, mode, topic);
      });
    });

    // Wire cancel buttons
    feed.querySelectorAll<HTMLButtonElement>('.open-debate-cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-open-debate-id]') as HTMLElement;
        const debateId = card.dataset.openDebateId!;
        btn.disabled = true;
        btn.textContent = '⏳';
        const { error } = await safeRpc('cancel_private_lobby', { p_debate_id: debateId });
        if (!error) {
          card.remove();
          showToast('Debate cancelled');
          if (!feed.querySelector('[data-open-debate-id]')) section.style.display = 'none';
        } else {
          btn.disabled = false;
          btn.textContent = '✕';
          showToast('Could not cancel — try again');
        }
      });
    });

  } catch (e) {
    console.warn('[Arena] loadMyOpenDebates error:', e);
  }
}
