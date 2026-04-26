// ══ NETLIFY FUNCTION — Voxtral (Mistral TTS) Proxy ══
//
// Used by the Mistral character only. The other four characters
// continue to route through netlify/functions/elevenlabs.js. Client
// dispatch lives in js/speech-elevenlabs.js (VOICE_VENDOR map).
//
// Mistral's TTS endpoint differs from ElevenLabs in two ways:
//   1. Request body uses `input` (not `text`) and `voice_id` is in
//      the body (not the URL path).
//   2. Response is JSON: { "audio_data": "<base64 mp3>" } — already
//      base64, just pass through with isBase64Encoded: true.
//
// Voice for Mistral character is hardcoded as fr_marie_curious (the
// preset that won the live A/B). Client may include a voiceId in the
// request body; we ignore it — there is exactly one voice on this
// proxy.
//
// Setup:
//   1. Add MISTRAL_TTS_API_KEY to Netlify environment variables.

const { verifyOrigin } = require('./_lib/verifyOrigin');

const VOXTRAL_MODEL = 'voxtral-mini-tts-2603';
const VOXTRAL_VOICE = 'fr_marie_curious';

exports.handler = async function(event) {
  const blocked = verifyOrigin(event, 'voxtral');
  if (blocked) return blocked;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.MISTRAL_TTS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'MISTRAL_TTS_API_KEY not set' }),
    };
  }

  let text;
  try {
    const body = JSON.parse(event.body);
    text = body.text;
    // voiceId may be present (client sends a uniform body shape across
    // both vendors); we ignore it and use the hardcoded voice above.
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing text' }) };
  }

  // Build outbound request explicitly so we can log it before sending.
  const outboundUrl = 'https://api.mistral.ai/v1/audio/speech';
  const outboundHeaders = {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
  };
  const outboundBody = JSON.stringify({
    model: VOXTRAL_MODEL,
    input: text,
    voice_id: VOXTRAL_VOICE,
    response_format: 'mp3',
  });

  // ── Diagnostic: log the complete outbound request (Authorization redacted)
  const redactedHeaders = Object.assign({}, outboundHeaders, { 'Authorization': 'Bearer [REDACTED]' });
  console.log('[voxtral-out]', JSON.stringify({
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

  // Capture all response headers for the diagnostic log — especially
  // mistral-correlation-id, which is the support-escalation handle.
  const inboundHeaders = {};
  response.headers.forEach(function(v, k) { inboundHeaders[k] = v; });

  if (!response.ok) {
    const errBody = await response.text().catch(function() { return ''; });
    console.log('[voxtral-in]', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: inboundHeaders,
      body: errBody,
    }));
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'Voxtral API error: ' + response.status }),
    };
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    console.log('[voxtral-in]', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: inboundHeaders,
      error: 'response was not valid JSON',
    }));
    return { statusCode: 502, body: JSON.stringify({ error: 'Voxtral returned non-JSON response' }) };
  }

  if (!data.audio_data) {
    console.log('[voxtral-in]', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: inboundHeaders,
      error: 'response JSON missing audio_data field',
      keys: Object.keys(data),
    }));
    return { statusCode: 502, body: JSON.stringify({ error: 'Voxtral response missing audio_data' }) };
  }

  // ── Diagnostic: log inbound success metadata. We don't dump audio_data
  // (~30KB base64) but we do record its length as a sanity check that the
  // round-trip produced reasonable audio. mistral-correlation-id is the
  // grep-handle in inboundHeaders.
  console.log('[voxtral-in]', JSON.stringify({
    status: response.status,
    statusText: response.statusText,
    headers: inboundHeaders,
    bodyType: 'JSON with audio_data',
    audioDataLength: data.audio_data.length,
  }));

  // Pass the base64 audio_data straight through. No additional encoding
  // step needed — Mistral already returns it in the form Netlify expects
  // when isBase64Encoded: true.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
    body: data.audio_data,
    isBase64Encoded: true,
  };
};
