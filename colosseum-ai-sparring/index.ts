// colosseum-ai-sparring/index.ts
// Supabase Edge Function — AI Sparring opponent powered by Groq
// Deploy: supabase functions deploy ai-sparring
// Env var required: GROQ_API_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-70b-versatile';
const MAX_TOKENS = 200; // Keep responses punchy, not essays

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
// Populist debater: talks like a real person, hot takes energy, real-world examples
function buildSystemPrompt(topic: string, totalRounds: number): string {
  return `You are a debate opponent on The Colosseum — a live debate app where real people argue about everything.

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

// ── HANDLER ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { topic, userArg, round, totalRounds, messageHistory } = body;

    // Validate required fields
    if (!topic || !userArg || !round || !totalRounds) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userArg, round, totalRounds' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation messages for Groq
    // messageHistory: [{ role: 'user'|'assistant', content: string }]
    const conversationMessages = [];

    // Inject full conversation history so AI has full context
    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      for (const msg of messageHistory) {
        if (msg.role && msg.content && typeof msg.content === 'string') {
          // Skip voice memo placeholder messages
          if (msg.content.startsWith('🎤 Voice memo')) continue;
          conversationMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }
    }

    // Always append the current user argument as the final message
    // (it may already be in history — deduplicate by checking last entry)
    const lastMsg = conversationMessages[conversationMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userArg) {
      conversationMessages.push({ role: 'user', content: userArg });
    }

    // Add round context as a system injection if we're in middle/final rounds
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

    // Call Groq
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + groqKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.85,      // Hot takes energy — a little unpredictable
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
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqRes.json();
    const response = groqData?.choices?.[0]?.message?.content?.trim();

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Groq' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ai-sparring] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
