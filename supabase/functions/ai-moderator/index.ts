// ============================================================
// THE MODERATOR — AI MODERATOR Edge Function
// Session 40: A08 hardened — removed deno.land import, CORS allowlist
//
// CHANGES FROM SESSION 39:
// 1. Deno.serve replaces import from deno.land/std (CWE-829)
// 2. CORS wildcard → allowlist (A05 fix)
// 3. Zero external imports — only built-in Deno APIs + fetch
//
// Deploy: supabase functions deploy ai-moderator --project-ref faomczmipsccwbhpivmp
// Env var required: GROQ_API_KEY (shared with ai-sparring)
// Session 208: Auth validation — rejects anonymous callers (audit #32)
// ============================================================

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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const { topic, reference, round, debateContext } = await req.json();

    if (!topic || !reference) {
      return new Response(
        JSON.stringify({ error: 'Missing topic or reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      // Fallback: allow with generic reason (LM-087)
      return new Response(
        JSON.stringify({
          ruling: 'allowed',
          reason: 'AI moderator unavailable — auto-allowed.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are the AI Moderator for The Moderator, a live debate platform. You judge whether submitted evidence/references are valid and relevant to the debate.

Your job is simple: look at the evidence and decide ALLOW or DENY.

ALLOW if:
- The evidence is relevant to the debate topic
- The URL (if provided) appears to be a legitimate source (news, research, government, reputable org)
- The description meaningfully supports or counters an argument
- Even if the evidence is weak, it's on-topic and not spam

DENY if:
- The evidence is completely off-topic (nothing to do with the debate)
- The URL is obviously spam, malware, or a joke site
- The description is empty nonsense, personal attacks, or trolling
- The submission is clearly an attempt to waste time or disrupt

You are tough but fair. Most legitimate submissions get ALLOWED. You only DENY clear garbage.

Respond in EXACTLY this JSON format, nothing else:
{"ruling":"allowed","reason":"Brief 1-sentence reason"}
or
{"ruling":"denied","reason":"Brief 1-sentence reason"}

Keep reasons under 20 words. Be direct. No preamble.`;

    const userMessage = `DEBATE TOPIC: "${topic}"
ROUND: ${round || 'unknown'}
SIDE SUPPORTED: ${reference.supports_side === 'a' ? 'Side A' : reference.supports_side === 'b' ? 'Side B' : 'Not specified'}
URL: ${reference.url || '(none)'}
DESCRIPTION: ${reference.description || '(none)'}
${debateContext ? `\nRECENT ARGUMENTS:\n${debateContext}` : ''}

Rule on this evidence: ALLOW or DENY?`;

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 10000);

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    clearTimeout(fetchTimeout);

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const rawResponse = groqData?.choices?.[0]?.message?.content?.trim() || '';

    let ruling = 'allowed';
    let reason = 'Evidence accepted.';

    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed.ruling === 'denied' || parsed.ruling === 'allowed') {
        ruling = parsed.ruling;
        reason = parsed.reason || (ruling === 'allowed' ? 'Evidence accepted.' : 'Evidence rejected.');
      }
    } catch {
      const lower = rawResponse.toLowerCase();
      if (lower.includes('"denied"') || lower.includes('deny') || lower.includes('denied')) {
        ruling = 'denied';
        const reasonMatch = rawResponse.match(/reason["\s:]+([^"}\n]+)/i);
        reason = reasonMatch ? reasonMatch[1].trim() : 'Evidence not relevant to the debate.';
      } else {
        ruling = 'allowed';
        const reasonMatch = rawResponse.match(/reason["\s:]+([^"}\n]+)/i);
        reason = reasonMatch ? reasonMatch[1].trim() : 'Evidence accepted.';
      }
    }

    if (reason.length > 200) reason = reason.substring(0, 197) + '...';

    return new Response(
      JSON.stringify({ ruling, reason }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('AI Moderator Groq timeout (10s)');
    } else {
      console.error('AI Moderator error:', err);
    }

    // On any error, default to ALLOW (LM-087: debate can't hang)
    return new Response(
      JSON.stringify({
        ruling: 'allowed',
        reason: 'AI moderator error — auto-allowed to keep debate flowing.',
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
