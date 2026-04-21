/**
 * THE MODERATOR — Share UI Module (TypeScript)
 *
 * Post-debate share prompt: DOM modal builder.
 * Depends on: share.ts, config.ts
 */

import { FEATURES } from './config.ts';
import { shareResult, inviteFriend } from './share.ts';
import type { ShareResultParams } from './share.ts';

// ============================================================
// INTERNAL STATE
// ============================================================

/** BUG 1 FIX: Store result in module scope instead of serializing into onclick attribute */
let _pendingShareResult: ShareResultParams | null = null;

// ============================================================
// PUBLIC API
// ============================================================

export function showPostDebatePrompt(result: ShareResultParams): void {
  if (!FEATURES.shareLinks) return;
  const existing = document.getElementById('post-debate-share');
  if (existing) existing.remove();

  _pendingShareResult = result || {};

  const won = (result as Record<string, unknown> | undefined)?.['won'];

  const modal = document.createElement('div');
  modal.id = 'post-debate-share';
  modal.style.cssText = `
    position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;
    display:flex;align-items:flex-end;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,var(--mod-bg-card) 0%,var(--mod-bg-base) 100%);
      border-top-left-radius:20px;border-top-right-radius:20px;
      width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
      text-align:center;
    ">
      <div style="font-size:48px;margin-bottom:8px;">${won ? '🏆' : '⚔️'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:${won ? 'var(--mod-accent)' : 'var(--mod-text-heading)'};">
        ${won ? 'YOU WON' : 'GOOD DEBATE'}
      </div>
      <div style="color:var(--mod-text-sub);font-size:14px;margin:8px 0 20px;">
        ${won ? 'Share your win with the world.' : 'Challenge them to a rematch?'}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button id="post-debate-share-btn" style="
          flex:1;padding:14px;background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:10px;
          font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
        ">📤 SHARE</button>
        <button id="post-debate-invite-btn" style="
          flex:1;padding:14px;background:var(--mod-bg-card);color:var(--mod-accent);border:1px solid var(--mod-accent-border);border-radius:10px;
          font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;
        ">📨 INVITE</button>
      </div>
      <button id="post-debate-skip-btn" style="
        width:100%;padding:12px;background:none;color:var(--mod-text-sub);border:none;font-size:13px;cursor:pointer;
      ">Skip</button>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);

  document.getElementById('post-debate-share-btn')?.addEventListener('click', () => {
    if (_pendingShareResult) shareResult(_pendingShareResult);
    modal.remove();
  });

  document.getElementById('post-debate-invite-btn')?.addEventListener('click', () => {
    inviteFriend();
    modal.remove();
  });

  document.getElementById('post-debate-skip-btn')?.addEventListener('click', () => {
    modal.remove();
  });
}
