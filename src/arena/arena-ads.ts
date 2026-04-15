/**
 * THE MODERATOR — Structural Ad Slots (F-43)
 *
 * Shared AdSense helpers for the 6 structural slot trigger points.
 * Publisher: ca-pub-1800696416995461
 * Ad unit:   8647716209
 *
 * Two modes:
 *   injectAdSlot(container)       — inline banner appended to container
 *   showAdInterstitial(onDone)    — timed full-screen overlay, calls onDone when dismissed
 *
 * AdSense loads async from index.html. Both helpers are no-op safe if the
 * script hasn't resolved — the slot stays empty and flow continues normally.
 */

const PUB_ID  = 'ca-pub-1800696416995461';
const SLOT_ID = '8647716209';

// ── Module-level interval handle ──────────────────────────────────────────────
let _interstitialTick: ReturnType<typeof setInterval> | null = null;

/** Cancel any running interstitial countdown tick. */
export function destroy(): void {
  if (_interstitialTick) { clearInterval(_interstitialTick); _interstitialTick = null; }
}

function _pushAd(): void {
  try {
    type W = typeof window & { adsbygoogle?: unknown[] };
    (window as W).adsbygoogle = (window as W).adsbygoogle ?? [];
    ((window as W).adsbygoogle as unknown[]).push({});
  } catch { /* AdSense not loaded — slot stays empty, flow continues */ }
}

/**
 * Inject an inline responsive banner ad into `container`.
 * Safe to call multiple times — each call produces one independent slot.
 */
export function injectAdSlot(container: HTMLElement, style?: Partial<CSSStyleDeclaration>): void {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;text-align:center;margin:12px 0;min-height:90px;';
  if (style) Object.assign(wrap.style, style);

  wrap.innerHTML = `
    <ins class="adsbygoogle structural-ad-slot"
         style="display:block;width:100%;min-height:90px;"
         data-ad-client="${PUB_ID}"
         data-ad-slot="${SLOT_ID}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  `;
  container.appendChild(wrap);
  _pushAd();
}

/**
 * Show a full-screen ad interstitial overlay.
 * Displays a countdown + skip button; calls onDone when the user dismisses
 * or the timer expires. Always calls onDone — never blocks flow.
 *
 * @param onDone   callback fired on dismiss/timeout (guaranteed)
 * @param totalSec total duration before auto-dismiss (default 8s)
 * @param skipSec  seconds before skip button appears (default 3s)
 */
export function showAdInterstitial(
  onDone: () => void,
  totalSec = 8,
  skipSec  = 3,
): void {
  const overlay = document.createElement('div');
  overlay.id = 'structural-ad-interstitial';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:99999;',
    'background:rgba(0,0,0,0.92);',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'padding:24px;',
  ].join('');

  overlay.innerHTML = `
    <div style="font-size:11px;letter-spacing:2px;color:#6a7a90; /* TODO: needs CSS var token */ margin-bottom:12px;">ADVERTISEMENT</div>
    <ins class="adsbygoogle structural-ad-slot"
         style="display:block;width:320px;min-height:250px;"
         data-ad-client="${PUB_ID}"
         data-ad-slot="${SLOT_ID}"
         data-ad-format="rectangle"
         data-full-width-responsive="false"></ins>
    <div style="margin-top:16px;display:flex;align-items:center;gap:12px;">
      <span id="sad-countdown" style="font-size:12px;color:#6a7a90; /* TODO: needs CSS var token */">${totalSec}s</span>
      <button id="sad-skip" style="
        display:none;padding:8px 20px;
        background:var(--mod-accent,#d4a843);color:var(--mod-bg-base);
        border:none;border-radius:8px;font-size:13px;font-weight:700;
        cursor:pointer;letter-spacing:1px;
      ">SKIP →</button>
    </div>
  `;

  document.body.appendChild(overlay);
  _pushAd();

  let remaining = totalSec;
  const countEl  = overlay.querySelector<HTMLElement>('#sad-countdown')!;
  const skipBtn  = overlay.querySelector<HTMLElement>('#sad-skip')!;

  function dismiss(): void {
    if (_interstitialTick) { clearInterval(_interstitialTick); _interstitialTick = null; }
    overlay.remove();
    onDone();
  }

  skipBtn.addEventListener('click', dismiss);

  if (_interstitialTick) clearInterval(_interstitialTick);
  _interstitialTick = setInterval(() => {
    remaining -= 1;
    countEl.textContent = `${remaining}s`;
    if (remaining <= totalSec - skipSec) {
      skipBtn.style.display = 'inline-block';
    }
    if (remaining <= 0) {
      clearInterval(_interstitialTick!);
      _interstitialTick = null;
      dismiss();
    }
  }, 1000);
}
