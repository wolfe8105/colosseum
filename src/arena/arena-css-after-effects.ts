/**
 * Arena CSS — F-57 Phase 3 After Effects breakdown rows
 */

export function injectAfterEffectsCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* F-57 Phase 3: After Effects breakdown */
    .arena-after-effects { width:100%;max-width:380px;margin:0 auto 20px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:14px 16px; }
    .arena-after-effects__title { font-family:var(--mod-font-ui);font-size:9px;font-weight:600;letter-spacing:2px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:10px;text-align:center; }
    .ae-row { display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-size:12px;padding:6px 0;border-top:1px solid var(--mod-border-subtle); }
    .ae-row:first-of-type { border-top:none; }
    .ae-label { font-family:var(--mod-font-ui);font-size:10px;letter-spacing:1px;color:var(--mod-text-muted);text-transform:uppercase;min-width:60px; }
    .ae-raw { font-family:var(--mod-font-ui);font-size:13px;font-weight:600;color:var(--mod-text-body); }
    .ae-arrow { color:var(--mod-text-muted);font-size:11px;padding:0 2px; }
    .ae-step { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:0.5px;padding:2px 6px;border-radius:var(--mod-radius-sm); }
    .ae-step--positive { color:var(--mod-status-open);background:rgba(0,255,170,0.08); }
    .ae-step--negative { color:var(--mod-accent);background:rgba(255,0,128,0.08); }
    .ae-final { font-family:var(--mod-font-ui);font-size:15px;font-weight:700;color:var(--mod-text-heading); }
    .ae-inv-section { border-top:1px solid var(--mod-border-subtle);margin-top:8px;padding-top:8px; }
    .ae-inv-header { font-family:var(--mod-font-ui);font-size:9px;font-weight:600;letter-spacing:2px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:6px; }
    .ae-inv-row { display:flex;align-items:baseline;gap:8px;padding:4px 0;font-size:12px; }
    .ae-inv-label { font-family:var(--mod-font-ui);font-size:11px;font-weight:700;color:var(--mod-accent-secondary);white-space:nowrap; }
    .ae-inv-detail { font-family:var(--mod-font-ui);font-size:11px;color:var(--mod-text-body);line-height:1.4; }
  `;
  document.head.appendChild(style);
}
