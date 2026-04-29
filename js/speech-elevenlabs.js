// ══ SPEECH ENGINE — TTS dispatcher (ElevenLabs + Voxtral) ══
//
// Drop-in replacement for js/speech.js. js/speech.js is preserved
// untouched as a fallback; index.html selects which engine via the
// <script> tag.
//
// Vendor routing: most models go to ElevenLabs. The Mistral character
// uses Voxtral (Mistral AI's TTS) — see VOICE_VENDOR below. The
// dispatch is per-model, so swapping a single character's vendor is
// a one-line change.
//
// This engine does NOT manage orb state or status text directly. The
// fire loop owns those, but it needs to know the moment audio actually
// starts playing so it can flip "Thinking…" → "Speaking…" at the right
// time (not when the LLM call returns — that's 1–2s before audio
// actually plays). The 3rd argument to speak() is an `onPlaybackStart`
// callback that fires exactly once when:
//   - audio.onplay fires (the success path), OR
//   - we know audio will not play (toggle off, fetch failure, audio
//     error, play() rejected) — so the fire loop's state isn't stuck
//     in "Thinking…" while the typewriter renders the response.
//
// Hard fail on errors: log to console, resolve the Promise, no retry,
// no fallback to Web Speech. The fire loop continues; the typewriter
// still types; only audio is missing for that turn.

const VOICE_VENDOR = {
  claude:   'elevenlabs',
  chatgpt:  'elevenlabs',
  gemini:   'elevenlabs',
  mistral:  'voxtral',
  deepseek: 'elevenlabs',
};

// ElevenLabs voice IDs. Mistral entry is intentionally retained for a
// one-line revert path (flip VOICE_VENDOR.mistral back to 'elevenlabs')
// if Voxtral has issues during the show. Zero runtime cost — only read
// when VOICE_VENDOR points at elevenlabs.
const VOICE_IDS = {
  claude:   'ntHkqwSzLpNOhjpTHQTE',
  chatgpt:  'o87gVFEcB69P1s56N8hj',
  gemini:   'pvcQOjj7sb5caUTCIXSg',
  mistral:  '5Ss5cCclN4XaAC1N9kSZ',  // unused while routing through voxtral; kept for revert
  deepseek: 'TWfoo9aPizRIb0jEV36a',
};

function getEndpoint(model) {
  return VOICE_VENDOR[model] === 'voxtral'
    ? '/.netlify/functions/voxtral'
    : '/.netlify/functions/elevenlabs';
}

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

function speak(text, model, onPlaybackStart) {
  return new Promise(function(resolve) {
    // The callback must fire exactly once per call. The `started` flag
    // guards against double-firing if multiple events occur (e.g.
    // audio.onplay then audio.onerror mid-playback).
    let started = false;
    function fireOnce() {
      if (started) return;
      started = true;
      if (typeof onPlaybackStart === 'function') {
        try { onPlaybackStart(); }
        catch (e) { console.error('[speech-elevenlabs] onPlaybackStart threw', e); }
      }
    }

    // Toggle off → no audio. Fire callback so the moderator's status
    // transitions to "Speaking…" for the typewriter's duration, then
    // resolve immediately. Fire loop's Promise.all still waits on
    // typeText.
    if (window.AudioState && !window.AudioState.isAudioOn(model)) {
      fireOnce();
      resolve();
      return;
    }

    const voiceId = VOICE_IDS[model];
    if (!voiceId) {
      console.error('[speech-elevenlabs] No voice ID for model:', model);
      fireOnce();
      resolve();
      return;
    }

    fetch(getEndpoint(model), {
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
      // Success path: audio actually starts → fire the callback.
      audio.onplay = function() { fireOnce(); };
      audio.onended = cleanup;
      audio.onerror = function(e) {
        console.error('[speech-elevenlabs] playback error', e);
        // Even on mid-playback error, ensure the callback fired so
        // the state isn't stranded in "Thinking…".
        fireOnce();
        cleanup();
      };
      audio.play().catch(function(e) {
        console.error('[speech-elevenlabs] play() rejected', e);
        fireOnce();
        cleanup();
      });
    }).catch(function(err) {
      // Hard fail per spec: log, fire callback so state isn't stuck,
      // resolve. No retry, no fallback.
      console.error('[speech-elevenlabs]', err);
      fireOnce();
      resolve();
    });
  });
}
