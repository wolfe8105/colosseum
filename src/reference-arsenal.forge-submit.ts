import { showToast } from './config.ts';
import { forgeReference, editReference } from './reference-arsenal.rpc.ts';
import type { ArsenalReference, SourceType, ReferenceCategory } from './reference-arsenal.types.ts';

export interface ForgeFormState {
  step: number;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType | '';
  category: ReferenceCategory | '';
  source_url: string;
}

// LM-FRG-001: try/finally ensures the submit button is always re-enabled on failure
// paths (collision, error). The isConnected guard skips re-enable when onComplete
// has already closed the form and detached the button from the DOM.
export async function _submitForge(
  state: ForgeFormState,
  isEdit: boolean,
  editRef: ArsenalReference | undefined,
  onComplete: (refId: string) => void,
): Promise<void> {
  const submitBtn = document.getElementById('forge-submit') as HTMLButtonElement | null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Saving...' : 'Forging...';
  }

  try {
    if (isEdit && editRef) {
      const result = await editReference(editRef.id, {
        source_title: state.source_title,
        source_author: state.source_author,
        source_date: state.source_date,
        locator: state.locator,
        claim_text: state.claim_text,
        category: state.category as ReferenceCategory,
      });

      if (result.action === 'collision') {
        showToast(`Collision: this source+locator already exists as "${result.existing_name}". Use the existing one instead.`, 'error');
        return;
      }

      showToast('Reference updated! \u270F\uFE0F', 'success');
      onComplete(editRef.id);
    } else {
      const result = await forgeReference({
        source_title: state.source_title,
        source_author: state.source_author,
        source_date: state.source_date,
        locator: state.locator,
        claim_text: state.claim_text,
        source_type: state.source_type as SourceType,
        category: state.category as ReferenceCategory,
        source_url: state.source_url || undefined,
      });

      if (result.action === 'collision') {
        showToast(`This source+locator already exists as "${result.existing_name}". Use it instead of forging a duplicate.`, 'error');
        return;
      }

      showToast('Reference forged! \u2694\uFE0F', 'success');
      onComplete(result.ref_id || '');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : isEdit ? 'Edit failed' : 'Forge failed';
    showToast(msg, 'error');
  } finally {
    // Re-enable only if the button is still in the DOM (form not yet closed by onComplete).
    if (submitBtn && submitBtn.disabled && submitBtn.isConnected) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)';
    }
  }
}
