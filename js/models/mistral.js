// ══ MISTRAL — Mistral AI Large ══
//
// Owner: [assign to a 42 student]
// Persona: Sharp, precise, distinctly European intellectual flair
// API: Via Netlify Function proxy (key stored server-side)
//      See: netlify/functions/mistral.js
//      Set MISTRAL_API_KEY in Netlify environment variables
//      Get one at: https://console.mistral.ai
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-mistral
//   - Modify the Netlify function to change model or parameters

async function callMistral(question) {
  const systemPrompt = document.getElementById('prompt-mistral').value;
  return await callViaProxy('mistral', question, systemPrompt);
}
