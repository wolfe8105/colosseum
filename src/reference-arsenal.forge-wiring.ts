import { showToast } from './config.ts';
import { _submitForge } from './reference-arsenal.forge-submit.ts';
import type { ForgeFormState } from './reference-arsenal.forge-submit.ts';
import type { ArsenalReference, SourceType, ReferenceCategory } from './reference-arsenal.types.ts';

export function _wireForgeSheet(
  container: HTMLElement,
  state: ForgeFormState,
  isEdit: boolean,
  editRef: ArsenalReference | undefined,
  onComplete: (refId: string) => void,
  onCancel: () => void,
  onRender: () => void,
): void {
  // Step 1: source details
  const titleEl = document.getElementById('forge-title') as HTMLInputElement | null;
  if (titleEl) titleEl.addEventListener('input', () => { state.source_title = titleEl.value; });

  const authorEl = document.getElementById('forge-author') as HTMLInputElement | null;
  if (authorEl) authorEl.addEventListener('input', () => { state.source_author = authorEl.value; });

  const dateEl = document.getElementById('forge-date') as HTMLInputElement | null;
  if (dateEl) dateEl.addEventListener('input', () => { state.source_date = dateEl.value; });

  const locatorEl = document.getElementById('forge-locator') as HTMLInputElement | null;
  if (locatorEl) locatorEl.addEventListener('input', () => { state.locator = locatorEl.value; });

  const urlEl = document.getElementById('forge-url') as HTMLInputElement | null;
  if (urlEl) urlEl.addEventListener('input', () => { state.source_url = urlEl.value; });

  // Step 2: claim
  const claimEl = document.getElementById('forge-claim') as HTMLTextAreaElement | null;
  if (claimEl) {
    claimEl.addEventListener('input', () => {
      state.claim_text = claimEl.value;
      const countEl = document.getElementById('forge-claim-count');
      if (countEl) countEl.textContent = String(state.claim_text.length);
    });
  }

  // Step 3: source type buttons (locked during edit — LM-ARSENAL-002)
  if (!isEdit) {
    container.querySelectorAll('.forge-source-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.source_type = (btn as HTMLElement).dataset.source as SourceType;
        onRender();
      });
    });
  }

  // Step 4: category buttons
  container.querySelectorAll('.forge-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.category = (btn as HTMLElement).dataset.cat as ReferenceCategory;
      onRender();
    });
  });

  // Nav
  document.getElementById('forge-back')?.addEventListener('click', () => {
    state.step--;
    onRender();
  });

  document.getElementById('forge-cancel')?.addEventListener('click', () => {
    onCancel();
  });

  document.getElementById('forge-next')?.addEventListener('click', () => {
    if (_validateStep(state)) {
      state.step++;
      onRender();
    }
  });

  document.getElementById('forge-submit')?.addEventListener('click', () => {
    void _submitForge(state, isEdit, editRef, onComplete);
  });
}

function _validateStep(state: ForgeFormState): boolean {
  if (state.step === 1) {
    if (state.source_title.trim().length < 2) {
      showToast('Source title must be at least 2 characters', 'error');
      return false;
    }
    if (state.source_author.trim().length < 2) {
      showToast('Author must be at least 2 characters', 'error');
      return false;
    }
    if (!state.source_date) {
      showToast('Source date is required', 'error');
      return false;
    }
    if (state.locator.trim().length < 1) {
      showToast('Locator is required (page, timestamp, paragraph, etc.)', 'error');
      return false;
    }
    return true;
  }
  if (state.step === 2) {
    if (state.claim_text.trim().length < 5) {
      showToast('Claim must be at least 5 characters', 'error');
      return false;
    }
    return true;
  }
  if (state.step === 3) {
    if (!state.source_type) {
      showToast('Select a source type', 'error');
      return false;
    }
    return true;
  }
  if (state.step === 4) {
    if (!state.category) {
      showToast('Select a category', 'error');
      return false;
    }
    return true;
  }
  return true;
}
