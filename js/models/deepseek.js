// ══ DEEPSEEK — DeepSeek-V3 ══
//
// Owner: [assign to a 42 student]
// Persona: Rigorous, research-driven, quietly confident
// API: Via Netlify Function proxy (DeepSeek blocks direct browser calls)
//      See: netlify/functions/deepseek.js
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-deepseek
//   - Modify callDeepSeek() below to change model or parameters
//   - Set DEEPSEEK_API_KEY in Netlify environment variables
//
// Note: DeepSeek uses an OpenAI-compatible API format

async function callDeepSeek(question, claudeKey) {
  const systemPrompt = document.getElementById('prompt-deepseek').value;

  const response = await fetch('/.netlify/functions/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt }),
  });

  // If Netlify function not available, fall back to Claude persona
  if (!response.ok) {
    console.warn('DeepSeek proxy unavailable, falling back to Claude persona');
    return await callClaude(question, claudeKey, systemPrompt);
  }

  const data = await response.json();
  return data.text;
}
