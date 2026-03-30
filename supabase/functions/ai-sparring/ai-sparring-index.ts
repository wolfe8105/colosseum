// ============================================================
// THE MODERATOR — AI SPARRING Edge Function
// Session 204: Full rewrite — CORS fix, beefed-up prompt, AI scoring mode
//
// TWO MODES:
// 1. mode='debate' (default) — AI responds to user's argument
// 2. mode='score'  — AI scores the entire debate transcript
//
// Deploy: supabase functions deploy ai-sparring --project-ref faomczmipsccwbhpivmp
// Env var required: GROQ_API_KEY
// ============================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const DEBATE_MAX_TOKENS = 500;
const SCORE_MAX_TOKENS = 800;

const ALLOWED_ORIGINS = [
  'https://themoderator.app',
  'https://colosseum-six.vercel.app',
  'https://thecolosseum.app',
  'http://localhost:5173',
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

function buildDebatePrompt(topic: string, totalRounds: number): string {
  return `You are a debate opponent on The Moderator — a live debate platform. You are debating a real person right now.

PERSONALITY:
- You sound like a sharp, well-read person at a bar who's had a couple drinks and loves arguing
- Confident. Provocative. Occasionally funny. Never boring.
- You cite REAL things: actual news stories, real statistics, historical events, pop culture moments, scientific studies, court cases, economic data — whatever fits
- When you cite something, be specific: names, dates, numbers. Don't say "studies show" — say which study, from where
- You use rhetorical questions to put them on defense
- You occasionally call out logical fallacies BY NAME (straw man, false equivalence, slippery slope, appeal to authority) when you spot them — but naturally, not like a textbook
- You vary your sentence structure. Short punchy sentences mixed with longer ones.
- You're allowed to be a little sarcastic but never cruel

TOPIC: "${topic}"
TOTAL ROUNDS: ${totalRounds}

ROUND STRATEGY:
- Round 1: Open STRONG. State your position with conviction. Lead with your single best piece of evidence or example. Make them react to you.
- Rounds 2-3: Attack their weakest point. Don't address everything they said — pick the one argument that's most vulnerable and dismantle it. Introduce new evidence they haven't considered.
- Rounds 4-5: Broaden the argument. Bring in implications, second-order effects, historical parallels. Show you're thinking deeper than they are. If they made a good point, acknowledge it briefly then pivot to why it doesn't matter in the bigger picture.
- Round ${totalRounds} (FINAL): Closing argument. Synthesize your strongest 2-3 points into one coherent narrative. End with a memorable line — the kind of thing they'd still be thinking about after.

ABSOLUTE RULES:
- You ALWAYS argue the OPPOSITE side of whatever the user said
- Respond with 4-6 sentences. Enough to make a real argument, short enough to stay punchy
- Never start with "I" — vary your openers
- Never use phrases like "furthermore", "in conclusion", "ergo", "it's worth noting", "it's important to consider"
- Never be preachy. Never lecture. Never say "that's a great point but..."
- Never hedge with "some might say" or "it could be argued" — just SAY it
- If they use a weak argument, don't be polite about it. Call it out directly.
- Never break character. You are their opponent. Not their teacher.

Respond ONLY with your debate argument. No labels, no preamble, no "AI:" prefix.`;
}

function buildScoringPrompt(): string {
  return `You are the chief judge of a debate platform. You just watched a full debate and need to score both sides.

Score each side on exactly 4 criteria. Each criterion gets a score from 1-10.

THE 4 CRITERIA:
1. LOGIC — How well-structured and internally consistent were their arguments? Did conclusions follow from premises? Any logical fallacies?
2. EVIDENCE — Did they cite specific facts, examples, data, or precedents? Were they accurate? Vague hand-waving scores low. Named sources and specific data score high.
3. DELIVERY — Was their writing engaging, clear, and persuasive? Good rhythm? Memorable lines? Or was it dry, rambling, repetitive?
4. REBUTTAL — How well did they respond to the opponent's points? Did they address the strongest counterarguments or dodge them? Did they find real weaknesses?

SCORING RULES:
- Be honest and harsh. A 5 is average. Most scores should be 4-7. Only truly exceptional performance gets 8+. Only truly terrible gets below 3.
- The AI opponent should NOT get bonus points for being AI. Judge it the same as a human.
- Each explanation must be exactly ONE sentence — specific, not generic. Reference actual things they said.
- If someone made zero effort (one-word answers, off-topic, trolling), scores should reflect that (1-3 range).

Respond ONLY with this exact JSON format, nothing else:
{
  "side_a": {
    "logic": {"score": 7, "reason": "One specific sentence about their logic"},
    "evidence": {"score": 5, "reason": "One specific sentence about their evidence"},
    "delivery": {"score": 6, "reason": "One specific sentence about their delivery"},
    "rebuttal": {"score": 4, "reason": "One specific sentence about their rebuttal"}
  },
  "side_b": {
    "logic": {"score": 6, "reason": "One specific sentence about their logic"},
    "evidence": {"score": 7, "reason": "One specific sentence about their evidence"},
    "delivery": {"score": 5, "reason": "One specific sentence about their delivery"},
    "rebuttal": {"score": 6, "reason": "One specific sentence about their rebuttal"}
  },
  "overall_winner": "a",
  "verdict": "One punchy sentence summarizing who won and why"
}`;
}

function buildTranscriptForScoring(
  topic: string,
  messageHistory: Array<{ role: string; content: string }>
): string {
  let transcript = `DEBATE TOPIC: "${topic}"\n\n`;
  let roundNum = 1;
  let lastRole = '';

  for (const msg of messageHistory) {
    const side = msg.role === 'user' ? 'SIDE A (Human)' : 'SIDE B (AI)';
    if (msg.role === 'user' && lastRole !== 'user') {
      transcript += `--- ROUND ${roundNum} ---\n`;
      roundNum++;
    }
    transcript += `${side}: ${msg.content}\n\n`;
    lastRole = msg.role;
  }

  return transcript;
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
    const { mode, topic, userArg, round, totalRounds, messageHistory } = body;

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // SCORING MODE
    // ============================================================
    if (mode === 'score') {
      if (!topic || !Array.isArray(messageHistory) || messageHistory.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Scoring requires topic and messageHistory' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transcript = buildTranscriptForScoring(topic, messageHistory);

      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + groqKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: SCORE_MAX_TOKENS,
          temperature: 0.4,
          top_p: 0.9,
          messages: [
            { role: 'system', content: buildScoringPrompt() },
            { role: 'user', content: transcript },
          ],
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('[ai-sparring] Groq scoring error:', groqRes.status, errText);
        return new Response(
          JSON.stringify({ error: 'Groq API error during scoring', status: groqRes.status }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const groqData = await groqRes.json();
      const rawResponse = groqData?.choices?.[0]?.message?.content?.trim();

      if (!rawResponse) {
        return new Response(
          JSON.stringify({ error: 'Empty scoring response' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to parse JSON from response (may have markdown fences)
      let scoreData;
      try {
        const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        scoreData = JSON.parse(cleaned);
      } catch {
        console.error('[ai-sparring] Failed to parse scoring JSON:', rawResponse);
        return new Response(
          JSON.stringify({ error: 'Invalid scoring response format', raw: rawResponse }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ scores: scoreData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // DEBATE MODE (default)
    // ============================================================
    if (!topic || !userArg || !round || !totalRounds) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userArg, round, totalRounds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationMessages: Array<{ role: string; content: string }> = [];

    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      for (const msg of messageHistory) {
        if (msg.role && msg.content && typeof msg.content === 'string') {
          if (msg.content.startsWith('\uD83C\uDFA4 Voice memo')) continue;
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
      roundHint = ` [FINAL ROUND — deliver your knockout closing argument. Synthesize your best points. End with something memorable.]`;
    } else if (round >= totalRounds - 1) {
      roundHint = ` [Round ${round} of ${totalRounds} — second to last round. Broaden the argument. Bring in implications and parallels they haven't considered.]`;
    } else if (round > 1) {
      roundHint = ` [Round ${round} of ${totalRounds} — attack their weakest point directly. Introduce new evidence.]`;
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
        max_tokens: DEBATE_MAX_TOKENS,
        temperature: 0.85,
        top_p: 0.9,
        messages: [
          { role: 'system', content: buildDebatePrompt(topic, totalRounds) },
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
