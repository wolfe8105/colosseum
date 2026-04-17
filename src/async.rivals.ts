/**
 * THE MODERATOR — Async Module: Rivals
 *
 * renderRivals, refreshRivals.
 */

import { state } from './async.state.ts';
import type { RivalEntry } from './async.types.ts';
import { escapeHTML } from './config.ts';
import { getMyRivals } from './auth.ts';

const esc = escapeHTML;

// ============================================================
// WIRING CALLBACK (set by orchestrator)
// ============================================================

type WireFn = (container: HTMLElement) => void;
let _wireRivals: WireFn | undefined;

export function _registerRivalWiring(fn: WireFn): void {
  _wireRivals = fn;
}

// ============================================================
// RIVALS
// ============================================================

export async function renderRivals(container: HTMLElement): Promise<void> {
  if (!container) return;

  if (!state.wiredContainers.has(container)) {
    _wireRivals?.(container);
    state.wiredContainers.add(container);
  }

  const rivals: RivalEntry[] =
    ((await getMyRivals()) as unknown as RivalEntry[]) ?? [];

  if (!rivals.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;color:#6a7a90; /* TODO: needs CSS var token */">
        <div style="font-size:28px;margin-bottom:6px;">⚔️</div>
        <div style="font-size:13px;">No rivals yet. Tap a username to declare one.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="padding:0 0 8px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;color:var(--mod-magenta);">⚔️ HATED RIVALS</div>
    ${rivals.map((r) => {
      const safeName = esc((r.rival_display_name ?? r.rival_username ?? 'Unknown').toUpperCase());
      const safeInitial = esc((r.rival_display_name ?? r.rival_username ?? '?')[0]?.toUpperCase() ?? '');
      const safeRivalId = esc(r.rival_id);
      const safeRivalUsername = esc(r.rival_username ?? '');
      const safeId = esc(r.id);

      return `
        <div style="background:#132240; /* TODO: needs CSS var token */border:1px solid rgba(204,41,54,0.2);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
          <div data-action="profile" data-user-id="${safeRivalId}" data-username="${safeRivalUsername}" style="width:40px;height:40px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-magenta);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--mod-magenta);cursor:pointer;">${safeInitial}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:var(--mod-text-heading);">${safeName}</div>
            <div style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">ELO ${Number(r.rival_elo ?? 1200)} · ${Number(r.rival_wins ?? 0)}W-${Number(r.rival_losses ?? 0)}L</div>
          </div>
          <div style="text-align:right;">
            ${r.status === 'pending'
              ? (r.direction === 'received'
                ? `<button data-action="accept-rival" data-id="${safeId}" style="padding:6px 12px;background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">ACCEPT</button>`
                : '<span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">PENDING</span>')
              : '<span style="font-size:11px;color:var(--mod-magenta);font-weight:700;letter-spacing:1px;">⚔️ ACTIVE</span>'}
          </div>
        </div>`;
    }).join('')}`;
}

export async function refreshRivals(): Promise<void> {
  const container = document.getElementById('rivals-feed');
  if (container) await renderRivals(container);
}
