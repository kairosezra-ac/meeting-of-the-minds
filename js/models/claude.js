// ══ CLAUDE — Anthropic Claude Sonnet 4 ══
//
// Owner: [assign to a 42 student]
// Persona: Calm, considered, philosophically grounded
// API: Via Netlify Function proxy (key stored server-side)
//      See: netlify/functions/claude.js
//      Set ANTHROPIC_API_KEY in Netlify environment variables
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-claude
//   - Modify the Netlify function to change model or max_tokens

async function callClaude(question) {
  const systemPrompt = document.getElementById('prompt-claude').value;
  return await callViaProxy('claude', question, systemPrompt);
}

// Generic proxy call — used by all models
async function callViaProxy(model, question, systemPrompt) {
  const response = await fetch(`/.netlify/functions/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `${model} proxy error`);
  }

  const data = await response.json();
  return data.text;
}
