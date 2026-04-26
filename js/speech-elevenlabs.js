// ══ SPEECH ENGINE — ElevenLabs ══
//
// Drop-in replacement for js/speech.js. Same public interface so the
// fire loop in js/app.js doesn't change. js/speech.js is preserved
// untouched as a fallback; index.html selects which engine via the
// <script> tag.
//
// This engine does NOT manage orb state or status text — the fire loop
// owns those. This file's only responsibility is audio playback (when
// AudioState.isAudioOn(model) is true) and Promise resolution.
//
// Hard fail on errors: log to console, resolve the Promise, no retry,
// no fallback to Web Speech. The fire loop continues; the typewriter
// still types; only audio is missing for that turn.

const VOICE_IDS = {
  claude:   'ntHkqwSzLpNOhjpTHQTE',
  chatgpt:  'o87gVFEcB69P1s56N8hj',
  gemini:   'pvcQOjj7sb5caUTCIXSg',
  mistral:  '5Ss5cCclN4XaAC1N9kSZ',
  deepseek: 'TWfoo9aPizRIb0jEV36a',
};

// ── iOS audio unlock ──
// Safari blocks programmatic audio playback until a user gesture has
// occurred. Mirror the unlock pattern from js/speech.js but for the
// HTMLAudioElement API: on first touch/click, play a tiny silent WAV.
// After this, subsequent programmatic .play() calls are permitted.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
  a.muted = true;
  a.play().catch(function() {});
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('click', unlockAudio);

function speak(text, model) {
  return new Promise(function(resolve) {
    // Toggle off → no audio. Resolve immediately. Fire loop's Promise.all
    // still waits on the typewriter; orb state is fire-loop-managed.
    if (window.AudioState && !window.AudioState.isAudioOn(model)) {
      resolve();
      return;
    }

    const voiceId = VOICE_IDS[model];
    if (!voiceId) {
      console.error('[speech-elevenlabs] No voice ID for model:', model);
      resolve();
      return;
    }

    fetch('/.netlify/functions/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, voiceId: voiceId }),
    }).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(body) {
          throw new Error('Proxy ' + response.status + ': ' + body.slice(0, 200));
        });
      }
      return response.blob();
    }).then(function(blob) {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      const cleanup = function() {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onended = cleanup;
      audio.onerror = function(e) {
        console.error('[speech-elevenlabs] playback error', e);
        cleanup();
      };
      audio.play().catch(function(e) {
        console.error('[speech-elevenlabs] play() rejected', e);
        cleanup();
      });
    }).catch(function(err) {
      // Hard fail per spec: log, resolve, no fallback.
      console.error('[speech-elevenlabs]', err);
      resolve();
    });
  });
}
