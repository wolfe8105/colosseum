// Public endpoint — rate-limited by IP via Upstash Redis (10 req/60s sliding window, cross-instance).
// ENV VARS REQUIRED: ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (set in Vercel dashboard)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'go-respond',
});

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 200;

function buildSystemPrompt(topic, side, totalRounds) {
  const userSide = side === 'for' ? 'FOR' : 'AGAINST';
  const aiSide = side === 'for' ? 'AGAINST' : 'FOR';

  return `You are a debate opponent on The Moderator — a live debate app where real people argue about everything.

YOUR PERSONALITY:
- You talk like a regular person, not a professor or a lawyer
- You have HOT TAKES. You're confident, a little provocative, and you back it up with real-world examples people actually know
- You use casual language — contractions, rhetorical questions, occasional emphasis
- You're not a pushover. You push back hard but you're not a jerk about it
- You cite real things: news stories, sports moments, movies, common experiences, stuff people actually lived through
- You keep it SHORT. 2-4 sentences max. This is a debate, not a TED talk

THE DEBATE TOPIC: "${topic}"
THE USER IS ARGUING: ${userSide}
YOU ARE ARGUING: ${aiSide}
TOTAL ROUNDS: ${totalRounds}

YOUR RULES:
- You are ALWAYS arguing ${aiSide} the topic, no matter what the user says
- Never agree with the user's main point — find the angle to push back from
- Never start your response with "I" — vary your openers
- Never use debate jargon ("furthermore", "in conclusion", "ergo", "thus")
- Never be preachy or lecture them
- Round 1: stake your position boldly, use a real-world example to anchor it
- Middle rounds: find the actual weakness in what they just said, attack it specifically
- Final round: land your knockout — one memorable line that sticks
- Keep responses under 60 words

After your argument, on a NEW line, rate the user's argument from 1-10 in this exact format: [SCORE:X]
Score generously for passion and real examples. Score low for vague claims or weak logic. Be fair but not easy.
The score is for the user's argument ONLY, not yours.`;
}

function buildScoringPrompt(topic, side, history) {
  return `You just finished a 3-round debate. Score the human's performance.

TOPIC: "${topic}"
HUMAN ARGUED: ${side === 'for' ? 'FOR' : 'AGAINST'}

DEBATE HISTORY:
${history}

Score the human on 4 criteria (1-10 each):
1. Logic — Did their arguments make sense?
2. Evidence — Did they cite real things or just opinions?
3. Delivery — Were they engaging and punchy?
4. Rebuttal — Did they address your points or talk past them?

Respond ONLY with valid JSON, no markdown, no backticks:
{"logic":N,"evidence":N,"delivery":N,"rebuttal":N,"verdict":"One sentence summary of their performance. Be honest but not mean."}`;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://themoderator.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // DOS-01 fix: require authenticated session — prevents unauthenticated API drain
  // Caller must pass Authorization: Bearer <supabase-jwt> header
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Validate JWT — full cryptographic verification if SUPABASE_JWT_SECRET is set,
  // otherwise fall back to structure check + expiry validation.
  let userId = 'unknown';
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.error('[go-respond] FATAL: SUPABASE_JWT_SECRET not set — refusing to serve');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    });
    userId = payload.sub || 'unknown';
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }

  // IS-01 fix: use x-real-ip (set by Vercel infrastructure, not spoofable by caller)
  // x-forwarded-for is caller-controlled and trivially spoofed for rate limit bypass.
  const ip = req.headers['x-real-ip'] ?? req.socket?.remoteAddress ?? 'unknown';
  // Rate limit by userId (authenticated) not IP — prevents IP-spoof bypass
  const rateLimitKey = `user:${userId}`;
  const { success } = await ratelimit.limit(rateLimitKey);
  if (!success) {
    return res.status(429).json({ error: 'Rate limit exceeded — try again in a minute' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[go-respond] ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { topic, side, round, totalRounds, userArg, messageHistory, action } = req.body;

    if (!topic || !side) {
      return res.status(400).json({ error: 'Missing required fields: topic, side' });
    }

    // IS-02 fix: strip prompt injection markers from topic before system prompt interpolation
    const safeTopic = String(topic || '')
      .slice(0, 500)
      .replace(/\bignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/gi, '[removed]')
      .replace(/\bsystem\s*prompt\b/gi, '[removed]')
      .replace(/\byou\s+are\s+now\b/gi, '[removed]')
      .replace(/\bdo\s+not\s+(follow|obey|respect)\b/gi, '[removed]')
      .replace(/<\/?[a-z][^>]*>/gi, '');
    const safeArg = String(userArg || '').slice(0, 2000);

    const safeHistory = (Array.isArray(messageHistory) ? messageHistory : [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))
      .slice(-20);

    // Scoring request after final round
    if (action === 'score') {
      const historyText = safeHistory
        .map(m => `${m.role === 'user' ? 'HUMAN' : 'AI'}: ${m.content}`)
        .join('\n');

      const scoreAbort = new AbortController();
      const scoreTimeout = setTimeout(() => scoreAbort.abort(), 9000);
      try {
        const claudeRes = await fetch(CLAUDE_API_URL, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 200,
            temperature: 0.7,
            messages: [
              { role: 'user', content: buildScoringPrompt(safeTopic, side, historyText) },
            ],
          }),
          signal: scoreAbort.signal,
        });

        if (!claudeRes.ok) {
          console.error('[go-respond] Claude score error:', claudeRes.status);
          return res.status(502).json({ error: 'AI scoring failed' });
        }

        const claudeData = await claudeRes.json();
        const raw = claudeData?.content?.[0]?.text?.trim() || '';

        try {
          const scores = JSON.parse(raw.replace(/```json|```/g, '').trim());
          return res.status(200).json({ scores });
        } catch (parseErr) {
          console.warn('[go-respond] Score JSON parse failed:', parseErr.message, '| raw[:200]:', raw?.slice(0, 200));
          return res.status(200).json({
            scores: { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Good effort — keep debating to sharpen your skills.' }
          });
        }
      } catch (err) {
        console.error('[go-respond] Scoring error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      } finally {
        clearTimeout(scoreTimeout);
      }
    }

    // Normal debate round
    if (!safeArg || !round || !totalRounds) {
      return res.status(400).json({ error: 'Missing required fields: userArg, round, totalRounds' });
    }

    const conversationMessages = safeHistory.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add current user argument
    conversationMessages.push({ role: 'user', content: safeArg });

    // Round hint for final round
    if (Number(round) === Number(totalRounds)) {
      const last = conversationMessages[conversationMessages.length - 1];
      conversationMessages[conversationMessages.length - 1] = {
        ...last,
        content: last.content + '\n\n[This is the final round. Make your closing argument count.]',
      };
    }

    const debateAbort = new AbortController();
    const debateTimeout = setTimeout(() => debateAbort.abort(), 9000);
    try {
      const claudeRes = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(safeTopic, side, totalRounds),
          temperature: 0.85,
          top_p: 0.9,
          messages: conversationMessages,
        }),
        signal: debateAbort.signal,
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        console.error('[go-respond] Claude API error:', claudeRes.status, errText);
        return res.status(502).json({ error: 'AI response failed' });
      }

      const claudeData = await claudeRes.json();
      const response = claudeData?.content?.[0]?.text?.trim();

      if (!response) {
        return res.status(502).json({ error: 'Empty response from AI' });
      }

      return res.status(200).json({ response });
    } finally {
      clearTimeout(debateTimeout);
    }

  } catch (err) {
    console.error('[go-respond] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
