/**
 * THE MODERATOR — Profile Depth Section
 * openSection, wireQuestions, saveSection, showReward.
 */

import { escapeHTML } from '../config.ts';
import { safeRpc, getCurrentUser, getIsPlaceholderMode } from '../auth.ts';
import { increment_questions_answered, claim_section_reward } from '../contracts/rpc-schemas.ts';
import { checkProfileMilestones } from '../tokens.ts';
import { SECTIONS } from './profile-depth.data.ts';
import { renderQuestion, renderGrid } from './profile-depth.render.ts';
import { renderTierBannerUI, updateMilestoneBar } from './profile-depth.tier.ts';
import {
  answers, completedSections, previouslyAnsweredIds, serverQuestionsAnswered,
  setAnswer, setActiveSection, addCompletedSection, setServerQuestionsAnswered,
  hasAnswer,
} from './profile-depth.state.ts';
import type { Section, SectionReward, AnswerValue } from './profile-depth.types.ts';

export function openSection(sectionId: string, onSectionClick: (id: string) => void): void {
  setActiveSection(sectionId);
  const section = SECTIONS.find(s => s.id === sectionId);
  if (!section) return;

  const panel = document.getElementById('question-panel');
  if (!panel) return;
  panel.classList.add('open');

  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">${escapeHTML(section.icon)} ${escapeHTML(section.name)}</div>
      <div class="panel-reward">⚡ ${escapeHTML(section.reward.text)}</div>
    </div>
    ${section.questions.map(q => renderQuestion(q)).join('')}
    <button class="save-section-btn" id="save-section-btn">SAVE & UNLOCK REWARD</button>
  `;

  wireQuestions();
  document.getElementById('save-section-btn')?.addEventListener('click', () => saveSection(section, onSectionClick));
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderGrid(onSectionClick);
}

export function wireQuestions(): void {
  // Inputs
  document.querySelectorAll<HTMLInputElement>('.q-input').forEach(el => {
    el.addEventListener('input', () => {
      const qid = el.dataset.qid;
      if (qid) setAnswer(qid, el.value);
    });
  });

  // Chips
  document.querySelectorAll<HTMLElement>('.chip-group').forEach(group => {
    const isMulti = group.dataset.multi === 'true';
    const max = parseInt(group.dataset.max ?? '99') || 99;
    group.querySelectorAll<HTMLElement>('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qid = group.dataset.qid;
        const val = chip.dataset.val;
        if (!qid || !val) return;
        if (isMulti) {
          let arr = Array.isArray(answers[qid]) ? [...(answers[qid] as string[])] : [];
          if (arr.includes(val)) {
            arr = arr.filter(v => v !== val);
            chip.classList.remove('selected');
          } else if (arr.length < max) {
            arr.push(val);
            chip.classList.add('selected');
          }
          setAnswer(qid, arr);
        } else {
          group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          setAnswer(qid, val);
        }
      });
    });
  });

  // Sliders
  document.querySelectorAll<HTMLInputElement>('.q-slider').forEach(el => {
    el.addEventListener('input', () => {
      const qid = el.dataset.qid;
      if (!qid) return;
      setAnswer(qid, parseInt(el.value));
      const label = document.getElementById('slider-val-' + qid);
      if (label) label.textContent = el.value;
    });
  });

  // Selects
  document.querySelectorAll<HTMLSelectElement>('.q-select').forEach(el => {
    el.addEventListener('change', () => {
      const qid = el.dataset.qid;
      if (qid) setAnswer(qid, el.value);
    });
  });
}

export async function saveSection(section: Section, onSectionClick: (id: string) => void): Promise<void> {
  let allAnswered = true;
  section.questions.forEach(q => {
    if (!hasAnswer(answers[q.id])) allAnswered = false;
  });

  localStorage.setItem('colosseum_profile_depth', JSON.stringify(answers));

  if (allAnswered) {
    addCompletedSection(section.id);
    localStorage.setItem('colosseum_depth_complete', JSON.stringify([...completedSections]));
    checkProfileMilestones(completedSections.size);
    showReward(section.reward);
  }

  const isPlaceholder = getIsPlaceholderMode();

  if (getCurrentUser() && !isPlaceholder) {
    try {
      const sectionAnswers: Record<string, AnswerValue> = {};
      section.questions.forEach(q => {
        if (answers[q.id] !== undefined) sectionAnswers[q.id] = answers[q.id];
      });

      const { error } = await safeRpc('save_profile_depth', {
        p_section_id: section.id,
        p_answers: sectionAnswers,
      });
      if (error) console.error('save_profile_depth error:', error);

      // Session 117: increment questions_answered for newly answered questions
      let newCount = 0;
      section.questions.forEach(q => {
        if (hasAnswer(answers[q.id]) && !previouslyAnsweredIds.has(q.id)) {
          newCount++;
          previouslyAnsweredIds.add(q.id);
        }
      });

      if (newCount > 0) {
        const incResult = await safeRpc('increment_questions_answered', { p_count: newCount }, increment_questions_answered);
        const incData = incResult as { data?: { ok?: boolean; questions_answered?: number } | null; error?: unknown };
        if (incData.error) {
          console.error('increment_questions_answered error:', incData.error);
        } else if (incData.data?.ok) {
          setServerQuestionsAnswered(incData.data.questions_answered ?? serverQuestionsAnswered);
          renderTierBannerUI(serverQuestionsAnswered);
          updateMilestoneBar();
        }
      }

      // Session 232: claim free power-up reward for completing section
      if (allAnswered) {
        const claimResult = await safeRpc('claim_section_reward', { p_section_id: section.id }, claim_section_reward);
        const claimData = claimResult as { data?: { success?: boolean; power_up_name?: string } | null; error?: unknown };
        if (claimData.data?.success) {
          console.debug('[ProfileDepth] Section reward claimed:', claimData.data.power_up_name);
        }
      }
    } catch (e) {
      console.error('save_profile_depth exception:', e);
    }
  }

  updateMilestoneBar();
  renderGrid(onSectionClick);

  if (allAnswered) {
    // LANDMINE [LM-DEPTH-003]: Anonymous setTimeout — no handle stored, cannot be cancelled
    // if the user opens a different section before this fires.
    setTimeout(() => {
      document.getElementById('question-panel')?.classList.remove('open');
      setActiveSection(null);
      renderGrid(onSectionClick);
    }, 2000);
  }
}

export function showReward(reward: SectionReward): void {
  const puIcons: Record<string, string> = { reveal: '👁️', multiplier_2x: '⚡', silence: '🤫', shield: '🛡️' };
  const iconEl = document.getElementById('reward-icon');
  if (iconEl) iconEl.textContent = puIcons[reward.powerUpId] ?? '⚡';
  const textEl = document.getElementById('reward-text');
  if (textEl) textEl.textContent = 'POWER-UP EARNED';
  const descEl = document.getElementById('reward-desc');
  if (descEl) descEl.textContent = reward.text;

  const toast = document.getElementById('reward-toast');
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}
