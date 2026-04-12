/**
 * THE MODERATOR — Reference Arsenal Forge Form
 *
 * Multi-step structured forge form. Entirely self-contained —
 * owns its own local state (ForgeFormState).
 */

import { escapeHTML, showToast } from './config.ts';
import { forgeReference, editReference } from './reference-arsenal.rpc.ts';
import { SOURCE_TYPES, CATEGORIES, CATEGORY_LABELS } from './reference-arsenal.constants.ts';
import type { ArsenalReference, ForgeParams, SourceType, ReferenceCategory } from './reference-arsenal.types.ts';

interface ForgeFormState {
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
  // LM-ARSENAL-001: `state` here is closure-local to this form invocation.
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

    const esc = escapeHTML;
    let html = '';

    // Step indicator
    const stepNames = [
      'Source Details',
      'Your Claim',
      'Source Type',
      'Choose Arena',
      'Review & Forge',
    ];
    html += `<div class="forge-steps">`;
    for (let i = 1; i <= 5; i++) {
      const cls = i === state.step ? 'forge-step active' : i < state.step ? 'forge-step done' : 'forge-step';
      html += `<div class="${cls}"><span class="forge-step-num">${i}</span><span class="forge-step-label">${stepNames[i - 1]}</span></div>`;
    }
    html += `</div>`;

    html += `<div class="forge-body">`;

    if (state.step === 1) {
      html += `
        <h3>Source Details</h3>
        <p class="forge-hint">Title, author, date, and specific locator (page, timestamp, paragraph).</p>
        <label class="forge-label">Source Title</label>
        <input type="text" id="forge-title" placeholder="e.g. IPCC Climate Report 2023" value="${esc(state.source_title)}" />
        <label class="forge-label">Author / Organization</label>
        <input type="text" id="forge-author" placeholder="e.g. IPCC Working Group I" value="${esc(state.source_author)}" />
        <label class="forge-label">Source Date</label>
        <input type="date" id="forge-date" value="${esc(state.source_date)}" />
        <label class="forge-label">Locator (page, timestamp, paragraph)</label>
        <input type="text" id="forge-locator" placeholder="e.g. p.42, 3:15, Section 2.1" value="${esc(state.locator)}" />
        <label class="forge-label">Source URL (optional)</label>
        <input type="url" id="forge-url" placeholder="https://..." value="${esc(state.source_url)}" />
      `;
    } else if (state.step === 2) {
      html += `
        <h3>Your Claim</h3>
        <p class="forge-hint">What does this source prove? Be specific. 120 characters max.</p>
        <textarea id="forge-claim" maxlength="120" rows="3" placeholder="e.g. Global temperatures rose 1.1\u00B0C since pre-industrial era">${esc(state.claim_text)}</textarea>
        <div class="forge-charcount"><span id="forge-claim-count">${state.claim_text.length}</span>/120</div>
      `;
    } else if (state.step === 3) {
      // LM-ARSENAL-002: source_type is locked at creation — disabled during edit.
      // Removing this guard would allow type changes that violate the DB constraint.
      html += `
        <h3>Source Type</h3>
        <p class="forge-hint">What kind of source is this? ${isEdit ? '<strong>Locked at creation — cannot be changed.</strong>' : 'This determines the power ceiling.'}</p>
        <div class="forge-source-types">
      `;
      for (const [key, info] of Object.entries(SOURCE_TYPES)) {
        const selected = state.source_type === key ? ' selected' : '';
        const disabled = isEdit ? ' disabled' : '';
        html += `<button class="forge-source-btn${selected}${disabled}" data-source="${key}" ${isEdit ? 'disabled' : ''}>
          <span class="source-label">${info.label}</span>
          <span class="source-tier">${info.tier}-tier \u00B7 Ceiling ${info.ceiling}</span>
        </button>`;
      }
      html += `</div>`;
    } else if (state.step === 4) {
      html += `
        <h3>Choose Your Arena</h3>
        <p class="forge-hint">Which debate category does this reference belong to?</p>
        <div class="forge-categories">
      `;
      for (const cat of CATEGORIES) {
        const selected = state.category === cat ? ' selected' : '';
        html += `<button class="forge-cat-btn${selected}" data-cat="${cat}">${CATEGORY_LABELS[cat]}</button>`;
      }
      html += `</div>`;
    } else if (state.step === 5) {
      const srcInfo = state.source_type ? SOURCE_TYPES[state.source_type as SourceType] : null;
      html += `
        <h3>Review & Forge</h3>
        <div class="forge-review-card">
          <div class="forge-review-claim">"${esc(state.claim_text)}"</div>
          <div class="forge-review-meta">
            <strong>${esc(state.source_title)}</strong><br/>
            ${esc(state.source_author)} \u00B7 ${esc(state.source_date)}
          </div>
          <div class="forge-review-meta">
            Locator: ${esc(state.locator)}
            ${state.source_url ? `<br/><a href="${esc(state.source_url)}" target="_blank" rel="noopener">${esc(state.source_url)}</a>` : ''}
          </div>
          <div class="forge-review-type">
            ${srcInfo ? `${srcInfo.label} (${srcInfo.tier}-tier \u00B7 Max Power ${srcInfo.ceiling})` : ''}
          </div>
          <div class="forge-review-cat">${state.category ? CATEGORY_LABELS[state.category as ReferenceCategory] : ''}</div>
        </div>
        ${isEdit ? '<p class="forge-hint">Editing costs 10 tokens.</p>' : '<p class="forge-hint">Forging costs 50 tokens.</p>'}
      `;
    }

    html += `</div>`;

    // Nav buttons
    html += `<div class="forge-nav">`;
    if (state.step > 1) {
      html += `<button id="forge-back" class="forge-btn-secondary">Back</button>`;
    } else {
      html += `<button id="forge-cancel" class="forge-btn-secondary">Cancel</button>`;
    }
    if (state.step < 5) {
      html += `<button id="forge-next" class="forge-btn-primary">Next</button>`;
    } else {
      html += `<button id="forge-submit" class="forge-btn-primary">${isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)'}</button>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    wireStepListeners();
  }

  function wireStepListeners(): void {
    // Step 1: source details
    const titleEl = document.getElementById('forge-title') as HTMLInputElement | null;
    if (titleEl) {
      titleEl.addEventListener('input', () => { state.source_title = titleEl.value; });
    }
    const authorEl = document.getElementById('forge-author') as HTMLInputElement | null;
    if (authorEl) {
      authorEl.addEventListener('input', () => { state.source_author = authorEl.value; });
    }
    const dateEl = document.getElementById('forge-date') as HTMLInputElement | null;
    if (dateEl) {
      dateEl.addEventListener('input', () => { state.source_date = dateEl.value; });
    }
    const locatorEl = document.getElementById('forge-locator') as HTMLInputElement | null;
    if (locatorEl) {
      locatorEl.addEventListener('input', () => { state.locator = locatorEl.value; });
    }
    const urlEl = document.getElementById('forge-url') as HTMLInputElement | null;
    if (urlEl) {
      urlEl.addEventListener('input', () => { state.source_url = urlEl.value; });
    }

    // Step 2: claim
    const claimEl = document.getElementById('forge-claim') as HTMLTextAreaElement | null;
    if (claimEl) {
      claimEl.addEventListener('input', () => {
        state.claim_text = claimEl.value;
        const countEl = document.getElementById('forge-claim-count');
        if (countEl) countEl.textContent = String(state.claim_text.length);
      });
    }

    // Step 3: source type buttons
    if (!isEdit) {
      container.querySelectorAll('.forge-source-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.source_type = (btn as HTMLElement).dataset.source as SourceType;
          render();
        });
      });
    }

    // Step 4: category buttons
    container.querySelectorAll('.forge-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = (btn as HTMLElement).dataset.cat as ReferenceCategory;
        render();
      });
    });

    // Nav
    document.getElementById('forge-back')?.addEventListener('click', () => {
      state.step--;
      render();
    });

    document.getElementById('forge-cancel')?.addEventListener('click', () => {
      onCancel();
    });

    document.getElementById('forge-next')?.addEventListener('click', () => {
      if (validateStep()) {
        state.step++;
        render();
      }
    });

    document.getElementById('forge-submit')?.addEventListener('click', () => {
      submitForge();
    });
  }

  function validateStep(): boolean {
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

  async function submitForge(): Promise<void> {
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
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '\u270F\uFE0F Save Changes (10t)';
          }
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
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '\u2694 Forge Weapon (50t)';
          }
          return;
        }

        showToast('Reference forged! \u2694\uFE0F', 'success');
        onComplete(result.ref_id || '');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEdit ? 'Edit failed' : 'Forge failed';
      showToast(msg, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)';
      }
    }
  }

  render();

  return () => {
    destroyed = true;
    container.innerHTML = '';
  };
}
