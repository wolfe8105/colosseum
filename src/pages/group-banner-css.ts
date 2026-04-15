/**
 * group-banner-css.ts — F-19 Group Banner CSS
 */

let _cssInjected = false;

export function injectGroupBannerCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ── Banner zone ────────────────────────────────────────── */
    .group-banner-zone { position: relative; width: 100%; height: 80px; overflow: hidden; border-bottom: 1px solid var(--mod-border-primary); flex-shrink: 0; }

    /* Tier 1 — CSS gradient */
    .group-banner-t1 { width: 100%; height: 100%; background: linear-gradient(135deg, rgba(10,10,30,1) 0%, rgba(30,20,60,1) 40%, rgba(10,10,30,1) 100%); display: flex; align-items: center; justify-content: center; gap: 12px; }
    .group-banner-t1-emoji { font-size: 36px; filter: drop-shadow(0 0 8px rgba(212,168,67,0.4)); }
    .group-banner-t1-name { font-family: var(--mod-font-display); font-size: 20px; font-weight: 700; color: var(--mod-text-heading); letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 12px rgba(212,168,67,0.25); }
    .group-banner-t1-stripe { position: absolute; inset: 0; background: repeating-linear-gradient(-45deg, transparent 0px, transparent 18px, rgba(212,168,67,0.04) 18px, rgba(212,168,67,0.04) 20px); pointer-events: none; }

    /* Tier 2 — static image */
    .group-banner-t2 { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }

    /* Tier 3 — animated video */
    .group-banner-t3 { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }

    /* Edit button (leaders only) */
    .group-banner-edit-btn { position: absolute; top: 8px; right: 8px; padding: 5px 10px; background: rgba(0,0,0,0.65); border: 1px solid var(--mod-accent-border); border-radius: 6px; color: var(--mod-accent); font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 1px; cursor: pointer; backdrop-filter: blur(4px); transition: background 0.15s; }
    .group-banner-edit-btn:hover { background: rgba(0,0,0,0.85); }

    /* Tier badge */
    .group-banner-tier-badge { position: absolute; bottom: 6px; left: 8px; padding: 2px 7px; background: rgba(0,0,0,0.6); border: 1px solid var(--mod-accent-border); border-radius: 4px; font-family: var(--mod-font-ui); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: var(--mod-accent); }

    /* ── Upload sheet ────────────────────────────────────────── */
    .gb-backdrop { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.6); }
    .gb-sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9001; background: var(--mod-bg-card); border-top: 1px solid var(--mod-accent-border); border-radius: 16px 16px 0 0; padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px)); max-height: 70dvh; overflow-y: auto; animation: gbSlideUp 0.28s cubic-bezier(0.32,0.72,0,1); }
    @keyframes gbSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .gb-handle { width: 36px; height: 4px; background: var(--mod-border-primary); border-radius: 2px; margin: 0 auto 16px; }
    .gb-title { font-family: var(--mod-font-display); font-size: 17px; font-weight: 700; color: var(--mod-text-heading); letter-spacing: 1px; margin-bottom: 4px; }
    .gb-subtitle { font-size: 12px; color: var(--mod-text-muted); font-family: var(--mod-font-ui); margin-bottom: 20px; }
    .gb-tier-row { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 10px; border: 1px solid var(--mod-border-primary); margin-bottom: 10px; background: var(--mod-bg-inset); }
    .gb-tier-row.unlocked { border-color: var(--mod-accent-border); }
    .gb-tier-row.locked   { opacity: 0.5; }
    .gb-tier-icon { font-size: 24px; flex-shrink: 0; }
    .gb-tier-info { flex: 1; }
    .gb-tier-label { font-family: var(--mod-font-ui); font-size: 13px; font-weight: 700; color: var(--mod-text-heading); }
    .gb-tier-desc { font-size: 11px; color: var(--mod-text-muted); margin-top: 2px; }
    .gb-tier-status { font-size: 10px; letter-spacing: 1px; color: var(--mod-accent); font-weight: 700; }
    .gb-upload-btn { padding: 8px 14px; background: var(--mod-accent-muted); border: 1px solid var(--mod-accent-border); border-radius: 8px; color: var(--mod-accent); font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s; flex-shrink: 0; }
    .gb-upload-btn:hover { background: rgba(212,168,67,0.22); }
    .gb-upload-btn:disabled { opacity: 0.4; cursor: default; }
    .gb-win-rate { padding: 12px 14px; background: var(--mod-bg-inset); border-radius: 8px; margin-bottom: 16px; font-family: var(--mod-font-ui); font-size: 12px; color: var(--mod-text-muted); }
    .gb-win-rate strong { color: var(--mod-accent); }
  `;
  document.head.appendChild(s);
}
