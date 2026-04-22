// ══ NETLIFY FUNCTION — Gemini Proxy ══

const { verifyOrigin } = require('./_lib/verifyOrigin');

exports.handler = async function(event) {
  const blocked = verifyOrigin(event, 'gemini');
  if (blocked) return blocked;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY not set' }) };
  }

  const { question, systemPrompt } = JSON.parse(event.body);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.9 },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'Gemini error' }) };
  }

  // Log finish reason to Netlify function logs for debugging
  const candidate = data.candidates[0];
  console.log('Gemini finishReason:', candidate.finishReason);
  console.log('Gemini text length:', candidate.content.parts[0].text.length);

  // Collect ALL parts in case response is split across multiple
  const text = candidate.content.parts.map(p => p.text).join('');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      text,
      finishReason: candidate.finishReason 
    }),
  };
};
