// ══ SPEECH ENGINE ══
// Text-to-speech for each model using Web Speech API
// Each model has distinct voice characteristics
// TODO: Replace with ElevenLabs for distinct per-model voices

// iOS audio unlock — Safari requires TTS to be triggered by a user gesture
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const utt = new SpeechSynthesisUtterance('');
  utt.volume = 0;
  window.speechSynthesis.speak(utt);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('click', unlockAudio);

// Pre-load voices
window.speechSynthesis && window.speechSynthesis.getVoices();
window.speechSynthesis && window.speechSynthesis.addEventListener('voiceschanged', function() {
  window.speechSynthesis.getVoices();
});

// Voice profiles per model
const VOICE_PROFILES = {
  claude:   { lang: 'en-GB', pitch: 1.05, rate: 0.93 },  // British, calm
  chatgpt:  { lang: 'en-US', pitch: 1.10, rate: 1.05 },  // American, upbeat
  gemini:   { lang: 'en-AU', pitch: 1.00, rate: 1.00 },  // Australian, neutral
  mistral:  { lang: 'fr-FR', pitch: 0.95, rate: 0.95 },  // French accent if available
  deepseek: { lang: 'en-US', pitch: 0.95, rate: 0.92 },  // Measured, deliberate
};

function speak(text, model) {
  return new Promise(function(resolve) {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    const profile = VOICE_PROFILES[model] || { lang: 'en-US', pitch: 1, rate: 1 };
    const voices = window.speechSynthesis.getVoices();

    // Try to find a matching voice
    const voice = voices.find(v => v.lang === profile.lang)
                || voices.find(v => v.lang.startsWith(profile.lang.split('-')[0]))
                || voices.find(v => v.lang.startsWith('en'));

    if (voice) utt.voice = voice;
    utt.pitch = profile.pitch;
    utt.rate = profile.rate;

    utt.onstart = function() {
      if (orbs[model]) orbs[model].setSpeaking(true);
      const s = document.getElementById('status-' + model);
      if (s) s.textContent = 'Speaking...';
    };

    utt.onend = utt.onerror = function() {
      if (orbs[model]) orbs[model].setSpeaking(false);
      const s = document.getElementById('status-' + model);
      if (s) s.textContent = '';
      resolve();
    };

    window.speechSynthesis.speak(utt);
  });
}
