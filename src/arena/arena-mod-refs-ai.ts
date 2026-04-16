import { ruleOnReference } from '../auth.ts';
import { SUPABASE_URL } from '../config.ts';
import type { CurrentDebate } from './arena-types.ts';
import { getUserJwt } from './arena-room-ai-response.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';

// Session 39: Call AI Moderator Edge Function for auto-ruling
export async function requestAIModRuling(
  debate: CurrentDebate,
  referenceId: string,
  url: string,
  description: string,
  supportsSide: string | null
): Promise<void> {
  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-moderator';

    const recentMessages = (debate.messages || []).slice(-6).map((m) =>
      `${m.role === 'user' ? 'Side A' : 'Side B'} (R${m.round}): ${m.text}`
    ).join('\n');

    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
      },
      body: JSON.stringify({
        topic: debate.topic,
        reference: { url, description, supports_side: supportsSide },
        round: debate.round,
        debateContext: recentMessages || null,
      }),
    });

    if (!res.ok) throw new Error('Edge Function error: ' + res.status);

    const data = await res.json() as { ruling?: string; reason?: string };
    const ruling = data?.ruling || 'allowed';
    const reason = data?.reason || 'AI ruling.';

    const result = await ruleOnReference(referenceId, ruling, '\uD83E\uDD16 ' + reason, 'ai');
    if (result?.error) {
      console.warn('[Arena] AI mod ruling RPC failed:', result.error);
    }

    const icon = ruling === 'allowed' ? '\u2705' : '\u274C';
    addSystemMessage(`${icon} AI Moderator: Evidence ${ruling.toUpperCase()} \u2014 ${reason}`);

  } catch (err) {
    console.warn('[Arena] AI Moderator Edge Function failed:', err);
    await ruleOnReference(referenceId, 'allowed', '\uD83E\uDD16 Auto-allowed (AI moderator unavailable)', 'ai');
    addSystemMessage('\u2705 AI Moderator: Evidence AUTO-ALLOWED (moderator unavailable)');
  }
}
