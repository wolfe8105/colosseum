// ============================================================
// THE COLOSSEUM — AI SPARRING Edge Function
// Session 40: A08 hardened — removed deno.land import, CORS allowlist
//
// CHANGES FROM SESSION 25:
// 1. Deno.serve replaces import from deno.land/std (CWE-829)
//    Supabase docs: "Do NOT use deno.land/std serve. Use Deno.serve"
// 2. CORS wildcard → allowlist (A05 fix)
// 3. Zero external imports — only built-in Deno APIs + fetch
//
// Deploy: supabase functions deploy ai-sparring
// Env var required: GROQ_API_KEY
// ============================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 200;

const ALLOWED_ORIGINS = [
  'https://colosseum-six.vercel.app',
  'https://thecolosseum.app',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function buildSystemPrompt(topic: string, totalRounds: number): string {
  return `You are a debate opponent on The Moderator — a live debate app where real people argue about everything.

YOUR PERSONALITY:
- You talk like a regular person, not a professor or a lawyer
- You have HOT TAKES. You're confident, a little provocative, and you back it up with real-world examples people actually know
- You use casual language — contractions, rhetorical questions, occasional emphasis
- You're not a pushover. You push back hard but you're not a jerk about it
- You cite real things: news stories, sports moments, movies, common experiences, stuff people actually lived through
- You keep it SHORT. 2-4 sentences max. This is a debate, not a TED talk

THE DEBATE TOPIC: "${topic}"
TOTAL ROUNDS: ${totalRounds}

YOUR RULES:
- You are ALWAYS arguing the OPPOSITE side of whatever the user just said
- Never agree with the user's main point — find the angle to push back from
- Never start your response with "I" — vary your openers
- Never use debate jargon ("furthermore", "in conclusion", "ergo", "thus")
- Never be preachy or lecture them
- Round 1: stake your position boldly, use a real-world example to anchor it
- Middle rounds: find the actual weakness in what they just said, attack it specifically
- Final round: land your knockout — one memorable line that sticks
- Keep responses under 60 words

Respond ONLY with your debate argument. No labels, no preamble, no "AI:" prefix.`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic, userArg, round, totalRounds, messageHistory } = body;

    if (!topic || !userArg || !round || !totalRounds) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userArg, round, totalRounds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationMessages: Array<{role: string, content: string}> = [];

    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      for (const msg of messageHistory) {
        if (msg.role && msg.content && typeof msg.content === 'string') {
          if (msg.content.startsWith('🎤 Voice memo')) continue;
          conversationMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }
    }

    const lastMsg = conversationMessages[conversationMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userArg) {
      conversationMessages.push({ role: 'user', content: userArg });
    }

    let roundHint = '';
    if (round === totalRounds) {
      roundHint = ' [FINAL ROUND — deliver your knockout closing argument]';
    } else if (round > 1) {
      roundHint = ` [Round ${round} of ${totalRounds} — respond directly to their last point]`;
    }

    if (roundHint && conversationMessages.length > 0) {
      const lastUserMsg = conversationMessages[conversationMessages.length - 1];
      conversationMessages[conversationMessages.length - 1] = {
        ...lastUserMsg,
        content: lastUserMsg.content + roundHint,
      };
    }

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + groqKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.85,
        top_p: 0.9,
        messages: [
          { role: 'system', content: buildSystemPrompt(topic, totalRounds) },
          ...conversationMessages,
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[ai-sparring] Groq API error:', groqRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Groq API error', status: groqRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqRes.json();
    const response = groqData?.choices?.[0]?.message?.content?.trim();

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Groq' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ai-sparring] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
