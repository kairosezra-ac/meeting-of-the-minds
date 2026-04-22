// ══ BOOT — wire the router, define all routes, start ══
//
// Loaded LAST among the JS modules so every dependency (Router, Auth,
// DebateState, Views.*) is already defined on window.

(function() {
  async function boot() {
    // 1. Bootstrap auth first — strips ?k= from URL and populates sessionStorage.
    await Auth.bootstrapFromURL();

    const id = DebateState.debateId;

    // 2. Define routes. More-specific patterns must come before less-specific
    //    ones so first-match-wins picks the right handler.
    Router.define('/',                                          function(p) { Views.renderRoot(p); });
    Router.define('/debate/' + id,                              function(p) { Views.renderEntry({ id: id }); });
    Router.define('/debate/' + id + '/moderator/focus/:model',  function(p) { Views.renderModeratorFocus(p); });
    Router.define('/debate/' + id + '/moderator',               function(p) { Views.renderModerator(p); });
    Router.define('/debate/' + id + '/stage/focus/:model',      function(p) { Views.renderStageFocus(p); });
    Router.define('/debate/' + id + '/stage',                   function(p) { Views.renderStagePanorama(p); });
    Router.define('/debate/' + id + '/backstage',               function(p) { Views.renderBackstage(p); });

    // 3. Start routing. This renders the current URL.
    Router.start();
  }

  // DOMContentLoaded guards against scripts running before <body> is parsed.
  // This module is loaded at end of <body>, so DOM is already ready — but
  // guard anyway for defensive correctness.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
