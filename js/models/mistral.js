// ══ MISTRAL — Mistral AI Large ══
//
// Owner: [assign to a 42 student]
// Persona: Sharp, precise, distinctly European intellectual flair
// API: Via Netlify Function proxy (Mistral blocks direct browser calls)
//      See: netlify/functions/mistral.js
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-mistral
//   - Modify callMistral() below to change model or parameters
//   - Set MISTRAL_API_KEY in Netlify environment variables

async function callMistral(question, claudeKey) {
  const systemPrompt = document.getElementById('prompt-mistral').value;

  const response = await fetch('/.netlify/functions/mistral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt }),
  });

  // If Netlify function not available, fall back to Claude persona
  if (!response.ok) {
    console.warn('Mistral proxy unavailable, falling back to Claude persona');
    return await callClaude(question, claudeKey, systemPrompt);
  }

  const data = await response.json();
  return data.text;
}
