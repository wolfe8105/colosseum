/**
 * THE MODERATOR — Reference Arsenal Forge Form
 *
 * Multi-step structured forge form. Entirely self-contained —
 * owns its own local state (ForgeFormState).
 */

import { _buildForgeContent } from './reference-arsenal.forge-render.ts';
import { _wireForgeSheet } from './reference-arsenal.forge-wiring.ts';
import type { ForgeFormState } from './reference-arsenal.forge-submit.ts';
import type { ArsenalReference } from './reference-arsenal.types.ts';

/**
 * Render the structured forge form into a container element.
 * If editRef is provided, pre-fills the form and calls editReference on submit.
 * source_type is disabled during edit (LM-206: locked at creation).
 */
export function showForgeForm(
  container: HTMLElement,
  onComplete: (refId: string) => void,
  onCancel: () => void,
  editRef?: ArsenalReference,
): () => void {
  // LM-ARSENAL-001: `state` is closure-local to this form invocation.
  // It is NOT a module-level state container. Each showForgeForm() call gets
  // its own fresh ForgeFormState. Do not extract to a separate file.
  const isEdit = !!editRef;
  const state: ForgeFormState = {
    step: 1,
    source_title: editRef?.source_title || '',
    source_author: editRef?.source_author || '',
    source_date: editRef?.source_date || '',
    locator: editRef?.locator || '',
    claim_text: editRef?.claim_text || '',
    source_type: editRef?.source_type || '',
    category: editRef?.category || '',
    source_url: editRef?.source_url || '',
  };

  let destroyed = false;

  function render(): void {
    if (destroyed) return;
    container.innerHTML = _buildForgeContent(state, isEdit);
    _wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render);
  }

  render();

  return () => {
    destroyed = true;
    container.innerHTML = '';
  };
}
