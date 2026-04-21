/**
 * THE MODERATOR — Async Actions: Challenge
 *
 * LANDMINE [LM-ACT-001]: No guard against opening the challenge modal when already open.
 * Rapid double-tap appends a second overlay.
 * LANDMINE [LM-ACT-002]: Early return on missing takeId does not close the modal.
 */

import { state } from './async.state.ts';
import { loadHotTakes } from './async.render.ts';
import { _enterArenaWithTopic } from './async.utils.ts';
import { escapeHTML, showToast } from './config.ts';
import { safeRpc, getSupabaseClient, getIsPlaceholderMode, requireAuth } from './auth.ts';
import type { HotTake } from './async.types.ts';

const esc = escapeHTML;

export function challenge(takeId: string): void {
  if (!requireAuth('challenge someone to a debate')) return;
  const take = state.hotTakes.find(t => t.id === takeId);
  if (!take) return;
  _showChallengeModal(take);
}

export function _showChallengeModal(take: HotTake): void {
  document.getElementById('challenge-modal')?.remove();
  const safeUser = esc(take.user);
  const safeText = esc(take.text);
  state.pendingChallengeId = take.id;

  const modal = document.createElement('div');
  modal.id = 'challenge-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';

  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,var(--mod-bg-card) 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 20px;"></div>
      <div style="font-family:var(--mod-font-display);font-size:22px;letter-spacing:2px;color:var(--mod-magenta);text-align:center;margin-bottom:4px;">⚔️ CHALLENGE</div>
      <div style="color:var(--mod-text-sub);text-align:center;font-size:13px;margin-bottom:16px;">You disagree with ${safeUser}?</div>
      <div style="background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--mod-text-heading);line-height:1.4;">"${safeText}"</div>
        <div style="font-size:11px;color:var(--mod-text-sub); margin-top:6px;">— ${safeUser} (ELO ${Number(take.elo)})</div>
      </div>
      <textarea id="challenge-response" placeholder="Your counter-argument..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:80px;
        font-family:var(--mod-font-ui);margin-bottom:12px;box-sizing:border-box;
      "></textarea>
      <div style="display:flex;gap:8px;">
        <button data-action="cancel-challenge" style="flex:1;padding:12px;background:var(--mod-bg-card);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;">CANCEL</button>
        <button data-action="submit-challenge" style="flex:1;padding:12px;background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:10px;font-family:var(--mod-font-display);font-size:16px;letter-spacing:2px;cursor:pointer;">⚔️ BET.</button>
      </div>
    </div>`;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.remove(); return; }
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'cancel-challenge') modal.remove();
    else if (btn.dataset['action'] === 'submit-challenge') void _submitChallenge(state.pendingChallengeId);
  });

  document.body.appendChild(modal);
}

export async function _submitChallenge(takeId: string | null): Promise<void> {
  if (!takeId) return;
  if (state.challengeInFlight) return;
  state.challengeInFlight = true;
  const take = state.hotTakes.find(t => t.id === takeId);
  if (!take) { state.challengeInFlight = false; return; }
  const textarea = document.getElementById('challenge-response') as HTMLTextAreaElement | null;
  const text = textarea?.value?.trim();
  if (!text) {
    if (textarea) textarea.style.borderColor = 'var(--mod-magenta)';
    state.challengeInFlight = false;
    return;
  }

  take.challenges++;
  document.getElementById('challenge-modal')?.remove();
  loadHotTakes(state.currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { error } = await safeRpc('create_challenge', {
        p_hot_take_id: takeId, p_counter_argument: text, p_topic: take.text,
      });
      if (error) {
        console.error('create_challenge error:', error);
        take.challenges--;
        loadHotTakes(state.currentFilter);
        showToast('Challenge failed — try again', 'error');
        state.challengeInFlight = false;
        return;
      }
      showToast('⚔️ Challenge sent! Entering the arena...', 'success');
      _enterArenaWithTopic(take.text);
    } catch (e) {
      console.error('create_challenge exception:', e);
      take.challenges--;
      loadHotTakes(state.currentFilter);
      showToast('Challenge failed — try again', 'error');
    }
  } else {
    showToast('⚔️ Challenge sent! Entering the arena...', 'success');
    _enterArenaWithTopic(take.text);
  }
  state.challengeInFlight = false;
}
