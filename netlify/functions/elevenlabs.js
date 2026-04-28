// ══ NETLIFY FUNCTION — ElevenLabs Proxy ══
//
// Proxies text-to-speech generation to ElevenLabs. Returns the binary
// MP3 audio (base64-encoded; Netlify decodes before sending to the
// browser, which receives `audio/mpeg` bytes).
//
// Setup:
//   1. Add ELEVENLABS_API_KEY to Netlify environment variables.

const { verifyOrigin } = require('./_lib/verifyOrigin');

// ── ElevenLabs v3 model + settings ──
// model_id:        eleven_v3 — higher-expressiveness model
// stability:       0.5 (Natural preset) — expressive but stable;
//                  ElevenLabs' recommended default for v3
// seed:            fixed integer for output determinism. v3 is
//                  non-deterministic by default; same text + voice +
//                  seed → same audio.
// MAX_TEXT_LENGTH: v3's per-request hard cap (v2 allowed 10000).
const MODEL_ID = 'eleven_v3';
const STABILITY = 0.5;
const SEED = 181818;
const MAX_TEXT_LENGTH = 3000;

exports.handler = async function(event) {
  const blocked = verifyOrigin(event, 'elevenlabs');
  if (blocked) return blocked;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ELEVENLABS_API_KEY not set' }),
    };
  }

  let text, voiceId;
  try {
    const body = JSON.parse(event.body);
    text = body.text;
    voiceId = body.voiceId;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!text || !voiceId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing text or voiceId' }) };
  }

  // Defensive char-limit guard. v3 caps at 3000 chars per request (vs
  // v2's 10000). Debate turns are typically 200-500 chars so this
  // should never fire — but if a model goes long, truncate rather
  // than let ElevenLabs reject the request and have the audience
  // hear silence on a model's turn.
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn('[elevenlabs-out] text length exceeds v3 3000-char limit, truncating', {
      originalLength: text.length,
      truncatedTo: MAX_TEXT_LENGTH,
    });
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  // Build the outbound request explicitly so we can log it before sending.
  // For v3 we send only `stability` in voice_settings — similarity_boost,
  // style, and use_speaker_boost are ignored or unsupported on v3 per
  // ElevenLabs docs. The fixed seed makes regenerations deterministic.
  const outboundUrl = 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId;
  const outboundHeaders = {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
    'Accept': 'audio/mpeg',
  };
  const outboundBody = JSON.stringify({
    text: text,
    model_id: MODEL_ID,
    voice_settings: { stability: STABILITY },
    seed: SEED,
  });

  // ── Diagnostic: log the complete outbound request (key redacted)
  const redactedHeaders = Object.assign({}, outboundHeaders, { 'xi-api-key': '[REDACTED]' });
  console.log('[elevenlabs-out]', JSON.stringify({
    url: outboundUrl,
    method: 'POST',
    headers: redactedHeaders,
    body: outboundBody,
  }));

  const response = await fetch(outboundUrl, {
    method: 'POST',
    headers: outboundHeaders,
    body: outboundBody,
  });

  // Capture response headers for the diagnostic log
  const inboundHeaders = {};
  response.headers.forEach(function(v, k) { inboundHeaders[k] = v; });

  if (!response.ok) {
    const errBody = await response.text().catch(function() { return ''; });
    // ── Diagnostic: log the inbound error response in full
    console.log('[elevenlabs-in]', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: inboundHeaders,
      body: errBody,
    }));
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'ElevenLabs API error: ' + response.status }),
    };
  }

  // ── Diagnostic: log the inbound success metadata (no body — it's binary)
  console.log('[elevenlabs-in]', JSON.stringify({
    status: response.status,
    statusText: response.statusText,
    headers: inboundHeaders,
    bodyType: 'binary audio/mpeg',
  }));

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
    body: base64,
    isBase64Encoded: true,
  };
};
