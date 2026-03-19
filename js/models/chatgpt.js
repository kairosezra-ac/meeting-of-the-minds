// ══ CHATGPT — OpenAI GPT-4o ══
//
// Owner: [assign to a 42 student]
// Persona: Pragmatic, confident, solution-oriented
// API: Via Netlify Function proxy (OpenAI blocks direct browser calls)
//      See: netlify/functions/chatgpt.js
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-chatgpt
//   - Modify callChatGPT() below to change model or parameters
//   - Set OPENAI_API_KEY in Netlify environment variables

async function callChatGPT(question, claudeKey) {
  const systemPrompt = document.getElementById('prompt-chatgpt').value;

  // If no OpenAI key is available via Netlify, fall back to Claude-as-ChatGPT
  const response = await fetch('/.netlify/functions/chatgpt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt }),
  });

  // If Netlify function not available, fall back to Claude persona
  if (!response.ok) {
    console.warn('ChatGPT proxy unavailable, falling back to Claude persona');
    return await callClaude(question, claudeKey, systemPrompt);
  }

  const data = await response.json();
  return data.text;
}
