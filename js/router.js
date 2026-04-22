// ══ ROUTER — History API, hand-rolled ══
//
// URL patterns use ':name' for path parameters.
// First-match-wins; define more specific routes before less specific ones.
//
// Exposes window.Router with:
//   define(pattern, handler)  — register a route
//   navigate(path, { replace }) — programmatic navigation (default: push)
//   refresh()                  — re-render the current route
//   start()                    — wire popstate + link interception and render once
//
// Link interception: any <a data-link href="/…"> is handled internally.

(function() {
  const routes = [];

  function define(pattern, handler) {
    const paramNames = [];
    const regexSource = '^' + pattern
      .replace(/\//g, '\\/')
      .replace(/:([a-zA-Z]+)/g, function(_, name) {
        paramNames.push(name);
        return '([^/]+)';
      }) + '$';
    routes.push({ pattern, regex: new RegExp(regexSource), paramNames, handler });
  }

  function resolve(path) {
    for (const route of routes) {
      const m = path.match(route.regex);
      if (m) {
        const params = {};
        route.paramNames.forEach(function(name, i) {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  function render() {
    const path = window.location.pathname;
    const resolved = resolve(path);
    if (resolved) {
      try {
        resolved.handler(resolved.params);
      } catch (e) {
        console.error('[router] handler threw', e);
      }
    } else {
      console.warn('[router] no route matched', path, '— redirecting to /');
      navigate('/', { replace: true });
    }
  }

  function navigate(path, opts) {
    opts = opts || {};
    if (path === window.location.pathname + window.location.search) {
      // same URL — just re-render without a history entry
      render();
      return;
    }
    if (opts.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    render();
  }

  function refresh() {
    render();
  }

  function start() {
    window.addEventListener('popstate', render);

    // Intercept internal links
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[data-link]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//')) return;
      e.preventDefault();
      navigate(href);
    });

    render();
  }

  window.Router = { define, navigate, refresh, start };
})();
