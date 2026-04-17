/**
 * Arena CSS — Phase 3 references feature:
 *   loadout picker, F-60 saved presets, cite/challenge buttons,
 *   reference dropdown, cite/challenge/ruling/powerup feed events,
 *   challenge ruling panel, reference popup
 */

export function injectReferencesPhase3CSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* ========== Phase 3: Reference Loadout Picker ========== */
    .ref-loadout-header { display:flex;justify-content:space-between;align-items:center;padding:8px 0 4px; }
    .ref-loadout-title { font-family:var(--mod-font-ui);font-size:12px;font-weight:700;color:var(--mod-text-secondary);letter-spacing:1px; }
    .ref-loadout-count { font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-bar-accent); }
    .ref-loadout-empty { text-align:center;padding:12px; }
    .ref-loadout-grid { display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto; }
    .ref-loadout-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;cursor:pointer;position:relative;transition:border-color 0.15s,background 0.15s; }
    .ref-loadout-card:active { transform:scale(0.98); }
    .ref-loadout-card.selected { border-color:var(--mod-bar-accent);background:rgba(226,116,42,0.08); }
    .ref-loadout-card.disabled { opacity:0.35;pointer-events:none; }
    .ref-loadout-card-top { display:flex;justify-content:space-between;align-items:center;margin-bottom:4px; }
    .ref-loadout-type { font-family:var(--mod-font-ui);font-size:10px;font-weight:700;color:var(--mod-text-muted);border:1px solid;border-radius:4px;padding:1px 4px; }
    .ref-loadout-power { font-family:var(--mod-font-ui);font-size:10px;color:var(--mod-text-muted); }
    .ref-loadout-claim { font-size:13px;color:var(--mod-text-primary);margin-bottom:2px;line-height:1.3; }
    .ref-loadout-domain { font-size:11px;color:var(--mod-text-muted); }
    .ref-loadout-check { position:absolute;top:6px;right:8px;font-size:14px; }

    /* ========== F-60: Saved Loadout Presets ========== */
    .preset-bar { display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px;flex-wrap:wrap; }
    .preset-bar-empty { justify-content:space-between; }
    .preset-bar-label { font-family:var(--mod-font-ui);font-size:10px;font-weight:700;color:var(--mod-text-muted);letter-spacing:1px;white-space:nowrap; }
    .preset-empty-label { font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted); }
    .preset-chip-row { display:flex;gap:6px;flex:1;overflow-x:auto;scrollbar-width:none; }
    .preset-chip-row::-webkit-scrollbar { display:none; }
    .preset-chip { background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:4px 12px;cursor:pointer;transition:background 0.15s,border-color 0.15s;white-space:nowrap;user-select:none; }
    .preset-chip:active, .preset-chip-active { background:rgba(226,116,42,0.18);border-color:var(--mod-bar-accent); }
    .preset-chip-name { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;color:var(--mod-text-primary); }
    .preset-save-btn { background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:4px 10px;font-family:var(--mod-font-ui);font-size:11px;font-weight:700;color:var(--mod-bar-accent);cursor:pointer;white-space:nowrap;transition:background 0.15s; }
    .preset-save-btn:hover { background:rgba(226,116,42,0.1); }
    .preset-save-btn:disabled { opacity:0.4;pointer-events:none; }

    /* ========== Phase 3: Cite/Challenge Buttons ========== */
    .feed-cite-btn { background:var(--mod-bg-glass);color:var(--mod-text-secondary);border:1px solid rgba(255,255,255,0.12); }
    .feed-cite-btn:not(:disabled):active { background:rgba(74,144,217,0.2); }
    .feed-challenge-btn { background:var(--mod-bg-glass);color:var(--mod-text-secondary);border:1px solid rgba(255,255,255,0.12); }
    .feed-challenge-btn:not(:disabled):active { background:rgba(231,68,42,0.2); }

    /* ========== Phase 3: Reference Dropdown ========== */
    .feed-ref-dropdown { background:var(--mod-bg-card);border:1px solid var(--mod-border-subtle);border-radius:10px;padding:8px;margin-top:6px;max-height:220px;overflow-y:auto; }
    .feed-dropdown-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:700;color:var(--mod-text-muted);letter-spacing:0.5px;margin-bottom:6px; }
    .feed-dropdown-item { padding:8px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);transition:background 0.1s; }
    .feed-dropdown-item:active { background:rgba(255,255,255,0.08); }
    .feed-dropdown-challenge { border-color:rgba(231,68,42,0.2); }
    .feed-dropdown-challenge:active { background:rgba(231,68,42,0.1); }
    .feed-dropdown-claim { display:block;font-size:13px;color:var(--mod-text-primary);margin-bottom:2px; }
    .feed-dropdown-meta { display:block;font-size:11px;color:var(--mod-text-muted); }
    .feed-dropdown-cancel { text-align:center;padding:6px;font-size:12px;color:var(--mod-text-muted);cursor:pointer;margin-top:4px; }

    /* ========== Phase 3: Feed Event — Reference Cite ========== */
    .feed-evt-cite { border-left:3px solid var(--mod-bar-accent);padding-left:10px; }
    .feed-cite-claim { display:block;font-style:italic;color:var(--mod-text-primary);cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px; }
    .feed-cite-domain { display:block;font-size:11px;color:var(--mod-text-muted);margin-top:2px; }

    /* ========== Phase 3: Feed Event — Reference Challenge ========== */
    .feed-evt-challenge { background:rgba(231,68,42,0.08);border:1px solid rgba(231,68,42,0.2);border-radius:6px;padding:8px 10px;text-align:center; }
    .feed-challenge-icon { font-size:18px;display:block;margin-bottom:2px; }
    .feed-challenge-text { font-size:13px;color:var(--mod-text-primary);font-weight:600; }

    /* ========== Phase 3: Feed Event — Mod Ruling ========== */
    .feed-evt-ruling { background:rgba(74,144,217,0.06);border:1px solid rgba(74,144,217,0.15);border-radius:6px;padding:8px 10px;text-align:center; }
    .feed-ruling-icon { font-size:16px;margin-right:4px; }
    .feed-ruling-text { font-size:13px;color:var(--mod-text-primary);font-weight:600; }

    /* ========== Phase 3: Feed Event — Power-up ========== */
    .feed-evt-powerup { background:rgba(194,154,88,0.08);border:1px solid rgba(194,154,88,0.2);border-radius:6px;padding:8px 10px;text-align:center; }
    .feed-powerup-icon { font-size:18px;margin-right:4px; }
    .feed-powerup-text { font-size:13px;color:var(--mod-text-primary);font-weight:600; }

    /* ========== Phase 3: Challenge Ruling Panel (Moderator) ========== */
    .feed-challenge-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:flex-end;justify-content:center; }
    .feed-ruling-panel { background:var(--mod-bg-card);border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:400px; }
    .feed-ruling-title { font-family:var(--mod-font-display);font-size:18px;font-weight:700;color:var(--mod-text-primary);text-align:center;margin-bottom:4px; }
    .feed-ruling-sub { font-size:13px;color:var(--mod-text-muted);text-align:center;margin-bottom:12px; }
    .feed-ruling-reason { width:100%;border:1px solid var(--mod-border-subtle);border-radius:8px;background:var(--mod-bg-glass);color:var(--mod-text-primary);font-family:var(--mod-font-body);font-size:14px;padding:8px;resize:none; }
    .feed-ruling-btns { display:flex;gap:10px;margin-top:10px; }
    .feed-ruling-accept,.feed-ruling-reject { flex:1;padding:12px;border:none;border-radius:8px;font-family:var(--mod-font-ui);font-size:14px;font-weight:700;cursor:pointer; }
    .feed-ruling-accept { background:rgba(93,202,165,0.2);color:var(--mod-status-open); }
    .feed-ruling-reject { background:rgba(231,68,42,0.2);color:var(--mod-side-a); }

    .feed-ref-popup { position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center; }
    .feed-ref-popup-inner { background:var(--mod-bg-card);border:1px solid var(--mod-border-subtle);border-radius:12px;padding:16px;width:90%;max-width:340px;position:relative; }
    .feed-ref-popup-claim { font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-primary);font-style:italic;margin-bottom:10px;line-height:1.4; }
    .feed-ref-popup-meta { display:flex;gap:8px;align-items:center;margin-bottom:10px; }
    .feed-ref-popup-type { font-size:11px;text-transform:uppercase;font-weight:700;color:var(--mod-gold);background:rgba(212,175,55,0.15);padding:2px 8px;border-radius:4px; }
    .feed-ref-popup-domain { font-size:12px;color:var(--mod-text-muted); }
    .feed-ref-popup-link { display:inline-block;font-size:13px;color:var(--mod-gold);text-decoration:none;font-weight:600; }
    .feed-ref-popup-link:hover { text-decoration:underline; }
    .feed-ref-popup-close { position:absolute;top:8px;right:10px;background:none;border:none;color:var(--mod-text-muted);font-size:16px;cursor:pointer;padding:4px; }
  `;
  document.head.appendChild(style);
}
