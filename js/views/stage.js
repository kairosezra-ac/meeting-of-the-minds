// ══ VIEW/STAGE — /debate/:id/stage and /.../stage/focus/:model ══
//
// Stub rendering. The Stage's real visual design is a later Phase 1 item
// (1.5 in the roadmap). What this stub must prove:
//   1. Panorama shows five model slots.
//   2. Focus shows one model full-bleed.
//   3. Both modes update a "currently speaking" visual indicator in
//      response to DebateState changes — including state broadcast from
//      another window via BroadcastChannel.
//
// The indicator is the interop contract with Backstage/Moderator. Once
// real rendering replaces the stub, the `data-speaking` hooks stay.

(function() {
  const MODELS = ['claude', 'chatgpt', 'gemini', 'mistral', 'deepseek'];

  function updatePanoramaIndicator(state) {
    const panel = document.getElementById('panel-stage-panorama');
    if (!panel) return;
    const slots = panel.querySelectorAll('.stage-slot');
    slots.forEach(function(slot) {
      const isSpeaking = slot.dataset.model === state.currentlySpeaking;
      slot.classList.toggle('speaking', isSpeaking);
    });
    const q = panel.querySelector('.stage-question');
    if (q) q.textContent = state.currentQuestion || '';
  }

  function updateFocusIndicator(state) {
    const panel = document.getElementById('panel-stage-focus');
    if (!panel) return;
    const model = panel.dataset.model;
    const slot = panel.querySelector('.stage-slot');
    if (slot) {
      slot.classList.toggle('speaking', model === state.currentlySpeaking);
    }
    const q = panel.querySelector('.stage-question');
    if (q) q.textContent = state.currentQuestion || '';
  }

  function renderPanorama(params) {
    Views.showPanel('panel-stage-panorama', 'stage');
    updatePanoramaIndicator(DebateState.get());
  }

  function renderFocus(params) {
    const model = params.model;
    if (MODELS.indexOf(model) === -1) {
      Router.navigate('/debate/' + DebateState.debateId + '/stage', { replace: true });
      return;
    }
    const panel = document.getElementById('panel-stage-focus');
    if (panel) {
      panel.dataset.model = model;
      const slot = panel.querySelector('.stage-slot');
      if (slot) {
        slot.dataset.model = model;
        // Update the displayed model name
        const nameEl = slot.querySelector('.stage-model-name');
        if (nameEl) {
          nameEl.textContent = model.charAt(0).toUpperCase() + model.slice(1);
          nameEl.style.color = 'var(--' + model + ')';
        }
        const dot = slot.querySelector('.stage-model-dot');
        if (dot) {
          dot.style.background = 'var(--' + model + ')';
          dot.style.boxShadow = '0 0 16px var(--' + model + ')';
        }
      }
    }
    Views.showPanel('panel-stage-focus', 'stage');
    updateFocusIndicator(DebateState.get());
  }

  // Re-render the active Stage view whenever state changes (local or remote).
  DebateState.subscribe(function(state, _source) {
    const panorama = document.getElementById('panel-stage-panorama');
    const focus = document.getElementById('panel-stage-focus');
    if (panorama && panorama.classList.contains('active')) {
      updatePanoramaIndicator(state);
    }
    if (focus && focus.classList.contains('active')) {
      updateFocusIndicator(state);
    }
  });

  // Refresh the panorama indicator from current DebateState without
  // touching panel classes or the body zone. Used by the moderator-
  // workspace Panorama tab: switchTab() toggles .active, then this
  // pulls current speaker/question into the embedded view so it
  // reflects state immediately rather than waiting for the next
  // broadcast. Standalone /stage route is unaffected — it goes through
  // renderPanorama() above.
  function refreshPanorama() {
    updatePanoramaIndicator(DebateState.get());
  }

  // ── Static panorama orbs ──
  // Draws each panorama canvas ONCE using the same drawOrb() function
  // the focus view uses (defined in js/orb.js). No requestAnimationFrame
  // loop — the result is a frozen still, visually identical to a focus
  // orb at intensity 0.5 / phase 0. Called on script load; canvases are
  // already in the DOM by that point (this script loads after the body).
  //
  // COLORS is declared at top-level in js/orb.js; in classic-script
  // load order it's accessible via the shared script lexical scope.
  // Defensive fallback inlines the RGB tuples in case scope access
  // fails on some browser configuration.
  function drawStaticPanoramaOrbs() {
    if (typeof drawOrb !== 'function') {
      console.warn('[stage] drawOrb not in scope; static panorama orbs will not render');
      return;
    }
    const colors = (typeof COLORS !== 'undefined') ? COLORS : {
      claude:   [242, 101,  34],
      chatgpt:  [ 16, 163, 127],
      gemini:   [251, 188,   4],
      mistral:  [237,  41,  57],
      deepseek: [ 91, 110, 245],
    };
    MODELS.forEach(function(model) {
      drawOrb('panorama-' + model, colors[model].join(','), 0, 0.5);
    });
  }

  drawStaticPanoramaOrbs();

  window.Views.renderStagePanorama = renderPanorama;
  window.Views.renderStageFocus = renderFocus;
  window.Views.refreshStagePanorama = refreshPanorama;
})();
