/**
 * THE MODERATOR — Toast Notification
 *
 * Extracted from config.ts (Session 255).
 * showToast and its module-level state live here.
 */

import type { ToastType } from './config.types';

let _toastTimeout: ReturnType<typeof setTimeout> | null = null;
let _toastKeyframeInjected = false;

export function showToast(msg: string, type: ToastType = 'info'): void {
  // Inject keyframe on first call
  if (!_toastKeyframeInjected) {
    const ks = document.createElement('style');
    ks.textContent = '@keyframes coloToastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(ks);
    _toastKeyframeInjected = true;
  }

  // Remove any existing toast
  const old = document.getElementById('colo-toast');
  if (old) old.remove();
  if (_toastTimeout) { clearTimeout(_toastTimeout); _toastTimeout = null; }

  const colors: Record<ToastType, { bg: string; text: string }> = {
    success: { bg: 'var(--mod-accent)', text: 'var(--mod-bg-base)' },
    error:   { bg: 'var(--mod-magenta)', text: 'var(--mod-text-on-accent)' },
    info:    { bg: 'rgba(26,45,74,0.95)', text: 'var(--mod-text-heading)' },
  };
  const c = colors[type];

  const toast = document.createElement('div');
  toast.id = 'colo-toast';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = [
    'position:fixed',
    'top:80px',
    'left:50%',
    'transform:translateX(-50%)',
    `background:${c.bg}`,
    `color:${c.text}`,
    'padding:12px 24px',
    'border-radius:8px',
    'font-family:var(--mod-font-ui)',
    'font-weight:700',
    'font-size:14px',
    'letter-spacing:0.5px',
    'z-index:99999',
    'max-width:90vw',
    'text-align:center',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
    'border:1px solid var(--mod-border-primary)',
    'animation:coloToastIn 0.25s ease',
  ].join(';');
  toast.textContent = msg;

  document.body.appendChild(toast);

  const duration = type === 'error' ? 4000 : 2500;
  _toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
