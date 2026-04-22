// ══ VIEW/AUTH-GATE — password prompt for gated routes ══
//
// Rendered when the user hits a gated route without a valid session.
// On success, we replay the intended route so the user lands where
// they originally asked to go.

(function() {
  let intendedPath = null;

  function render(targetPath) {
    intendedPath = targetPath || window.location.pathname;
    Views.showPanel('panel-auth-gate', 'auth-gate');
    const err = document.getElementById('auth-gate-error');
    if (err) err.textContent = '';
    const input = document.getElementById('auth-secret-input');
    if (input) {
      input.value = '';
      // Autofocus on next tick (after panel is visible).
      setTimeout(function() { input.focus(); }, 0);
    }
  }

  async function submit() {
    const input = document.getElementById('auth-secret-input');
    const err = document.getElementById('auth-gate-error');
    if (!input) return;
    const secret = input.value.trim();
    if (!secret) return;

    const tier = await Auth.identifyTier(secret);
    input.value = '';
    if (!tier) {
      if (err) err.textContent = 'Invalid secret.';
      return;
    }
    Auth.setTier(tier);
    Router.navigate(intendedPath || '/', { replace: true });
  }

  window.Views.renderAuthGate = render;
  window.submitAuthGate = submit; // invoked by inline onclick/onkeydown
})();
