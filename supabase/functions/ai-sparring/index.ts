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
// Session 207: Added themoderator.app to CORS, 10s Groq timeout
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
- Never agree with the
