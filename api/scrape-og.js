// ============================================================
// THE MODERATOR — OG Preview Scraper (Serverless Function)
// Session 293 — F-62 Link Card Debates
//
// WHAT THIS DOES:
// 1. Takes a URL from authenticated user
// 2. Fetches the page server-side (avoids CORS)
// 3. Extracts og:image, og:title, domain
// 4. Returns JSON preview data for storage in arena_debates.link_preview
//
// ROUTE: /api/scrape-og?url=<encoded-url>
//
// WHY SERVERLESS:
// Client-side fetch would be blocked by CORS on most domains.
// Server-side scrape is invisible to the target site's CORS policy.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Max response body to read (1MB — enough for <head> section)
const MAX_BODY_BYTES = 1024 * 1024;
// Scrape timeout
const FETCH_TIMEOUT_MS = 8000;

function extractMeta(html, property) {
  // Match <meta property="og:X" content="..."> or <meta name="og:X" content="...">
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return match[1];
  }
  return null;
}

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://themoderator.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth gate — require valid Supabase session
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify token with Supabase
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
  } catch {
    return res.status(401).json({ error: 'Auth verification failed' });
  }

  const url = req.query.url;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL. Provide a valid http or https URL.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheModeratorBot/1.0; +https://themoderator.app)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(422).json({ error: `URL returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(422).json({ error: 'URL does not return HTML' });
    }

    // Read body with size limit
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      chunks.push(value);
      if (totalBytes >= MAX_BODY_BYTES) break;
    }

    const html = new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))));

    // Extract OG data
    const ogImage = extractMeta(html, 'og:image');
    const ogTitle = extractMeta(html, 'og:title');
    const domain = getDomain(url);

    if (!ogImage) {
      return res.status(422).json({ error: 'No og:image found. Try a different link.' });
    }

    // Resolve relative og:image URLs
    let imageUrl = ogImage;
    if (ogImage.startsWith('/')) {
      try {
        const base = new URL(url);
        imageUrl = `${base.protocol}//${base.host}${ogImage}`;
      } catch { /* keep as-is */ }
    }

    return res.status(200).json({
      image_url: imageUrl,
      og_title: ogTitle || null,
      domain: domain || null,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(422).json({ error: 'URL took too long to respond' });
    }
    return res.status(422).json({ error: 'Could not fetch URL' });
  }
}
