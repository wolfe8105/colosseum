// ============================================================
// THE MODERATOR — OG Preview Scraper (Serverless Function)
// Session 293 — F-62 Link Card Debates
// Updated — F-77 Image Proxying (Reddit pattern)
//
// WHAT THIS DOES:
// 1. Takes a URL from authenticated user
// 2. Fetches the page server-side (avoids CORS)
// 3. Extracts og:image, og:title, domain
// 4. Downloads the og:image and re-uploads to Supabase Storage
//    (same trick Reddit uses — images never 404 because they live
//    on our CDN, not the source site's)
// 5. Returns JSON preview data with our stable Supabase image URL
//
// ROUTE: /api/scrape-og?url=<encoded-url>
//
// WHY IMAGE PROXYING:
// Storing raw og:image URLs (espncdn.com, media.cnn.com, etc.) breaks
// constantly — hotlink protection, CDN expiry, CORS, 404s.
// Reddit solves this by copying every image to their own CDN immediately.
// We do the same: fetch → upload to link-previews bucket → store our URL.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STORAGE_BUCKET = 'link-previews';

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

// Deterministic filename from URL — same URL always produces same filename
// so we never upload duplicates for the same article
function imageFilename(imageUrl) {
  // Simple hash: sum of char codes, then hex. Good enough for dedup.
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    hash = ((hash << 5) - hash) + imageUrl.charCodeAt(i);
    hash |= 0;
  }
  const unsigned = (hash >>> 0).toString(16).padStart(8, '0');
  // Guess extension from URL, default to jpg
  const ext = imageUrl.match(/\.(png|webp|gif|jpe?g)(\?|$)/i)?.[1]?.replace('jpeg','jpg') || 'jpg';
  return `${unsigned}.${ext}`;
}

// Fetch an image URL and upload to Supabase Storage.
// Returns the public Supabase CDN URL, or null on failure.
async function proxyImage(imageUrl) {
  try {
    const filename = imageFilename(imageUrl);
    const storagePath = `og/${filename}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;

    // Check if we already have this image cached — if so, skip upload
    const checkRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/info/public/${STORAGE_BUCKET}/${storagePath}`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (checkRes.ok) {
      // Already cached — return existing URL
      return publicUrl;
    }

    // Fetch the image bytes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const imgRes = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheModeratorBot/1.0; +https://themoderator.app)',
        'Accept': 'image/*',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    // Size limit: 4MB
    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength > 4 * 1024 * 1024) return null;

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 1 year
          'x-upsert': 'false', // don't overwrite existing
        },
        body: bytes,
      }
    );

    if (!uploadRes.ok) return null;
    return publicUrl;

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

    // Proxy the image through Supabase Storage (Reddit pattern).
    // If proxying fails for any reason, fall back to the original URL —
    // better a sometimes-broken image than no preview at all.
    const proxiedUrl = await proxyImage(imageUrl);

    return res.status(200).json({
      image_url: proxiedUrl || imageUrl,
      og_title: ogTitle || null,
      domain: domain || null,
      proxied: !!proxiedUrl, // handy for debugging
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(422).json({ error: 'URL took too long to respond' });
    }
    return res.status(422).json({ error: 'Could not fetch URL' });
  }
}
