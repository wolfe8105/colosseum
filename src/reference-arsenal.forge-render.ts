import { escapeHTML, sanitizeUrl } from './config.ts';
import { SOURCE_TYPES, CATEGORIES, CATEGORY_LABELS } from './reference-arsenal.constants.ts';
import type { SourceType, ReferenceCategory } from './reference-arsenal.types.ts';
import type { ForgeFormState } from './reference-arsenal.forge-submit.ts';

// LM-FRG-002: Step state is preserved via the ForgeFormState object passed by reference.
// Each step renderer reads from state (not DOM), so re-renders restore field values correctly.
// The wiring layer updates state on every input event before any re-render is triggered.

export function _buildForgeContent(state: ForgeFormState, isEdit: boolean): string {
  let html = _renderStepIndicator(state.step);
  html += `<div class="forge-body">`;
  html += _renderStep(state, isEdit);
  html += `</div>`;
  html += _renderNav(state.step, isEdit);
  return html;
}

function _renderStepIndicator(currentStep: number): string {
  const stepNames = ['Source Details', 'Your Claim', 'Source Type', 'Choose Arena', 'Review & Forge'];
  let html = `<div class="forge-steps">`;
  for (let i = 1; i <= 5; i++) {
    const cls = i === currentStep ? 'forge-step active' : i < currentStep ? 'forge-step done' : 'forge-step';
    html += `<div class="${cls}"><span class="forge-step-num">${i}</span><span class="forge-step-label">${stepNames[i - 1]}</span></div>`;
  }
  html += `</div>`;
  return html;
}

function _renderStep(state: ForgeFormState, isEdit: boolean): string {
  switch (state.step) {
    case 1: return _renderStep1(state);
    case 2: return _renderStep2(state);
    case 3: return _renderStep3(state, isEdit);
    case 4: return _renderStep4(state);
    case 5: return _renderStep5(state, isEdit);
    default: return '';
  }
}

function _renderStep1(state: ForgeFormState): string {
  const esc = escapeHTML;
  return `
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
}

function _renderStep2(state: ForgeFormState): string {
  const esc = escapeHTML;
  return `
    <h3>Your Claim</h3>
    <p class="forge-hint">What does this source prove? Be specific. 120 characters max.</p>
    <textarea id="forge-claim" maxlength="120" rows="3" placeholder="e.g. Global temperatures rose 1.1\u00B0C since pre-industrial era">${esc(state.claim_text)}</textarea>
    <div class="forge-charcount"><span id="forge-claim-count">${state.claim_text.length}</span>/120</div>
  `;
}

function _renderStep3(state: ForgeFormState, isEdit: boolean): string {
  // LM-ARSENAL-002: source_type is locked at creation — disabled during edit.
  // Removing this guard would allow type changes that violate the DB constraint.
  let html = `
    <h3>Source Type</h3>
    <p class="forge-hint">What kind of source is this? ${isEdit ? '<strong>Locked at creation \u2014 cannot be changed.</strong>' : 'This determines the power ceiling.'}</p>
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
  return html;
}

function _renderStep4(state: ForgeFormState): string {
  let html = `
    <h3>Choose Your Arena</h3>
    <p class="forge-hint">Which debate category does this reference belong to?</p>
    <div class="forge-categories">
  `;
  for (const cat of CATEGORIES) {
    const selected = state.category === cat ? ' selected' : '';
    html += `<button class="forge-cat-btn${selected}" data-cat="${cat}">${CATEGORY_LABELS[cat]}</button>`;
  }
  html += `</div>`;
  return html;
}

function _renderStep5(state: ForgeFormState, isEdit: boolean): string {
  const esc = escapeHTML;
  const srcInfo = state.source_type ? SOURCE_TYPES[state.source_type as SourceType] : null;
  return `
    <h3>Review & Forge</h3>
    <div class="forge-review-card">
      <div class="forge-review-claim">"${esc(state.claim_text)}"</div>
      <div class="forge-review-meta">
        <strong>${esc(state.source_title)}</strong><br/>
        ${esc(state.source_author)} \u00B7 ${esc(state.source_date)}
      </div>
      <div class="forge-review-meta">
        Locator: ${esc(state.locator)}
        ${state.source_url ? `<br/><a href="${sanitizeUrl(state.source_url ?? '')}" target="_blank" rel="noopener">${esc(state.source_url)}</a>` : ''}
      </div>
      <div class="forge-review-type">
        ${srcInfo ? `${srcInfo.label} (${srcInfo.tier}-tier \u00B7 Max Power ${srcInfo.ceiling})` : ''}
      </div>
      <div class="forge-review-cat">${state.category ? CATEGORY_LABELS[state.category as ReferenceCategory] : ''}</div>
    </div>
    ${isEdit ? '<p class="forge-hint">Editing costs 10 tokens.</p>' : '<p class="forge-hint">Forging costs 50 tokens.</p>'}
  `;
}

function _renderNav(step: number, isEdit: boolean): string {
  let html = `<div class="forge-nav">`;
  if (step > 1) {
    html += `<button id="forge-back" class="forge-btn-secondary">Back</button>`;
  } else {
    html += `<button id="forge-cancel" class="forge-btn-secondary">Cancel</button>`;
  }
  if (step < 5) {
    html += `<button id="forge-next" class="forge-btn-primary">Next</button>`;
  } else {
    html += `<button id="forge-submit" class="forge-btn-primary">${isEdit ? '\u270F\uFE0F Save Changes (10t)' : '\u2694 Forge Weapon (50t)'}</button>`;
  }
  html += `</div>`;
  return html;
}
