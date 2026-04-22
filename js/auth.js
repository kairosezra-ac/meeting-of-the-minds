// ══ AUTH — Two-tier (Moderator, Stagehand) ══
//
// Hashed secrets (SHA-256). Plaintext passwords are NOT in this repo —
// they are distributed out-of-band to the operator and the helper.
//
// Tiers:
//   moderator → unlocks /moderator AND /backstage
//   stagehand → unlocks /backstage only
//   (observer is not gated)
//
// Bootstrap: visit a gated URL with `?k=<secret>` once. The secret is
// hashed, compared to the stored hash, and — on match — written to
// sessionStorage. `?k=` is stripped from the URL via replaceState so
// the secret does not persist in history. Subsequent navigation checks
// sessionStorage only.
//
// If the operator hits a gated URL without a valid session, the
// auth-gate view appears with a password field.

(function() {
  const HASHES = {
    moderator: '2169a14106349b0160ec1dc735c988a9bc311dd6c6a26ee6c8eb15e0d321b148',
    stagehand: '3fc1ccae80668e252235f5d82de5c8a14e71d37756a790ede27a42046dc6d356',
  };

  const STORAGE_KEY = 'debate.auth.tier';

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  async function identifyTier(secret) {
    if (!secret) return null;
    let hash;
    try {
      hash = await sha256(secret);
    } catch (e) {
      console.error('[auth] SHA-256 unavailable', e);
      return null;
    }
    if (hash === HASHES.moderator) return 'moderator';
    if (hash === HASHES.stagehand) return 'stagehand';
    return null;
  }

  function getTier() {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function setTier(tier) {
    if (!tier) return;
    try { sessionStorage.setItem(STORAGE_KEY, tier); } catch (_) {}
  }

  function clearTier() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /**
   * Read ?k=<secret> from the URL. If present, try to upgrade the session
   * and strip the param from history.
   */
  async function bootstrapFromURL() {
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('k');
    if (!secret) return getTier();

    const tier = await identifyTier(secret);
    if (tier) setTier(tier);

    // Strip ?k= regardless of outcome — don't leak secrets in history.
    params.delete('k');
    const qs = params.toString();
    const clean = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    window.history.replaceState({}, '', clean);

    return getTier();
  }

  /**
   * Is the current session authorized for this route?
   *   '/moderator' → moderator only
   *   '/backstage' → moderator OR stagehand
   *   anything else → true (not gated)
   */
  function canAccess(routeName) {
    const tier = getTier();
    if (routeName === '/moderator') return tier === 'moderator';
    if (routeName === '/backstage') return tier === 'moderator' || tier === 'stagehand';
    return true;
  }

  window.Auth = { bootstrapFromURL, getTier, setTier, clearTier, identifyTier, canAccess };
})();
