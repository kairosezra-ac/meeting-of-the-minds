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
        // Keep the typewriter caret in view inside the bounded response
        // region. On short responses this is a no-op (nothing to scroll);
        // on long responses it keeps new characters visible as they appear.
        el.scrollTop = el.scrollHeight;
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

// Pacing pause between models — gives the audience a beat to absorb
// each answer before the next begins. Skipped after the last model.
const INTER_MODEL_BUFFER_MS = 1200;

async function fireQuestion() {
  if (isFiring) return;

  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;

  isFiring = true;
  document.getElementById('fireBtn').disabled = true;
  addToLog(question);

  // Broadcast the new question + clear any stale "speaking" marker so
  // every open Stage window starts the round clean.
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

  // Fire models sequentially — each one speaks before the next begins.
  // for-i (not for-of) so we can detect the final iteration and skip
  // the inter-model buffer after the last model.
  const selectedArray = Array.from(selected);
  for (let i = 0; i < selectedArray.length; i++) {
    const model = selectedArray[i];

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
      // Don't setThinking(false) yet. "Thinking…" persists through the
      // TTS round-trip so audience and operator see "Thinking" during
      // the actual think — including the LLM call AND the time it
      // takes for audio to start playing. The transition to "Speaking"
      // fires inside the onPlaybackStart callback below, when the
      // speech engine signals that audio actually started (or when
      // it knows audio won't play — toggle off, error path, etc.).
      // setSpeaking(true) implicitly exits the thinking state in the
      // orb engine (intensity 0.7 → 1.0, speaking=true).

      const onPlaybackStart = function() {
        if (statusEl) statusEl.textContent = 'Speaking...';
        if (orbs[model]) orbs[model].setSpeaking(true);
      };

      await Promise.all([typeText(model, text), speak(text, model, onPlaybackStart)]);

      if (orbs[model]) orbs[model].setSpeaking(false);
      if (statusEl) statusEl.textContent = '';
    } catch(err) {
      if (orbs[model]) orbs[model].setThinking(false);
      // Defensive — if Promise.all threw mid-flight, setSpeaking may have
      // been latched true. Clear it so the orb doesn't strand mid-pulse.
      if (orbs[model]) orbs[model].setSpeaking(false);
      const el = document.getElementById('response-' + model);
      if (el) { el.classList.remove('empty'); el.textContent = 'Error: ' + err.message; }
      if (statusEl) statusEl.textContent = '';
      console.error(model, err);
    }

    // Clear the broadcast "currently speaking" so Stage windows mirror
    // the local orb returning to idle. Without this, Stage windows
    // would show the previous speaker glowing through the buffer pause.
    if (window.DebateState) {
      DebateState.update({ currentlySpeaking: null });
    }

    // Inter-model pacing pause — skipped after the final model.
    if (i < selectedArray.length - 1) {
      await new Promise(function(r) { setTimeout(r, INTER_MODEL_BUFFER_MS); });
    }
  }

  setStatus('Round complete', 'fire the next question');
  document.getElementById('fireBtn').disabled = false;
  isFiring = false;

  // Return to moderator dashboard panel (intra-zone; URL unchanged).
  switchTab('mod', document.querySelector('[data-tab=mod]'));
}

// ── Enter key fires question ──
document.getElementById('questionInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fireQuestion(); }
});
