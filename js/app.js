// ══ APP.JS — Moderator-zone controller ══
//
// Fire loop, model toggles, typewriter, and the intra-zone tab switcher.
// Zone-level routing lives in js/router.js; this file is agnostic to
// URLs — it drives the Moderator experience and broadcasts state.
//
// API keys live in Netlify environment variables, consumed server-side
// by netlify/functions/*. There is no client-side key handling.

// ── Intra-zone tab switching ──
// Used by the Moderator tab bar and by the fire loop to spotlight each
// model as it speaks. Does NOT update the URL — URL-level navigation is
// Router.navigate(). During a fire round the URL stays at /moderator;
// /moderator/focus/<model> exists as a deep-link target.
function switchTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.className = 'tab');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  if (el) {
    el.className = 'tab active-' + id;
  }

  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
}

// ── Model toggles ──
const selected = new Set(['claude', 'chatgpt', 'gemini', 'mistral', 'deepseek']);

const modelNames = {
  claude:   'Claude',
  chatgpt:  'ChatGPT',
  gemini:   'Gemini',
  mistral:  'Mistral',
  deepseek: 'DeepSeek',
};

function toggleModel(btn) {
  const model = btn.dataset.model;
  if (selected.has(model)) {
    if (selected.size <= 1) return; // Keep at least one
    selected.delete(model);
    btn.classList.remove('on');
  } else {
    selected.add(model);
    btn.classList.add('on');
  }
}

// ── Type text ──
function typeText(model, text) {
  return new Promise(function(resolve) {
    const el = document.getElementById('response-' + model);
    el.classList.remove('empty');
    el.innerHTML = '';

    const cursor = document.createElement('span');
    cursor.className = 'orb-cursor';
    cursor.style.background = `var(--${model})`;
    el.appendChild(cursor);

    let i = 0;
    function type() {
      if (i < text.length) {
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(type, 18);
      } else {
        cursor.remove();
        const btn = document.getElementById('challenge-' + model);
        if (btn) btn.classList.add('visible');
        resolve();
      }
    }
    type();
  });
}

// ── Challenge ──
function challengeFrom(model) {
  const response = document.getElementById('response-' + model);
  if (!response) return;
  const text = response.textContent;
  document.getElementById('questionInput').value = text;
  switchTab('mod', document.querySelector('[data-tab=mod]'));
}

// ── Fire ──
let isFiring = false;
let lastResponse = {};

async function fireQuestion() {
  if (isFiring) return;

  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;

  isFiring = true;
  document.getElementById('fireBtn').disabled = true;
  addToLog(question);

  // Broadcast the new question + clear any stale "speaking" marker so
  // every open Stage window shows the question and no highlight.
  if (window.DebateState) {
    DebateState.update({ currentQuestion: question, currentlySpeaking: null });
  }

  // Clear previous responses
  for (const m of selected) {
    const el = document.getElementById('response-' + m);
    if (el) { el.textContent = ''; el.classList.add('empty'); }
    const btn = document.getElementById('challenge-' + m);
    if (btn) btn.classList.remove('visible');
  }

  // Fire models sequentially — each one speaks before the next begins
  for (const model of selected) {
    setStatus('Asking ' + modelNames[model], 'thinking...');
    const statusEl = document.getElementById('status-' + model);
    if (statusEl) statusEl.textContent = 'Thinking...';
    if (orbs[model]) orbs[model].setThinking(true);

    // Spotlight this model in the moderator tab bar AND on every Stage
    // window (via BroadcastChannel). The moderator's URL stays at
    // /moderator throughout the round — spotlighting is internal state,
    // not navigation.
    switchTab(model, document.querySelector(`[data-tab=${model}]`));
    if (window.DebateState) {
      DebateState.update({ currentlySpeaking: model });
    }

    try {
      let text;
      if (model === 'claude') {
        text = await callClaude(question);
      } else if (model === 'gemini') {
        text = await callGemini(question);
      } else if (model === 'chatgpt') {
        text = await callChatGPT(question);
      } else if (model === 'mistral') {
        text = await callMistral(question);
      } else if (model === 'deepseek') {
        text = await callDeepSeek(question);
      }

      lastResponse[model] = text;
      if (orbs[model]) orbs[model].setThinking(false);
      await Promise.all([typeText(model, text), speak(text, model)]);

    } catch(err) {
      if (orbs[model]) orbs[model].setThinking(false);
      const el = document.getElementById('response-' + model);
      if (el) { el.classList.remove('empty'); el.textContent = 'Error: ' + err.message; }
      console.error(model, err);
    }

    if (statusEl) statusEl.textContent = '';
  }

  setStatus('Round complete', 'fire the next question');
  document.getElementById('fireBtn').disabled = false;
  isFiring = false;

  // Round over — clear the "speaking" marker on all Stage windows.
  if (window.DebateState) {
    DebateState.update({ currentlySpeaking: null });
  }

  // Return to moderator dashboard panel (intra-zone; URL unchanged).
  switchTab('mod', document.querySelector('[data-tab=mod]'));
}

// ── Enter key fires question ──
document.getElementById('questionInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fireQuestion(); }
});
