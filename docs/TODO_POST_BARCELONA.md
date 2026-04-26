# Post-Barcelona Cleanup & Decisions

Items deferred from the pre-conference crunch. Each has enough context here
to be picked up cold after the show. None block production.

---

## Technical debt

### PR #6 muddled scope

ElevenLabs proxy and Voxtral routing for the Mistral character were shipped
together in a single squash-merge (`11d0234`) for showtime expediency. The
two changes are conceptually independent — one introduces a TTS proxy
infrastructure, the other swaps a single character's vendor — and would
ideally have been two PRs.

**Consider** replaying as two separate PRs before the next major TTS change:
`feature/elevenlabs-proxy` + `feature/voxtral-mistral`. Cleaner revert path
if either piece needs to be peeled back independently.

### Typewriter sync regression

Typewriter-to-audio sync has been imperfect since the ElevenLabs integration
landed. Symptoms vary; root cause not yet investigated. Currently lives
under "good enough for the show" — the timing offsets aren't dramatic and
the round still reads clearly.

**Investigate** post-conference. Either fix or accept as a known limitation
and document it formally.

### Backstage tab

Still pending from before voice-integration work. Originally scoped, never
landed.

### Focus view orb glow regression

Small CSS fix, deferred from before voice-integration work. Single-file
change, low risk; just hasn't been picked up.

---

## Architecture decision: native-ecosystem TTS, partially realized

The Mistral character now speaks via Mistral's own TTS (Voxtral, voice
`fr_marie_curious` via `voxtral-mini-tts-2603`). This is a small step
toward "each character speaks through its own ecosystem's TTS where
possible."

The remaining four characters (Claude, ChatGPT, Gemini, DeepSeek) continue
to route through ElevenLabs. This is a **deliberate choice**, not a deferred
to-do, given research findings on **Apr 27, 2026**:

- **Claude → ElevenLabs.** Anthropic uses ElevenLabs themselves for Claude
  voice mode. ElevenLabs for the Claude character is therefore alignment
  with Anthropic's own product choice, not a compromise.

- **ChatGPT → ElevenLabs.** OpenAI's TTS was considered and deferred.
  Architectural complexity (separate auth surface, different streaming
  model) plus accent control limitations confirmed via testing on
  OpenAI.fm. Not worth the integration cost for the marginal authenticity
  gain.

- **Gemini → ElevenLabs.** Google's TTS similarly considered and deferred.
  Same trade-off: integration complexity vs. marginal benefit.

- **DeepSeek → ElevenLabs.** DeepSeek has no native TTS as of Apr 2026.
  Qwen3-TTS was tested via Hugging Face Space and ruled out: Chinese
  inflection on English text doesn't render reliably across vendors —
  the same structural limitation that affects ElevenLabs' Voice Design
  for cross-cultural English. The DeepSeek statesman gravitas is best
  achieved via ElevenLabs voice selection rather than vendor-native TTS.

**Reconsider quarterly** as the TTS landscape evolves. ChatGPT and Gemini
are the most likely to flip to native if/when those ecosystems improve
their accent control and ergonomics. DeepSeek depends on a viable Chinese
TTS provider emerging.

---

_Generated 2026-04-27 from session notes. Update this file as items
land or as new debt accumulates._
