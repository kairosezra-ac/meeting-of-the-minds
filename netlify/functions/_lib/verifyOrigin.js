// ══ VERIFY ORIGIN — shared Netlify function helper ══
//
// Rejects any request whose browser Origin (or Referer fallback) isn't in
// the allowlist. Blocks direct API consumption by curl / Postman / other
// non-browser clients — the whole point is to prevent someone who finds
// the `/.netlify/functions/*` URLs from burning vendor tokens on our keys.
//
// The `_lib/` prefix keeps this file out of Netlify's function bundler
// (directories starting with `_` are excluded from function discovery).
//
// Not rate-limiting. Not auth in the identity sense. Just: "did this
// request come from a browser that had our HTML loaded?"

const EXACT_ALLOWLIST = [
  'https://askallmodels.alignedconversations.com', // production custom domain
  'https://neon-cannoli-e91813.netlify.app',       // Netlify auto-subdomain
];

// Netlify deploy-preview URLs: https://deploy-preview-<PR#>--<site>.netlify.app
const PREVIEW_PATTERN = /^https:\/\/deploy-preview-\d+--neon-cannoli-e91813\.netlify\.app$/;

/**
 * Extract the request's origin from Origin header, falling back to parsing
 * Referer. Returns null if neither is usable.
 */
function extractOrigin(headers) {
  if (!headers) return null;

  // Netlify lowercases header keys, but be defensive.
  const origin = headers.origin || headers.Origin;
  if (origin) return origin;

  const referer = headers.referer || headers.Referer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_) {
      return null;
    }
  }

  return null;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (EXACT_ALLOWLIST.includes(origin)) return true;
  if (PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

/**
 * Verify the request comes from an allowed browser origin.
 * Returns null if allowed, or a 403 response object if blocked.
 *
 * @param {object} event - Netlify function event (AWS-Lambda-shaped).
 * @param {string} functionName - For logs, e.g. 'claude'.
 */
function verifyOrigin(event, functionName) {
  const headers = event.headers || {};
  const origin = extractOrigin(headers);

  if (isAllowedOrigin(origin)) return null;

  // Log enough detail to debug legitimate-but-rejected requests without
  // leaking the request body (which may contain user questions).
  console.warn('[verifyOrigin] Rejected request', {
    function: functionName,
    origin: headers.origin || headers.Origin || null,
    referer: headers.referer || headers.Referer || null,
    userAgent: headers['user-agent'] || headers['User-Agent'] || null,
  });

  return {
    statusCode: 403,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Forbidden: origin not allowed' }),
  };
}

module.exports = { verifyOrigin };
