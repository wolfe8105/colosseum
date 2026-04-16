import { assignModerator, submitReference } from '../auth.ts';
import { friendlyError } from '../config.ts';
import { currentDebate, selectedModerator, screenEl } from './arena-state.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';
import { requestAIModRuling } from './arena-mod-refs-ai.ts';

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
  // LANDMINE [LM-MODREFS-007]: If F-55 evidence submission is ever
  // revived, re-implement this function and wire a button into the arena UI.
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
