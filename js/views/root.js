// ══ VIEW/ROOT — `/` holding page ══
//
// Minimal: brand mark, "Arena coming soon" framing, and a single button
// to /debate/barcelona. Phase 2 rebuilds this into the debate picker.

(function() {
  function render() {
    Views.showPanel('panel-root', 'root');
  }

  window.Views.renderRoot = render;
})();
