// ============================================================
// THE MODERATOR — AI SPARRING Edge Function
// Session 40: A08 hardened — removed deno.land import, CORS allowlist
//
// CHANGES FROM SESSION 25:
// 1. Deno.serve replaces import from deno.land/std (CWE-829)
//    Supabase docs: "Do NOT use deno.land/std serve. Use Deno.serve"
// 2. CORS wildcard → allowlist (A05 fix)
// 3. Zero external imports — only built-in Deno APIs + fetch
//
// Deploy: supabase functions deploy ai-sparring
// Env var required: ANTHROPIC_API_KEY
// Session 208: Auth validation — rejects anonymous callers (audit #32)
// Session 208: Swapped Groq → Claude API
// Session 220: AI-BUG-1 fix — added mode: 'score' branch for AI scorecard
// ============================================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 200;
const SCORE_MAX_TOKENS = 800;

const ALLOWED_ORIGINS = [
  'https://colosseum-six.vercel.app',
  'https://thecolosseum.app',
  'https://themoderator.app',
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

function buildScoringPrompt(topic: string): string {
  return `You are the official AI Judge for The Moderator, a live debate platform. You have just watched a complete debate and must score both sides.

DEBATE TOPIC: "${topic}"

Score each side on 4 criteria, each from 1 to 10:
- LOGIC: How sound is their reasoning? Are there logical fallacies, contradictions, or leaps?
- EVIDENCE: Did they cite real examples, data, or experiences? Or just opinions and assertions?
- DELIVERY: Was the argument clear, punchy, and persuasive? Or rambling and unfocused?
- REBUTTAL: Did they directly address and counter the opponent's points? Or talk past them?

The conversation uses "user" for Side A and "assistant" for Side B.

You MUST respond with ONLY valid JSON, no markdown, no backticks, no preamble. Use this exact structure:
{
  "side_a": {
    "logic": { "score": <1-10>, "reason": "<one sentence>" },
    "evidence": { "score": <1-10>, "reason": "<one sentence>" },
    "delivery": { "score": <1-10>, "reason": "<one sentence>" },
    "rebuttal": { "score": <1-10>, "reason": "<one sentence>" }
  },
  "side_b": {
    "logic": { "score": <1-10>, "reason": "<one sentence>" },
    "evidence": { "score": <1-10>, "reason": "<one sentence>" },
    "delivery": { "score": <1-10>, "reason": "<one sentence>" },
    "rebuttal": { "score": <1-10>, "reason": "<one sentence>" }
  },
  "overall_winner": "a" or "b" or "draw",
  "verdict": "<one punchy sentence explaining who won and why>"
}

Be a tough judge. Don't give 8+ unless they earned it. Most scores should be 4-7. Differentiate — if one side was clearly better on a criterion, the scores should reflect that gap.`;
}

// ── Scoring validation helpers ──

interface CriterionScore {
  score: number;
  reason: string;
}

interface SideScores {
  logic: CriterionScore;
  evidence: CriterionScore;
  delivery: CriterionScore;
  rebuttal: CriterionScore;
}

interface AIScoreResult {
  side_a: SideScores;
  side_b: SideScores;
  overall_winner: string;
  verdict: string;
}

function defaultCriterion(): CriterionScore {
  return { score: 5, reason: 'No detailed assessment available.' };
}

function validateCriterion(c: unknown): CriterionScore {
  if (c && typeof c === 'object' && 'score' in c && 'reason' in c) {
    const obj = c as Record<string, unknown>;
    const score = typeof obj.score === 'number' ? Math.max(1, Math.min(10, Math.round(obj.score))) : 5;
    const reason = typeof obj.reason === 'string' && obj.reason.length > 0 ? obj.reason.substring(0, 200) : 'No detailed assessment available.';
    return { score, reason };
  }
  return defaultCriterion();
}

function validateSide(s: unknown): SideScores {
  if (s && typeof s === 'object') {
    const obj = s as Record<string, unknown>;
    return {
      logic: validateCriterion(obj.logic),
      evidence: validateCriterion(obj.evidence),
      delivery: validateCriterion(obj.delivery),
      rebuttal: validateCriterion(obj.rebuttal),
    };
  }
  return {
    logic: defaultCriterion(),
    evidence: defaultCriterion(),
    delivery: defaultCriterion(),
    rebuttal: defaultCriterion(),
  };
}

function validateScoreResult(parsed: unknown): AIScoreResult {
  if (!parsed || typeof parsed !== 'object') throw new Error('Not an object');
  const obj = parsed as Record<string, unknown>;
  return {
    side_a: validateSide(obj.side_a),
    side_b: validateSide(obj.side_b),
    overall_winner: (typeof obj.overall_winner === 'string' && ['a', 'b', 'draw'].includes(obj.overall_winner)) ? obj.overall_winner : 'draw',
    verdict: typeof obj.verdict === 'string' && obj.verdict.length > 0 ? obj.verdict.substring(0, 300) : 'The judge has spoken.',
  };
}

// ── Scoring handler (Session 220: AI-BUG-1) ──

async function handleScoring(
  body: Record<string, unknown>,
  apiKey: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const topic = body.topic as string;
  const messageHistory = body.messageHistory as Array<{ role: string; content: string }>;

  if (!topic) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: topic' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build conversation from messageHistory for scoring context
  const conversationMessages: Array<{ role: string; content: string }> = [];
  if (Array.isArray(messageHistory) && messageHistory.length > 0) {
    for (const msg of messageHistory) {
      if (msg.role && msg.content && typeof msg.content === 'string') {
        if (msg.content.startsWith('\u{1F3A4} Voice memo')) continue;
        conversationMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
  }

  if (conversationMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No messages to score' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Ensure conversation starts with 'user' (Claude API requirement)
  if (conversationMessages[0].role !== 'user') {
    conversationMessages.unshift({
      role: 'user',
      content: '[Side A did not submit an opening argument]',
    });
  }

  // Ensure alternating roles (Claude API requirement)
  const cleaned: Array<{ role: string; content: string }> = [];
  for (const msg of conversationMessages) {
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === msg.role) {
      cleaned[cleaned.length - 1].content += '\n\n' + msg.content;
    } else {
      cleaned.push({ ...msg });
    }
  }

  // Add the scoring request as the final user message
  if (cleaned[cleaned.length - 1].role === 'user') {
    cleaned.push({ role: 'assistant', content: 'The debate has concluded.' });
  }
  cleaned.push({ role: 'user', content: 'The debate is over. Score both sides now.' });

  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 15000);

  const claudeRes = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: SCORE_MAX_TOKENS,
      system: buildScoringPrompt(topic),
      temperature: 0.3,
      messages: cleaned,
    }),
  });
  clearTimeout(fetchTimeout);

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    console.error('[ai-sparring] Claude scoring API error:', claudeRes.status, errText);
    return new Response(
      JSON.stringify({ error: 'Claude API error', status: claudeRes.status }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const claudeData = await claudeRes.json();
  const rawText = claudeData?.content?.[0]?.text?.trim();

  if (!rawText) {
    return new Response(
      JSON.stringify({ error: 'Empty scoring response from Claude' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse JSON — strip markdown fences if Claude wraps them
  let jsonStr = rawText;
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const scores = validateScoreResult(parsed);
    return new Response(
      JSON.stringify({ scores }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseErr) {
    console.error('[ai-sparring] Failed to parse scoring JSON:', parseErr, 'Raw:', rawText.substring(0, 500));
    return new Response(
      JSON.stringify({ error: 'Invalid scoring response format' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // ── Auth validation (Session 208: audit #32) ──
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Session 218: ADV-6 fix — fail closed when env vars missing
  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!sbUrl || !sbAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  try {
    const authRes = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': sbAnonKey,
      },
    });
    if (!authRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    // Auth service unreachable — reject (fail closed for quota protection)
    return new Response(
      JSON.stringify({ error: 'Auth service unavailable' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();

    // ── API key check (shared by both modes) ──
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Session 220: AI-BUG-1 fix — scoring mode ──
    if (body.mode === 'score') {
      return await handleScoring(body, apiKey, corsHeaders);
    }

    // ── Debate response mode (default) ──
    const { topic, userArg, round, totalRounds, messageHistory } = body;

    if (!topic || !userArg || !round || !totalRounds) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userArg, round, totalRounds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationMessages: Array<{role: string, content: string}> = [];

    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      for (const msg of messageHistory) {
        if (msg.role && msg.content && typeof msg.content === 'string') {
          if (msg.content.startsWith('\u{1F3A4} Voice memo')) continue;
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

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 10000);

    const claudeRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(topic, totalRounds),
        temperature: 0.85,
        top_p: 0.9,
        messages: conversationMessages,
      }),
    });
    clearTimeout(fetchTimeout);

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[ai-sparring] Claude API error:', claudeRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Claude API error', status: claudeRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeData = await claudeRes.json();
    const response = claudeData?.content?.[0]?.text?.trim();

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Claude' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[ai-sparring] Claude API timeout');
      return new Response(
        JSON.stringify({ error: 'Claude API timeout' }),
        { status: 504, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }
    console.error('[ai-sparring] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
