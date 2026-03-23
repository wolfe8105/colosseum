/**
 * THE MODERATOR — Navigation Registry
 *
 * Decouples screen navigation from home.ts to eliminate window.navigateTo global.
 * home.ts registers the real navigateTo function at init time.
 * All other modules import navigateTo from here — no circular imports.
 *
 * Session 163: H-02 fix
 */

type NavigateFn = (screenId: string) => void;
let _navigate: NavigateFn | null = null;

/** Called once by home.ts to register the real navigateTo implementation. */
export function registerNavigate(fn: NavigateFn): void {
  _navigate = fn;
}

/** Navigate to a screen by ID. No-op if home.ts hasn't registered yet. */
export function navigateTo(screenId: string): void {
  if (_navigate) _navigate(screenId);
}
