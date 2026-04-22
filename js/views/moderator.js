// ══ VIEW/MODERATOR — /debate/:id/moderator and /.../focus/:model ══
//
// Auth-gated (Moderator tier). On success, shows the existing #panel-mod
// (or the deep-linked model response panel). Fire-loop behaviour is
// intentionally left unchanged — see js/app.js. The zone-moderator body
// class makes the intra-zone tab bar visible via CSS.

(function() {
  function updateTabBarVisual(tabId) {
    document.querySelectorAll('.tab').forEach(function(t) {
      t.className = 'tab';
    });
    const tab = document.querySelector('[data-tab=' + tabId + ']');
    if (tab) tab.className = 'tab active-' + tabId;
  }

  function renderDashboard(params) {
    if (!Auth.canAccess('/moderator')) {
      Views.renderAuthGate(window.location.pathname);
      return;
    }
    Views.showPanel('panel-mod', 'moderator');
    updateTabBarVisual('mod');
  }

  function renderFocus(params) {
    if (!Auth.canAccess('/moderator')) {
      Views.renderAuthGate(window.location.pathname);
      return;
    }
    const model = params.model;
    const panelId = 'panel-' + model;
    if (!document.getElementById(panelId)) {
      // Unknown model name → fall back to dashboard
      Router.navigate('/debate/' + DebateState.debateId + '/moderator', { replace: true });
      return;
    }
    Views.showPanel(panelId, 'moderator');
    updateTabBarVisual(model);
  }

  window.Views.renderModerator = renderDashboard;
  window.Views.renderModeratorFocus = renderFocus;
})();
