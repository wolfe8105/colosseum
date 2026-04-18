/**
 * THE MODERATOR — Profile Depth Engine (TypeScript)
 *
 * Extracted from moderator-profile-depth.html inline script.
 * 20 sections, 100 questions, tier system integration, power-up + cosmetic rewards.
 *
 * Migration: Session 128 (Phase 4). Refactored: split into 6 sub-modules.
 */

import { ready, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, safeRpc } from '../auth.ts';
import { FEATURES } from '../config.ts';
import '../tiers.ts';

import { snapshotAnswered, serverQuestionsAnswered, setServerQuestionsAnswered, previouslyAnsweredIds } from './profile-depth.state.ts';
import { renderGrid } from './profile-depth.render.ts';
import { renderTierBannerUI, updateMilestoneBar } from './profile-depth.tier.ts';
import { openSection } from './profile-depth.section.ts';

function onSectionClick(sectionId: string): void {
  openSection(sectionId, onSectionClick);
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!FEATURES.profileDepth) return;
  const isPlaceholder = getIsPlaceholderMode();

  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);
  if (!getCurrentUser() && !isPlaceholder) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  snapshotAnswered();
  renderGrid(onSectionClick);
  updateMilestoneBar();

  const user = getCurrentUser();
  const sb = getSupabaseClient() as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: { questions_answered?: number } | null; error: unknown }> } } } } | null;

  if (user && sb && !isPlaceholder) {
    try {
      const { data: profile, error } = await sb
        .from('profiles')
        .select('questions_answered')
        .eq('id', (user as { id: string }).id)
        .single();

        if (!error && profile) {
          setServerQuestionsAnswered(profile.questions_answered ?? 0);

          if (serverQuestionsAnswered === 0 && previouslyAnsweredIds.size > 0) {
            const syncResult = await safeRpc('increment_questions_answered', { p_count: previouslyAnsweredIds.size });
            const syncData = syncResult as { data?: { ok?: boolean; questions_answered?: number } | null };
            if (syncData.data?.ok) {
              setServerQuestionsAnswered(syncData.data.questions_answered ?? serverQuestionsAnswered);
            }
          }

          renderTierBannerUI(serverQuestionsAnswered);
          updateMilestoneBar();
        }
    } catch (e) {
      console.error('Tier fetch error:', e);
    }
  }
});
