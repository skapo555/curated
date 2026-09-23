/* Curated — local state. Everything persists in localStorage so the
   prototype survives refreshes without a backend. */

import { ITEMS, SOURCES, TOPICS } from './data.js';

const KEY = 'curated.state.v2';
const OLD_KEY = 'curated.state.v1';
const DAY = 86400 * 1000;

/* Every user-owned value carries the moment it changed, so two devices can be
   merged without a server arbitrating. `at` mirrors the shape of the data:
   at.items[id][field], at.followed[sourceId], at.notes[id], at.settings[key]. */
const DEFAULTS = () => ({
  progress: {},   // itemId -> 0..1 (furthest point reached)
  opened: {},     // itemId -> last-opened timestamp
  completed: {},  // itemId -> timestamp
  saved: {},      // itemId -> timestamp
  feedback: {},   // itemId -> 'up' | 'down'
  notes: {},      // itemId -> text
  followed: {},   // sourceId -> bool, filled in by syncSources() once content loads
  settings: {
    archiveDays: 7,
    completion: 'auto',   // auto | ask | manual
    theme: 'system',      // system | light | dark
    textSize: 'm',        // s | m | l
    readingFont: 'serif', // serif | sans
    pickCount: 10,        // how many Home surfaces at once
  },
  liveSynced: false,
  onboarded: false,     // has this device chosen its sources yet?
  surfaced: {},         // itemId -> day it was first shown on Home
  at: { items: {}, followed: {}, notes: {}, settings: {} },
  syncedAt: 0,          // server time of the last successful pull
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY) || migrateV1();
    if (raw) {
      const parsed = JSON.parse(raw);
      const d = DEFAULTS();
      // Anyone already reading here has effectively chosen already — don't
      // interrupt them with a picker for a decision they've made.
      if (!('onboarded' in parsed)) parsed.onboarded = !!parsed.liveSynced || Object.keys(parsed.followed || {}).length > 0;
      return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings || {}) }, at: { ...d.at, ...(parsed.at || {}) } };
    }
  } catch (e) { /* fall through to fresh state */ }
  return DEFAULTS();
}

/* v1 had no timestamps. Stamp everything as "changed long ago" so that any
   later edit on another device wins, but nothing is lost. */
function migrateV1() {
  const raw = localStorage.getItem(OLD_KEY);
  if (!raw) return null;
  try {
    const v1 = JSON.parse(raw);
    const t = 1;
    const at = { items: {}, followed: {}, notes: {}, settings: {} };
    const stamp = (id, field) => { (at.items[id] = at.items[id] || {})[field] = t; };
    for (const id of Object.keys(v1.progress || {})) stamp(id, 'progress');
    for (const id of Object.keys(v1.completed || {})) stamp(id, 'completed');
    for (const id of Object.keys(v1.saved || {})) stamp(id, 'saved');
    for (const id of Object.keys(v1.feedback || {})) stamp(id, 'feedback');
    for (const id of Object.keys(v1.opened || {})) stamp(id, 'opened');
    for (const id of Object.keys(v1.notes || {})) at.notes[id] = t;
    for (const k of Object.keys(v1.followed || {})) at.followed[k] = t;
    for (const k of Object.keys(v1.settings || {})) at.settings[k] = t;
    const v2 = JSON.stringify({ ...v1, at, syncedAt: 0 });
    localStorage.setItem(KEY, v2);
    localStorage.removeItem(OLD_KEY);
    return v2;
  } catch (e) { return null; }
}

const now = () => Date.now();
function touch(kind, id, field) {
  if (kind === 'items') (state.at.items[id] = state.at.items[id] || {})[field] = now();
  else state.at[kind][id] = now();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore quota errors */ }
  listeners.forEach(fn => fn());
}

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const getState = () => state;
export const settings = () => state.settings;

/* Call after live content replaces SOURCES so new sources get a follow default. */
export function syncSources(live = false) {
  let changed = false;
  if (live && !state.liveSynced) { state.liveSynced = true; changed = true; }
  // A source nobody has ruled on yet: off until this device has been through
  // the picker, on afterwards, so a source added later isn't silently hidden.
  for (const s of SOURCES) if (!(s.id in state.followed)) {
    state.followed[s.id] = state.onboarded ? !s.unavailable : false; changed = true;
  }
  if (changed) save();
}

export const isOnboarded = () => !!state.onboarded;

/* The picker's only job is to record a deliberate choice. */
export function completeOnboarding(ids) {
  const now = Date.now();
  for (const s of SOURCES) {
    const yes = ids.includes(s.id) && !s.unavailable;
    state.followed[s.id] = yes;
    state.at.followed[s.id] = now;
  }
  state.onboarded = true;
  save();
}

export function resetAll() {
  const followed = state.followed;
  state = DEFAULTS();
  state.followed = {};
  state.liveSynced = true;
  state.onboarded = false;
  save();
}

/* ---------- Lookups ---------- */
export const itemById = (id) => ITEMS.find(i => i.id === id);
export const sourceById = (id) => SOURCES.find(s => s.id === id);
export const topicById = (id) => TOPICS.find(t => t.id === id);
export const isFollowed = (sourceId) => !!state.followed[sourceId];

export const followedItems = () => ITEMS.filter(i => isFollowed(i.sourceId));
export const isSaved = (id) => !!state.saved[id];
export const isCompleted = (id) => !!state.completed[id];
export const progressOf = (id) => state.progress[id] || 0;
export const feedbackOf = (id) => state.feedback[id] || null;
export const noteOf = (id) => state.notes[id] || '';
export const isStarted = (id) => progressOf(id) >= 0.04 && !isCompleted(id);

export const ageDays = (item) => (Date.now() - new Date(item.publishedAt).getTime()) / DAY;
export const isFresh = (item) => ageDays(item) <= state.settings.archiveDays;

/* ---------- Derived collections ---------- */

/* Currently Reading / Watching: started, not finished, most recent first. */
export function currentlyReading() {
  return followedItems()
    .filter(i => isStarted(i.id))
    .sort((a, b) => (state.opened[b.id] || 0) - (state.opened[a.id] || 0));
}

/* All New: fresh, followed, not completed. Started items stay here too —
   the user may want to see them in context — but picks exclude them. */
export function allNew() {
  return followedItems()
    .filter(i => isFresh(i) && !isCompleted(i.id))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function archived() {
  return followedItems()
    .filter(i => !isFresh(i) && !isCompleted(i.id))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function finished() {
  return ITEMS.filter(i => isCompleted(i.id))
    .sort((a, b) => state.completed[b.id] - state.completed[a.id]);
}

/* Every note the user has written, newest first, with its piece attached. */
export function allNotes() {
  return Object.entries(state.notes)
    .map(([id, body]) => ({ id, body, at: state.at.notes[id] || 0, item: itemById(id) }))
    .sort((a, b) => b.at - a.at);
}

export function savedItems() {
  return ITEMS.filter(i => isSaved(i.id))
    .sort((a, b) => state.saved[b.id] - state.saved[a.id]);
}

export function itemsForSource(sourceId) {
  return ITEMS.filter(i => i.sourceId === sourceId)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function itemsForTopic(topicId) {
  return followedItems()
    .filter(i => i.topics.includes(topicId) && !isCompleted(i.id))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/* ---------- Three Worth Your Time ----------
   Personalisation lives inside the followed-source universe only.
   Signals: editorial worth, freshness, explicit 👍/👎 by topic and source,
   what the user finishes, plus a small day-seeded jitter so the trio is
   stable through the day but not identical every day. */
function affinities() {
  const topic = {}, source = {};
  const bump = (obj, k, v) => { obj[k] = (obj[k] || 0) + v; };
  for (const [id, fb] of Object.entries(state.feedback)) {
    const it = itemById(id); if (!it) continue;
    const v = fb === 'up' ? 1 : -1;
    it.topics.forEach(t => bump(topic, t, v * 1.5));
    bump(source, it.sourceId, v);
  }
  for (const id of Object.keys(state.completed)) {
    const it = itemById(id); if (!it) continue;
    it.topics.forEach(t => bump(topic, t, 0.4));
    bump(source, it.sourceId, 0.6);
  }
  for (const id of Object.keys(state.saved)) {
    const it = itemById(id); if (!it) continue;
    it.topics.forEach(t => bump(topic, t, 0.3));
  }
  return { topic, source };
}

function daySeed() {
  const d = new Date(); const s = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let n = 2166136261; for (const ch of s) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619) >>> 0; }
  return n;
}
function jitter(id) {
  let n = daySeed(); for (const ch of id) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619) >>> 0; }
  return (n % 1000) / 1000 * 0.6;
}

const DAY_MS = 86400 * 1000;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const hoursOld = (item) => (Date.now() - new Date(item.publishedAt).getTime()) / 3600000;

/* Home is meant to answer "what today is worth your time", so recency is a
   tier, not a tie-breaker: today's pieces are chosen first and only then does
   it reach back. Within a tier, quality and what you've shown a taste for
   decide. Anything Home already offered on a previous day steps aside for
   something you haven't seen. */
/* A piece, rather than a news brief. Ingest scores 3 at roughly six minutes. */
export const SUBSTANTIAL = 3;

export function worthYourTime(n = state.settings.pickCount || 3) {
  const aff = affinities();
  const today = dayKey();
  // worth 0 is rolling coverage — never a "piece worth your time".
  const pool = allNew().filter(i => i.worth > 0 && !isStarted(i.id) && !isSaved(i.id) && feedbackOf(i.id) !== 'down');

  const scored = pool.map(item => {
    let topicBoost = 0; item.topics.forEach(t => { topicBoost += aff.topic[t] || 0; });
    const sourceBoost = aff.source[item.sourceId] || 0;
    const seenBefore = state.surfaced[item.id] && state.surfaced[item.id] !== today;
    return {
      item,
      hours: hoursOld(item),
      // Offered before and passed over: step aside, but don't disappear — on a
      // quiet day a good piece should still beat a thin new one.
      score: item.worth + topicBoost + sourceBoost + jitter(item.id) - (seenBefore ? 2.5 : 0),
      topicBoost, sourceBoost,
    };
  });

  const picks = [];
  const bySource = {};
  const usedTopics = new Set();
  let videos = 0;
  const maxVideos = Math.max(1, Math.round(n / 5));
  const maxPerSource = n <= 3 ? 1 : Math.max(1, Math.ceil(n / 6));

  const take = (candidates, { strictTopic, capSource, capVideo }) => {
    for (const c of candidates) {
      if (picks.length === n) return;
      if (picks.includes(c)) continue;
      if (capSource && (bySource[c.item.sourceId] || 0) >= maxPerSource) continue;
      if (capVideo && c.item.type === 'video' && videos >= maxVideos) continue;
      if (strictTopic && c.item.topics.length && c.item.topics.every(t => usedTopics.has(t))) continue;
      picks.push(c);
      bySource[c.item.sourceId] = (bySource[c.item.sourceId] || 0) + 1;
      c.item.topics.forEach(t => usedTopics.add(t));
      if (c.item.type === 'video') videos++;
    }
  };

  // A single day rarely holds ten substantial pieces — most days it holds
  // fewer than ten — so rather than scrape the bottom of today's barrel, this
  // takes the substantial things from the last few days first, then today's
  // lighter pieces, then reaches further back. Each pass relaxes either the
  // quality floor or the window, never both at once.
  // Only considered pieces reach Home. Short news has its own place now, so
  // when a day is thin this reaches further back in time rather than lower in
  // quality — which is the honest trade for a section called "worth your time".
  const PASSES = [
    { floor: SUBSTANTIAL, hours: 24 }, { floor: SUBSTANTIAL, hours: 48 },
    { floor: SUBSTANTIAL, hours: 72 }, { floor: SUBSTANTIAL, hours: 24 * 7 },
    { floor: SUBSTANTIAL, hours: 24 * 14 },
    { floor: 2, hours: 48 },          // only if a fortnight of reading is exhausted
  ];
  for (const pass of PASSES) {
    if (picks.length === n) break;
    const tier = scored
      .filter(c => c.hours <= pass.hours && c.item.worth >= pass.floor)
      .sort((a, b) => b.score - a.score);
    take(tier, { strictTopic: true, capSource: true, capVideo: true });
    take(tier, { strictTopic: false, capSource: true, capVideo: true });
  }
  // Last resort, if the source universe is very small: anything left.
  if (picks.length < Math.min(n, 3)) {
    take(scored.slice().sort((a, b) => b.score - a.score), { strictTopic: false, capSource: false, capVideo: false });
  }

  return picks.map(c => ({ ...c, reason: reasonFor(c, aff) }));
}

/* In the Know — the short pieces, kept out of the way of the long reads.
   News you'd want to have noticed, in a form you can scan in fifteen seconds. */
export function inTheKnow(limit = Infinity, exclude = []) {
  const skip = new Set(exclude);
  const candidates = allNew()
    .filter(i => i.worth > 0 && i.worth < SUBSTANTIAL && !skip.has(i.id)
                 && !isCompleted(i.id) && !isStarted(i.id) && feedbackOf(i.id) !== 'down')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // Newest first, but no single newsroom may fill the brief: the busiest
  // source would otherwise take every line.
  if (limit === Infinity) return spaceOutSources(candidates);
  const out = [], perSource = {};
  for (const cap of [1, 2, 99]) {
    for (const i of candidates) {
      if (out.length === limit) return out;
      if (out.includes(i)) continue;
      if ((perSource[i.sourceId] || 0) >= cap) continue;
      out.push(i);
      perSource[i.sourceId] = (perSource[i.sourceId] || 0) + 1;
    }
  }
  return out;
}

/* Roughly chronological, but no newsroom may run more than twice in a row:
   the busiest source otherwise fills the first screen and the feed reads as
   one masthead repeating itself. An item is only ever moved later, never
   earlier, so the sense of time holds. */
function spaceOutSources(list, maxRun = 2) {
  const out = [], held = [];
  const pool = list.slice();
  while (pool.length || held.length) {
    const runSource = out.length >= maxRun
      && out.slice(-maxRun).every(i => i.sourceId === out[out.length - 1].sourceId)
      ? out[out.length - 1].sourceId : null;
    // prefer something held back earlier, then the next that breaks the run
    let next = held.findIndex(i => i.sourceId !== runSource);
    if (next >= 0) { out.push(held.splice(next, 1)[0]); continue; }
    next = pool.findIndex(i => i.sourceId !== runSource);
    if (next === -1) {                       // nothing else left: let the run stand
      out.push(...held.splice(0), ...pool.splice(0));
      break;
    }
    held.push(...pool.splice(0, next));       // the ones we skipped come back soon
    out.push(pool.shift());
  }
  return out;
}

/* Called once Home has actually shown these, so tomorrow can offer something
   else. Items shown today are not penalised until tomorrow. */
export function recordSurfaced(ids) {
  const today = dayKey();
  let changed = false;
  for (const id of ids) if (!state.surfaced[id]) { state.surfaced[id] = today; changed = true; }
  // forget anything older than the freshness window; it can come round again
  const cutoff = Date.now() - (state.settings.archiveDays + 7) * DAY_MS;
  for (const [id, day] of Object.entries(state.surfaced)) {
    const [y, m, d] = day.split('-').map(Number);
    if (new Date(y, m - 1, d).getTime() < cutoff) { delete state.surfaced[id]; changed = true; }
  }
  if (changed) save();
}

function reasonFor({ item, hours, topicBoost, sourceBoost }, aff) {
  const src = sourceById(item.sourceId);
  if (hours <= 14) return 'Published today';
  if (hours <= 24) return 'Published in the last day';
  if (sourceBoost >= 1.5) return `You tend to finish ${src.name}`;
  if (topicBoost >= 1.5) {
    const best = item.topics.slice().sort((a, b) => (aff.topic[b] || 0) - (aff.topic[a] || 0))[0];
    const t = topicById(best);
    if (t) return `More on ${t.name}, as you asked`;
  }
  if (hours <= 48) return 'Yesterday';
  if (item.type === 'video') return `Video · ${Math.round(item.durationSec / 60)} min`;
  if (item.readMinutes >= 15) return `Long read · ${item.readMinutes} min`;
  return `Still worth your time · ${Math.round(hours / 24)} days old`;
}

/* ---------- Mutations ---------- */
export function open(id) {
  state.opened[id] = Date.now();
  touch('items', id, 'opened');
  save();
}

export function setProgress(id, p) {
  const prev = state.progress[id] || 0;
  const next = Math.max(prev, Math.min(1, Math.max(0, p)));
  if (next !== prev) { state.progress[id] = next; touch('items', id, 'progress'); save(); }
}

export function setProgressExact(id, p) {
  state.progress[id] = Math.min(1, Math.max(0, p)); touch('items', id, 'progress'); save();
}

export function complete(id) {
  state.completed[id] = Date.now();
  state.progress[id] = 1;
  touch('items', id, 'completed'); touch('items', id, 'progress');
  save();
}

export function uncomplete(id) {
  delete state.completed[id];
  state.progress[id] = 0;
  touch('items', id, 'completed'); touch('items', id, 'progress');
  save();
}

export function toggleSaved(id) {
  if (state.saved[id]) delete state.saved[id]; else state.saved[id] = Date.now();
  touch('items', id, 'saved');
  save(); return !!state.saved[id];
}

export function setFeedback(id, fb) {
  if (state.feedback[id] === fb) delete state.feedback[id]; else state.feedback[id] = fb;
  touch('items', id, 'feedback');
  save(); return state.feedback[id] || null;
}

export function setNote(id, text) {
  if (text.trim()) state.notes[id] = text; else delete state.notes[id];
  touch('notes', id);
  save();
}

export function setFollowed(sourceId, yes) {
  state.followed[sourceId] = !!yes; touch('followed', sourceId); save();
}

export function setSetting(key, value) {
  state.settings[key] = value; touch('settings', key); save();
}

/* ============================================================
   Sync — merging two devices without a server refereeing.

   Rules, chosen so a stale device can never take something away:
     progress   furthest point wins, regardless of when it was recorded
     completed  sticky: once finished, it stays finished
     saved / feedback / followed / settings / opened   most recent change wins
     notes      most recent wins; if both sides changed since the last sync,
                the loser is kept as a conflict copy rather than discarded
   ============================================================ */

const ITEM_FIELDS = ['progress', 'completed', 'saved', 'feedback', 'opened'];

/* The local state in the shape the server stores. */
export function snapshot() {
  const items = {};
  const add = (id) => (items[id] = items[id] || { item_id: id });
  for (const [id, v] of Object.entries(state.progress)) add(id).progress = v;
  for (const [id, v] of Object.entries(state.completed)) add(id).completed_at = v;
  for (const [id, v] of Object.entries(state.saved)) add(id).saved_at = v;
  for (const [id, v] of Object.entries(state.feedback)) add(id).feedback = v;
  for (const [id, v] of Object.entries(state.opened)) add(id).opened_at = v;
  for (const id of Object.keys(items)) items[id].at = state.at.items[id] || {};
  return {
    items: Object.values(items),
    notes: Object.entries(state.notes).map(([item_id, body]) => ({ item_id, body, at: state.at.notes[item_id] || 0 })),
    follows: Object.entries(state.followed).map(([source_id, followed]) => ({ source_id, followed, at: state.at.followed[source_id] || 0 })),
    settings: { ...state.settings },
    settingsAt: { ...state.at.settings },
  };
}

/* Everything changed since the last successful sync — what gets pushed. */
export function pending(since = state.syncedAt) {
  const s = snapshot();
  return {
    items: s.items.filter(i => Object.values(i.at).some(t => t > since)),
    notes: s.notes.filter(n => n.at > since),
    follows: s.follows.filter(f => f.at > since),
    settings: Object.fromEntries(Object.entries(s.settings).filter(([k]) => (s.settingsAt[k] || 0) > since)),
    settingsAt: s.settingsAt,
  };
}

export function hasPending(since = state.syncedAt) {
  const p = pending(since);
  return p.items.length > 0 || p.notes.length > 0 || p.follows.length > 0 || Object.keys(p.settings).length > 0;
}

/* Fold the server's rows into local state. Returns a summary for logging. */
export function mergeRemote(remote, { markSynced = 0 } = {}) {
  const changed = { items: 0, notes: 0, follows: 0, settings: 0, conflicts: 0 };
  const localAt = (id, f) => (state.at.items[id] || {})[f] || 0;

  for (const r of remote.items || []) {
    const id = r.item_id, rAt = r.at || {};
    // progress: furthest wins, so an old device can't rewind you
    if (r.progress != null && r.progress > (state.progress[id] || 0)) {
      state.progress[id] = r.progress;
      (state.at.items[id] = state.at.items[id] || {}).progress = rAt.progress || r.updated_at || 0;
      changed.items++;
    }
    // completed: sticky
    if (r.completed_at && !state.completed[id]) {
      state.completed[id] = r.completed_at;
      state.progress[id] = 1;
      (state.at.items[id] = state.at.items[id] || {}).completed = rAt.completed || r.updated_at || 0;
      changed.items++;
    }
    // the rest: newest write wins
    for (const [field, key] of [['saved', 'saved_at'], ['feedback', 'feedback'], ['opened', 'opened_at']]) {
      const t = rAt[field] || r.updated_at || 0;
      if (t > localAt(id, field)) {
        const v = r[key];
        const bucket = field === 'saved' ? state.saved : field === 'feedback' ? state.feedback : state.opened;
        if (v == null) delete bucket[id]; else bucket[id] = v;
        (state.at.items[id] = state.at.items[id] || {})[field] = t;
        changed.items++;
      }
    }
  }

  for (const r of remote.notes || []) {
    const id = r.item_id, rAt = r.at || r.updated_at || 0, mine = state.at.notes[id] || 0;
    if (rAt <= mine) {
      // Both sides edited since the last sync and mine is newer: keep theirs
      // rather than silently dropping a thought written on another device.
      if (mine > (state.syncedAt || 0) && rAt > (state.syncedAt || 0) && r.body && r.body !== state.notes[id]) {
        state.notes[id] = `${state.notes[id] || ''}\n\n— also written elsewhere —\n${r.body}`;
        state.at.notes[id] = Date.now();
        changed.conflicts++;
      }
      continue;
    }
    if (r.body) state.notes[id] = r.body; else delete state.notes[id];
    state.at.notes[id] = rAt;
    changed.notes++;
  }

  for (const r of remote.follows || []) {
    const t = r.at || r.updated_at || 0;
    if (t > (state.at.followed[r.source_id] || 0)) {
      state.followed[r.source_id] = !!r.followed;
      state.at.followed[r.source_id] = t;
      changed.follows++;
    }
  }
  // Sources arriving from another device are a choice already made — a new
  // device signing in should land in the reading, not in the picker.
  if ((remote.follows || []).length) state.onboarded = true;

  const rs = remote.settings || {}, rsAt = remote.settingsAt || {};
  for (const [k, v] of Object.entries(rs)) {
    const t = rsAt[k] || remote.settingsUpdatedAt || 0;
    if (t > (state.at.settings[k] || 0)) { state.settings[k] = v; state.at.settings[k] = t; changed.settings++; }
  }

  if (markSynced) state.syncedAt = markSynced;
  save();
  return changed;
}

export function markSynced(t) { state.syncedAt = t; save(); }
export const lastSynced = () => state.syncedAt;
