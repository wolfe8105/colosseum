/**
 * THE MODERATOR — Profile Depth Render
 * renderGrid, renderQuestion, ringSVG, sectionPct.
 */

import { escapeHTML } from '../config.ts';
import { SECTIONS } from './profile-depth.data.ts';
import { answers, completedSections, activeSection } from './profile-depth.state.ts';
import type { Question, Section, InputQuestion, ChipsQuestion, SliderQuestion, SelectQuestion } from './profile-depth.types.ts';

export function sectionPct(section: Section): number {
  const total = section.questions.length;
  let answered = 0;
  section.questions.forEach(q => {
    const val = answers[q.id];
    if (val !== undefined && val !== '' && val !== null && !(Array.isArray(val) && val.length === 0)) answered++;
  });
  return Math.round((answered / total) * 100);
}

export function ringSVG(pct: number): string {
  const circumference = 2 * Math.PI * 9;
  const offset = circumference - (pct / 100) * circumference;
  return `<svg><circle class="ring-bg" cx="11" cy="11" r="9"/><circle class="ring-fill" cx="11" cy="11" r="9" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/></svg>`;
}

export function renderGrid(onSectionClick: (id: string) => void): void {
  const grid = document.getElementById('section-grid');
  if (!grid) return;

  grid.innerHTML = SECTIONS.map(s => {
    const done = completedSections.has(s.id);
    const pct = sectionPct(s);
    const isActive = activeSection === s.id;
    return `
      <div class="section-tile ${done ? 'complete' : ''} ${isActive ? 'active-section' : ''}" data-section="${escapeHTML(s.id)}">
        ${done ? '<span class="section-check">✅</span>' : `<div class="section-ring">${ringSVG(pct)}</div>`}
        <div class="section-icon">${escapeHTML(s.icon)}</div>
        <div class="section-name">${escapeHTML(s.name)}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.section-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const sectionId = (tile as HTMLElement).dataset.section;
      if (sectionId) onSectionClick(sectionId);
    });
  });
}

export function renderQuestion(q: Question): string {
  const val = answers[q.id];

  if (q.type === 'input') {
    const iq = q as InputQuestion;
    return `
      <div class="question-card">
        <div class="question-label">${escapeHTML(iq.label)}</div>
        <input class="q-input" data-qid="${escapeHTML(iq.id)}" type="text" placeholder="${escapeHTML(iq.placeholder ?? '')}" value="${escapeHTML((val as string) ?? '')}" maxlength="500">
      </div>`;
  }

  if (q.type === 'chips') {
    const cq = q as ChipsQuestion;
    const selected: string[] = cq.multi ? (Array.isArray(val) ? val : []) : (val ? [val as string] : []);
    return `
      <div class="question-card">
        <div class="question-label">${escapeHTML(cq.label)}${cq.max ? ` (max ${cq.max})` : ''}</div>
        <div class="chip-group" data-qid="${escapeHTML(cq.id)}" data-multi="${!!cq.multi}" data-max="${cq.max ?? 99}">
          ${cq.options.map(o => `<div class="chip ${selected.includes(o) ? 'selected' : ''}" data-val="${escapeHTML(o)}">${escapeHTML(o)}</div>`).join('')}
        </div>
      </div>`;
  }

  if (q.type === 'slider') {
    const sq = q as SliderQuestion;
    const current = val !== undefined ? Number(val) : Math.round((sq.min + sq.max) / 2);
    return `
      <div class="question-card">
        <div class="question-label">${escapeHTML(sq.label)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--white-dim);margin-bottom:4px;">
          <span>${escapeHTML(sq.labels[0])}</span><span>${escapeHTML(sq.labels[1])}</span>
        </div>
        <div class="slider-row">
          <input class="q-slider" data-qid="${escapeHTML(sq.id)}" type="range" min="${sq.min}" max="${sq.max}" value="${current}">
          <span class="slider-val" id="slider-val-${escapeHTML(sq.id)}">${current}</span>
        </div>
      </div>`;
  }

  if (q.type === 'select') {
    const selq = q as SelectQuestion;
    return `
      <div class="question-card">
        <div class="question-label">${escapeHTML(selq.label)}</div>
        <select class="q-select" data-qid="${escapeHTML(selq.id)}">
          <option value="" disabled ${!val ? 'selected' : ''}>Choose one...</option>
          ${selq.options.map(o => `<option value="${escapeHTML(o)}" ${val === o ? 'selected' : ''}>${escapeHTML(o)}</option>`).join('')}
        </select>
      </div>`;
  }

  return '';
}
