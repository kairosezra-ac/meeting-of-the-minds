// ══ MODERATOR ══
// Session management, question bank, question log

// ── Session ──
function updateSystemPrompts() {
  const event    = document.getElementById('session-event')?.value    || 'Beyond Boundaries Global Festival';
  const location = document.getElementById('session-location')?.value || 'Barcelona';
  const topic    = document.getElementById('session-topic')?.value    || 'The Future of Conversational AI';
  const ctx = `${event} in ${location}, debating: ${topic}`;

  const personas = {
    claude:   'calm, considered, and philosophically grounded',
    chatgpt:  'pragmatic, confident, and solution-oriented',
    gemini:   'analytical, curious, and expansive in thinking',
    mistral:  'sharp, precise, with a distinctly European intellectual flair',
    deepseek: 'rigorous, research-driven, and quietly confident',
  };

  ['claude', 'chatgpt', 'gemini', 'mistral', 'deepseek'].forEach(id => {
    const el = document.getElementById('prompt-' + id);
    if (!el) return;
    const name = id === 'chatgpt' ? 'ChatGPT' : id.charAt(0).toUpperCase() + id.slice(1);
    el.value = `You are ${name}, a panelist at ${ctx}. You are ${personas[id]}. Answer in 2-4 sentences. No markdown, no bullet points — plain spoken language only.`;
  });
}

// ── Question Bank ──
function toggleBank() {
  const bank = document.getElementById('question-bank');
  const icon = document.getElementById('bank-icon');
  const hidden = bank.style.display === 'none';
  bank.style.display = hidden ? 'block' : 'none';
  icon.textContent = hidden ? '▾' : '▸';
}

function useQ(el) {
  document.getElementById('questionInput').value = el.textContent;
  document.getElementById('questionInput').focus();
}

// ── Question Log ──
let logCount = 0;

function addToLog(question) {
  const box = document.getElementById('logBox');
  const empty = box.querySelector('.log-empty');
  if (empty) empty.remove();

  logCount++;
  const item = document.createElement('div');
  item.className = 'log-item fade-in';
  item.innerHTML = `<div class="log-num">${String(logCount).padStart(2, '0')}</div><div class="log-q">${question}</div>`;
  item.onclick = function() { document.getElementById('questionInput').value = question; };
  box.insertBefore(item, box.firstChild);
}

// ── Status line ──
function setStatus(label, value) {
  const el = document.getElementById('statusLine');
  if (!el) return;
  el.innerHTML = value ? `${label} — <span>${value}</span>` : label;
}
