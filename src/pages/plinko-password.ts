/**
 * plinko-password.ts — Pure password validation utilities (no DOM).
 */

import { clampHibp } from '../contracts/dependency-clamps.ts';

/** Validate password meets Supabase complexity rules. Returns error string or null. */
export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password needs at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password needs at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password needs at least one digit.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password)) return 'Password needs at least one symbol (!@#$%^&* etc).';
  return null;
}

/** Check password against HIBP Pwned Passwords API using k-anonymity. Returns true if leaked. */
export async function checkHIBP(password: string): Promise<boolean> {
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

    clampHibp(response);
    if (!response.ok) return false; // API error — don't block signup

    const text = await response.text();
    return text.split('\n').some(line => line.split(':')[0].trim() === suffix);
  } catch (err) {
    clampHibp(null, err instanceof Error ? err.message : 'unknown error');
    return false; // timeout or network error — don't block signup
  }
}
