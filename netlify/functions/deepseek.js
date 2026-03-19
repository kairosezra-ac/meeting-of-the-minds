// ══ NETLIFY FUNCTION — DeepSeek Proxy ══
//
// Setup:
//   1. Deploy to Netlify
//   2. Go to Site Settings → Environment Variables
//   3. Add DEEPSEEK_API_KEY with your DeepSeek API key
//      Get one at: https://platform.deepseek.com
//
// Note: DeepSeek uses OpenAI-compatible API format

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not set in Netlify environment variables' }) };
  }

  const { question, systemPrompt } = JSON.parse(event.body);

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'DeepSeek error' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: data.choices[0].message.content }),
  };
};
