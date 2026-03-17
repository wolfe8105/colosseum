/**
 * THE COLOSSEUM — Plinko Gate Controller (TypeScript)
 *
 * Extracted from colosseum-plinko.html inline script.
 * Linear 4-step signup: OAuth/Email → Age Gate → Username → Enter.
 *
 * Migration: Session 128 (Phase 4)
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type SignupMethod = 'oauth' | 'email' | null;

// ============================================================
// STATE
// ============================================================

let currentStep = 1;
let signupMethod: SignupMethod = null;
let signupEmail = '';
let signupPassword = '';
let signupDob = '';
let _isMinor = false;

const TOTAL_STEPS = 4;

const isPlaceholder: boolean =
  typeof window.ColosseumConfig !== 'undefined' &&
  !!(window.ColosseumConfig as unknown as Record<string, unknown>).placeholderMode;

if (isPlaceholder) {
  const banner = document.getElementById('placeholder-banner');
  if (banner) banner.style.display = 'block';
}

// ============================================================
// HELPERS
// ============================================================

/** Return destination — SESSION 50 Bug 3 fix, SESSION 64 backslash fix */
function getReturnTo(): string {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('returnTo');
  if (dest && dest.startsWith('/') && !dest.startsWith('//') && !dest.includes('\\')) return dest;
  return 'index.html';
}

function updateProgress(): void {
  const bar = document.getElementById('progress');
  if (bar) bar.style.width = ((currentStep) / TOTAL_STEPS) * 100 + '%';
}

function goToStep(n: number): void {
  document.querySelectorAll('.plinko-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById('step-' + n);
  if (step) step.classList.add('active');
  currentStep = n;
  updateProgress();
}

function showMsg(id: string, text: string, type: 'success' | 'error'): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'form-msg ' + type;
  el.textContent = text;
}

function clearMsg(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'form-msg';
  el.textContent = '';
}

function getAge(month: number, day: number, year: number): number {
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ============================================================
// DOB SELECT POPULATION
// ============================================================

const daySelect = document.getElementById('dob-day') as HTMLSelectElement | null;
if (daySelect) {
  for (let i = 1; i <= 31; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    daySelect.appendChild(opt);
  }
}

const yearSelect = document.getElementById('dob-year') as HTMLSelectElement | null;
if (yearSelect) {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 10; y >= currentYear - 100; y--) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }
}

// ============================================================
// STEP 1: METHOD SELECTION
// ============================================================

function handleOAuth(provider: string): void {
  if (isPlaceholder) {
    showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error');
    return;
  }
  signupMethod = 'oauth';
  const auth = window.ColosseumAuth as unknown as Record<string, unknown>;
  const oauthLogin = auth?.oauthLogin as ((provider: string, redirectTo: string) => void) | undefined;
  if (oauthLogin) oauthLogin(provider, window.location.href);
}

document.getElementById('btn-google')?.addEventListener('click', () => handleOAuth('google'));
document.getElementById('btn-apple')?.addEventListener('click', () => handleOAuth('apple'));

// Email toggle
document.getElementById('email-toggle')?.addEventListener('click', function (this: HTMLElement) {
  const fields = document.getElementById('email-fields');
  if (!fields) return;
  fields.classList.toggle('open');
  this.textContent = fields.classList.contains('open') ? 'Hide email signup ▴' : 'Use email instead ▾';
  if (fields.classList.contains('open')) {
    setTimeout(() => {
      document.getElementById('btn-email-next')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  }
});

// Email continue
document.getElementById('btn-email-next')?.addEventListener('click', () => {
  clearMsg('step1-msg');
  const email = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
  const password = (document.getElementById('signup-password') as HTMLInputElement | null)?.value ?? '';

  if (!email) { showMsg('step1-msg', 'Please enter your email.', 'error'); return; }
  if (!password || password.length < 8) { showMsg('step1-msg', 'Password must be at least 8 characters.', 'error'); return; }

  signupMethod = 'email';
  signupEmail = email;
  signupPassword = password;
  goToStep(2);
});

// ============================================================
// STEP 2: AGE GATE
// ============================================================

document.getElementById('btn-age-next')?.addEventListener('click', () => {
  clearMsg('step2-msg');
  const month = (document.getElementById('dob-month') as HTMLSelectElement | null)?.value ?? '';
  const day = (document.getElementById('dob-day') as HTMLSelectElement | null)?.value ?? '';
  const year = (document.getElementById('dob-year') as HTMLSelectElement | null)?.value ?? '';
  const tos = (document.getElementById('tos-check') as HTMLInputElement | null)?.checked ?? false;

  if (!month || !day || !year) { showMsg('step2-msg', 'Please enter your date of birth.', 'error'); return; }
  if (!tos) { showMsg('step2-msg', 'You must agree to the Terms of Service.', 'error'); return; }

  const age = getAge(parseInt(month), parseInt(day), parseInt(year));
  if (age < 13) {
    showMsg('step2-msg', 'You must be at least 13 years old to use The Colosseum.', 'error');
    return;
  }

  signupDob = `${year}-${String(parseInt(month)).padStart(2, '0')}-${String(parseInt(day)).padStart(2, '0')}`;
  _isMinor = age < 18;
  goToStep(3);
});

// ============================================================
// STEP 3: USERNAME
// ============================================================

document.getElementById('btn-create')?.addEventListener('click', async () => {
  clearMsg('step3-msg');
  const username = (document.getElementById('signup-username') as HTMLInputElement | null)?.value.trim() ?? '';
  const displayName = (document.getElementById('signup-display') as HTMLInputElement | null)?.value.trim() || username;

  if (!username || username.length < 3 || username.length > 20) {
    showMsg('step3-msg', 'Username must be 3-20 characters.', 'error'); return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showMsg('step3-msg', 'Letters, numbers, and underscores only.', 'error'); return;
  }

  if (isPlaceholder) {
    showMsg('step3-msg', 'Demo mode — account created!', 'success');
    setTimeout(() => goToStep(4), 600);
    return;
  }

  const btn = document.getElementById('btn-create') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'CREATING...'; }

  try {
    const auth = window.ColosseumAuth as unknown as Record<string, unknown>;

    if (signupMethod === 'email') {
      const signUp = auth.signUp as ((opts: Record<string, string>) => Promise<{ success: boolean; error?: string }>) | undefined;
      if (!signUp) return;

      const result = await signUp({
        email: signupEmail,
        password: signupPassword,
        username,
        displayName,
        dob: signupDob,
      });

      // SESSION 64: Clear credentials from memory immediately
      signupPassword = '';
      signupEmail = '';

      if (!result.success) {
        showMsg('step3-msg', result.error ?? 'Signup failed.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
        return;
      }

      const welcome = document.getElementById('welcome-text');
      if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '. Check your email to confirm your account.';
      goToStep(4);

    } else if (signupMethod === 'oauth') {
      // OAuth user returned — update their profile with username/dob
      const supabaseClient = auth.supabase as { rpc: (fn: string, args: Record<string, string>) => Promise<unknown> } | undefined;
      if (supabaseClient) {
        try {
          await supabaseClient.rpc('update_profile', {
            p_display_name: displayName,
            p_username: username,
          });
        } catch { /* non-critical */ }
      }

      const welcome = document.getElementById('welcome-text');
      if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '!';
      goToStep(4);
    }
  } catch {
    // SESSION 64: Clear credentials on error path too
    signupPassword = '';
    signupEmail = '';
    showMsg('step3-msg', 'Something went wrong. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
  }
});

// ============================================================
// STEP 4: ENTER
// ============================================================

document.getElementById('btn-enter')?.addEventListener('click', () => {
  window.location.href = getReturnTo();
});

// ============================================================
// OAUTH RETURN + AUTH STATE
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  const auth = window.ColosseumAuth as unknown as Record<string, unknown> | undefined;
  if (!auth) return;

  const supabaseClient = auth.supabase as { auth: { onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => void } } | undefined;

  if (!isPlaceholder && supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event: string, session: { user?: unknown } | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const hash = window.location.hash;

        // Email confirmation return
        if (hash && (hash.includes('type=signup') || hash.includes('type=email'))) {
          const welcome = document.getElementById('welcome-text');
          if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
          // SESSION 64: Clear hash to remove tokens from URL
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          goToStep(4);
          return;
        }

        // OAuth return — complete profile
        signupMethod = 'oauth';
        goToStep(2);
      }
    });
  }

  // Handle hash-based auth callbacks
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    if (type === 'signup' || type === 'email') {
      // SESSION 64: Verify real session before showing confirmation
      const hasRealSession = !!auth.currentUser;
      if (hasRealSession) {
        const welcome = document.getElementById('welcome-text');
        if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
        goToStep(4);
      }
    }
    // SESSION 64: Clear hash immediately — tokens in URL leak via Referer
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // If already logged in, go straight to app
  // SESSION 63: Use readyPromise so INITIAL_SESSION has time to fire.
  const ready = auth.ready as Promise<void> | undefined;
  if (ready) {
    ready.then(() => {
      if ((window.ColosseumAuth as unknown as Record<string, unknown>).currentUser && !isPlaceholder) {
        window.location.href = getReturnTo();
      }
    });
  } else if (auth.currentUser && !isPlaceholder) {
    window.location.href = getReturnTo();
  }
});
