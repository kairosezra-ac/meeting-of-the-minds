// ══ NETLIFY FUNCTION — ElevenLabs Proxy ══
//
// Proxies text-to-speech generation to ElevenLabs. Returns the binary
// MP3 audio (base64-encoded; Netlify decodes before sending to the
// browser, which receives `audio/mpeg` bytes).
//
// Setup:
//   1. Add ELEVENLABS_API_KEY to Netlify environment variables.

const { verifyOrigin } = require('./_lib/verifyOrigin');

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
};

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

  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!response.ok) {
    // Log the full vendor response for debugging in Netlify Function logs;
    // return a generic error to the client (vendor responses sometimes
    // echo the request, which could include user text).
    const errBody = await response.text().catch(function() { return ''; });
    console.error('[elevenlabs] vendor error', response.status, errBody.slice(0, 300));
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'ElevenLabs API error: ' + response.status }),
    };
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
    body: base64,
    isBase64Encoded: true,
  };
};
