// ============================================================
// COLOSSEUM LOCKS FIX — Must load BEFORE Supabase CDN
// ============================================================
// Supabase JS captures navigator.locks at parse time.
// Orphaned locks cause getSession(), signOut(), and token
// refresh to hang forever. This mock must be in place before
// the Supabase CDN script tag evaluates.
//
// SESSION 30: Replaces the init()-time mock that was too late.
// ============================================================
try {
  Object.defineProperty(navigator, 'locks', {
    value: {
      request: async function(_name, optionsOrCb, maybeCb) {
        const cb = typeof maybeCb === 'function' ? maybeCb : optionsOrCb;
        if (typeof cb === 'function') return await cb({ name: _name, mode: 'exclusive' });
      },
      query: async () => ({ held: [], pending: [] }),
    },
    configurable: true,
    writable: true,
  });
} catch (e) { /* older browsers */ }
