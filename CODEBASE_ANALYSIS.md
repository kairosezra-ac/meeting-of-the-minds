# Meeting of the Minds — Codebase Analysis

_Internal technical analysis of the repository as of commit `005f694` (main)._
_Not intended as user-facing documentation._

---

## 1. Project overview

A vanilla-JS static site that runs a live AI panel format: one moderator question → five models (Claude, ChatGPT, Gemini, Mistral, DeepSeek) answer in sequence, each with an animated canvas orb, typewriter text, and text-to-speech voice. Single-operator stage demo, not a multi-user product. Hosted on Netlify with serverless function proxies for API key hiding and CORS.

Built by Ezra Cano Lara (Aligned Conversations) with Claude, in partnership with CDI Foundation. Target audience: 42 Barcelona students customize individual model personas.

---

## 2. Architecture & data flow

End-to-end path of a single fired question:

```
Moderator types in #questionInput
  → fireQuestion()                               [app.js:117]
  → addToLog(question)                           [moderator.js:44]
  → for each model in `selected` (Set), sequentially:
      → setStatus + orb.setThinking(true)        [app.js:137–140]
      → switchTab(model)  (spotlight the panel)  [app.js:143]
      → call{Model}(question)                    [app.js:147–156]
          → callViaProxy(model, question, sys)   [js/models/*.js]
          → POST /.netlify/functions/{model}
          → Netlify function reads process.env.*_API_KEY
          → calls vendor API
          → returns { text }
      → orb.setThinking(false)
      → Promise.all([typeText(...), speak(...)]) [app.js:161]
        (typewriter + TTS run concurrently; next
         model waits for both to finish)
  → setStatus("Round complete") + switchTab('mod')
```

Key property: **models fire sequentially, not in parallel**. Each finishes speaking before the next begins. This is the stage-format choice — it's what makes the show feel like a panel, not a race.

---

## 3. File inventory

### Root
| File | Purpose |
|---|---|
| `index.html` (279 lines) | SPA entry; 8 toggleable panels (landing, moderator, 5 model tabs, backstage) |
| `netlify.toml` (8 lines) | Netlify build config; rewrites `/api/*` → `/.netlify/functions/*` |
| `.gitignore` | Ignores `.env`, `node_modules`, `.DS_Store` |
| `README.md` | Public project description + setup |
| `CONTRIBUTING.md` | 42 student onboarding |

### JavaScript (`js/`)
| File | LOC | Purpose |
|---|---|---|
| `app.js` | 189 | Central controller: nav, toggle, fire loop, typewriter, key UI |
| `moderator.js` | 63 | Session metadata, dynamic system prompts, question bank, log |
| `orb.js` | 80 | Canvas orb animation engine (60 FPS, vanilla) |
| `speech.js` | 69 | Web Speech API TTS with per-model voice profiles |
| `models/claude.js` | ~17 | Thin shell → `callViaProxy` |
| `models/chatgpt.js` | ~17 | Thin shell → `callViaProxy` |
| `models/gemini.js` | ~17 | Thin shell → `callViaProxy` |
| `models/mistral.js` | ~17 | Thin shell → `callViaProxy` |
| `models/deepseek.js` | ~17 | Thin shell → `callViaProxy` |

### Netlify Functions (`netlify/functions/`)
| File | Vendor API | Model | Notes |
|---|---|---|---|
| `claude.js` | `api.anthropic.com/v1/messages` | `claude-sonnet-4-20250514` | max_tokens 300 |
| `chatgpt.js` | `api.openai.com/v1/chat/completions` | `gpt-4o` | max_tokens 300 |
| `gemini.js` | `generativelanguage.googleapis.com` | `gemini-2.5-flash` | max_tokens **800**, temp **0.9** |
| `mistral.js` | `api.mistral.ai/v1/chat/completions` | `mistral-large-latest` | max_tokens 300 |
| `deepseek.js` | `api.deepseek.com/v1/chat/completions` | `deepseek-chat` | max_tokens 300 |

### CSS (`css/`)
| File | LOC | Role |
|---|---|---|
| `main.css` | 70 | CSS variables (colors, type), reset, tab bar, panel toggle |
| `landing.css` | 93 | Hero page, gradient title, CTA |
| `moderator.css` | 186 | Session fields, question bank, model toggles, fire btn, log, backstage |
| `orb.css` | 127 | Canvas container, cursor, response text, prompt editor, challenge btn |

---

## 4. Per-file deep dive (JS)

### `js/app.js` — central controller
- **State**: `selected` (Set of enabled models), `isFiring` (lock), `lastResponse` (cache by model)
- **Fire loop** (`fireQuestion`, line 117): sequential; each iteration sets status → thinking orb → switches tab → awaits API call → triggers typewriter + TTS concurrently via `Promise.all`
- **Per-model error recovery** (line 163): if one model fails, the error text goes into that model's response panel and the loop continues. Other models unaffected.
- **Auto-spotlight**: mid-fire `switchTab(model)` (line 143) visually rotates focus onto whichever model is currently speaking.
- **Challenge feature** (line 105): "Challenge Another Model" button pulls a model's response into the question field for immediate rebuttal.
- **Enter-to-fire**: `keydown` listener on `#questionInput` (line 182) — Enter fires, Shift+Enter newline.

### `js/moderator.js` — context & history
- **Dynamic system prompt** (line 11): builds each model's system prompt by interpolating `event`, `location`, `topic` session fields into a template, then reads the per-model textarea and combines. This is how the same models get re-contextualized per conference — session metadata "primes" all five personas at once.
- **Question bank** (line 28): collapsible curated list; clicking a canned question populates the input.
- **Log** (`addToLog`, line 44): each fired question becomes a clickable log item; clicking replays by re-populating the input.

### `js/orb.js` — canvas animation
- **Per-orb state**: `{ phase, intensity, targetIntensity, speaking }`
- **Visual states**:
  - Idle: intensity 0.3, phase += 0.02/frame
  - Thinking: targetIntensity → 0.7, phase += 0.05/frame
  - Speaking: targetIntensity → 1.0, speaking flag true
- **Easing**: intensity → targetIntensity at 8%/frame → "breathing" feel
- **Rendering**: radial gradient with wobbling center offset + outer glow, drawn at ~60 FPS via `requestAnimationFrame`
- No external library; everything is raw Canvas 2D.

### `js/speech.js` — text-to-speech
- **Engine**: browser Web Speech API (`SpeechSynthesisUtterance`)
- **iOS unlock hack** (lines 8–18): Safari mutes TTS until first user gesture; a throwaway utterance is triggered on first `touchstart`/`click` to unlock.
- **Per-model voice profiles** (lines 27–33):

| Model | Lang | Pitch | Rate | Effect |
|---|---|---|---|---|
| Claude | en-GB | 1.05 | 0.93 | calm British |
| ChatGPT | en-US | 1.10 | 1.05 | upbeat American |
| Gemini | en-AU | 1.00 | 1.00 | neutral Australian |
| Mistral | fr-FR | 0.95 | 0.95 | French (falls back to en-US if unavailable) |
| DeepSeek | en-US | 0.95 | 0.92 | measured American |

- **Voice selection cascade**: exact `lang` match → prefix match → any English voice.
- **Promise-wrapped**: `speak()` resolves on `onend` or `onerror`, so the fire loop can `await` it.
- **TODO on line 4**: migrate to ElevenLabs for distinct, production-quality voices.

### `js/models/*.js` — thin API shells
All five files are near-identical:
1. Read the per-model system prompt from `#prompt-{model}` textarea.
2. Call `callViaProxy(model, question, systemPrompt)` (shared helper — probably in one of the model files or inlined).
3. Return the text.

No direct vendor SDK usage, no browser-side keys, no retry logic.

### `netlify/functions/*.js` — serverless proxies
All five follow the same pattern:
1. Reject non-POST (405).
2. Read key from `process.env.<VENDOR>_API_KEY`; 500 if missing.
3. Parse `{ question, systemPrompt }` from body.
4. Fetch vendor API with key in header (or query string for Gemini).
5. Parse response text from vendor-specific shape.
6. Return `{ text }`.

Gemini is the outlier — see §9.

---

## 5. CSS

- **Variables**: brand colors per model in `main.css` (`--claude`, `--chatgpt`, etc.); dark theme (`--bg: #060606`, `--surface: #0f0f0f`).
- **Type**: DM Mono (body, 300/400 weights) + Bebas Neue (headings, uppercase, tracked-out).
- **Responsive**: `clamp()` for font sizes, `vw` units for orb dimensions; flex + grid for layout.
- **Tab bar**: sticky, horizontally scrollable on narrow screens.
- **Orb visuals**: 240×240 canvas inside a circular container (`border-radius: 50%`); typewriter cursor uses keyframe blink animation.
- **No component layer** — styles are flat, IDs and class-based, no CSS modules or framework.

---

## 6. Netlify integration

### `netlify.toml`
```toml
publish = "."                    # root = site root
functions = "netlify/functions"  # functions directory
# redirect: /api/* → /.netlify/functions/:splat
```

### Why every model goes through a function (even ones with JS SDKs)

All five vendors are proxied, not just the ones that "need" it. Reasons:
1. **CORS** — most vendor APIs reject browser-origin calls.
2. **Key hiding** — no vendor key ever touches the client.
3. **Consistency** — one pattern for all five. Easier for 42 students to copy-paste-customize.

The README says Claude is called "direct from the browser" — **this is out of date**. All five are proxied.

### Required environment variables (in Netlify UI)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`

---

## 7. State & runtime

- **Framework**: none. Vanilla JS, direct DOM (`getElementById`, `querySelectorAll`, `addEventListener`).
- **State scope**: module-global variables in `app.js` (`selected`, `isFiring`, `lastResponse`) + DOM state (textarea values, log items).
- **localStorage**: used by `saveKey()` but **never read back** (see §8).
- **Single-user, single-session**. Each reload resets state except localStorage keys (which are dead weight anyway).
- **Concurrency within a round**: models serial, but each model's typewriter + TTS run concurrent via `Promise.all`.

---

## 8. Deep dive: Backstage UI is dead code

The entire API-key-management flow in the Backstage panel is **non-functional**.

### Evidence

| Line | File | Observation |
|---|---|---|
| `app.js:7` | `const PRESET_KEYS = {};` | Empty object, never populated |
| `app.js:9–11` | `saveAllKeys()` | No-op; comment says "No preset keys" |
| `app.js:13–16` | `loadKeys()` | No-op; comment says "Keys stored in Netlify env vars" |
| `app.js:18–35` | `saveKey()` | Writes `localStorage['debate-key-' + model]` — **no code anywhere reads this** |
| `app.js:49` | `if (id === 'backstage') loadKeys();` | Calls the no-op |
| `app.js:188` | `loadKeys()` on init | Calls the no-op |
| `index.html:229` | UI text | "Keys are preloaded. But hit Save to be extra sure…" — **false on both counts** |
| `js/models/*.js` | none | No reads from localStorage |
| `netlify/functions/*.js` | none | Keys read exclusively from `process.env` |

### Impact

- **Misleading UX**: the operator sees key fields, types a key, sees "Saved ✓", and believes something happened. Nothing did.
- **Minor security footgun**: if the operator pastes a real key, it's persisted in plaintext `localStorage`, visible to browser extensions and dev tools, with no downstream use.
- **Probably legacy**: almost certainly leftover from an earlier architecture where keys ran client-side. Comments in `app.js` acknowledge the shift ("Keys are stored in Netlify environment variables, not localStorage") — but the form wasn't ripped out.

### Recommended fix

Either:
- **Option A (delete)**: remove the Backstage key form from `index.html`, delete `saveKey`/`loadKeys`/`PRESET_KEYS` from `app.js`, keep only the ℹ️ info note explaining that keys live in Netlify env vars.
- **Option B (real feature)**: wire the localStorage keys through to the Netlify functions as an override (POST body includes optional `apiKey`, function prefers it over `process.env`). Useful for 42 students testing with personal keys — but opens the door to leaking keys if someone screenshots Backstage.

Option A is cleaner. Option B has a real use case for local dev, but then `netlify dev` with a local `.env` already covers that.

---

## 9. Deep dive: Gemini parameter drift

Gemini's Netlify function is systematically different from the other four. It behaves like a file that was debugged under pressure and never normalized back.

### Differences

| Dimension | Other 4 | Gemini |
|---|---|---|
| Token budget | `max_tokens: 300` | `maxOutputTokens: 800` (**~2.7× longer**) |
| Temperature | unset (vendor default) | `0.9` explicit |
| Response parsing | `data.choices[0].message.content` | `candidate.content.parts.map(p => p.text).join('')` — joins all parts |
| Debug output | none | `console.log` of `finishReason` and text length (lines 36–37) |
| Return payload | `{ text }` | `{ text, finishReason }` (extra field, unused by client) |
| API style | OpenAI-compatible | Google-native (`system_instruction`, `contents`, `generationConfig`) |

### Impact on stage

- **Uneven turns**: Gemini answers will be noticeably longer. Longer text = longer typewriter (18 ms/char) + longer TTS. Audience experience skews toward Gemini dominating airtime.
- **Different creativity profile**: temp 0.9 makes Gemini outputs more varied than the four models at default temperature (where defaults range ~0.7–1.0 depending on vendor). Not inherently bad, but it's an unintentional comparison-breaking variable.
- **Dev clutter**: `console.log` and the unused `finishReason` field in the response suggest debugging that should be cleaned up.

### Why it probably happened

Google's API format is the most different, and Gemini 2.5 Flash in particular has been known to return multi-part responses when `maxOutputTokens` is too low — likely the function hit empty-text responses, got bumped to 800 tokens to fix truncation, and the `.join('')` + debug logs were added mid-debugging. Never reverted.

### Recommended fix

Normalize with the pack:
- Lower `maxOutputTokens` to 300 (match others) — unless longer Gemini responses are intentional.
- Remove the explicit `temperature: 0.9` OR add matching temps to the other four (pick a policy — defaults or explicit).
- Drop the `console.log` lines.
- Drop `finishReason` from the response body (client ignores it anyway).
- Keep the `.parts.map(...).join('')` — that's defensive and correct for Google's API shape.

---

## 10. Other issues worth flagging

### Security
- **No auth/rate-limit on Netlify functions.** Anyone who finds the `/api/*` routes can burn your vendor tokens. Fine for a conference demo; dangerous if left running long-term. Consider: origin check, shared-secret header, or a Netlify edge function with rate limiting.
- **No CSRF protection.** Not critical for a stateless POST-only flow, but noted.

### Accessibility
- `<meta viewport user-scalable=no>` in `index.html` blocks pinch-zoom. WCAG red flag; harmless for stage use.
- Canvas orbs have no ARIA labeling — screen readers get nothing.
- Typewriter effect doesn't respect `prefers-reduced-motion`. Same for orb animation.

### Performance
- All five orbs render at 60 FPS even when their tab isn't visible (`orb.js` doesn't gate on visibility). Minor CPU waste.
- No debouncing on session-metadata inputs that trigger `updateSystemPrompts()`.

### Documentation drift
- README claims Claude is called direct from the browser with a "baked in fallback." It isn't — Claude goes through `netlify/functions/claude.js` like everyone else.
- README and CONTRIBUTING both reference the Backstage key flow as if it works. It doesn't (see §8).

### Error handling
- Per-model errors are caught and shown inline (good), but there's no retry. If Gemini times out, the moderator has to refire manually.
- No timeout on the `fetch()` in Netlify functions — if a vendor hangs, the function hangs until Netlify's own timeout (~10s default) cuts it.

---

## 11. CONTRIBUTING.md summary

Workflow for 42 Barcelona students:

1. Fork, clone, `npm install -g netlify-cli`, `netlify dev` for local.
2. Claim one `js/models/{name}.js` file.
3. Customize system prompt and persona. README gives examples of weak vs. strong personas:
   - Weak: _"You are a helpful assistant."_
   - Strong: _"You are Mistral — sharp, precise, distrust hype, value clarity…"_
4. Adjust `max_tokens` or `temperature` if needed.
5. PR back.

Notably absent:
- No guidance on coordinating when multiple students edit the same file.
- No testing expectations.
- No deployment guidance — assumes the maintainer handles Netlify env vars.
- References Backstage key flow as if it works.

---

## 12. Suggested fixes (prioritized)

### High priority
1. **Delete the dead Backstage key UI** (§8). Ships immediately; reduces confusion; closes a minor key-leak footgun.
2. **Normalize Gemini parameters** to match the other four (§9). Restores stage fairness.
3. **Update README** to reflect that all five models route through Netlify functions (not just three).

### Medium priority
4. Add minimal auth to Netlify functions (shared-secret header from the HTML, or origin check) so the endpoints can't be hit by anyone who finds them.
5. Add per-fetch timeout in Netlify functions (e.g., 8s) so one slow vendor doesn't block the round.
6. Clean `console.log` + unused `finishReason` in `gemini.js`.

### Low priority / nice-to-have
7. Migrate TTS from Web Speech API to ElevenLabs — big quality jump for stage (already a TODO).
8. Gate orb rendering on tab visibility (skip `requestAnimationFrame` work when the panel isn't active).
9. Respect `prefers-reduced-motion` for typewriter + orb animations.
10. Add accessibility labels to canvas orbs.

---

_Analysis compiled by Claude, 2026-04-22, against commit `005f694` on `main`._
