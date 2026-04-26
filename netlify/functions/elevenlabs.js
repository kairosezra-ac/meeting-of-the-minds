// ══ NETLIFY FUNCTION — ElevenLabs Proxy ══
//
// Proxies text-to-speech generation to ElevenLabs. Returns the binary
// MP3 audio (base64-encoded; Netlify decodes before sending to the
// browser, which receives `audio/mpeg` bytes).
//
// Setup:
//   1. Add ELEVENLABS_API_KEY to Netlify environment variables.

const { verifyOrigin } = require('./_lib/verifyOrigin');

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

  // Build the outbound request explicitly so we can log it before sending.
  // voice_settings intentionally omitted: per ElevenLabs docs, voice_settings
  // overrides the voice's stored settings for that request only. Omitting
  // lets the voice's stored settings render through (matches ElevenLabs web
  // UI default).
  const outboundUrl = 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId;
  const outboundHeaders = {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
    'Accept': 'audio/mpeg',
  };
  const outboundBody = JSON.stringify({
    text: text,
    model_id: 'eleven_multilingual_v2',
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
