import { safeRpc, getCurrentProfile, assignModerator, getDebateReferences, submitReference, ruleOnReference } from '../auth.ts';
import { escapeHTML, friendlyError, SUPABASE_URL } from '../config.ts';
import {
  currentDebate, selectedModerator, screenEl,
  referencePollTimer, pendingReferences, shieldActive,
  _rulingCountdownTimer,
  set_referencePollTimer, set_pendingReferences, set_shieldActive,
  set__rulingCountdownTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { ReferenceItem } from './arena-types-results.ts';
import { isPlaceholder } from './arena-core.ts';
import { addSystemMessage } from './arena-room-live.ts';
import { getUserJwt } from './arena-room-ai.ts';
import { removeShieldIndicator } from '../powerups.ts';

export async function assignSelectedMod(debateId: string): Promise<void> {
  if (!selectedModerator || isPlaceholder()) return;
  if (debateId.startsWith('ai-local-') || debateId.startsWith('placeholder-')) return;
  try {
    await assignModerator(debateId, selectedModerator.id, selectedModerator.type);
  } catch { /* warned */ }
}

export function addReferenceButton(): void {
  // F-55: Old evidence submission path retired. All modes now use the
  // loadout-based citation system (F-51 Phase 3). The submit_reference
  // RPC no longer exists. This function is kept as a no-op so callsites
  // don't need changes.
  return;
}

export function showReferenceForm(): void {
  hideReferenceForm();
  const debate = currentDebate;
  if (!debate) return;

  const form = document.createElement('div');
  form.className = 'arena-ref-form arena-fade-in';
  form.id = 'arena-ref-form';
  form.innerHTML = `
    <input type="url" id="arena-ref-url" placeholder="URL (optional)" autocomplete="off">
    <textarea id="arena-ref-desc" placeholder="Describe the evidence..." maxlength="500" rows="2"></textarea>
    <div class="arena-ref-side-row">
      <button class="arena-ref-side-btn" data-side="a">Supports Side A</button>
      <button class="arena-ref-side-btn" data-side="b">Supports Side B</button>
    </div>
    <div class="arena-ref-actions">
      <button class="arena-ref-submit" id="arena-ref-submit-btn">SUBMIT EVIDENCE</button>
      <button class="arena-ref-cancel" id="arena-ref-cancel-btn">\u2715</button>
    </div>
  `;

  const messages = document.getElementById('arena-messages');
  if (messages) {
    messages.parentNode?.insertBefore(form, messages.nextSibling);
  } else {
    screenEl?.appendChild(form);
  }

  // Wire side buttons
  let selectedSide: string | null = null;
  form.querySelectorAll('.arena-ref-side-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.arena-ref-side-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSide = (btn as HTMLElement).dataset.side!;
    });
  });

  document.getElementById('arena-ref-submit-btn')?.addEventListener('click', async () => {
    const url = (document.getElementById('arena-ref-url') as HTMLInputElement | null)?.value?.trim() || '';
    const desc = (document.getElementById('arena-ref-desc') as HTMLTextAreaElement | null)?.value?.trim() || '';
    if (!url && !desc) return;

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement | null;
    if (submitBtn) { submitBtn.textContent = '\u23F3'; submitBtn.disabled = true; }

    const result = await submitReference(debate.id, url || null, desc || null, selectedSide || undefined);
    if (result?.error) {
      addSystemMessage('\u274C ' + (friendlyError(result.error) || String(result.error)));
    } else {
      addSystemMessage('\uD83D\uDCCE Evidence submitted \u2014 awaiting moderator ruling');
      // Session 39: AI moderator auto-rules
      if (debate.moderatorType === 'ai' && (result as unknown as Record<string, unknown>)?.reference_id) {
        void requestAIModRuling(debate, (result as unknown as Record<string, unknown>).reference_id as string, url, desc, selectedSide);
      }
    }
    hideReferenceForm();
  });

  document.getElementById('arena-ref-cancel-btn')?.addEventListener('click', hideReferenceForm);
}

export function hideReferenceForm(): void {
  document.getElementById('arena-ref-form')?.remove();
}

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
        <div class="mod-ruling-ref-meta">ROUND ${ref.round || '?'} \u00B7 ${sideLabel}</div>
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
    }
    overlay.remove();
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
    }
    overlay.remove();
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
  return;
}

export function stopReferencePoll(): void {
  if (referencePollTimer) { clearInterval(referencePollTimer); set_referencePollTimer(null); }
  set_pendingReferences([]);
}

// Session 39: Call AI Moderator Edge Function for auto-ruling
export async function requestAIModRuling(
  debate: CurrentDebate,
  referenceId: string,
  url: string,
  description: string,
  supportsSide: string | null
): Promise<void> {
  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-moderator';

    const recentMessages = (debate.messages || []).slice(-6).map((m) =>
      `${m.role === 'user' ? 'Side A' : 'Side B'} (R${m.round}): ${m.text}`
    ).join('\n');

    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
      },
      body: JSON.stringify({
        topic: debate.topic,
        reference: { url, description, supports_side: supportsSide },
        round: debate.round,
        debateContext: recentMessages || null,
      }),
    });

    if (!res.ok) throw new Error('Edge Function error: ' + res.status);

    const data = await res.json() as { ruling?: string; reason?: string };
    const ruling = data?.ruling || 'allowed';
    const reason = data?.reason || 'AI ruling.';

    const result = await ruleOnReference(referenceId, ruling, '\uD83E\uDD16 ' + reason, 'ai');
    if (result?.error) {
      console.warn('[Arena] AI mod ruling RPC failed:', result.error);
    }

    const icon = ruling === 'allowed' ? '\u2705' : '\u274C';
    addSystemMessage(`${icon} AI Moderator: Evidence ${ruling.toUpperCase()} \u2014 ${reason}`);

  } catch (err) {
    console.warn('[Arena] AI Moderator Edge Function failed:', err);
    await ruleOnReference(referenceId, 'allowed', '\uD83E\uDD16 Auto-allowed (AI moderator unavailable)', 'ai');
    addSystemMessage('\u2705 AI Moderator: Evidence AUTO-ALLOWED (moderator unavailable)');
  }
}
