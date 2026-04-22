// ══ NETLIFY FUNCTION — Mistral Proxy ══
//
// Setup:
//   1. Deploy to Netlify
//   2. Go to Site Settings → Environment Variables
//   3. Add MISTRAL_API_KEY with your Mistral API key
//      Get one at: https://console.mistral.ai

const { verifyOrigin } = require('./_lib/verifyOrigin');

exports.handler = async function(event) {
  const blocked = verifyOrigin(event, 'mistral');
  if (blocked) return blocked;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'MISTRAL_API_KEY not set in Netlify environment variables' }) };
  }

  const { question, systemPrompt } = JSON.parse(event.body);

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'Mistral error' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: data.choices[0].message.content }),
  };
};
