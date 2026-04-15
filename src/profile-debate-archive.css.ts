/**
 * THE MODERATOR — Profile Debate Archive CSS
 */

let _cssInjected = false;

export function injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ===== F-53 DEBATE ARCHIVE ===== */
    .dba-section { padding: 0 16px 80px; }
    .dba-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .dba-title { font-family: var(--mod-font-display); font-size: 11px; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; }
    .dba-add-btn { background: var(--mod-accent); color: var(--mod-bg-base); border: none; border-radius: 8px; padding: 6px 12px; font-family: var(--mod-font-display); font-size: 11px; letter-spacing: 2px; cursor: pointer; }
    .dba-add-btn:active { opacity: 0.75; }

    /* Filter bar */
    .dba-filters { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; }
    .dba-chip { padding: 5px 10px; border-radius: 20px; border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-muted); font-size: 11px; letter-spacing: 1px; cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
    .dba-chip.active { background: var(--mod-accent); border-color: var(--mod-accent); color: var(--mod-bg-base); }
    .dba-search { flex: 1; min-width: 100px; background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: 8px; padding: 5px 10px; color: var(--mod-text-body); font-size: 12px; outline: none; }
    .dba-search::placeholder { color: var(--mod-text-muted); }

    /* Table wrapper — horizontal scroll on mobile */
    .dba-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--mod-border-primary); border-radius: 10px; }
    .dba-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dba-table th { padding: 8px 10px; text-align: left; font-family: var(--mod-font-display); font-size: 10px; letter-spacing: 2px; color: var(--mod-text-muted); background: var(--mod-bg-elevated); border-bottom: 1px solid var(--mod-border-primary); white-space: nowrap; }
    .dba-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--mod-text-body); vertical-align: middle; }
    .dba-table tr:last-child td { border-bottom: none; }
    .dba-table tr:hover td { background: rgba(255,255,255,0.02); }
    .dba-row { cursor: pointer; }

    /* W/L badge */
    .dba-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-family: var(--mod-font-display); font-size: 10px; letter-spacing: 1px; }
    .dba-badge.win  { background: rgba(22,199,132,0.15); color: #16c784; /* LANDMINE [LM-DBA-001]: TODO: needs CSS var token */ border: 1px solid rgba(22,199,132,0.3); }
    .dba-badge.loss { background: rgba(204,41,54,0.12);  color: var(--mod-magenta); border: 1px solid rgba(204,41,54,0.25); }
    .dba-badge.draw { background: rgba(255,255,255,0.06); color: var(--mod-text-muted); border: 1px solid var(--mod-border-primary); }

    /* Category chip */
    .dba-cat { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; letter-spacing: 1px; background: var(--mod-bg-elevated); color: var(--mod-text-muted); text-transform: uppercase; }

    /* Score */
    .dba-score { font-family: var(--mod-font-display); color: var(--mod-text-heading); white-space: nowrap; }

    /* Hidden indicator */
    .dba-hidden-badge { font-size: 10px; color: var(--mod-text-muted); margin-left: 4px; opacity: 0.6; }

    /* Name cell */
    .dba-name { max-width: 140px; }
    .dba-name-main { color: var(--mod-text-heading); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dba-name-desc { font-size: 10px; color: var(--mod-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }

    /* Owner action row */
    .dba-actions { display: flex; gap: 6px; }
    .dba-action-btn { background: none; border: 1px solid var(--mod-border-primary); border-radius: 6px; padding: 4px 8px; font-size: 11px; color: var(--mod-text-muted); cursor: pointer; white-space: nowrap; }
    .dba-action-btn:hover { border-color: var(--mod-accent); color: var(--mod-accent); }
    .dba-action-btn.danger:hover { border-color: var(--mod-magenta); color: var(--mod-magenta); }

    /* Empty state */
    .dba-empty { padding: 32px 16px; text-align: center; color: var(--mod-text-muted); font-size: 13px; }
    .dba-empty-icon { font-size: 28px; margin-bottom: 8px; }
    .dba-loading { padding: 24px 16px; text-align: center; color: var(--mod-text-muted); font-size: 12px; letter-spacing: 1px; }

    /* Add picker sheet */
    .dba-picker-overlay { position: fixed; inset: 0; background: var(--mod-bg-overlay); z-index: 9000; display: flex; align-items: flex-end; justify-content: center; }
    .dba-picker-sheet { background: var(--mod-bg-elevated); border-top-left-radius: 20px; border-top-right-radius: 20px; width: 100%; max-width: 480px; max-height: 70vh; display: flex; flex-direction: column; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
    .dba-picker-handle { width: 36px; height: 4px; background: var(--mod-bg-control); border-radius: 2px; margin: 12px auto 16px; flex-shrink: 0; }
    .dba-picker-title { font-family: var(--mod-font-display); font-size: 12px; letter-spacing: 3px; color: var(--mod-text-muted); text-align: center; margin-bottom: 12px; flex-shrink: 0; }
    .dba-picker-list { overflow-y: auto; flex: 1; }
    .dba-picker-row { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
    .dba-picker-row:hover { background: rgba(255,255,255,0.03); }
    .dba-picker-topic { font-size: 13px; color: var(--mod-text-heading); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dba-picker-meta { font-size: 11px; color: var(--mod-text-muted); }
    .dba-picker-empty { padding: 32px 16px; text-align: center; color: var(--mod-text-muted); font-size: 13px; }

    /* Edit sheet */
    .dba-edit-field { margin: 0 16px 12px; }
    .dba-edit-label { font-size: 11px; letter-spacing: 1px; color: var(--mod-text-muted); margin-bottom: 4px; text-transform: uppercase; }
    .dba-edit-input { width: 100%; background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: 8px; padding: 10px 12px; color: var(--mod-text-body); font-size: 13px; outline: none; box-sizing: border-box; }
    .dba-edit-input:focus { border-color: var(--mod-accent); }
    .dba-edit-toggle { display: flex; align-items: center; gap: 10px; margin: 0 16px 16px; }
    .dba-edit-toggle-label { font-size: 13px; color: var(--mod-text-body); flex: 1; }
    .dba-edit-actions { display: flex; gap: 8px; margin: 0 16px 8px; }
    .dba-edit-save { flex: 1; background: var(--mod-accent); color: var(--mod-bg-base); border: none; border-radius: 10px; padding: 12px; font-family: var(--mod-font-display); font-size: 13px; letter-spacing: 2px; cursor: pointer; }
    .dba-edit-cancel { padding: 12px 16px; background: var(--mod-bg-subtle); color: var(--mod-text-muted); border: 1px solid var(--mod-border-primary); border-radius: 10px; font-size: 13px; cursor: pointer; }
  `;
  document.head.appendChild(s);
}
