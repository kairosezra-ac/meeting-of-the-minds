// ══ DEEPSEEK — DeepSeek-V3 ══
//
// Owner: [assign to a 42 student]
// Persona: Rigorous, research-driven, quietly confident
// API: Via Netlify Function proxy (key stored server-side)
//      See: netlify/functions/deepseek.js
//      Set DEEPSEEK_API_KEY in Netlify environment variables
//      Get one at: https://platform.deepseek.com
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-deepseek
//   - Modify the Netlify function to change model or parameters

async function callDeepSeek(question) {
  const systemPrompt = document.getElementById('prompt-deepseek').value;
  return await callViaProxy('deepseek', question, systemPrompt);
}
