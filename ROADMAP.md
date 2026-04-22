# Meeting of the Minds — Product Roadmap

*Version 1.10 — April 22, 2026*

---

## Guiding Principles

**Separation of concerns.** Phase 1 and Phase 2 are developed in separate repositories. Phase 1 work in the `meeting-of-the-minds` repo never destabilizes the event-ready site. Phase 2 ambition lives in its own repo and doesn't threaten the live Barcelona experience. The two eventually share a domain (`askallmodels.alignedconversations.com`), but how that deployment is stitched together — subsumed, forwarded, or otherwise — is a Phase 2 decision, not a Phase 1 one. Learnings port across deliberately, not accidentally.

**Scope discipline before Barcelona.** Everything not on the Phase 1 list is explicitly deferred. The six-day window rewards focus over breadth.

**Architectural investments earn their keep over time.** Some decisions (role split, URL-routed views, BroadcastChannel for local multi-screen) deliver modest value in Phase 1 but substantial value in Phase 2. Build them thoughtfully now so Phase 2 inherits them cleanly.

**Both single-screen and multi-screen setups are first-class runtime modes.** The Barcelona event may run on five external monitors (the theatrical multi-screen setup) or on a single screen (a laptop, the Mac mini's own display, one monitor) depending on what the hardware and venue permit. The software treats both as legitimate configurations, not one as a "backup" of the other. The single-screen mode must deliver a strong, well-designed experience on its own merits — not feel like a degraded version of the multi-screen one.

**Theatrical vocabulary is load-bearing, not decorative.** The app is a *place*, and its vocabulary names real functional zones: **Entry** (where visitors arrive and choose their role), **Backstage** (the moderator's workspace — prepare, perform, monitor), **Stage** (the observer's view of the debate). Inside the Stage, viewers choose their vantage — **panorama** (all five models, take in the whole panel) or **focus** (one model, like locking attention on a single panelist). The metaphor mirrors how attention actually works at a live panel, which is why it's intuitive without explanation.

**Focus vs. panorama is a rendering property of the Stage, not a role property.** The moderator (in Backstage) drives the debate. Stage views each choose their own rendering. Multi-screen theatrical setups are simply multiple focused Stage views running at once. This unifies local setups with remote Phase 2 viewers — both are Stage instances, just in different contexts.

**Debate ID is the root primitive.** All state and URLs hang off a debate ID. Stage and Backstage are views *onto a debate*; Moderator and Observer are roles *relative to a debate*, not global app roles. In Phase 1 the ID is hardcoded (`barcelona`, one debate only); in Phase 2 IDs become dynamic (one per user-created debate). The architecture does not change between phases — only the ID generation does.

**Structure code as a team would, not as one person — as a discipline, not a rule.** The aspiration is decomposed, ownership-bounded files and directories rather than monoliths: each concern in its own file, each file readable without reading the whole codebase. We recognize this sometimes runs against the natural grain of AI-assisted coding — writing as a monolith and then decomposing is often cleaner than decomposing upfront. That's fine. What isn't fine is monoliths that never get refactored. The commitment: after meaningful feature work, we refactor toward structure *before* building further on top. Everyone (human and AI) holds everyone else accountable to this loop.

---

## Phase 1: Barcelona Event Build

**Timeline:** Now → April 28, 2026
**Repo:** `meeting-of-the-minds` (existing)
**Domain:** `askallmodels.alignedconversations.com` — permanent. Barcelona lives at `askallmodels.alignedconversations.com/debate/barcelona`.
**Goal:** Ship a polished, performance-ready version for the live panel at Museu Marítim. Stability and theatrical quality take priority over feature breadth.

**Framing:** Phase 1 is *not* a scaled-down version of the Arena. It is one fully-built instance of what the Arena will host many of. Barcelona has a permanent URL at `/debate/barcelona` and will stay there indefinitely — Phase 2 adds a debate picker at `/` but does not disturb the Barcelona debate.

### 1.0 — Pre-Rebuild Cleanup

Before any new architecture or features are built, address the prioritized items from `CODEBASE_ANALYSIS.md`. This ensures the rebuild starts from a clean foundation rather than inheriting tech debt into a new structure where it compounds. Scope for this pass:

- **Reconcile documentation drift:** README claims Claude is called direct from the browser with a "baked in fallback" — not true, all five models route through Netlify functions. Update README and CONTRIBUTING.md to match reality. *(Completed — commit `6bf2493`.)*
- **Remove dead Backstage key-entry UI:** the current Backstage panel's key-management form writes to localStorage that nothing reads. It misleads the operator and creates a minor key-leak footgun. Remove the form; keep the panel itself as the seed of the future Backstage (Moderator Workspace, item 1.3). Replace the form with a short info note naming Backstage's real purpose.
- **Add minimal auth to Netlify functions:** currently the `/api/*` endpoints have no auth or rate limiting, meaning anyone who finds the URL can burn vendor tokens on your accounts. Before the live event publicizes the site, add an origin check (Option B from the deliberation): production domain + Netlify auto-subdomain + deploy-preview pattern in the allowlist. Shared-secret header (Option A) is deferred to Phase 2 / Arena, where the stronger protection will be needed.

Explicitly *not* in Phase 1.0 cleanup scope:
- **Gemini parameter normalization.** Despite `max_tokens: 800` creating uneven stage airtime, touching Gemini's working configuration six days before the event is too risky — the original bump was likely a fix for truncated responses. Leave as-is.
- **Gemini debug hygiene** (stray `console.log`, unused `finishReason`). Cosmetic; bundled with "don't touch Gemini."
- **Accessibility labels, `prefers-reduced-motion`, orb visibility gating, per-fetch timeouts.** Not urgent for Phase 1; revisit if time allows.

The goal of Phase 1.0 is a clean, honest baseline for the rebuild, not a perfect codebase.

### 1.1 — Debate ID Primitive, URL Architecture, and Role Split Foundation

The architectural spine the rest of Phase 1 hangs off. Before Entry, Backstage, or Stage can be built meaningfully, the app needs a coherent model of what a debate *is* and how views address it.

**URL structure:**
- `/` — Root holding page. Minimal branding for the Arena ("coming soon"), short description of the broader vision, and a single live button: *"Enter the Barcelona Meeting of the Minds →"* linking to `/debate/barcelona`. In Phase 2 this gets rebuilt into a debate picker showing all ongoing debates; for Phase 1 it's a one-button placeholder.
- `/debate/<id>` — Entry screen for a specific debate: choose Moderator or Observer.
- `/debate/<id>/stage` — Stage, panorama mode (the Observer landing after role selection).
- `/debate/<id>/stage/focus/<model>` — Stage, focused on one participant.
- `/debate/<id>/backstage` — Backstage for that debate (Moderator access, gated).

For Barcelona, `<id> = "barcelona"` — hardcoded, single debate. No dynamic ID generation in Phase 1.

**State model:** a single debate object, keyed by `debateId`, containing the current question, the round's transcript, which model is currently speaking, and history. Stage windows and Backstage both subscribe to this state.

**State sync mechanism (Phase 1):** **BroadcastChannel** is the primary mechanism — instant, in-browser, works across windows on a single machine. Given the Barcelona hardware plan (one Mac mini driving all Stage windows, iPad via Sidecar as the Backstage station), this should be sufficient.

*Documented fallback:* if hardware testing reveals cross-machine sync issues (e.g., Sidecar doesn't actually share a browser context, or Backstage needs to run on a physically separate machine from the Stage windows), fall back to a lightweight cloud state layer — Netlify Blobs or similar — polled by Stage windows every 500ms–1s. Slower than BroadcastChannel but works across machines. Keep this option on the shelf until hardware testing; do not build speculatively.

**What this item delivers:** routing, URL handling, a debate-state object, BroadcastChannel-based sync, and the gated Moderator entry. The views on top (Entry screen visuals, Backstage controls, Stage rendering) are subsequent items — this one just makes their architecture possible.

### 1.2 — Entry Flow & Role Selection

The **Entry** screen presents the debate as a place. Visitor chooses a role: **Moderator** (drives the debate, enters Backstage, authenticated) or **Observer** (watches the debate, enters the Stage). For Barcelona, the Entry screen shows a single option: *"Meeting of the Minds — Barcelona"*. Click it, choose a role, route accordingly.

Barcelona's context: the URL isn't publicized, so in practice only the operator (Ezra, or the helper at Backstage) will use it — Moderator and Observer paths both exist primarily for architectural continuity with Phase 2, where Observer becomes a real role for public audiences. In Phase 1, Observer is deliberately minimal: a placeholder that watches whatever the Moderator drives. The role split gets built now so that when Phase 2 introduces real observers, the routing, state model, and URL structure are already in place.

### 1.3 — Backstage (Moderator Workspace)

The moderator's workspace — where they **prepare** (draft and select questions, tune settings before the show), **perform** (fire questions, direct the debate flow, steer attention), and **monitor** (confirm each of the five models is reachable and responding). The current Backstage panel being cleaned up in Phase 1.0 is the seed of this — stripped of its misleading key form, ready to be built out as the real workspace.

Core capabilities:

- **Question controls:** pose questions, choose single-model vs. round-table mode, replay/repeat responses, navigate between questions.
- **Attention direction:** signal which model the audience should focus on (visual cue propagated to Stage views).
- **Launch Stage windows:** a one-click action to open focused Stage views for all five models — the ergonomic setup for the theatrical multi-screen configuration.
- **Per-model connectivity check:** a small "ping" action per model that fires a trivial request and reports success/failure. Replaces the old key-entry form's implicit "is this working?" signal with something that actually checks.
- **Runtime settings:** per-model knobs (temperature, max_tokens) and voice parameters once ElevenLabs lands. Settings that belong in a UI, not in code.

Backstage does *not* have a "display mode" setting. Stage views render themselves (panorama or focus); Backstage drives the debate and opens Stage windows.

### 1.4 — Stage View

The read-only view of the current debate. Accessible to anyone entering as Observer, or opened by the moderator from Backstage. Shows live transcript with voices playing. Watchable on any device — phone, laptop, or dedicated external display. The Stage supports two rendering modes, chosen per-window:

- **Panorama:** all five models in a round-table view. The default Stage rendering.
- **Focus:** one model only, full-screen, prominent identity. Used for dedicated external monitors in the theatrical multi-screen setup, and selectable by any observer who wants to concentrate on a single participant.

Rendering is the Stage window's own choice. The same view code works on a phone and on a 24" monitor — styling adapts to context.

### 1.5 — Stage Focus View Design

Visual design of the Stage in Focus mode — the per-model full-screen view shown on external displays. Large typography readable from distance, prominent model identity, clear "speaking now" state, minimal chrome, elegant composition. This is the *face* each AI wears in the room.

### 1.6 — ElevenLabs Voice Integration

Replace browser-native speech synthesis with ElevenLabs TTS. Assign a distinct voice to each of the five models (Claude, ChatGPT, Gemini, Mistral, DeepSeek). Tune per-model parameters (stability, similarity, style). Ensure French-language responses render in a proper French voice. Handle playback timing so voice begins as text appears. Decide caching strategy to manage latency and cost. Voices layer onto the Stage infrastructure built in 1.1–1.5; no dependency on the debate ID foundation beyond "there is a Stage to play voices on."

### 1.7 — Event-Day Readiness

Dry runs, stability testing, backup procedures. Verify multi-screen setup on actual Mac mini + dock + monitor configuration. Test Sidecar iPad connectivity if used as the Backstage station. Rehearse full flow end-to-end. Document setup procedures for the helper. Define fallback: if multi-screen hardware fails, a single panorama Stage must still deliver a strong experience.

### Explicitly Deferred in Phase 1

- Social layer: save responses, share to LinkedIn, vote on best response, user accounts, debate history. Deferred to Phase 2 or to the "Phase 1 Bonus" hacks if time allows.
- Multiple simultaneous debates. Deferred entirely to Phase 2.
- User-created debates on arbitrary topics. Deferred entirely to Phase 2.

---

## Phase 1 Bonus: Nice-to-Have Hacks

**Timeline:** Opportunistic, only if Phase 1 is stable with days to spare
**Principle:** Minimum-viable versions of social features, achievable without infrastructure investment.

### Hack A — Lightweight Share-to-LinkedIn

A share button on a model's response that pre-populates a LinkedIn share intent URL with the model's output as text. No backend, no persistence, no accounts — the response text is already in the browser, piped into LinkedIn's share URL format. Minutes of work; delivers real user value.

### Hack B — Copy / Export Response

A button that copies a response (with attribution) to the clipboard. Zero infrastructure.

### Hack C — Screenshot-Friendly Stage Focus View

Ensure the Stage in Focus mode renders cleanly when screenshotted — readable composition, clear model identity, quotable framing. Makes organic sharing easier without building any sharing system.

These hacks capture most of the *social* benefit of a proper social layer without requiring any of its infrastructure. They are deliberately second-class in the roadmap.

---

## Phase 2: Full-Fledged "Arena" Version

**Timeline:** Starts post-Barcelona, late April / early May 2026
**Repo:** new, separate (working name: `meeting-of-the-minds-arena` or `askallmodels`)
**Domain:** shared with Phase 1 at `askallmodels.alignedconversations.com`. Phase 2 takes over root (`/`); Barcelona's URL at `/debate/barcelona` is preserved as one debate among many in the Arena. No domain migration — same domain, new content at root.
**Goal:** Transform the app from a single-debate tool into a platform for multiple simultaneous, topic-agnostic debates with tune-in viewing.

### 2.1 — Architecture Foundation

Persistent, server-side debate state. Database or blob-store layer (Netlify Blobs, Supabase, or similar). Real-time subscription mechanism so clients receive updates as debates advance. Backend process that advances debates on some cadence — scheduled functions, or on-demand generation triggered by tune-in.

### 2.2 — Topic Generalization

Prompt architecture that works across arbitrary topics. System prompts that produce coherent debates whether the topic is "Catalan independence," "Nestlé water extraction," or anything else. Interface for setting a topic when creating a debate.

### 2.3 — Tune-In Experience

Home screen showing multiple ongoing debates. User selects which to tune into. Debate view renders current state and streams new turns. Indicators for debate age and phase. The role split (Moderator/Observer) already operates per-debate in Phase 1; Phase 2 is when that per-debate scoping finally matters, because there are multiple debates to moderate or observe.

### 2.4 — User-Created Debates

Interface for users to launch their own debates on custom topics. Rate limiting, content guardrails, moderation considerations. Lifecycle: public vs. private, persistent vs. ephemeral.

### 2.5 — Voice Integration Carried Forward

ElevenLabs work from Phase 1 extends naturally. Same voices, same tuning, applied to the Arena context.

### 2.6 — Social Layer (Proper Implementation)

If and when it proves worth the investment: user accounts or anonymous session identity, response saving, voting on best responses, debate history. Built deliberately, not hacked. The Phase 1 Bonus hacks may persist alongside or be replaced.

### 2.7 — Root `/` Becomes the Debate Picker

In Phase 1, `/` is a minimal holding page with a single link to `/debate/barcelona`. Phase 2 rebuilds `/` into the actual Arena: a list of ongoing debates, each tunable-into, plus a way to create new ones. Barcelona's URL (`/debate/barcelona`) is unchanged — it's just one instance in the list. No domain migration needed; the architecture anticipates this from Phase 1.

---

## Phase 3: Reserved

The third project slot — not yet defined. Held for ideas that crystallize during or after the Barcelona event. May relate to Aligned Conversations studio work, may emerge from the panel itself, may be deferred indefinitely.

---
