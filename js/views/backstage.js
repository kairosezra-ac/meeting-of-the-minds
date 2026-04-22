// ══ VIEW/BACKSTAGE — /debate/:id/backstage ══
//
// Stagehand workspace. This PR ships a stub with one working section:
// "Launch Stage Window" — six buttons that open new browser windows at
// specific Stage URLs. Demonstrates the display-control pattern before
// real Stage rendering or real settings controls are built.
//
// Auth: Stagehand tier OR Moderator tier (moderator access includes
// backstage access).

(function() {
  function render(params) {
    if (!Auth.canAccess('/backstage')) {
      Views.renderAuthGate(window.location.pathname);
      return;
    }
    Views.showPanel('panel-backstage', 'backstage');
  }

  function launchStage(pathSuffix) {
    const debateId = DebateState.debateId;
    const url = '/debate/' + debateId + '/stage' + (pathSuffix || '');
    // _blank + noopener so the new window is independent (and can't
    // reach back into this one's window.opener).
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  window.Views.renderBackstage = render;
  window.launchStage = launchStage; // invoked by inline onclick
})();
