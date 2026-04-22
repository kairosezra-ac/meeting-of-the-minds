# Contributing to Meeting of the Minds 🥊

Welcome, 42 Barcelona! You are contributing to a live AI debate that will be performed on stage at the **Beyond Boundaries Global Festival in Barcelona, April 2026**.

Each of you owns one AI model. Your job is to make it as compelling, distinct, and entertaining as possible.

---

## Your mission

Each model needs to feel like a real debate panelist — not just a chatbot answering questions. You control:

1. **The persona** — how your model introduces itself and frames its answers
2. **The system prompt** — the instructions that shape every response
3. **The API call** — the model, temperature, max_tokens, and any prompt chaining

The audience will be conversational AI practitioners. They know their stuff. Make your model interesting.

---

## Who owns what

| Model    | File | Owner |
|----------|------|-------|
| Claude   | `js/models/claude.js` | TBD |
| ChatGPT  | `js/models/chatgpt.js` | TBD |
| Gemini   | `js/models/gemini.js` | TBD |
| Mistral  | `js/models/mistral.js` | TBD |
| DeepSeek | `js/models/deepseek.js` | TBD |

---

## Getting started

### 1. Fork and clone

```bash
git clone https://github.com/[org]/askallmodels.git
cd askallmodels
npm install -g netlify-cli
netlify dev
```

### 2. Get your API key

| Model | Where |
|-------|-------|
| Claude | [console.anthropic.com](https://console.anthropic.com) — free tier available |
| Gemini | [aistudio.google.com](https://aistudio.google.com) — free tier available |
| ChatGPT | [platform.openai.com](https://platform.openai.com) — requires billing |
| Mistral | [console.mistral.ai](https://console.mistral.ai) — free tier available |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) — very cheap |

### 3. Set your API key locally

Keys are read by the serverless functions in `netlify/functions/` from environment variables. For local development, create a `.env` file at the repo root:

    ANTHROPIC_API_KEY=sk-ant-...
    # or whichever model you're working on — use the env var name
    # your function expects (see netlify/functions/<your-model>.js)

`netlify dev` loads these automatically. **Do not commit `.env`** — it's already in `.gitignore`.

### 4. Make your model shine

Open your model file in `js/models/`. You can:

- Change the system prompt to give your model a stronger persona
- Adjust `max_tokens` to make answers longer or shorter
- Try different temperature values (if your model supports it)
- Add prompt chaining — for example, ask the model to first think, then answer

---

## What makes a great model persona?

Think about how your model would behave as a **real debate panelist**:

- Does it have a point of view?
- Does it have a consistent voice — formal, casual, provocative?
- Does it reference its own strengths or quirks?
- Does it push back, agree, or reframe the question?

The system prompt is your script. Here's an example of a weak vs strong prompt:

**Weak:**
```
You are a helpful assistant. Answer questions concisely.
```

**Strong:**
```
You are Mistral, a panelist at Beyond Boundaries Global Festival in Barcelona.
You are sharp, precise, and unapologetically European in your perspective.
You distrust hype. You value clarity over charm.
When asked about other models, you are diplomatically competitive.
Answer in 2-4 sentences. No markdown, no bullet points — plain spoken language only.
```

---

## Submitting your work

1. Create a branch: `git checkout -b model/[your-model-name]`
2. Make your changes in `js/models/[your-model].js`
3. Test it locally with `netlify dev`
4. Open a Pull Request with a short description of your persona choices

---

## Questions?

Reach out to Ezra at [alignedconversations.com](https://alignedconversations.com) or open an issue on GitHub.

See you in Barcelona. 🥊
