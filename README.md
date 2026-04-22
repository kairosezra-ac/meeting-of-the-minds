# Meeting of the Minds 🥊

> A live AI debate format where Claude, ChatGPT, Gemini, Mistral and DeepSeek answer the same question simultaneously — on stage, in front of an audience.

**A CDI Foundation × Aligned Conversations production**  
*Beyond Boundaries Global Festival — Barcelona, April 2026*

---

## What is this?

One question. Five AI models. Each responding live, in sequence, as a panelist at a conversational AI conference. The moderator fires a question, the audience watches each model respond in real time — with animated orbs, text typewriter effects, and distinct voices.

Part experiment. Part debate. Part spectacle. Entirely unpredictable.

---

## Live demo

🔗 [askallmodels.alignedconversations.com](https://askallmodels.alignedconversations.com)

---

## Project structure

```
askallmodels/
├── index.html                  ← Main app entry point
├── netlify.toml                ← Netlify build config
├── css/
│   ├── main.css                ← Base styles, CSS variables, colors
│   ├── landing.css             ← Landing page
│   ├── moderator.css           ← Moderator panel + backstage
│   └── orb.css                 ← Orb animations and model panels
├── js/
│   ├── app.js                  ← App logic: navigation, fire, keys
│   ├── orb.js                  ← Canvas orb animation engine
│   ├── speech.js               ← Text-to-speech engine
│   ├── moderator.js            ← Session, question bank, log
│   └── models/
│       ├── claude.js           ← Claude API call + persona
│       ├── chatgpt.js          ← ChatGPT API call + persona
│       ├── gemini.js           ← Gemini API call + persona
│       ├── mistral.js          ← Mistral API call + persona
│       └── deepseek.js         ← DeepSeek API call + persona
└── netlify/
    └── functions/
        ├── claude.js           ← Serverless proxy for Anthropic
        ├── chatgpt.js          ← Serverless proxy for OpenAI
        ├── gemini.js           ← Serverless proxy for Google
        ├── mistral.js          ← Serverless proxy for Mistral AI
        └── deepseek.js         ← Serverless proxy for DeepSeek
```

---

## How to run locally

```bash
# Clone the repo
git clone https://github.com/[org]/askallmodels.git
cd askallmodels

# Install Netlify CLI
npm install -g netlify-cli

# Start local dev server (runs Netlify Functions locally too)
netlify dev
```

Then open `http://localhost:8888` in your browser.

---

## API Keys

| Model    | Where to get a key | How it's called | Key location |
|----------|--------------------|-----------------|--------------|
| Claude   | [console.anthropic.com](https://console.anthropic.com) | Via Netlify Function | Netlify env var |
| Gemini   | [aistudio.google.com](https://aistudio.google.com) | Via Netlify Function | Netlify env var |
| ChatGPT  | [platform.openai.com](https://platform.openai.com) | Via Netlify Function | Netlify env var |
| Mistral  | [console.mistral.ai](https://console.mistral.ai) | Via Netlify Function | Netlify env var |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | Via Netlify Function | Netlify env var |

**No keys live in the code.** All keys are stored as Netlify environment variables.

Add these in Netlify → Site Configuration → Environment Variables:
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`

If a key is missing, that model will return an error message.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute as a 42 Barcelona student.

---

## Credits

Built by [Ezra Cano Lara](https://alignedconversations.com) with Claude (Anthropic).  
Produced in partnership with [CDI Foundation](https://cdifoundation.com).
