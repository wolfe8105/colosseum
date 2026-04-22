/**
 * THE MODERATOR — Home Page Controller (orchestrator)
 *
 * Runtime module — entry point for index.html via Vite.
 * Wires auth hooks, URL params, rivals presence, and
 * delegates to sibling modules for feed, overlay, nav, profile, arsenal.
 *
 * Session 201: Replaced LCARS ring nav with card feed.
 */
// --- Side-effect imports (self-wire their listeners at module load) ---
import './home.overlay.ts';
import './home.nav.ts';
import './home.arsenal.ts';
import './home.profile.ts';
import './home.depth.ts';
import '../tokens.ts';
import '../notifications.ts';
import '../leaderboard.ts';
import '../dm/dm.ts';
import '../scoring.ts';
import '../tiers.ts';
import '../paywall.ts';
import '../cards.ts';
import '../analytics.ts';
import { initDripCard } from '../onboarding-drip.ts';
import { initProfileSocials } from '../profile-socials.ts';

// --- Named imports ---
import { ready, getCurrentUser, getIsPlaceholderMode, onChange } from '../auth.ts';
import type { Profile } from '../auth.ts';
import type { User } from '@supabase/supabase-js';
import { init as initRivalsPresence, destroy as destroyRivalsPresence } from '../rivals-presence.ts';
import { showToast } from '../config.ts';
import { renderFeed } from './home.feed.ts';
import { loadBountyDotSet } from '../bounties.ts';
import { initTournaments } from '../tournaments.ts';
import { openCategory, initPullToRefresh } from './home.overlay.ts';
import { navigateTo } from './home.nav.ts';
import { updateUIFromProfile, loadFollowCounts } from './home.profile.ts';
import { CATEGORIES, state } from './home.state.ts';

// LM-HOME-003: Arsenal back button wired here to break nav ↔ arsenal circular dep.
document.getElementById('arsenal-back-btn')?.addEventListener('click', () => {
  if (state.arsenalForgeCleanup) { state.arsenalForgeCleanup(); state.arsenalForgeCleanup = null; }
  navigateTo('profile');
});

// F-59: Invite back button — same pattern as arsenal
document.getElementById('invite-back-btn')?.addEventListener('click', () => {
  navigateTo('profile');
});

// Auth state → UI
onChange(updateUIFromProfile);

// F-25: Rival online alerts — init on login, destroy on logout
onChange((user: User | null, profile: Profile | null) => {
  if (user && profile) {
    void initRivalsPresence();
  } else {
    destroyRivalsPresence();
  }
});

// Pull-to-refresh init
initPullToRefresh();

// Profile social links (F-70)
initProfileSocials();

// ============================================================
// INIT — Members Zone assumes valid session
// ============================================================

/** Show slow-connection overlay with a visible countdown. Returns a cleanup fn. */
function showSlowConnectionOverlay(seconds: number, onResolved: () => void): { dismiss: () => void; waitForZero: () => Promise<void> } {
  const overlay = document.createElement('div');
  overlay.id = 'slow-conn-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'background:rgba(0,0,0,0.82)', 'color:#fff', 'font-family:var(--mod-font-ui,sans-serif)',
    'padding:2rem', 'text-align:center', 'gap:1rem'
  ].join(';');

  const msg = document.createElement('p');
  msg.style.cssText = 'margin:0;font-size:1.1rem;max-width:340px;line-height:1.5';
  msg.textContent = 'Having trouble connecting... will need to sign back in if unable to resolve your connection';

  const countEl = document.createElement('p');
  countEl.style.cssText = 'margin:0;font-size:2.5rem;font-weight:700;font-variant-numeric:tabular-nums';
  countEl.textContent = String(seconds);

  overlay.appendChild(msg);
  overlay.appendChild(countEl);
  document.body.appendChild(overlay);

  let remaining = seconds;
  let resolved = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const dismiss = () => {
    resolved = true;
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    overlay.remove();
    onResolved();
  };

  const waitForZero = () => new Promise<void>(resolve => {
    intervalId = setInterval(() => {
      remaining -= 1;
      countEl.textContent = String(remaining);
      if (remaining <= 0) {
        if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
        if (!resolved) { overlay.remove(); }
        resolve();
      }
    }, 1000);
  });

  return { dismiss, waitForZero };
}

async function appInit() {
  // Phase 1: wait up to 6 seconds for auth
  let authSettled = false;
  try {
    await Promise.race([
      ready.then(() => { authSettled = true; }),
      new Promise<void>(r => setTimeout(r, 6000))
    ]);
  } catch (e) { console.warn('[Home] auth init failed:', e); }

  // Phase 2: if auth still pending after 6s, show slow-connection overlay + 20s countdown
  if (!authSettled && !getCurrentUser() && !getIsPlaceholderMode()) {
    let overlayDismissed = false;
    const { dismiss, waitForZero } = showSlowConnectionOverlay(20, () => { overlayDismissed = true; });

    // Race: auth resolves vs countdown hits zero
    await Promise.race([
      ready.then(() => { authSettled = true; dismiss(); }),
      waitForZero()
    ]);

    if (!authSettled && !overlayDismissed) {
      // Countdown expired with no auth — tell user and redirect to login
      showToast('Unable to connect. Please sign in again.', 'error');
      await new Promise(r => setTimeout(r, 1800));
      window.location.href = 'moderator-login.html';
      return;
    }
  }

  const loading = document.getElementById('loading-screen');
  if (loading) { loading.classList.add('fade-out'); setTimeout(() => loading.remove(), 400); }

  if (!getCurrentUser() && !getIsPlaceholderMode()) {
    window.location.href = 'moderator-login.html';
    return;
  }

  if (getIsPlaceholderMode()) {
    updateUIFromProfile(null, { display_name: 'Debater', username: 'debater', elo_rating: 1200, wins: 0, losses: 0, current_streak: 0, level: 1, debates_completed: 0, token_balance: 50, subscription_tier: 'free', profile_depth_pct: 0 } as any);
  }

  try {
    const urlScreen = new URLSearchParams(window.location.search).get('screen');
    if (urlScreen && document.getElementById('screen-' + urlScreen)) { navigateTo(urlScreen); }
  } catch (e) { console.warn('[Home] screen nav failed:', e); }

  loadFollowCounts().catch(e => console.error('[home]', e));
  renderFeed().catch(e => console.error('renderFeed error:', e));
  loadBountyDotSet().catch(e => console.warn('loadBountyDotSet error:', e));
  initTournaments().catch(e => console.error('[home]', e));

  // F-36: Onboarding drip card (new users, first 14 days)
  const homeEl = document.getElementById('screen-home');
  if (homeEl) initDripCard(homeEl).catch(e => console.error('[home]', e));
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => appInit().catch(e => console.error('appInit error:', e))); }
else { appInit().catch(e => console.error('appInit error:', e)); }

// --- Payment toasts ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('payment') === 'success') { showToast('✅ Payment successful!', 'success'); window.history.replaceState({}, '', window.location.pathname); }
if (urlParams.get('payment') === 'canceled') { showToast('Payment canceled.', 'info'); window.history.replaceState({}, '', window.location.pathname); }

// --- Auto-open category overlay from ?cat= query param ---
const catParam = urlParams.get('cat');
if (catParam) { const matchedCat = CATEGORIES.find(c => c.id === catParam); if (matchedCat) { openCategory(matchedCat); window.history.replaceState({}, '', window.location.pathname); } }
