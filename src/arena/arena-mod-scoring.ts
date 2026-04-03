import { getCurrentProfile, scoreModerator } from '../auth.ts';
import { escapeHTML, friendlyError } from '../config.ts';
import type { CurrentDebate } from './arena-types.ts';

export function renderModScoring(debate: CurrentDebate, container: HTMLElement): void {
  if (!debate.moderatorId || !debate.moderatorName) return;
  const profile = getCurrentProfile();
  if (!profile) return;

  const isDebater = (profile.id === debate.debater_a || profile.id === debate.debater_b);
  const isMod = (profile.id === debate.moderatorId);
  if (isMod) return; // Can't score yourself

  const section = document.createElement('div');
  section.className = 'mod-score-section';

  if (isDebater) {
    section.innerHTML = `
      <div class="mod-score-title">RATE THE MODERATOR</div>
      <div class="mod-score-card">
        <div class="mod-score-name">\u2696\uFE0F ${escapeHTML(debate.moderatorName)}</div>
        <div class="mod-score-btns">
          <button class="mod-score-btn happy" data-score="25">\uD83D\uDC4D FAIR</button>
          <button class="mod-score-btn unhappy" data-score="0">\uD83D\uDC4E UNFAIR</button>
        </div>
        <div class="mod-scored" id="mod-scored" style="display:none;"></div>
      </div>
    `;
  } else {
    section.innerHTML = `
      <div class="mod-score-title">RATE THE MODERATOR</div>
      <div class="mod-score-card">
        <div class="mod-score-name">\u2696\uFE0F ${escapeHTML(debate.moderatorName)}</div>
        <div class="mod-score-slider-row">
          <input type="range" class="mod-score-slider" id="mod-score-slider" min="1" max="50" value="25">
          <div class="mod-score-val" id="mod-score-val">25</div>
        </div>
        <button class="mod-score-submit" id="mod-score-submit">SUBMIT SCORE</button>
        <div class="mod-scored" id="mod-scored" style="display:none;"></div>
      </div>
    `;
  }

  container.appendChild(section);

  // Wire debater buttons
  section.querySelectorAll('.mod-score-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const score = parseInt((btn as HTMLElement).dataset.score!, 10);
      section.querySelectorAll('.mod-score-btn').forEach((b) => { (b as HTMLButtonElement).disabled = true; (b as HTMLElement).style.opacity = '0.4'; });
      const result = await scoreModerator(debate.id, score);
      const scoredEl = document.getElementById('mod-scored');
      if (result?.error) {
        if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--mod-accent)'; }
      } else {
        if (scoredEl) { scoredEl.textContent = '\u2705 Score submitted'; scoredEl.style.display = 'block'; }
      }
    });
  });

  // Wire spectator slider + submit
  const slider = document.getElementById('mod-score-slider') as HTMLInputElement | null;
  const valEl = document.getElementById('mod-score-val');
  if (slider && valEl) {
    slider.addEventListener('input', () => { valEl.textContent = slider.value; });
  }
  document.getElementById('mod-score-submit')?.addEventListener('click', async () => {
    const score = parseInt(slider?.value || '25', 10);
    const submitBtn = document.getElementById('mod-score-submit') as HTMLButtonElement | null;
    if (submitBtn) { submitBtn.textContent = '\u23F3'; submitBtn.disabled = true; }
    const result = await scoreModerator(debate.id, score);
    const scoredEl = document.getElementById('mod-scored');
    if (result?.error) {
      if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--mod-accent)'; }
      if (submitBtn) { submitBtn.textContent = 'SUBMIT SCORE'; submitBtn.disabled = false; }
    } else {
      if (scoredEl) { scoredEl.textContent = '\u2705 Score submitted'; scoredEl.style.display = 'block'; }
      if (submitBtn) submitBtn.remove();
    }
  });
}
