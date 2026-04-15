/**
 * intro-music-css.ts — F-21 Intro Music Picker CSS
 */

let _cssInjected = false;

export function injectIntroMusicCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .im-backdrop { position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6);animation:imFadeIn 0.2s ease; }
    @keyframes imFadeIn { from{opacity:0} to{opacity:1} }
    @keyframes imSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
    .im-sheet { position:fixed;bottom:0;left:0;right:0;z-index:9001;background:var(--mod-bg-card);border-top:1px solid var(--mod-accent-border);border-radius:16px 16px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));max-height:82dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:imSlideUp 0.28s cubic-bezier(0.32,0.72,0,1); }
    .im-handle { width:36px;height:4px;background:var(--mod-border-primary);border-radius:2px;margin:0 auto 16px; }
    .im-title { font-family:var(--mod-font-display);font-size:17px;font-weight:700;color:var(--mod-text-heading);letter-spacing:1px;margin-bottom:4px; }
    .im-subtitle { font-size:12px;color:var(--mod-text-muted);margin-bottom:18px;font-family:var(--mod-font-ui); }
    .im-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px; }
    .im-track-btn { display:flex;align-items:center;gap:10px;padding:11px 12px;background:var(--mod-bg-inset);border:1px solid var(--mod-border-primary);border-radius:10px;cursor:pointer;text-align:left;transition:border-color 0.15s,background 0.15s;position:relative; }
    .im-track-btn:hover { background:var(--mod-accent-muted); }
    .im-track-btn.selected { border-color:var(--mod-accent);background:var(--mod-accent-muted); }
    .im-track-btn.selected::after { content:'✓';position:absolute;top:6px;right:8px;font-size:11px;color:var(--mod-accent);font-weight:700; }
    .im-track-icon { font-size:22px;flex-shrink:0; }
    .im-track-info { overflow:hidden; }
    .im-track-label { font-family:var(--mod-font-ui);font-size:13px;font-weight:700;color:var(--mod-text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .im-track-desc { font-size:10px;color:var(--mod-text-muted);letter-spacing:0.3px;margin-top:1px; }
    .im-preview-btn { font-size:14px;position:absolute;top:50%;right:8px;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:var(--mod-text-muted);display:none; }
    .im-track-btn:hover .im-preview-btn { display:block; }
    .im-preview-btn:hover { color:var(--mod-accent); }
    .im-tier2-section { border-top:1px solid var(--mod-border-primary);padding-top:14px;margin-top:4px; }
    .im-tier2-label { font-family:var(--mod-font-ui);font-size:11px;font-weight:700;letter-spacing:2px;color:var(--mod-accent);margin-bottom:8px; }
    .im-tier2-locked { font-size:13px;color:var(--mod-text-muted);font-family:var(--mod-font-ui);padding:10px 12px;background:var(--mod-bg-inset);border-radius:8px; }
    .im-upload-btn { display:flex;align-items:center;gap:10px;width:100%;padding:12px;background:var(--mod-bg-inset);border:1px dashed var(--mod-accent-border);border-radius:10px;cursor:pointer;font-family:var(--mod-font-ui);font-size:13px;font-weight:600;color:var(--mod-accent);letter-spacing:0.5px;transition:background 0.15s,border-color 0.15s; }
    .im-upload-btn:hover { background:var(--mod-accent-muted);border-color:var(--mod-accent); }
    .im-upload-btn.selected { border-style:solid; }
    .im-upload-desc { font-size:11px;color:var(--mod-text-muted);margin-top:6px;font-family:var(--mod-font-ui); }
    .im-save-btn { display:block;width:100%;margin-top:18px;padding:14px;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-size:16px;font-weight:700;letter-spacing:1.5px;border:none;border-radius:10px;cursor:pointer;transition:opacity 0.15s; }
    .im-save-btn:disabled { opacity:0.4;cursor:default; }
    .im-save-btn:not(:disabled):hover { opacity:0.85; }
  `;
  document.head.appendChild(s);
}
