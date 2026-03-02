// ============================================================
// THE COLOSSEUM — Vercel Edge Middleware (Move 3)
// Session 16 — February 28, 2026
//
// WHAT THIS DOES:
// 1. Rate limits ALL /api/* routes (per IP)
// 2. Enforces CORS — only your domain can call API routes
// 3. Blocks suspicious request patterns
//
// HOW TO USE:
// Place this file at the ROOT of your repo as: middleware.js
// Vercel automatically picks it up — no config needed.
// ============================================================

export const config = {
  matcher: '/api/:path*',
};

// --- In-memory rate limit store (per Vercel Edge instance) ---
// Note: Edge instances are ephemeral. This provides per-instance
// protection. For distributed rate limiting at scale, use 
// Vercel KV or Upstash Redis. This is sufficient for launch.
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;     // 30 requests per minute per IP

// Allowed origins — ONLY your domain
const ALLOWED_ORIGINS = [
  'https://colosseum-six.vercel.app',
  'https://thecolosseum.app',           // future custom domain
  // PLACEHOLDER: Add your custom domain here when you buy one
];

// In development, also allow localhost
if (process.env.VERCEL_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:5173');
}

function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  record.count++;
  if (record.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

// Cleanup old entries every 5 minutes to prevent memory leak
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup > 5 * 60 * 1000) {
    const cutoff = now - WINDOW_MS * 2;
    for (const [ip, record] of rateLimitMap) {
      if (record.windowStart < cutoff) {
        rateLimitMap.delete(ip);
      }
    }
    lastCleanup = now;
  }
}

export default function middleware(request) {
  cleanupIfNeeded();

  const origin = request.headers.get('origin');
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const path = url.pathname;

  // --- CORS enforcement ---
  // Webhook endpoints (Telegram, Discord) don't send Origin headers
  // so we skip CORS check for those specific paths
  const isWebhook = path.includes('telegram-webhook') || 
                    path.includes('discord-interactions') ||
                    path.includes('stripe-webhook');

  if (!isWebhook && origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Blocked-Reason': 'CORS',
          },
        }
      );
    }
  }

  // --- Rate limiting ---
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again in 1 minute.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // --- Request size check (block oversized payloads) ---
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1_000_000) {
    // 1MB max payload
    return new Response(
      JSON.stringify({ error: 'Request too large' }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // --- Pass through with rate limit headers ---
  // Vercel Edge Middleware uses NextResponse or returns nothing to continue
  // For a non-Next.js project, we just return undefined to pass through
  // But we need to add CORS headers to the response

  // For preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        'Access-Control-Max-Age': '86400',
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  }

  // For non-Next.js Vercel projects, middleware can't modify the response
  // headers on pass-through. The rate limiting and CORS blocking above
  // are the primary protection. The actual CORS response headers are
  // set by the API functions themselves (see patched Stripe functions).

  // Return undefined = pass request through to the API function
  return undefined;
}
