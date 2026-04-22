// ══ STATE — Debate state + BroadcastChannel sync ══
//
// One shared state object keyed by debateId. All windows on the same
// debate subscribe to the same BroadcastChannel and receive updates
// instantly.
//
// For Phase 1, the debate ID is hardcoded to "barcelona". Phase 2 will
// generate IDs dynamically; the state shape and sync mechanism stay the
// same.
//
// Exposes window.DebateState with:
//   get()                — snapshot of current state
//   update(partial)      — shallow-merge and broadcast
//   subscribe(fn)        — receive (state, source) where source is
//                          'local' (this window) or 'remote' (other window)
//   debateId             — the current debate identifier

(function() {
  const DEBATE_ID = 'barcelona';
  const CHANNEL_NAME = 'debate:' + DEBATE_ID;

  let state = {
    debateId: DEBATE_ID,
    currentQuestion: null,
    currentlySpeaking: null,
    transcript: [], // [{ model, text, timestamp }]
  };

  const listeners = new Set();
  let channel = null;

  function notify(source) {
    for (const fn of listeners) {
      try { fn(state, source); } catch (e) { console.error('[state] listener threw', e); }
    }
  }

  function broadcast() {
    if (!channel) return;
    try {
      channel.postMessage({ type: 'state', state });
    } catch (e) {
      console.error('[state] broadcast failed', e);
    }
  }

  function get() {
    return state;
  }

  function update(partial) {
    state = Object.assign({}, state, partial);
    notify('local');
    broadcast();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }

  function init() {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[state] BroadcastChannel unavailable — cross-window sync disabled');
      return;
    }
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'state') {
        state = e.data.state;
        notify('remote');
      }
    });
  }

  init();

  window.DebateState = { get, update, subscribe, debateId: DEBATE_ID };
})();
