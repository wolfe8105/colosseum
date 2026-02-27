// ============================================================
// COLOSSEUM PAYMENTS — Stripe Checkout Client (Item 6.2.2.1)
// Token purchases, subscription upgrades, placeholder modals.
// Placeholder mode when Stripe key missing.
// ============================================================

window.ColosseumPayments = (() => {

  let stripe = null;
  let isPlaceholderMode = true;

  function init() {
    if (typeof ColosseumConfig === 'undefined' || ColosseumConfig.placeholderMode.stripe) {
      isPlaceholderMode = true;
      console.warn('ColosseumPayments: Stripe credentials missing, placeholder mode');
      return;
    }

    try {
      stripe = Stripe(ColosseumConfig.STRIPE_PUBLISHABLE_KEY);
      isPlaceholderMode = false;
    } catch (e) {
      console.error('ColosseumPayments: Stripe init failed', e);
      isPlaceholderMode = true;
    }
  }

  // --- Minor check (Item 14.4.3.4) ---
  function _isMinor() {
    return ColosseumAuth?.currentProfile?.is_minor === true;
  }

  // --- Subscribe (Items 14.2.3) ---
  async function subscribe(tier) {
    if (_isMinor()) {
      _showToast('Subscriptions require parental consent for users under 18.', 'error');
      return;
    }

    if (isPlaceholderMode) {
      _showPlaceholderModal('subscription', tier);
      return;
    }

    const priceId = ColosseumConfig.STRIPE_PRICES[`${tier}_monthly`];
    if (!priceId || ColosseumConfig.isPlaceholder(priceId)) {
      _showPlaceholderModal('subscription', tier);
      return;
    }

    try {
      // Check if Edge Function URL is still a placeholder
      if (!ColosseumConfig.STRIPE_FUNCTION_URL || ColosseumConfig.isPlaceholder(ColosseumConfig.STRIPE_FUNCTION_URL)) {
        _showPlaceholderModal('subscription', tier);
        return;
      }

      const userId = ColosseumAuth?.currentUser?.id || 'unknown';
      const res = await fetch(ColosseumConfig.STRIPE_FUNCTION_URL, {
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=canceled`,
        })
      });

      const { sessionId } = await res.json();
      await stripe.redirectToCheckout({ sessionId });
    } catch (e) {
      console.error('ColosseumPayments: subscribe error', e);
      _showToast('Payment error. Try again.', 'error');
    }
  }

  // --- Buy Tokens (Items 14.2.4) ---
  async function buyTokens(packageId) {
    if (_isMinor()) {
      _showToast('Token purchases require parental consent for users under 18.', 'error');
      return;
    }

    if (isPlaceholderMode) {
      _showPlaceholderModal('tokens', packageId);
      return;
    }

    const priceId = ColosseumConfig.STRIPE_PRICES[packageId];
    if (!priceId || ColosseumConfig.isPlaceholder(priceId)) {
      _showPlaceholderModal('tokens', packageId);
      return;
    }

    try {
      // Check if Edge Function URL is still a placeholder
      if (!ColosseumConfig.STRIPE_FUNCTION_URL || ColosseumConfig.isPlaceholder(ColosseumConfig.STRIPE_FUNCTION_URL)) {
        _showPlaceholderModal('tokens', packageId);
        return;
      }

      const userId = ColosseumAuth?.currentUser?.id || 'unknown';
      const res = await fetch(ColosseumConfig.STRIPE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_checkout',
          priceId,
          userId,
          mode: 'payment',
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=canceled`,
        })
      });

      const { sessionId } = await res.json();
      await stripe.redirectToCheckout({ sessionId });
    } catch (e) {
      console.error('ColosseumPayments: buyTokens error', e);
      _showToast('Payment error. Try again.', 'error');
    }
  }

  // --- Placeholder Modal ---
  function _showPlaceholderModal(type, detail) {
    const existing = document.getElementById('payment-placeholder-modal');
    if (existing) existing.remove();

    const tierInfo = ColosseumConfig?.TIERS?.[detail];
    const tokenPkg = ColosseumConfig?.TOKENS?.packages?.find(p => p.id === detail);

    let title, body;
    if (type === 'subscription' && tierInfo) {
      title = `${tierInfo.name.toUpperCase()} — $${tierInfo.price}/mo`;
      body = `Stripe not connected yet. When live, this button will open Stripe Checkout for the ${tierInfo.name} tier.`;
    } else if (type === 'tokens' && tokenPkg) {
      title = `${tokenPkg.amount} TOKENS — $${tokenPkg.price}`;
      body = `Stripe not connected yet. When live, this will purchase ${tokenPkg.amount} tokens via Stripe Checkout.`;
    } else {
      title = 'PAYMENT';
      body = 'Stripe not connected. See colosseum-config.js and DEPLOYMENT-GUIDE.md.';
    }

    const modal = document.createElement('div');
    modal.id = 'payment-placeholder-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:#132240;border:1px solid rgba(212,168,67,0.3);border-radius:12px;max-width:360px;width:100%;padding:24px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#d4a843;margin-bottom:8px;">${title}</div>
        <div style="color:#a0a8b8;font-size:14px;line-height:1.5;margin-bottom:20px;">${body}</div>
        <div style="background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);border-radius:8px;padding:12px;margin-bottom:20px;">
          <div style="color:#cc2936;font-size:12px;font-weight:700;">⚠️ PLACEHOLDER MODE</div>
          <div style="color:#a0a8b8;font-size:11px;margin-top:4px;">Paste your Stripe keys into colosseum-config.js</div>
        </div>
        <button onclick="this.closest('#payment-placeholder-modal').remove()" 
          style="background:#1a2d4a;color:#f0f0f0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 32px;font-weight:700;cursor:pointer;font-size:14px;width:100%;">
          GOT IT
        </button>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  function _showToast(msg, type) {
    const t = document.createElement('div');
    const bg = type === 'error' ? '#e74c3c' : '#2ecc71';
    t.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // --- Auto-init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    subscribe,
    buyTokens,
    get isPlaceholderMode() { return isPlaceholderMode; },
  };

})();
