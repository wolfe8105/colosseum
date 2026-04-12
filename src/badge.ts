/**
 * THE MODERATOR — Verified Gladiator Badge (F-33)
 *
 * Single source of truth for the 🎖️ badge inline HTML.
 * Import and call vgBadge(verified) wherever a username is rendered.
 * Returns empty string for unverified users — safe to concat unconditionally.
 */

/**
 * Returns inline badge HTML for verified gladiators, empty string otherwise.
 * Designed to sit immediately after a username at any font size down to 12px.
 */
export function vgBadge(verified: boolean | null | undefined): string {
  if (!verified) return '';
  return '<span title="Verified Gladiator" aria-label="Verified Gladiator" style="display:inline-block;margin-left:4px;font-size:0.9em;line-height:1;vertical-align:middle;cursor:default;" class="vg-badge">🎖️</span>';
}
