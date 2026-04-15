/**
 * Arena CSS — Phase 2 fireworks animation on point_award
 */

export function injectFeedFireworksCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Phase 2: Fireworks on point_award */
    .feed-fireworks { position:relative;overflow:visible; }
    .feed-fireworks::before,
    .feed-fireworks::after { content:'';position:absolute;top:50%;left:50%;width:6px;height:6px;border-radius:50%;animation:feedFirework 0.6s ease-out forwards;pointer-events:none; }
    /* TODO: needs CSS var token — #c29a58 (mod gold), #E7442A (side-a red), #4A90D9 (side-b blue) */
    .feed-fireworks::before { background:#c29a58;box-shadow:12px -18px 0 #E7442A, -14px -12px 0 #4A90D9, 20px 8px 0 #c29a58, -18px 14px 0 #E7442A; }
    .feed-fireworks::after { background:#4A90D9;box-shadow:-10px -20px 0 #c29a58, 16px -10px 0 #E7442A, -20px 6px 0 #4A90D9, 14px 16px 0 #c29a58; }
    @keyframes feedFirework {
      0% { transform:scale(0);opacity:1; }
      50% { transform:scale(1.8);opacity:0.8; }
      100% { transform:scale(2.5);opacity:0; }
    }
  `;
  document.head.appendChild(style);
}
