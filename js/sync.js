/* Curated — sync.

   Local-first: the device stays the source of truth for what you see, changes
   queue locally, and the server is reconciled in the background. The merge
   rules live in store.js and are covered by tests in /test/.

   Timestamps: the client tracks when each field changed, in milliseconds; the
   server records a row-level `updated_at`. Merging falls back to the row
   timestamp when a per-field one isn't available, which is accurate enough for
   one person with two devices. */

import * as S from './store.js';
import * as A from './auth.js';

const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
const ms = (s) => (s ? Date.parse(s) : 0);

let syncing = false;
let queued = null;
const listeners = new Set();
export const onSyncChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
let state = { status: 'idle', at: 0, error: null };   // idle | syncing | error | offline
export const syncState = () => state;
const set = (s) => { state = { ...state, ...s }; listeners.forEach(fn => fn(state)); };

/* ---------- push ---------- */

async function push(since) {
  const p = S.pending(since);
  if (p.items.length) {
    await A.db('item_state?on_conflict=user_id,item_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: p.items.map(i => ({
        user_id: A.currentUser().id,
        item_id: i.item_id,
        progress: i.progress || 0,
        opened_at: iso(i.opened_at),
        completed_at: iso(i.completed_at),
        saved_at: iso(i.saved_at),
        feedback: i.feedback || null,
      })),
    });
  }
  if (p.notes.length) {
    await A.db('notes?on_conflict=user_id,item_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: p.notes.map(n => ({ user_id: A.currentUser().id, item_id: n.item_id, body: n.body })),
    });
  }
  if (p.follows.length) {
    await A.db('follows?on_conflict=user_id,source_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: p.follows.map(f => ({ user_id: A.currentUser().id, source_id: f.source_id, followed: !!f.followed })),
    });
  }
  if (Object.keys(p.settings).length) {
    await A.db('profiles?on_conflict=user_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ user_id: A.currentUser().id, settings: S.settings() }],
    });
  }
}

/* ---------- pull ---------- */

async function pull(since) {
  const q = since ? `&updated_at=gt.${encodeURIComponent(new Date(since).toISOString())}` : '';
  const [items, notes, follows, profiles] = await Promise.all([
    A.db(`item_state?select=*${q}`),
    A.db(`notes?select=*${q}`),
    A.db(`follows?select=*${q}`),
    A.db('profiles?select=*'),
  ]);
  const prof = (profiles && profiles[0]) || null;
  return {
    items: (items || []).map(r => ({
      item_id: r.item_id,
      progress: r.progress,
      opened_at: ms(r.opened_at) || null,
      completed_at: ms(r.completed_at) || null,
      saved_at: ms(r.saved_at) || null,
      feedback: r.feedback,
      updated_at: ms(r.updated_at),
    })),
    notes: (notes || []).map(r => ({ item_id: r.item_id, body: r.body, at: ms(r.updated_at) })),
    follows: (follows || []).map(r => ({ source_id: r.source_id, followed: r.followed, at: ms(r.updated_at) })),
    settings: (prof && prof.settings) || {},
    settingsUpdatedAt: prof ? ms(prof.updated_at) : 0,
  };
}

/* ---------- the loop ---------- */

export async function sync({ full = false } = {}) {
  if (!A.isSignedIn()) return { skipped: 'signed out' };
  if (syncing) { queued = { full }; return { skipped: 'already running' }; }
  syncing = true;
  set({ status: 'syncing', error: null });
  const since = full ? 0 : S.lastSynced();
  try {
    // Pull first so anything from the other device is merged before we push,
    // then push everything that is still newer locally.
    const remote = await pull(since);
    S.mergeRemote(remote);
    await push(since);
    S.markSynced(Date.now());
    set({ status: 'idle', at: Date.now(), error: null });
    return { ok: true };
  } catch (e) {
    const offline = !navigator.onLine || /Failed to fetch|NetworkError/i.test(e.message);
    set({ status: offline ? 'offline' : 'error', error: offline ? null : e.message });
    return { ok: false, error: e.message };
  } finally {
    syncing = false;
    if (queued) { const q = queued; queued = null; setTimeout(() => sync(q), 400); }
  }
}

/* First sign-in on a device: adopt whatever is already here rather than
   letting the server overwrite it, then reconcile both directions. */
export async function adoptLocalState() {
  return sync({ full: true });
}

let debounce;
export function nudge() {
  if (!A.isSignedIn()) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => sync(), 2500);
}

export function start() {
  if (!A.isSignedIn()) return;
  sync();
  S.subscribe(nudge);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('online', () => sync());
}
