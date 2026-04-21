/**
 * THE MODERATOR — Auth Gate (requireAuth modal)
 *
 * Extracted from auth.core.ts. Dependency direction: auth.gate.ts → auth.core.ts.
 * auth.core.ts does NOT import from this file (no circular dep).
 */

import { getCurrentUser, getIsPlaceholderMode } from './auth.core.ts';
import { escapeHTML } from './config.ts';

/** Falls back to inline escape if config not loaded yet */
function esc(s: string | null | undefined): string {
  return escapeHTML(s);
}

/**
 * Returns true if logged in. If not, shows a sign-up prompt modal and returns false.
 * actionLabel is escaped before innerHTML injection (XSS fix, Session 64).
 */
export function requireAuth(actionLabel?: string): boolean {
  if (getCurrentUser() && !getIsPlaceholderMode()) return true;

  document.getElementById('auth-gate-modal')?.remove();

  const safeLabel = esc(actionLabel ?? 'do that');
  const modal = document.createElement('div');
  modal.id = 'auth-gate-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  modal.innerHTML = `
    <div style="background:var(--mod-bg-card); border:1px solid var(--mod-accent-border);border-radius:12px;padding:28px 24px;max-width:340px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">⚔️</div>
      <div style="font-family:var(--mod-font-display);font-size:20px;font-weight:700;color:var(--mod-accent);margin-bottom:8px;">JOIN THE ARENA</div>
      <div style="font-size:14px;color:var(--mod-text-primary); margin-bottom:20px;">Sign in to ${safeLabel}</div>
      <a href="moderator-plinko.html?returnTo=${returnTo}" style="display:block;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-weight:700;font-size:16px;padding:12px;border-radius:8px;text-decoration:none;margin-bottom:10px;">SIGN UP FREE</a>
      <a href="moderator-login.html?returnTo=${returnTo}" style="display:block;color:var(--mod-accent);font-size:14px;text-decoration:none;">Already have an account? Log in</a>
      <button id="auth-gate-close-btn" style="margin-top:14px;background:none;border:none;color:var(--mod-text-muted); font-size:13px;cursor:pointer;">Maybe later</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('auth-gate-close-btn')?.addEventListener('click', () => {
    document.getElementById('auth-gate-modal')?.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  return false;
}
