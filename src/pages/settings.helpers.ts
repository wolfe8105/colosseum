/**
 * THE MODERATOR — Settings Helpers
 * Shared utilities: toast, getEl, getChecked, setChecked, validateTier.
 */

export interface SettingsData {
  display_name: string;
  username: string;
  bio: string;
  email: string;
  subscription_tier?: string;
  preferred_language: string;
  notif_challenge: boolean;
  notif_debate: boolean;
  notif_follow: boolean;
  notif_reactions: boolean;
  notif_rivals: boolean;
  notif_economy: boolean;
  audio_sfx: boolean;
  audio_mute: boolean;
  privacy_public: boolean;
  privacy_online: boolean;
  privacy_challenges: boolean;
}

export const VALID_TIERS = ['free', 'contender', 'champion', 'creator'] as const;
export type ValidTier = typeof VALID_TIERS[number];

export const TIER_LABELS: Record<ValidTier, string> = {
  free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR',
};

export function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

export function getEl<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function getChecked(id: string): boolean {
  return (getEl<HTMLInputElement>(id))?.checked ?? false;
}

export function setChecked(id: string, val: boolean): void {
  const el = getEl<HTMLInputElement>(id);
  if (el) el.checked = val;
}

export function validateTier(raw: string | undefined): ValidTier {
  return VALID_TIERS.includes(raw as ValidTier) ? (raw as ValidTier) : 'free';
}
