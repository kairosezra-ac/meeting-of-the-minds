// ══ AUDIO STATE — per-model audio toggle ══
//
// Volatile state: page load = all five models ON. No persistence
// (no localStorage, no sessionStorage). Refresh resets to all ON.
//
// Read by speak() in js/speech-elevenlabs.js via AudioState.isAudioOn(model).
// Toggled from each model's Agent Settings panel via toggleAudio(model, btn).
//
// Toggling does not interrupt currently-playing audio — the engine reads
// state at call time, not continuously. The change applies on the next
// speak() call.

(function() {
  const state = {
    claude:   true,
    chatgpt:  true,
    gemini:   true,
    mistral:  true,
    deepseek: true,
  };

  function isAudioOn(model) {
    return state[model] !== false;
  }

  function toggle(model, btnEl) {
    state[model] = !state[model];
    if (btnEl) {
      btnEl.classList.toggle('on', state[model]);
      btnEl.classList.toggle('off', !state[model]);
      btnEl.setAttribute('aria-pressed', state[model] ? 'true' : 'false');
    }
  }

  window.AudioState = { isAudioOn, toggle };
  window.toggleAudio = toggle; // for inline onclick=
})();
