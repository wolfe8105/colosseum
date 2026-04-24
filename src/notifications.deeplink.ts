/**
 * THE MODERATOR — Notification Deep Links
 *
 * Called when a user taps a notification item.
 * Marks it read, closes the panel, then navigates to the right screen.
 *
 * Type → destination:
 *   mod_invite              → Arena → Mod Queue
 *   mod_accepted            → Arena → Lobby (debate detail)
 *   mod_declined            → Arena → Lobby (debate detail)
 *   challenge / challenged  → Arena → Pending Challenges section
 *   debate_start            → Arena → Lobby (debate room)
 *   result                  → Arena (lobby, post-debate history)
 *   follow / follow_online  → (no-op — no profile deep link yet)
 *   everything else         → just mark read, stay put
 */

import type { Notification } from './notifications.types.ts';
import { navigateTo } from './navigation.ts';

export function handleDeepLink(n: Notification): void {
  const debateId = n.data?.debate_id as string | undefined;

  switch (n.type) {
    case 'mod_invite':
      // Go to Arena, then open the Mod Queue where the invite lives
      navigateTo('arena');
      setTimeout(() => {
        import('./arena/arena-mod-queue-browse.ts').then(({ showModQueue }) => {
          showModQueue();
        }).catch(() => {});
      }, 150);
      break;

    case 'mod_accepted':
    case 'mod_declined':
      // Go to Arena lobby — the debate card will be there
      navigateTo('arena');
      if (debateId) {
        // Scroll to / highlight the relevant debate card after navigation settles
        setTimeout(() => {
          const card = document.querySelector(`[data-debate-id="${CSS.escape(debateId)}"]`) as HTMLElement | null;
          card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (card) {
            card.style.transition = 'box-shadow 0.3s';
            card.style.boxShadow = '0 0 0 2px var(--mod-accent)';
            setTimeout(() => { card.style.boxShadow = ''; }, 2000);
          }
        }, 400);
      }
      break;

    case 'challenge':
    case 'challenged':
      // Go to Arena and scroll to pending challenges section
      navigateTo('arena');
      setTimeout(() => {
        const section = document.getElementById('arena-pending-challenges-section');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      break;

    case 'debate_start':
      // Go to Arena — the debate lobby/room handles the rest via its own polling
      navigateTo('arena');
      break;

    case 'result':
      // Go to Arena — results are visible in the lobby post-debate
      navigateTo('arena');
      break;

    case 'follow':
    case 'follow_online':
    case 'follow_debate': {
      // Navigate to the follower's profile if we have their id
      const followerId = n.data?.follower_id as string | undefined;
      if (followerId) {
        import('./auth.profile.ts').then(({ showUserProfile }) => {
          void showUserProfile(followerId);
        }).catch(() => {});
      }
      break;
    }

    default:
      // No deep link for this type — just mark read (done by caller)
      break;
  }
}
