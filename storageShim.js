// The app's code was originally written for Claude's built-in `window.storage`
// API. That API only exists inside Claude's own artifact runtime, so for a
// real, standalone deployment we recreate the same interface here using the
// browser's localStorage instead. Importing this file (once, before the app
// renders) makes `window.storage.get/set/delete/list` work exactly the same
// way the app already expects — no changes needed in App.jsx.
//
// Note: localStorage is per-browser/per-device, not synced across devices.
// The optional "shared" parameter from the original API is accepted for
// compatibility but has no special effect here (everything is just local).

if (typeof window !== 'undefined' && !window.storage) {
  const PREFIX = 'pf:';

  window.storage = {
    async get(key) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) throw new Error('not found');
        return { key, value: raw, shared: false };
      } catch (e) {
        throw e;
      }
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length))
        .filter((k) => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}
