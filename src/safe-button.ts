/**
 * THE MODERATOR — safeButton
 *
 * Wraps an async click handler so the button is disabled during execution
 * and ALWAYS re-enabled in a `finally` block — even on unexpected throws.
 *
 * Fixes the "disable-button-no-finally" tech debt pattern (80+ call sites).
 *
 * Usage:
 *   btn.addEventListener('click', safeButton(btn, 'SAVING…', 'SAVE', async () => { … }));
 *   // or with defaults (textContent unchanged):
 *   btn.addEventListener('click', safeButton(btn, async () => { … }));
 */

/** Full signature with loading/reset labels */
export function safeButton(
  btn: HTMLButtonElement | null,
  loadingText: string,
  resetText: string,
  handler: () => Promise<void>,
): () => void;

/** Short signature — no text changes, just disable/enable */
export function safeButton(
  btn: HTMLButtonElement | null,
  handler: () => Promise<void>,
): () => void;

export function safeButton(
  btn: HTMLButtonElement | null,
  loadingTextOrHandler: string | (() => Promise<void>),
  resetTextOrUndef?: string,
  handlerOrUndef?: () => Promise<void>,
): () => void {
  const hasLabels = typeof loadingTextOrHandler === 'string';
  const loadingText = hasLabels ? (loadingTextOrHandler as string) : null;
  const resetText   = hasLabels ? (resetTextOrUndef as string) : null;
  const handler     = hasLabels ? (handlerOrUndef as () => Promise<void>) : (loadingTextOrHandler as () => Promise<void>);

  return () => {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    if (loadingText) btn.textContent = loadingText;

    handler().catch((err: unknown) => {
      console.error('[safeButton] handler error:', err);
    }).finally(() => {
      if (btn) {
        btn.disabled = false;
        if (resetText) btn.textContent = resetText;
      }
    });
  };
}
