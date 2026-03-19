// ══ GEMINI — Google Gemini 2.5 Flash ══
//
// Owner: [assign to a 42 student]
// Persona: Analytical, curious, expansive in thinking
// API: Via Netlify Function proxy (key stored server-side)
//      See: netlify/functions/gemini.js
//      Set GEMINI_API_KEY in Netlify environment variables
//      Get one at: https://aistudio.google.com
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-gemini
//   - Modify the Netlify function to change model or parameters

async function callGemini(question) {
  const systemPrompt = document.getElementById('prompt-gemini').value;
  return await callViaProxy('gemini', question, systemPrompt);
}
