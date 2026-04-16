// arena-room-ai-response.ts — In-debate AI sparring: response generation
// Split from arena-room-ai.ts

// LANDMINE [LM-ROOMAI-001]: AI_TOPICS imported in original arena-room-ai.ts but never used anywhere in the file — dead import carried in from original.

import { safeRpc, getSupabaseClient } from '../auth.ts';
import { SUPABASE_URL, FEATURES } from '../config.ts';
import { currentDebate } from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { AI_RESPONSES } from './arena-constants.ts';
import { isPlaceholder, randomFrom } from './arena-core.utils.ts';
import { addMessage } from './arena-room-live-messages.ts';
import { advanceRound } from './arena-room-live-poll.ts';

export async function handleAIResponse(debate: CurrentDebate, userText: string): Promise<void> {
  if (!FEATURES.aiSparring) return;
  // Show typing indicator
  const messages = document.getElementById('arena-messages');
  const typing = document.createElement('div');
  typing.className = 'arena-typing';
  typing.id = 'arena-ai-typing';
  typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  messages?.appendChild(typing);
  messages?.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

  // Disable input while AI is "thinking"
  const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  const aiText = await generateAIDebateResponse(debate.topic, userText, debate.round, debate.totalRounds);

  // Remove typing indicator
  document.getElementById('arena-ai-typing')?.remove();

  addMessage('b', aiText, debate.round, true);

  if (!isPlaceholder() && !debate.id.startsWith('ai-local-')) {
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: 'b',
        p_content: aiText,
        p_is_ai: true,
      });
    } catch { /* warned */ }
  }

  // Re-enable input
  if (input) input.disabled = false;

  advanceRound();
}

// Session 208: Get user JWT for Edge Function auth (audit #32)
export async function getUserJwt(): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function generateAIDebateResponse(
  topic: string,
  _userArg: string,
  round: number,
  totalRounds: number
): Promise<string> {
  if (!FEATURES.aiSparring) return '';
  const messageHistory = (currentDebate?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.text,
  }));

  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';
    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
      },
      body: JSON.stringify({ topic, userArg: _userArg, round, totalRounds, messageHistory }),
    });

    if (!res.ok) throw new Error('Edge Function error: ' + res.status);
    const data = await res.json() as { response?: string };
    if (data?.response) return data.response;
    throw new Error('Empty response');
  } catch {
    await new Promise<void>((r) => setTimeout(r, 1200 + Math.random() * 1800));
    const templates = round === 1 ? AI_RESPONSES.opening! : round >= totalRounds ? AI_RESPONSES.closing! : AI_RESPONSES.rebuttal!;
    const opener = randomFrom(templates);
    const fillers = [
      'When we look at "' + topic + '" from a practical standpoint, the nuances become clearer.',
      'The research on this topic suggests a more complex picture than most people acknowledge.',
      'History shows us that similar arguments have played out before, and the results speak for themselves.',
      'If we follow your logic to its conclusion, we end up in some uncomfortable territory.',
      'The strongest version of your argument still has a fundamental flaw at its core.',
    ];
    return opener + ' ' + randomFrom(fillers);
  }
}

export function generateSimulatedResponse(_round: number): string {
  const responses = [
    "I see your point, but I think you're overlooking a key factor here. The data actually suggests the opposite conclusion when you control for external variables.",
    "That's a common argument, but it falls apart under scrutiny. Consider what happens when we apply that logic consistently across all cases.",
    "While I respect that position, I've seen compelling evidence that points in a different direction entirely. Let me lay it out.",
    "You raise an interesting point, but I think the premise itself is flawed. Here's why that framing doesn't hold up.",
  ];
  return randomFrom(responses);
}
