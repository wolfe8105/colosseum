// ============================================================
// THE COLOSSEUM — AI MODERATOR Edge Function
// Session 39: AI-powered reference/evidence ruling
//
// Receives: debate topic, reference (url, description, side),
//   round, debate context
// Returns: { ruling: 'allowed'|'denied', reason: string }
//
// Uses Groq Llama 3.1 70B (same as ai-sparring)
// GROQ_API_KEY already set as Supabase secret (Session 25)
//
// Deploy: supabase functions deploy ai-moderator --project-ref faomczmipsccwbhpivmp
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, reference, round, debateContext } = await req.json();

    if (!topic || !reference) {
      return new Response(
        JSON.stringify({ error: "Missing topic or reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      // Fallback: allow with generic reason
      return new Response(
        JSON.stringify({
          ruling: "allowed",
          reason: "AI moderator unavailable — auto-allowed.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the moderator prompt
    const systemPrompt = `You are the AI Moderator for The Colosseum, a live debate platform. You judge whether submitted evidence/references are valid and relevant to the debate.

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
ROUND: ${round || "unknown"}
SIDE SUPPORTED: ${reference.supports_side === "a" ? "Side A" : reference.supports_side === "b" ? "Side B" : "Not specified"}
URL: ${reference.url || "(none)"}
DESCRIPTION: ${reference.description || "(none)"}
${debateContext ? `\nRECENT ARGUMENTS:\n${debateContext}` : ""}

Rule on this evidence: ALLOW or DENY?`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const rawResponse = groqData?.choices?.[0]?.message?.content?.trim() || "";

    // Parse the JSON response
    let ruling = "allowed";
    let reason = "Evidence accepted.";

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(rawResponse);
      if (parsed.ruling === "denied" || parsed.ruling === "allowed") {
        ruling = parsed.ruling;
        reason = parsed.reason || (ruling === "allowed" ? "Evidence accepted." : "Evidence rejected.");
      }
    } catch {
      // If JSON parse fails, try to extract from text
      const lower = rawResponse.toLowerCase();
      if (lower.includes('"denied"') || lower.includes("deny") || lower.includes("denied")) {
        ruling = "denied";
        // Try to extract reason
        const reasonMatch = rawResponse.match(/reason["\s:]+([^"}\n]+)/i);
        reason = reasonMatch ? reasonMatch[1].trim() : "Evidence not relevant to the debate.";
      } else {
        ruling = "allowed";
        const reasonMatch = rawResponse.match(/reason["\s:]+([^"}\n]+)/i);
        reason = reasonMatch ? reasonMatch[1].trim() : "Evidence accepted.";
      }
    }

    // Sanitize reason length
    if (reason.length > 200) reason = reason.substring(0, 197) + "...";

    return new Response(
      JSON.stringify({ ruling, reason }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("AI Moderator error:", err);

    // On any error, default to ALLOW (LM-087: debate can't hang)
    return new Response(
      JSON.stringify({
        ruling: "allowed",
        reason: "AI moderator error — auto-allowed to keep debate flowing.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
