/**
 * THE MODERATOR — Terms Page Controller (TypeScript)
 *
 * Extracted from moderator-terms.html inline script.
 * Tab switching between ToS, Privacy, and Community Guidelines.
 *
 * Migration: Session 128 (Phase 4)
 */

// ============================================================
// TAB SWITCHING
// ============================================================

type LegalTab = 'tos' | 'privacy' | 'community';

const TAB_MAP: Record<LegalTab, number> = { tos: 0, privacy: 1, community: 2 };

function showTab(tab: LegalTab): void {
  document.querySelectorAll('.legal-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.legal-tab').forEach(t => t.classList.remove('active'));

  const page = document.getElementById('page-' + tab);
  if (page) page.classList.add('active');

  const tabs = document.querySelectorAll('.legal-tab');
  const idx = TAB_MAP[tab];
  if (idx !== undefined && tabs[idx]) tabs[idx].classList.add('active');

  window.scrollTo(0, 0);
}

// Handle hash navigation
if (window.location.hash === '#privacy') showTab('privacy');
if (window.location.hash === '#community') showTab('community');

// Event delegation for tab switching
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  if (el.dataset.action === 'show-tab') {
    e.preventDefault();
    showTab(el.dataset.tab as LegalTab);
  }
});
