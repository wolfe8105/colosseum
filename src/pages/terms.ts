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

// Delegated click handler for [data-tab] buttons and links (CSP-safe)
document.addEventListener('click', (e: Event) => {
  const target = (e.target as HTMLElement).closest('[data-tab]') as HTMLElement | null;
  if (!target) return;
  e.preventDefault();
  const tab = target.dataset.tab as LegalTab | undefined;
  if (tab && tab in TAB_MAP) showTab(tab);
});

// Back link (replaces javascript:history.back())
document.getElementById('terms-back-link')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  history.back();
});
