import { ruleOnReference } from '../auth.ts';
import { escapeHTML, friendlyError } from '../config.ts';
import {
  _rulingCountdownTimer, set__rulingCountdownTimer,
  referencePollTimer, set_referencePollTimer, set_pendingReferences,
} from './arena-state.ts';
import type { ReferenceItem } from './arena-types-results.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';

export function showRulingPanel(ref: ReferenceItem): void {
  document.getElementById('mod-ruling-overlay')?.remove();

  const sideLabel = ref.supports_side === 'a' ? 'Side A' : ref.supports_side === 'b' ? 'Side B' : 'Neutral';

  const overlay = document.createElement('div');
  overlay.className = 'mod-ruling-overlay';
  overlay.id = 'mod-ruling-overlay';
  overlay.innerHTML = `
    <div class="mod-ruling-backdrop"></div>
    <div class="mod-ruling-sheet">
      <div class="mod-ruling-handle"></div>
      <div class="mod-ruling-title">\u2696\uFE0F RULING NEEDED</div>
      <div class="mod-ruling-sub">Evidence submitted by ${escapeHTML(ref.submitter_name || 'Unknown')}</div>
      <div class="mod-ruling-timer" id="mod-ruling-timer">60s auto-allow</div>
      <div class="mod-ruling-ref">
        <div class="mod-ruling-ref-meta">ROUND ${Number(ref.round) || '?'} \u00B7 ${sideLabel}</div>
        ${ref.url ? `<div class="mod-ruling-ref-url">${escapeHTML(ref.url)}</div>` : ''}
        ${ref.description ? `<div class="mod-ruling-ref-desc">${escapeHTML(ref.description)}</div>` : ''}
        <div class="mod-ruling-ref-side">Supports: ${sideLabel}</div>
      </div>
      <textarea class="mod-ruling-reason" id="mod-ruling-reason" placeholder="Reason for ruling (optional)" maxlength="300"></textarea>
      <div class="mod-ruling-btns">
        <button class="mod-ruling-allow" id="mod-ruling-allow">\u2705 ALLOW</button>
        <button class="mod-ruling-deny" id="mod-ruling-deny">\u274C DENY</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-allow countdown
  let countdown = 60;
  const timerEl = overlay.querySelector('#mod-ruling-timer');
  if (_rulingCountdownTimer) clearInterval(_rulingCountdownTimer);
  set__rulingCountdownTimer(setInterval(() => {
    countdown--;
    if (timerEl) timerEl.textContent = countdown + 's auto-allow';
    if (countdown <= 0) {
      clearInterval(_rulingCountdownTimer!);
      set__rulingCountdownTimer(null);
      overlay.remove();
      ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)').catch((e) => console.warn('[Arena] ruleOnReference auto-allow failed:', e));
    }
  }, 1000));

  // Wire buttons
  let _rulingBusy = false;
  overlay.querySelector('#mod-ruling-allow')?.addEventListener('click', async () => {
    if (_rulingBusy) return;
    _rulingBusy = true;
    const allowBtn = overlay.querySelector('#mod-ruling-allow') as HTMLButtonElement | null;
    const denyBtn = overlay.querySelector('#mod-ruling-deny') as HTMLButtonElement | null;
    if (allowBtn) allowBtn.disabled = true;
    if (denyBtn) denyBtn.disabled = true;
    clearInterval(_rulingCountdownTimer!);
    set__rulingCountdownTimer(null);
    const reason = (document.getElementById('mod-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const result = await ruleOnReference(ref.id, 'allowed', reason);
    if (result?.error) {
      addSystemMessage('\u274C Ruling failed: ' + (friendlyError(result.error) || String(result.error)));
      _rulingBusy = false;
      if (allowBtn) allowBtn.disabled = false;
      if (denyBtn) denyBtn.disabled = false;
    } else {
      addSystemMessage('\u2705 Evidence ALLOWED by moderator' + (reason ? ': ' + reason : ''));
      overlay.remove();
    }
  });

  overlay.querySelector('#mod-ruling-deny')?.addEventListener('click', async () => {
    if (_rulingBusy) return;
    _rulingBusy = true;
    const allowBtn = overlay.querySelector('#mod-ruling-allow') as HTMLButtonElement | null;
    const denyBtn = overlay.querySelector('#mod-ruling-deny') as HTMLButtonElement | null;
    if (allowBtn) allowBtn.disabled = true;
    if (denyBtn) denyBtn.disabled = true;
    clearInterval(_rulingCountdownTimer!);
    set__rulingCountdownTimer(null);
    const reason = (document.getElementById('mod-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const result = await ruleOnReference(ref.id, 'denied', reason);
    if (result?.error) {
      addSystemMessage('\u274C Ruling failed: ' + (friendlyError(result.error) || String(result.error)));
      _rulingBusy = false;
      if (allowBtn) allowBtn.disabled = false;
      if (denyBtn) denyBtn.disabled = false;
    } else {
      addSystemMessage('\u274C Evidence DENIED by moderator' + (reason ? ': ' + reason : ''));
      overlay.remove();
    }
  });

  // Close on backdrop tap — don't close, moderator must rule
  overlay.querySelector('.mod-ruling-backdrop')?.addEventListener('click', () => {
    // Don't close — moderator must rule.
  });
}

export function startReferencePoll(_debateId: string): void {
  // F-55: Old submit_reference → moderator ruling poll retired.
  // The submit_reference RPC no longer exists, so no new debate_references
  // rows will be inserted. The poll is now a no-op. Challenges in the new
  // system go through file_reference_challenge → rule_on_reference, which
  // uses debate_feed_events and reference_challenges (not debate_references).
  // LANDMINE [LM-MODREFS-008]: If F-55 reference poll is ever revived,
  // implement polling logic here against the new challenge tables.
  return;
}

export function stopReferencePoll(): void {
  if (referencePollTimer) { clearInterval(referencePollTimer); set_referencePollTimer(null); }
  set_pendingReferences([]);
}
