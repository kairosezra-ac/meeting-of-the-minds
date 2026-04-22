// ══ VIEW/ENTRY — /debate/:id ══
//
// Three-role choice: Moderator, Stagehand, Observer.
// The Entry screen itself is not gated. Clicking Moderator or Stagehand
// sends the user to a gated URL; auth prompting happens there.

(function() {
  function render(params) {
    Views.showPanel('panel-entry', 'entry');
    // params.id is available if we ever want to render the debate name.
    // For Barcelona (single debate) the panel HTML is static.
  }

  window.Views.renderEntry = render;
})();
