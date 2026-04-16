// arena-room-live-poll.ts — text/AI mode flow: opponent polling, submit, round advance, live timer
// startLiveRoundTimer lives here (not in audio) to avoid a poll↔audio circular dep:
// advanceRound calls startLiveRoundTimer, and startLiveRoundTimer calls advanceRound.

import { safeRpc } from '../auth.ts';
import { nudge } from '../nudge.ts';
import {
  currentDebate, opponentPollTimer, opponentPollElapsed, roundTimer, roundTimeLeft,
  set_opponentPollTimer, set_opponentPollElapsed, set_roundTimer, set_roundTimeLeft,
} from './arena-state.ts';
import type { DebateRole } from './arena-types.ts';
import { OPPONENT_POLL_MS, OPPONENT_POLL_TIMEOUT_SEC, ROUND_DURATION } from './arena-constants.ts';
import { isPlaceholder, formatTimer } from './arena-core.utils.ts';
import { handleAIResponse, generateSimulatedResponse } from './arena-room-ai.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { addMessage, addSystemMessage } from './arena-room-live-messages.ts';

export function stopOpponentPoll(): void {
  if (opponentPollTimer) { clearInterval(opponentPollTimer); set_opponentPollTimer(null); }
  set_opponentPollElapsed(0);
}

export function startOpponentPoll(debateId: string, myRole: DebateRole, round: number): void {
  stopOpponentPoll();

  // LANDMINE [LM-LIVE-004]: setInterval runs an async callback. If the RPC hangs longer than
  // OPPONENT_POLL_MS, a second fetch fires before the first resolves. Multiple in-flight
  // get_debate_messages requests; first to resolve wins the advanceRound call.
  set_opponentPollTimer(setInterval(async () => {
    set_opponentPollElapsed(opponentPollElapsed + OPPONENT_POLL_MS / 1000);

    if (opponentPollElapsed >= OPPONENT_POLL_TIMEOUT_SEC) {
      stopOpponentPoll();
      addSystemMessage('Opponent hasn\'t responded. You can continue waiting or leave the debate.');
      const inp = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
      if (inp) inp.disabled = false;
      const rec = document.getElementById('arena-record-btn') as HTMLButtonElement | null;
      if (rec) rec.disabled = false;
      return;
    }

    try {
      const { data, error } = await safeRpc<unknown>('get_debate_messages', { p_debate_id: debateId });
      if (error || !data) return;

      const msgs = (Array.isArray(data) ? data : []) as Array<{ side: string; round: number; content: string; is_ai: boolean }>;
      const oppMsg = msgs.find(m => m.side !== myRole && m.round === round);
      if (!oppMsg) return;

      stopOpponentPoll();
      const oppSide: DebateRole = myRole === 'a' ? 'b' : 'a';
      addMessage(oppSide, oppMsg.content, round, oppMsg.is_ai ?? false);

      // Re-enable input for next round (text or voicememo)
      const inp = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
      if (inp) inp.disabled = false;
      const rec = document.getElementById('arena-record-btn') as HTMLButtonElement | null;
      if (rec) rec.disabled = false;

      advanceRound();
    } catch { /* retry next tick */ }
  }, OPPONENT_POLL_MS));
}

export async function submitTextArgument(): Promise<void> {
  const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  input.style.height = 'auto';
  const charCountEl = document.getElementById('arena-char-count');
  if (charCountEl) charCountEl.textContent = '0';
  const sendBtnEl = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
  if (sendBtnEl) sendBtnEl.disabled = true;

  const debate = currentDebate!;
  const side = debate.role;
  addMessage(side, text, debate.round, false);

  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    // LANDMINE [LM-LIVE-001]: catch block is silent — no console.error, no telemetry. If
    // submit_debate_message fails, opponent's poll times out waiting for a message that was
    // never persisted. Tracked as M-B3 in AUDIT-FINDINGS.md.
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: side,
        p_content: text,
      });
    } catch { /* warned */ }
  }

  if (debate.mode === 'ai') {
    await handleAIResponse(debate, text);
  } else {
    // Human-vs-human: disable input, poll for opponent's message
    input.disabled = true;
    addSystemMessage('Waiting for opponent\'s response...');
    if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
      setTimeout(() => {
        const oppSide: DebateRole = side === 'a' ? 'b' : 'a';
        addMessage(oppSide, generateSimulatedResponse(debate.round), debate.round, false);
        input.disabled = false;
        advanceRound();
      }, 2000 + Math.random() * 3000);
    } else {
      startOpponentPoll(debate.id, side, debate.round);
    }
  }
}

export function advanceRound(): void {
  const debate = currentDebate!;
  if (debate.round >= debate.totalRounds) {
    setTimeout(() => void endCurrentDebate(), 1500);
    return;
  }

  // F-57 round-end cluster: snapshot scores + apply pressure before advancing.
  // Fire-and-forget — non-fatal if it fails. ON CONFLICT DO NOTHING on the
  // server means only the first caller (of potentially two debaters) does work.
  // LANDMINE [LM-LIVE-003]: If close_debate_round fails, the "Pressure" system message is
  // never shown even when the server DID apply pressure. Client-side error path loses
  // telemetry. Tracked in AUDIT-FINDINGS.md.
  const completedRound = debate.round;
  if (!debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && debate.mode !== 'ai') {
    void safeRpc('close_debate_round', {
      p_debate_id: debate.id,
      p_round:     completedRound,
    }).then(({ data }) => {
      if (!data) return;
      const result = data as { pressure_on_a?: boolean; pressure_on_b?: boolean; score_a?: number; score_b?: number };
      const myRole = debate.role;
      const pressureHitMe =
        (myRole === 'a' && result.pressure_on_a) ||
        (myRole === 'b' && result.pressure_on_b);
      if (pressureHitMe) {
        addSystemMessage('\uD83D\uDDD1\uFE0F Pressure \u2014 you scored 0 this round: \u22122 pts');
      }
    }).catch(() => { /* non-fatal */ });
  }

  debate.round++;
  nudge('round_end', '\uD83D\uDD14 Round complete. Stay sharp.');
  addSystemMessage(`Round ${debate.round} of ${debate.totalRounds} \u2014 Your turn.`);

  const roundLabel = document.getElementById('arena-round-label');
  if (roundLabel) roundLabel.textContent = `ROUND ${debate.round}/${debate.totalRounds}`;

  if (debate.mode === 'live') startLiveRoundTimer();
}

export function startLiveRoundTimer(): void {
  set_roundTimeLeft(ROUND_DURATION);
  if (roundTimer) clearInterval(roundTimer);
  const timerEl = document.getElementById('arena-room-timer');

  set_roundTimer(setInterval(() => {
    set_roundTimeLeft(roundTimeLeft - 1);
    if (timerEl) {
      timerEl.textContent = formatTimer(roundTimeLeft);
      timerEl.classList.toggle('warning', roundTimeLeft <= 15);
    }
    if (roundTimeLeft <= 0) {
      if (roundTimer) clearInterval(roundTimer);
      addSystemMessage('\u23F1\uFE0F Time\'s up for this round!');
      advanceRound();
    }
  }, 1000));
}
