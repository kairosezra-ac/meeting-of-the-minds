// ══ NETLIFY FUNCTION — ChatGPT Proxy ══
// 
// This serverless function proxies requests to OpenAI's API.
// It runs server-side so CORS is not an issue.
//
// Setup:
//   1. Deploy to Netlify
//   2. Go to Site Settings → Environment Variables
//   3. Add OPENAI_API_KEY with your OpenAI API key

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY not set in Netlify environment variables' }) };
  }

  const { question, systemPrompt } = JSON.parse(event.body);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'OpenAI error' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: data.choices[0].message.content }),
  };
};
