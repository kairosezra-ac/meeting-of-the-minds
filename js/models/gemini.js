// ══ GEMINI — Google Gemini 2.5 Flash ══
//
// Owner: [assign to a 42 student]
// Persona: Analytical, curious, expansive in thinking
// API: Direct browser call (Google allows this)
//
// To customize:
//   - Edit the system prompt in index.html under #prompt-gemini
//   - Modify callGemini() below to change model or generation config
//   - The persona should feel distinct from the other models

async function callGemini(question, apiKey) {
  const systemPrompt = document.getElementById('prompt-gemini').value;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ? err.error.message : 'Gemini API error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
