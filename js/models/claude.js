// ══ CLAUDE — Anthropic Claude Sonnet 4 ══
// 
// Owner: [assign to a 42 student]
// Persona: Calm, considered, philosophically grounded
// API: Direct browser call (Anthropic allows this with the special header)
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-claude
//   - Modify callClaude() below to change model, temperature, max_tokens
//   - The persona should feel distinct from the other models

async function callClaude(question, apiKey) {
  const systemPrompt = document.getElementById('prompt-claude').value;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ? err.error.message : 'Claude API error');
  }

  const data = await response.json();
  return data.content[0].text;
}
