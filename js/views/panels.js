// ══ VIEWS/PANELS — shared panel-management helpers ══
//
// Every view calls showPanel(id) to become active. showPanel removes
// the .active class from every .panel, then adds it to the target.
//
// Also manages a `zone-*` class on <body> so CSS can key off the
// active zone (e.g. the intra-Moderator tab bar is only visible
// inside the moderator zone).

(function() {
  function showPanel(panelId, zoneName) {
    document.querySelectorAll('.panel').forEach(function(p) {
      p.classList.remove('active');
    });
    const target = document.getElementById(panelId);
    if (target) target.classList.add('active');

    // Clear any previous zone-* class, set the new one.
    const body = document.body;
    const zoneClasses = Array.from(body.classList).filter(function(c) {
      return c.startsWith('zone-');
    });
    zoneClasses.forEach(function(c) { body.classList.remove(c); });
    if (zoneName) body.classList.add('zone-' + zoneName);
  }

  window.Views = window.Views || {};
  window.Views.showPanel = showPanel;
})();
