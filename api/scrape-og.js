// ============================================================
// THE MODERATOR — OG Preview Scraper (Serverless Function)
// Session 293 — F-62 Link Card Debates
// Updated — F-77 Microlink Pro + Supabase image proxy
//
// FLOW:
// 1. Authenticated user POSTs a URL
// 2. Microlink Pro fetches the page (real headless Chromium,
//    residential proxy rotation, bot detection bypass)
// 3. Microlink returns og:title, og:image URL, domain
// 4. We download the og:image and re-upload to Supabase Storage
//    → image lives on our CDN permanently, never 404s
// 5. Return stable Supabase image URL + metadata
//
// WHY MICROLINK:
// Our own curl/fetch gets blocked by ESPN, CNN, Cloudflare-protected
// sites. Microlink runs real Chromium with residential proxies and
// handles bot detection on the top 500 sites automatically.
//
// WHY SUPABASE STORAGE:
// Even with Microlink giving us the correct og:image URL, that URL
// lives on ESPN/CNN's CDN and can break (hotlink protection, token
// expiry, 404). We copy it to our own storage so it's permanent.
// Same pattern Reddit uses with external-preview.redd.it.
//
// ROUTE: GET /api/scrape-og?url=<encoded>
//        POST /api/scrape-og  { url }
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MICROLINK_API_KEY = process.env.MICROLINK_API_KEY;

const STORAGE_BUCKET = 'link-previews';
const MICROLINK_ENDPOINT = 'https://pro.microlink.io';

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return null; }
}

function isValidUrl(url) {
  try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}

// Deterministic filename — same article URL always maps to same file.
// Deduplicates uploads when multiple users post the same link.
function imageFilename(imageUrl) {
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    hash = ((hash << 5) - hash) + imageUrl.charCodeAt(i);
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const ext = imageUrl.match(/\.(png|webp|gif|jpe?g)(\?|$)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
  return `${hex}.${ext}`;
}

// Download og:image from source and upload to Supabase Storage.
// Returns our permanent CDN URL, or null on failure.
async function proxyImageToSupabase(imageUrl) {
  try {
    const filename = imageFilename(imageUrl);
    const storagePath = `og/${filename}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;

    // Already cached — return immediately without re-uploading
    const checkRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/info/public/${STORAGE_BUCKET}/${storagePath}`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (checkRes.ok) return publicUrl;

    // Download image (10s timeout, 4MB cap)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
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

    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength > 4 * 1024 * 1024) return null;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'x-upsert': 'false',
        },
        body: bytes,
      }
    );

    return uploadRes.ok ? publicUrl : null;
  } catch {
    return null;
  }
}

// Microlink Pro — real Chromium + residential proxies.
// Handles ESPN, CNN, Bloomberg, any bot-protected site automatically.
async function fetchWithMicrolink(url) {
  const params = new URLSearchParams({ url, meta: 'true' });
  const res = await fetch(`${MICROLINK_ENDPOINT}?${params}`, {
    headers: { 'x-api-key': MICROLINK_API_KEY },
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 'success' || !json.data) return null;

  const { data } = json;
  return {
    imageUrl: data.image?.url || null,
    ogTitle: data.title || null,
    domain: getDomain(url),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://themoderator.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth gate
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
  } catch {
    return res.status(401).json({ error: 'Auth verification failed' });
  }

  // URL from query string (GET) or body (POST)
  let url;
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      url = body?.url;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  } else {
    url = req.query.url;
  }

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // Microlink handles bot detection, JS rendering, proxy rotation
    const meta = await fetchWithMicrolink(url);
    if (!meta?.imageUrl) {
      return res.status(422).json({ error: 'No preview image found for this URL' });
    }

    // Copy image to our CDN — permanent, never breaks
    const proxiedUrl = await proxyImageToSupabase(meta.imageUrl);

    return res.status(200).json({
      image_url: proxiedUrl || meta.imageUrl,
      og_title: meta.ogTitle,
      domain: meta.domain,
      proxied: !!proxiedUrl,
    });
  } catch (err) {
    console.error('[scrape-og] error:', err);
    return res.status(422).json({ error: 'Could not fetch preview' });
  }
}
