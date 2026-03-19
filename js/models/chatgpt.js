// ══ CHATGPT — OpenAI GPT-4o ══
//
// Owner: [assign to a 42 student]
// Persona: Pragmatic, confident, solution-oriented
// API: Via Netlify Function proxy (key stored server-side)
//      See: netlify/functions/chatgpt.js
//      Set OPENAI_API_KEY in Netlify environment variables
//      Get one at: https://platform.openai.com
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-chatgpt
//   - Modify the Netlify function to change model or parameters

async function callChatGPT(question) {
  const systemPrompt = document.getElementById('prompt-chatgpt').value;
  return await callViaProxy('chatgpt', question, systemPrompt);
}
