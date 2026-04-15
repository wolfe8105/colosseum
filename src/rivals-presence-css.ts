/**
 * THE MODERATOR — Rivals Presence CSS (F-25)
 *
 * Injects #rival-alert-popup styles and keyframe animations.
 * Leaf module — no imports from rivals-presence family.
 */

export function injectRivalsPresenceCSS(): void {
  if (document.getElementById('rival-presence-css')) return;
  const style = document.createElement('style');
  style.id = 'rival-presence-css';
  style.textContent = `
    @keyframes rivalSlideIn {
      0%   { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.9); }
      20%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1.03); }
      30%  { transform:translateX(-50%) translateY(0) scale(1); }
      100% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes rivalSlideOut {
      0%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      100% { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.9); }
    }
    #rival-alert-popup {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99998;
      background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #1a0a0a 100%); /* TODO: needs CSS var token */
      border: 2px solid var(--mod-magenta);
      border-radius: 14px;
      padding: 18px 20px;
      min-width: 280px;
      max-width: 340px;
      box-shadow: 0 0 30px rgba(204,41,54,0.4), 0 8px 32px rgba(0,0,0,0.6);
      animation: rivalSlideIn 0.4s ease-out forwards;
      font-family: var(--mod-font-ui);
    }
    #rival-alert-popup.dismissing {
      animation: rivalSlideOut 0.3s ease-in forwards;
    }
    #rival-alert-popup .rap-icon {
      font-size: 28px;
      text-align: center;
      margin-bottom: 6px;
    }
    #rival-alert-popup .rap-title {
      font-family: var(--mod-font-display);
      font-size: 13px;
      letter-spacing: 2px;
      color: var(--mod-magenta);
      text-align: center;
      margin-bottom: 4px;
    }
    #rival-alert-popup .rap-name {
      font-family: var(--mod-font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--mod-text-heading);
      text-align: center;
      margin-bottom: 4px;
    }
    #rival-alert-popup .rap-sub {
      font-size: 13px;
      color: var(--mod-text-sub);
      text-align: center;
      margin-bottom: 14px;
    }
    #rival-alert-popup .rap-actions {
      display: flex;
      gap: 8px;
    }
    #rival-alert-popup .rap-challenge {
      flex: 1;
      padding: 10px;
      background: var(--mod-magenta);
      color: var(--mod-text-on-accent);
      border: none;
      border-radius: 8px;
      font-family: var(--mod-font-display);
      font-size: 13px;
      letter-spacing: 1px;
      font-weight: 700;
      cursor: pointer;
    }
    #rival-alert-popup .rap-dismiss {
      flex: 1;
      padding: 10px;
      background: var(--mod-bg-subtle);
      color: var(--mod-text-sub);
      border: 1px solid var(--mod-border-primary);
      border-radius: 8px;
      font-family: var(--mod-font-ui);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}
