/**
 * THE MODERATOR — Plinko Gate Controller (TypeScript)
 *
 * Extracted from moderator-plinko.html inline script.
 * Linear 4-step signup: OAuth/Email → Age Gate → Username → Enter.
 *
 * Migration: Session 128 (Phase 4)
 * Session 134: OAuth path now calls set_profile_dob RPC (DOB-in-JWT fix)
 */

// ES imports (replaces window globals)
import { oauthLogin, signUp, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, toggleModerator, ready } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { nudge } from '../nudge.ts';

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

const TOTAL_STEPS = 5;

const isPlaceholder: boolean = isAnyPlaceholder;

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
  return 'index.html?screen=arena';
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

  // F-59: On step-5 (YOU'RE IN), fetch & show invite link nudge
  if (n === 5) {
    void injectInviteNudge();
  }
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


// F-59: Fetch the user's stable invite link and inject a share nudge on step-5
async function injectInviteNudge(): Promise<void> {
  const step5 = document.getElementById('step-5');
  if (!step5 || document.getElementById('plinko-invite-nudge')) return;

  let inviteUrl: string | null = null;
  try {
    const { safeRpc } = await import('../auth.ts');
    const result = await safeRpc('get_my_invite_link', {});
    const data = result.data as { url?: string } | null;
    inviteUrl = data?.url ?? null;
  } catch { /* non-blocking */ }

  if (!inviteUrl) return;

  const nudgeEl = document.createElement('div');
  nudgeEl.id = 'plinko-invite-nudge';
  nudgeEl.style.cssText = 'margin-top:20px;padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;text-align:center;';
  nudgeEl.innerHTML = `
    <div style="font-size:22px;margin-bottom:6px;">🎁</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:var(--mod-text-heading);margin-bottom:4px;">BRING YOUR FRIENDS</div>
    <div style="font-size:12px;color:var(--mod-text-muted);margin-bottom:12px;text-transform:none;">Invite 1 friend who debates → earn a Legendary Power-Up. Invite 5 → Mythic Power-Up.</div>
    <button id="plinko-invite-copy" style="width:100%;padding:11px;background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1.5px;color:var(--mod-accent-text);cursor:pointer;">📋 COPY INVITE LINK</button>
  `;
  step5.appendChild(nudgeEl);

  nudgeEl.querySelector('#plinko-invite-copy')?.addEventListener('click', async () => {
    const btn = nudgeEl.querySelector('#plinko-invite-copy') as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(inviteUrl!);
      btn.textContent = '✓ COPIED!';
      setTimeout(() => { btn.textContent = '📋 COPY INVITE LINK'; }, 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteUrl!;
      ta.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      btn.textContent = '✓ COPIED!';
      setTimeout(() => { btn.textContent = '📋 COPY INVITE LINK'; }, 2500);
    }
  });
}

/** Validate password meets Supabase complexity rules. Returns error string or null. */
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password needs at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password needs at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password needs at least one digit.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password)) return 'Password needs at least one symbol (!@#$%^&* etc).';
  return null;
}

/** Check password against HIBP Pwned Passwords API using k-anonymity. Returns true if leaked. */
async function checkHIBP(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return false; // API error — don't block signup

    const text = await response.text();
    return text.split('\n').some(line => line.split(':')[0].trim() === suffix);
  } catch {
    return false; // timeout or network error — don't block signup
  }
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
  oauthLogin(provider, window.location.href);
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
document.getElementById('btn-email-next')?.addEventListener('click', async () => {
  clearMsg('step1-msg');
  const email = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
  const password = (document.getElementById('signup-password') as HTMLInputElement | null)?.value ?? '';

  if (!email) { showMsg('step1-msg', 'Please enter your email.', 'error'); return; }

  // Layer 1: Client-side complexity check (matches Supabase password rules)
  const complexityError = validatePasswordComplexity(password);
  if (complexityError) { showMsg('step1-msg', complexityError, 'error'); return; }

  // Layer 2: HIBP leaked password check (k-anonymity, 3s timeout, non-blocking on failure)
  const btn = document.getElementById('btn-email-next') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'CHECKING...'; }

  const isPwned = await checkHIBP(password);
  if (isPwned) {
    showMsg('step1-msg', 'This password has appeared in a data breach. Please choose a different one.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'CONTINUE'; }
    return;
  }

  if (btn) { btn.disabled = false; btn.textContent = 'CONTINUE'; }

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
    showMsg('step2-msg', 'You must be at least 13 years old to use The Moderator.', 'error');
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
    setTimeout(() => goToStep(5), 600);
    return;
  }

  const btn = document.getElementById('btn-create') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'CREATING...'; }

  try {
    if (signupMethod === 'email') {
      if (!signupEmail || !signupPassword) {
        showMsg('step3-msg', 'Session expired. Please start over.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
        setTimeout(() => goToStep(1), 1500);
        return;
      }

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
        const err = result.error ?? 'Signup failed.';
        // Layer 3: If password-related error slipped past client validation,
        // show clean message and send user back to step 1 where the password field is
        if (err.toLowerCase().includes('password')) {
          showMsg('step1-msg', 'Please choose a stronger password.', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
          goToStep(1);
          return;
        }
        showMsg('step3-msg', err, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
        return;
      }

      // Email signup: check if Supabase returned a session
      // If Confirm email is enabled, session is null — user must confirm first
      if (!result.session) {
        // No session — skip step 4 (mod opt-in RPC would fail without auth)
        // Modify step 5 for email confirmation flow
        const title = document.querySelector('#step-5 .step-title');
        if (title) title.textContent = 'CHECK YOUR EMAIL';

        const welcome = document.getElementById('welcome-text');
        const emailForDisplay = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? 'your email';
        if (welcome) welcome.textContent = 'We sent a confirmation link to ' + emailForDisplay + '. Click the link to activate your account.';

        // Hide ENTER button — user has no session, arena would bounce them
        const enterBtn = document.getElementById('btn-enter');
        if (enterBtn) enterBtn.style.display = 'none';

        // Add resend button if not already present
        if (!document.getElementById('btn-resend-email')) {
          const step5 = document.getElementById('step-5');
          if (step5) {
            const resendBtn = document.createElement('button');
            resendBtn.type = 'button';
            resendBtn.className = 'btn-primary';
            resendBtn.id = 'btn-resend-email';
            resendBtn.style.marginTop = '12px';
            resendBtn.textContent = 'RESEND CONFIRMATION EMAIL';
            resendBtn.addEventListener('click', async () => {
              const resendEmail = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
              if (!resendEmail) return;
              resendBtn.disabled = true;
              resendBtn.textContent = 'SENDING...';
              try {
                const sbClient = getSupabaseClient() as any;
                if (sbClient) {
                  const { error: resendError } = await sbClient.auth.resend({
                    type: 'signup',
                    email: resendEmail,
                  });
                  if (resendError) throw resendError;
                  resendBtn.textContent = 'EMAIL SENT ✓';
                  setTimeout(() => { resendBtn.disabled = false; resendBtn.textContent = 'RESEND CONFIRMATION EMAIL'; }, 30000);
                }
              } catch {
                resendBtn.disabled = false;
                resendBtn.textContent = 'RESEND CONFIRMATION EMAIL';
                const w = document.getElementById('welcome-text');
                if (w) w.textContent = 'Could not resend. Try again in a moment.';
              }
            });
            step5.appendChild(resendBtn);
          }
        }

        goToStep(5);
      } else {
        // Session exists (email confirmation disabled or auto-confirmed) — normal flow
        const welcome = document.getElementById('welcome-text');
        if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '. Check your email to confirm your account.';
        goToStep(4);
      }

    } else if (signupMethod === 'oauth') {
      // OAuth user returned — update their profile with username/dob
      const supabaseClient = getSupabaseClient() as { rpc: (fn: string, args: Record<string, string>) => Promise<unknown> } | null;
      if (supabaseClient) {
        try {
          await supabaseClient.rpc('update_profile', {
            p_display_name: displayName,
            p_username: username,
          });
        } catch { /* non-critical */ }

        // SESSION 134: Write DOB to profiles via RPC (OAuth bypasses signUp metadata)
        if (signupDob) {
          try {
            await supabaseClient.rpc('set_profile_dob', { p_dob: signupDob });
          } catch { /* non-critical — DOB missing is better than blocking signup */ }
        }
      }

      const welcome = document.getElementById('welcome-text');
      if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '!';
      nudge('first_signup', '🎉 Welcome to the arena. Your journey starts now.', 'success');
      // F-36: Day 1 — showed up
      import('../onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(1)).catch(() => {});
      goToStep(4);
    } else {
      showMsg('step3-msg', 'Session expired. Please start over.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
      setTimeout(() => goToStep(1), 1500);
      return;
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
// STEP 4: MODERATOR OPT-IN
// ============================================================

document.getElementById('btn-enable-mod')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-enable-mod') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'ENABLING...'; }
  try {
    await toggleModerator(true);
  } catch { /* non-critical — proceed to step 5 regardless */ }
  goToStep(5);
});

document.getElementById('btn-skip-mod')?.addEventListener('click', () => {
  goToStep(5);
});

// ============================================================
// STEP 5: ENTER
// ============================================================

document.getElementById('btn-enter')?.addEventListener('click', () => {
  window.location.href = getReturnTo();
});

// ============================================================
// OAUTH RETURN + AUTH STATE
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  const supabaseClient = getSupabaseClient() as { auth: { onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => void } } | null;

  if (!isPlaceholder && supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event: string, session: { user?: unknown } | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const hash = window.location.hash;

        // Email confirmation return — skip mod step (step 5 = YOU'RE IN)
        if (hash && (hash.includes('type=signup') || hash.includes('type=email'))) {
          const welcome = document.getElementById('welcome-text');
          if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
          // Restore normal step 5 UI (undo email-confirmation modifications)
          const title = document.querySelector('#step-5 .step-title');
          if (title) title.textContent = "YOU'RE IN";
          const enterBtn = document.getElementById('btn-enter');
          if (enterBtn) enterBtn.style.display = '';
          const resendBtn = document.getElementById('btn-resend-email');
          if (resendBtn) resendBtn.style.display = 'none';
          // SESSION 64: Clear hash to remove tokens from URL
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          goToStep(5);
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
      const hasRealSession = !!getCurrentUser();
      if (hasRealSession) {
        const welcome = document.getElementById('welcome-text');
        if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
        // Restore normal step 5 UI (undo email-confirmation modifications)
        const title = document.querySelector('#step-5 .step-title');
        if (title) title.textContent = "YOU'RE IN";
        const enterBtn = document.getElementById('btn-enter');
        if (enterBtn) enterBtn.style.display = '';
        const resendBtn = document.getElementById('btn-resend-email');
        if (resendBtn) resendBtn.style.display = 'none';
        goToStep(5);
      }
    }
    // SESSION 64: Clear hash immediately — tokens in URL leak via Referer
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // If already logged in, go straight to app
  // SESSION 63: Use readyPromise so INITIAL_SESSION has time to fire.
  ready.then(() => {
    if (getCurrentUser() && !isPlaceholder) {
      window.location.href = getReturnTo();
    }
  });
});
