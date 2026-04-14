/**
 * Arena CSS — pre-debate screen + Session 110 staking results
 */

export function injectPreDebateCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* SESSION 110: Pre-debate screen */
    .arena-pre-debate { display:flex;flex-direction:column;align-items:center;padding:20px 16px;padding-bottom:80px;overflow-y:auto;height:100%; }
    .arena-pre-debate-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:4px;text-align:center; }
    .arena-pre-debate-sub { font-size:13px;color:var(--mod-text-body);text-align:center;margin-bottom:16px; }
    .arena-pre-debate-enter { display:inline-flex;align-items:center;gap:8px;padding:14px 40px;border-radius:var(--mod-radius-pill);border:none;background:var(--mod-bar-accent);background-image:var(--mod-gloss);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:16px; }
    .arena-pre-debate-enter:active { transform:scale(0.96); }

    /* SESSION 110: Staking results in post-debate */
    .arena-staking-result { background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);border-radius:var(--mod-radius-md);padding:14px 20px;margin:12px 0;text-align:center;max-width:300px;width:100%; }
    .arena-staking-result-title { font-family:var(--mod-font-ui);font-size:7px;font-weight:600;letter-spacing:1px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:6px; }
    .arena-staking-result-amount { font-family:var(--mod-font-ui);font-size:24px;font-weight:700;letter-spacing:1px; }
    .arena-staking-result-amount.won { color:var(--mod-status-open); }
    .arena-staking-result-amount.lost { color:var(--mod-accent); }
    .arena-staking-result-amount.none { color:var(--mod-text-muted); }
    .arena-staking-result-detail { font-size:11px;color:var(--mod-text-muted);margin-top:4px; }
  `;
  document.head.appendChild(style);
}
