// ============================================================
// COLOSSEUM PAYWALL — Contextual Paywall System (Item 6.2.6.3)
// 4 variants: general, shop, social, leaderboard
// gate() helper, dismissible, non-aggressive.
// Items: 14.2.6.1-14.2.6.4
// ============================================================

window.ColosseumPaywall = (() => {

  const VARIANTS = {
    general: {
      title: 'UNLOCK EVERYTHING',
      subtitle: 'Go ad-free, get more tokens, and access premium features.',
      cta: 'SEE PLANS',
      icon: '⚔️',
    },
    shop: {
      title: 'UNLOCK EXCLUSIVE GEAR',
      subtitle: 'Premium cosmetics, rare badges, and legendary effects.',
      cta: 'UPGRADE NOW',
      icon: '🛒',
    },
    social: {
      title: 'CONNECT & COMPETE',
      subtitle: 'Create private rooms, team up, and access advanced stats.',
      cta: 'GO PRO',
      icon: '👥',
    },
    leaderboard: {
      title: 'SEE YOUR FULL STATS',
      subtitle: 'Detailed analytics, Elo history, and performance breakdowns.',
      cta: 'UNLOCK STATS',
      icon: '📊',
    },
  };

  /**
   * gate(feature, tier) — check if user has access
   * Returns true if allowed, false if blocked (and shows paywall)
   */
  function gate(feature, requiredTier = 'contender') {
    const profile = ColosseumAuth?.currentProfile;
    if (!profile) return true; // Don't block if we can't check

    const tierOrder = ['free', 'contender', 'champion', 'creator'];
    const userIdx = tierOrder.indexOf(profile.subscription_tier || 'free');
    const requiredIdx = tierOrder.indexOf(requiredTier);

    if (userIdx >= requiredIdx) return true;

    // Determine which paywall variant to show
    const variantMap = {
      private_rooms: 'social',
      team_create: 'social',
      dms: 'social',
      exclusive_cosmetics: 'shop',
      rare_badges: 'shop',
      legendary_effects: 'shop',
      analytics: 'leaderboard',
      elo_history: 'leaderboard',
      recordings: 'leaderboard',
    };

    const variant = variantMap[feature] || 'general';
    show(variant);
    return false;
  }

  function show(variant = 'general') {
    const existing = document.getElementById('paywall-modal');
    if (existing) existing.remove();

    const v = VARIANTS[variant] || VARIANTS.general;

    const modal = document.createElement('div');
    modal.id = 'paywall-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
      display:flex;align-items:flex-end;justify-content:center;padding:0;
    `;
    // Bottom sheet on mobile
    modal.innerHTML = `
      <div id="paywall-sheet" style="
        background:linear-gradient(180deg,#132240 0%,#0a1628 100%);
        border-top-left-radius:20px;border-top-right-radius:20px;
        width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));
        transform:translateY(100%);transition:transform 0.3s ease;
      ">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 20px;"></div>
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:40px;margin-bottom:8px;">${v.icon}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:#d4a843;">${v.title}</div>
          <div style="color:#a0a8b8;font-size:14px;margin-top:6px;">${v.subtitle}</div>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(212,168,67,0.08);border-radius:8px;">
            <span style="color:#d4a843;">✓</span>
            <span style="color:#f0f0f0;font-size:13px;">Ad-free experience</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(212,168,67,0.08);border-radius:8px;">
            <span style="color:#d4a843;">✓</span>
            <span style="color:#f0f0f0;font-size:13px;">30+ tokens per day</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(212,168,67,0.08);border-radius:8px;">
            <span style="color:#d4a843;">✓</span>
            <span style="color:#f0f0f0;font-size:13px;">Priority matchmaking & more</span>
          </div>
        </div>
        
        <button onclick="navigateTo('shop');document.getElementById('paywall-modal')?.remove();" style="
          width:100%;padding:14px;background:#cc2936;color:#fff;border:none;border-radius:10px;
          font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;cursor:pointer;
          margin-bottom:8px;
        ">${v.cta}</button>
        
        <button onclick="document.getElementById('paywall-modal')?.remove();" style="
          width:100%;padding:12px;background:none;color:#a0a8b8;border:none;
          font-size:13px;cursor:pointer;
        ">Maybe later</button>
      </div>
    `;

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      document.getElementById('paywall-sheet').style.transform = 'translateY(0)';
    });
  }

  function dismiss() {
    const modal = document.getElementById('paywall-modal');
    if (modal) {
      const sheet = document.getElementById('paywall-sheet');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      setTimeout(() => modal.remove(), 300);
    }
  }

  return { gate, show, dismiss, VARIANTS };

})();
