// arena-room-enter.ts — room entry dispatcher
// Split from arena-room-setup.ts

import { safeRpc } from '../auth.ts';
import { nudge } from '../nudge.ts';
import { set_view } from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import { enterFeedRoom } from './arena-feed-room.ts';
import { renderRoom } from './arena-room-render.ts';

export function enterRoom(debate: CurrentDebate): void {
  set_view('room');
  // F-21: Stop any playing intro music when entering the room
  import('./arena-sounds.ts').then(({ stopIntroMusic }) => stopIntroMusic()).catch(() => {});

  // F-51: Route live mode to the new feed room
  if (debate.mode === 'live') {
    nudge('enter_debate', '\u2696\uFE0F You\'re in. The feed is live.');
    if (!isPlaceholder() && !debate.id.startsWith('placeholder-')) {
      safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch((e: unknown) => {
        console.warn('[Arena] Status update to live failed:', e);
      });
    }
    enterFeedRoom(debate);
    return;
  }

  // F-03: Play entrance sequence, then render the room
  import('./arena-entrance.ts')
    .then(({ playEntranceSequence }) => playEntranceSequence(debate))
    .catch(() => {})
    .finally(() => renderRoom(debate));
}
