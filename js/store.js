/* Curated — local state. Everything persists in localStorage so the
   prototype survives refreshes without a backend. */

import { ITEMS, SOURCES, TOPICS } from './data.js';

const KEY = 'curated.state.v1';
const DAY = 86400 * 1000;

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
  },
  liveSynced: false,
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULTS(), ...parsed, settings: { ...DEFAULTS().settings, ...(parsed.settings || {}) } };
      return merged;
    }
  } catch (e) { /* fall through to fresh state */ }
  return DEFAULTS();
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
  if (live && !state.liveSynced) {
    // First time real sources arrive: start from their defaults, not the mock era's follows.
    for (const s of SOURCES) state.followed[s.id] = s.followed;
    state.liveSynced = true; changed = true;
  }
  for (const s of SOURCES) if (!(s.id in state.followed)) { state.followed[s.id] = s.followed; changed = true; }
  if (changed) save();
}

export function resetAll() {
  const followed = state.followed;
  state = DEFAULTS();
  state.followed = Object.fromEntries(SOURCES.map(s => [s.id, !s.unavailable]));
  state.liveSynced = true;
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

export function savedItems() {
  return ITEMS.filter(i => isSaved(i.id))
    .sort((a, b) => state.saved[b.id] - state.saved[a.id]);
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

export function threeWorthYourTime() {
  const aff = affinities();
  const pool = allNew().filter(i => !isStarted(i.id) && !isSaved(i.id) && feedbackOf(i.id) !== 'down');
  const scored = pool.map(item => {
    let score = item.worth * 2;
    const days = ageDays(item);
    score += Math.max(0, 2 - days * 0.3);
    let topicBoost = 0; item.topics.forEach(t => { topicBoost += aff.topic[t] || 0; });
    const sourceBoost = aff.source[item.sourceId] || 0;
    score += topicBoost + sourceBoost + jitter(item.id);
    return { item, score, topicBoost, sourceBoost };
  }).sort((a, b) => b.score - a.score);

  const picks = [];
  const usedSources = new Set(); const usedTopics = new Set(); let videos = 0;
  const tryPick = (strict) => {
    for (const c of scored) {
      if (picks.length === 3) break;
      if (picks.includes(c)) continue;
      if (usedSources.has(c.item.sourceId)) continue;
      if (c.item.type === 'video' && videos >= 1) continue;
      if (strict && c.item.topics.every(t => usedTopics.has(t))) continue;
      picks.push(c); usedSources.add(c.item.sourceId);
      c.item.topics.forEach(t => usedTopics.add(t));
      if (c.item.type === 'video') videos++;
    }
  };
  tryPick(true); tryPick(false);
  // Absolute last resort: fill with anything left (e.g. tiny source universe).
  for (const c of scored) { if (picks.length === 3) break; if (!picks.includes(c)) picks.push(c); }

  return picks.map(c => ({ ...c, reason: reasonFor(c, aff) }));
}

function reasonFor({ item, topicBoost, sourceBoost }, aff) {
  const src = sourceById(item.sourceId);
  if (sourceBoost >= 1.5) return `You tend to finish ${src.name}`;
  if (sourceBoost >= 1) return `You liked recent pieces from ${src.name}`;
  if (topicBoost >= 1.5) {
    const best = item.topics.slice().sort((a, b) => (aff.topic[b] || 0) - (aff.topic[a] || 0))[0];
    return `More on ${topicById(best).name}, as you asked`;
  }
  if (item.type === 'video') return `Video · ${Math.round(item.durationSec / 60)} min`;
  if (item.readMinutes >= 15) return `Long read · ${item.readMinutes} min`;
  if (ageDays(item) < 0.35) return 'Published this morning';
  return `Worth your time from ${src.name}`;
}

/* ---------- Mutations ---------- */
export function open(id) {
  state.opened[id] = Date.now();
  save();
}

export function setProgress(id, p) {
  const prev = state.progress[id] || 0;
  const next = Math.max(prev, Math.min(1, Math.max(0, p)));
  if (next !== prev) { state.progress[id] = next; save(); }
}

export function setProgressExact(id, p) {
  state.progress[id] = Math.min(1, Math.max(0, p)); save();
}

export function complete(id) {
  state.completed[id] = Date.now();
  state.progress[id] = 1;
  save();
}

export function uncomplete(id) {
  delete state.completed[id];
  state.progress[id] = 0;
  save();
}

export function toggleSaved(id) {
  if (state.saved[id]) delete state.saved[id]; else state.saved[id] = Date.now();
  save(); return !!state.saved[id];
}

export function setFeedback(id, fb) {
  if (state.feedback[id] === fb) delete state.feedback[id]; else state.feedback[id] = fb;
  save(); return state.feedback[id] || null;
}

export function setNote(id, text) {
  if (text.trim()) state.notes[id] = text; else delete state.notes[id];
  save();
}

export function setFollowed(sourceId, yes) {
  state.followed[sourceId] = !!yes; save();
}

export function setSetting(key, value) {
  state.settings[key] = value; save();
}
