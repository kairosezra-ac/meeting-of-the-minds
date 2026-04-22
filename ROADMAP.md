# Meeting of the Minds — Product Roadmap

*Version 1.3 — April 22, 2026*

---

## Guiding Principles

**Separation of concerns.** Phase 1 and Phase 2 live in separate repositories on separate Netlify sites. Phase 1 work never destabilizes the event-ready version; Phase 2 ambition never threatens the live site. Learnings port across deliberately, not accidentally.

**Scope discipline before Barcelona.** Everything not on the Phase 1 list is explicitly deferred. The six-day window rewards focus over breadth.

**Architectural investments earn their keep over time.** Some decisions (role split, URL-routed views, BroadcastChannel for local multi-screen) deliver modest value in Phase 1 but substantial value in Phase 2. Build them thoughtfully now so Phase 2 inherits them cleanly.

**Fallback is a first-class mode.** Single-observer operation is not a backup of multi-observer — both are legitimate runtime configurations. The software is always ready to run on whatever hardware the day permits.

**Focus vs. panorama is a rendering property, not a role property.** The moderator drives the debate; observer windows each choose their rendering (panoramic — all five models — or focused on one). Multi-screen setups are simply multiple focused observer windows running at once. This unifies local theatrical setups with remote Phase 2 viewers.

---

## Open Questions (To Resolve Before Building Phase 1.2+)

The Moderator/Observer role split is a load-bearing architectural decision and is being deliberately pressure-tested before any code is written against it. This pressure-test happens *after* Phase 1.0 (cleanup) and *before* the role-split implementation. Questions to work through:

1. **What does the Observer role actually *do* in Phase 1?** Is it earning its keep for Barcelona, or is it primarily an architectural investment for Phase 2? Be honest about which one.
2. **Failure modes of the split.** Where does it get awkward — UX, routing, authentication, the transition from Phase 1 to Phase 2?
3. **Moderator authentication.** URL-secret vs. password vs. something else. Smallest thing that's safe enough for the event.
4. **Observer home screen when no debate is active.** Before the event, during, after.
5. **Phase 1 → Phase 2 migration.** Does the Phase 2 concept of "Moderator and Observer are roles within a debate, not at app level" create a clean migration or a conflict with what we build in Phase 1?

Items 1.2–1.5 below describe the intended design assuming the split holds, but may be revised after the pressure-test.

---

## Phase 1: Barcelona Event Build

**Timeline:** Now → April 28, 2026
**Repo:** `meeting-of-the-minds` (existing)
**Domain:** currently `askallmodels.alignedconversations.com`; eventual migration to `meetingofthemindsbarcelona.alignedconversations.com`
**Goal:** Ship a polished, performance-ready version for the live panel at Museu Marítim. Stability and theatrical quality take priority over feature breadth.

### 1.0 — Pre-Rebuild Cleanup

Before any new architecture or features are built, address the prioritized items from `CODEBASE_ANALYSIS.md`. This ensures the rebuild starts from a clean foundation rather than inheriting tech debt into a new structure where it compounds. Scope for this pass:

- **Delete dead code:** the Backstage UI key-management flow writes to localStorage that nothing reads. It misleads the operator and creates a minor key-leak footgun. Remove the form; keep only an info note explaining keys live in Netlify env vars.
- **Normalize Gemini parameters:** bring `max_tokens`, temperature, debug logging, and response shape in line with the other four models. Current drift produces uneven stage airtime (Gemini answers ~2.7× longer) and comparison-breaking temperature variance. Keep the defensive `.parts.map().join('')` — that's correct for Google's API shape.
- **Add minimal auth to Netlify functions:** currently the `/api/*` endpoints have no auth or rate limiting, meaning anyone who finds the URL can burn vendor tokens on your accounts. Before the live event widely publicizes the site, add a shared-secret header (HTML sends, function verifies) or origin check. Small change, real exposure mitigation. Promoted from Medium to High priority given the event timing.
- **Reconcile documentation drift:** README claims Claude is called direct from the browser with a "baked in fallback" — not true, all five models route through Netlify functions. Update README and CONTRIBUTING.md to match reality.
- **Quick-win hygiene:** drop the stray `console.log` statements and unused `finishReason` response field in `gemini.js`.

Deferred to later phases or skipped: accessibility labels, `prefers-reduced-motion` support, orb visibility gating, per-fetch timeouts. Not urgent for Phase 1; revisit if time allows. The goal of Phase 1.0 is a clean, honest baseline, not a perfect codebase.

### 1.1 — ElevenLabs Voice Integration

Replace browser-native speech synthesis with ElevenLabs TTS. Assign a distinct voice to each of the five models (Claude, ChatGPT, Gemini, Mistral, DeepSeek). Tune per-model parameters (stability, similarity, style). Ensure French-language responses render in a proper French voice. Handle playback timing so voice begins as text appears. Decide caching strategy to manage latency and cost.

### 1.2 — Entry Flow & Role Selection

Home screen presenting the debate stage. Visitor chooses: **Moderator** (drives the debate, authenticated) or **Observer** (watches). Routes split from here. Most casual visitors land as observers; the moderator enters via a gated URL or password. The Observer role in Phase 1 is deliberately minimal in feature set — its presence establishes the pattern that pays off in Phase 2.

### 1.3 — Moderator Panel

The moderator's control interface. Pose questions, choose single-model vs. round-table mode, replay/repeat responses, navigate between questions, direct attention to a specific model (visual cue propagated to observer views). Includes an ergonomic action: **launch observer windows for all five models** — a one-click setup for the theatrical multi-screen configuration.

The moderator does *not* have a display mode setting. Observer windows render themselves according to their own view choice (panoramic or focused); the moderator just drives the debate.

### 1.4 — Observer View

A read-only view of the current debate. Accessible to anyone entering as Observer or launched by the moderator. Shows live transcript with voices playing. Watchable on any device — phone, laptop, or dedicated external display. Two rendering modes:

- **Panoramic:** all five models in a round-table view. The default for casual visitors.
- **Focused:** one model only, full-screen, prominent identity. Used for dedicated external screens in the theatrical multi-screen setup, and selectable by any observer who wants to concentrate on one model.

Rendering is the observer window's own choice. The same view code works on a phone and on a 24" monitor — styling adapts to context.

### 1.5 — Observer Screen Design

Visual design of the focused observer view shown on external displays. Large typography readable from distance, prominent model identity, clear "speaking now" state, minimal chrome, elegant composition. This is the *face* each AI wears in the room.

### 1.6 — Event-Day Readiness

Dry runs, stability testing, backup procedures. Verify multi-screen setup on actual Mac mini + dock + monitor configuration. Test Sidecar iPad connectivity if used as the moderator station. Rehearse full flow end-to-end. Document setup procedures for the helper. Define fallback: if multi-screen hardware fails, a single panoramic observer view must still deliver a strong experience.

### Explicitly Deferred in Phase 1

- Social layer: save responses, share to LinkedIn, vote on best response, user accounts, debate history. Deferred to Phase 2 or to Phase 1.5 as hacks.
- Multiple simultaneous debates. Deferred entirely to Phase 2.
- User-created debates on arbitrary topics. Deferred entirely to Phase 2.

---

## Phase 1.5: Nice-to-Have Hacks

**Timeline:** Opportunistic, only if Phase 1 is stable with days to spare
**Principle:** Minimum-viable versions of social features, achievable without infrastructure investment.

### 1.5.a — Lightweight Share-to-LinkedIn

A share button on a model's response that pre-populates a LinkedIn share intent URL with the model's output as text. No backend, no persistence, no accounts — the response text is already in the browser, piped into LinkedIn's share URL format. Minutes of work; delivers real user value.

### 1.5.b — Copy / Export Response

A button that copies a response (with attribution) to the clipboard. Zero infrastructure.

### 1.5.c — Screenshot-Friendly Observer View

Ensure the focused observer view renders cleanly when screenshotted — readable composition, clear model identity, quotable framing. Makes organic sharing easier without building any sharing system.

These hacks capture most of the *social* benefit of a proper social layer without requiring any of its infrastructure. They are deliberately second-class in the roadmap.

---

## Phase 2: Full-Fledged "Arena" Version

**Timeline:** Starts post-Barcelona, late April / early May 2026
**Repo:** new, separate (working name: `meeting-of-the-minds-arena` or `askallmodels`)
**Domain:** eventual migration target for `askallmodels.alignedconversations.com`
**Goal:** Transform the app from a single-debate tool into a platform for multiple simultaneous, topic-agnostic debates with tune-in viewing.

### 2.1 — Architecture Foundation

Persistent, server-side debate state. Database or blob-store layer (Netlify Blobs, Supabase, or similar). Real-time subscription mechanism so clients receive updates as debates advance. Backend process that advances debates on some cadence — scheduled functions, or on-demand generation triggered by tune-in.

### 2.2 — Topic Generalization

Prompt architecture that works across arbitrary topics. System prompts that produce coherent debates whether the topic is "Catalan independence," "Nestlé water extraction," or anything else. Interface for setting a topic when creating a debate.

### 2.3 — Tune-In Experience

Home screen showing multiple ongoing debates. User selects which to tune into. Debate view renders current state and streams new turns. Indicators for debate age and phase. Role split evolves: Moderator and Observer become roles *within a debate*, not at the app level.

### 2.4 — User-Created Debates

Interface for users to launch their own debates on custom topics. Rate limiting, content guardrails, moderation considerations. Lifecycle: public vs. private, persistent vs. ephemeral.

### 2.5 — Voice Integration Carried Forward

ElevenLabs work from Phase 1 extends naturally. Same voices, same tuning, applied to the Arena context.

### 2.6 — Social Layer (Proper Implementation)

If and when it proves worth the investment: user accounts or anonymous session identity, response saving, voting on best responses, debate history. Built deliberately, not hacked. The Phase 1.5 hacks may persist alongside or be replaced.

### 2.7 — Domain Migration

Migrate `askallmodels.alignedconversations.com` from Barcelona version to Arena app. Barcelona version moves to its own subdomain. Sequenced to avoid downtime.

---

## Phase 3: Reserved

The third project slot — not yet defined. Held for ideas that crystallize during or after the Barcelona event. May relate to Aligned Conversations studio work, may emerge from the panel itself, may be deferred indefinitely.

---
