/**
 * THE MODERATOR — Profile Social Links (F-70)
 * Display and edit social media links on own profile.
 */

import { escapeHTML } from './config.ts';
import { getCurrentProfile, updateProfile, onChange } from './auth.ts';
import type { Profile } from './auth.types.ts';

const PLATFORMS = [
  { key: 'social_twitter',   icon: '𝕏',  url: (u: string) => `https://x.com/${u}` },
  { key: 'social_instagram', icon: '📷', url: (u: string) => `https://instagram.com/${u}` },
  { key: 'social_tiktok',    icon: '🎵', url: (u: string) => `https://tiktok.com/@${u}` },
  { key: 'social_youtube',   icon: '▶️', url: (u: string) => `https://youtube.com/@${u}` },
  { key: 'social_snapchat',  icon: '👻', url: (u: string) => `https://snapchat.com/add/${u}` },
  { key: 'social_bluesky',   icon: '🦋', url: (u: string) => `https://bsky.app/profile/${u.includes('.') ? u : u + '.bsky.social'}` },
] as const;

type SocialKey = typeof PLATFORMS[number]['key'];

function getVal(profile: Profile, key: SocialKey): string {
  return (profile[key] as string) ?? '';
}

/** Render the social icon row for own profile */
function renderSocialDisplay(profile: Profile): void {
  const container = document.getElementById('profile-socials');
  const editBtn = document.getElementById('profile-socials-edit-btn');
  if (!container || !editBtn) return;

  const links = PLATFORMS.filter(p => getVal(profile, p.key).trim());

  if (links.length === 0) {
    container.style.display = 'none';
    // Show edit button so user can add socials
    editBtn.style.display = 'inline-block';
    editBtn.textContent = 'ADD SOCIALS';
    return;
  }

  const html = links.map(p => {
    const handle = escapeHTML(getVal(profile, p.key));
    const href = p.url(getVal(profile, p.key));
    return `<a href="${href}" target="_blank" rel="noopener" style="font-size:20px;text-decoration:none;opacity:0.8;transition:opacity 0.2s;" title="@${handle}">${p.icon}</a>`;
  }).join('');

  container.innerHTML = `<div style="display:flex;gap:14px;justify-content:center;align-items:center;">${html}</div>`;
  container.style.display = 'block';
  editBtn.style.display = 'inline-block';
  editBtn.textContent = 'EDIT SOCIALS';
}

/** Populate the edit inputs from profile */
function populateEditForm(profile: Profile): void {
  const ids: [SocialKey, string][] = [
    ['social_twitter', 'social-twitter'],
    ['social_instagram', 'social-instagram'],
    ['social_tiktok', 'social-tiktok'],
    ['social_youtube', 'social-youtube'],
    ['social_snapchat', 'social-snapchat'],
    ['social_bluesky', 'social-bluesky'],
  ];
  for (const [key, id] of ids) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.value = getVal(profile, key);
  }
}

/** Wire up edit/save/cancel */
export function initProfileSocials(): void {
  const editBtn = document.getElementById('profile-socials-edit-btn');
  const editPanel = document.getElementById('profile-socials-edit');
  const saveBtn = document.getElementById('socials-save-btn');
  const cancelBtn = document.getElementById('socials-cancel-btn');

  if (!editBtn || !editPanel || !saveBtn || !cancelBtn) return;

  editBtn.addEventListener('click', () => {
    const profile = getCurrentProfile();
    if (!profile) return;
    populateEditForm(profile);
    editPanel.style.display = 'block';
    editBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    editPanel.style.display = 'none';
    editBtn.style.display = 'inline-block';
  });

  saveBtn.addEventListener('click', async () => {
    const btn = saveBtn as HTMLButtonElement;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const getValue = (id: string): string | null => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      const val = input?.value?.trim().replace(/^@/, '') ?? '';
      return val || null;
    };

    try {
      await updateProfile({
        social_twitter: getValue('social-twitter'),
        social_instagram: getValue('social-instagram'),
        social_tiktok: getValue('social-tiktok'),
        social_youtube: getValue('social-youtube'),
        social_snapchat: getValue('social-snapchat'),
        social_bluesky: getValue('social-bluesky'),
      });

      editPanel.style.display = 'none';
      editBtn.style.display = 'inline-block';

      // Re-render with updated profile
      const profile = getCurrentProfile();
      if (profile) renderSocialDisplay(profile);
    } catch (err) {
      console.error('[Socials] save failed:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'SAVE';
    }
  });

  // Render on auth change
  onChange((_user, profile) => {
    if (profile) renderSocialDisplay(profile);
  });
}
