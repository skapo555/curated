/* Curated — app shell, router and screens. No framework, no build step. */

import { ITEMS, SOURCES, TOPICS, SOURCE_TYPE_LABEL, imageFor, CONTENT, loadContent, loadItemDetail } from './data.js';
import * as S from './store.js';
import * as A from './auth.js';
import * as Sync from './sync.js';

/* ============================================================ helpers */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDur = (sec) => { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); const h = Math.floor(m / 60); return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
const readable = (item) => item.type === 'video' || item.hasBody !== false;
const lengthLabel = (item) => item.type === 'video' ? `${Math.round((item.durationSec || 0) / 60) || '?'} min watch` : readable(item) ? `${item.readMinutes} min read` : 'On publisher’s site';
const relTime = (iso) => {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 60) return `${Math.max(1, Math.round(d))}m ago`;
  if (d < 60 * 24) return `${Math.round(d / 60)}h ago`;
  const days = Math.round(d / 1440);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};
const dayLabel = (iso) => {
  const d = new Date(iso), t = new Date(); const diff = Math.floor((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
};
const todayLine = () => new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
const pct = (item) => Math.min(S.isCompleted(item.id) ? 100 : 99, Math.round(S.progressOf(item.id) * 100));
const remaining = (item) => {
  const p = S.progressOf(item.id);
  if (item.type === 'video') { const left = Math.round(item.durationSec * (1 - p) / 60); return `${left} min left`; }
  const left = Math.max(1, Math.round((item.readMinutes || 5) * (1 - p))); return `about ${left} min left`;
};
const src = (item) => S.sourceById(item.sourceId);
const srcName = (item) => src(item).short || src(item).name;
const haptic = (ms = 10) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

const I = {
  today: '<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12v16H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M12 4h5.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H12"/><path d="M7 8h2M7 11h2M15 8h2M15 11h2"/></svg>',
  topics: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  saved: '<svg viewBox="0 0 24 24"><path d="M6 4.5h12v16l-6-4.2-6 4.2z"/></svg>',
  sources: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5S14.5 17.9 12 20.5M12 3.5C9.5 6.1 8.3 8.9 8.3 12s1.2 5.9 3.7 8.5"/></svg>',
  reading: '<svg viewBox="0 0 24 24"><path d="M5 5.5h14v13H5z"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><path d="M4 7h16v3H4zM5.5 10v9h13v-9"/><path d="M10 14h4"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 4.5h12v16l-6-4.2-6 4.2z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h4.5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M17 13V4h3v9zM17 13l-4 7c-1.5 0-2.5-1-2.5-2.5V14H6a2 2 0 0 1-2-2.3l1-6A2 2 0 0 1 7 4h10"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10.5L19 8v11.5H5z"/><path d="M8 12h8M8 15.5h5"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 4v11M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v6H5V7h6"/></svg>',
  type: '<svg viewBox="0 0 24 24"><path d="M4 18L8.5 6l4.5 12M5.6 14h5.8"/><path d="M15 18l2.6-7 2.6 7M15.9 15.6h3.4"/></svg>',
  notebook: '<svg viewBox="0 0 24 24"><path d="M7 4.5h11v15H7z"/><path d="M7 4.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2"/><path d="M10 9h5M10 12.5h5"/></svg>',
  browse: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
};

/* ============================================================ UI bits */
let toastTimer;
function toast(msg, ok = false) {
  const t = $('#toast');
  t.innerHTML = (ok ? I.check : '') + `<span>${esc(msg)}</span>`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function sheet(html, handlers = {}) {
  const b = $('#sheet');
  b.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  b.hidden = false;
  const close = () => { b.hidden = true; b.innerHTML = ''; };
  b.onclick = (e) => { if (e.target === b) close(); };
  for (const [sel, fn] of Object.entries(handlers)) $(sel, b).onclick = () => { fn(); close(); };
  return close;
}

function celebrate() {
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="ring">${I.check}</div>`;
  document.body.appendChild(el);
  haptic([12, 40, 18]);
  setTimeout(() => el.remove(), 900);
}

function imgHTML(item, ratio = 'r-3x2', w = 900, h = 600, extra = '') {
  const { src: url, tone } = imageFor(item, w, h);
  const name = src(item) ? src(item).name : '';
  // The monogram sits underneath: it shows when a publisher has no image, or
  // blocks hotlinking (ABC's CDN does), instead of an empty coloured block.
  const ph = `<span class="ph" aria-hidden="true"><b>${esc(name.slice(0, 1))}</b><i>${esc(name)}</i></span>`;
  const img = url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')">` : '';
  return `<div class="img ${ratio}" style="--tone:${tone}">${ph}${img}${extra}</div>`;
}
const videoExtras = (item, play = false) => `<span class="dur">${fmtDur(item.durationSec)}</span>${play ? `<span class="play"><span>${I.play}</span></span>` : ''}`;

/* A publisher's image can fail for a moment on a patchy connection. Give it one
   more try before falling back to the monogram underneath. */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.closest('.img')) return;
  if (img.dataset.retried) { img.remove(); return; }
  img.dataset.retried = '1';
  const src = img.src.split('#')[0];
  setTimeout(() => { img.src = src + (src.includes('?') ? '&' : '?') + 'r=1'; }, 1200);
}, true);

/* ============================================================ nav */
const NAV_MAIN = [
  { id: 'today', href: '#/', label: 'Today', icon: I.today },
  { id: 'new', href: '#/new', label: 'All New', icon: I.browse },
  { id: 'topics', href: '#/topics', label: 'Topics', icon: I.topics },
  { id: 'saved', href: '#/saved', label: 'Saved', icon: I.saved },
  { id: 'sources', href: '#/sources', label: 'Sources', icon: I.sources },
];
const NAV_MORE = [
  { id: 'notes', href: '#/notes', label: 'Notebook', icon: I.notebook },
  { id: 'reading', href: '#/reading', label: 'Currently Reading', icon: I.reading },
  { id: 'archive', href: '#/archive', label: 'Archive', icon: I.archive },
  { id: 'settings', href: '#/settings', label: 'Settings', icon: I.settings },
];
function renderNav(active) {
  const link = (n) => `<a href="${n.href}" ${active === n.id ? 'aria-current="page"' : ''}>${n.icon}<span>${n.label}</span></a>`;
  $('#tabbar').innerHTML = NAV_MAIN.map(link).join('');
  $('#sidebar-nav').innerHTML = NAV_MAIN.map(link).join('') + '<div class="sep"></div>' + NAV_MORE.map(link).join('');
}

/* ============================================================ card renderers */
function continueCard(item) {
  const p = S.progressOf(item.id);
  const isVideo = item.type === 'video';
  return `<a class="continue" href="#/item/${item.id}">
    ${imgHTML(item, 'r-16x9', 1000, 563, isVideo ? videoExtras(item) : '')}
    <div class="continue-body">
      <div class="meta"><span class="src">${esc(src(item).name)}</span><span>${isVideo ? 'Watching' : 'Reading'}</span></div>
      <h3>${esc(item.title)}</h3>
      <div class="progress-row"><span>${pct(item)}%</span><div class="bar"><i style="width:${p * 100}%"></i></div><span>${remaining(item)}</span><span class="cta">${isVideo ? 'Continue' : 'Continue'} →</span></div>
    </div></a>`;
}
function miniRow(item) {
  const p = S.progressOf(item.id);
  return `<a class="row-mini" href="#/item/${item.id}">${imgHTML(item, 'r-1x1', 200, 200)}<div class="t"><h4>${esc(item.title)}</h4><div class="meta">${esc(src(item).name)} · ${pct(item)}% · ${remaining(item)}</div></div></a>`;
}
function pickCard({ item, reason }, n) {
  const isVideo = item.type === 'video';
  const meta = `<div class="meta"><span class="src">${esc(srcName(item))}</span><span>${lengthLabel(item)}</span></div>`;
  if (n === 1) {
    return `<a class="pick pick-lead" href="#/item/${item.id}">${imgHTML(item, 'r-16x9', 1000, 563, isVideo ? videoExtras(item, true) : '')}
      <div class="pick-text"><span class="n">${n}.</span>${meta}<h3>${esc(item.title)}</h3><p class="dek">${esc(item.dek)}</p><span class="reason">${esc(reason)}</span></div></a>`;
  }
  return `<a class="pick pick-split" href="#/item/${item.id}"><div><span class="n">${n}.</span>${meta}<h3>${esc(item.title)}</h3><p class="dek">${esc(item.dek)}</p><span class="reason">${esc(reason)}</span></div>${imgHTML(item, 'r-1x1', 400, 400, isVideo ? `<span class="dur">${fmtDur(item.durationSec)}</span>` : '')}</a>`;
}

/* Deliberately plain: no image, no standfirst — a line you scan, not a card. */
function briefRow(item) {
  return `<a class="brief-row" href="#/item/${item.id}">
    <span class="brief-src">${esc(srcName(item))}</span>
    <span class="brief-title">${esc(item.title)}</span>
    <span class="brief-when">${relTime(item.publishedAt)}</span>
  </a>`;
}

function listRow(item, opts = {}) {
  const p = S.progressOf(item.id); const done = S.isCompleted(item.id);
  const state = done ? `<span class="state">${I.check.replace('<svg', '<svg style="width:14px;height:14px;stroke:var(--success);fill:none;stroke-width:2.4"')} Finished</span>`
    : S.isStarted(item.id) ? `<span class="state"><span class="bar"><i style="width:${p * 100}%"></i></span>${pct(item)}%</span>` : '';
  return `<a class="row ${done ? 'done' : ''}" href="#/item/${item.id}"><div>
    <div class="meta"><span class="src">${esc(srcName(item))}</span><span>${lengthLabel(item)}</span><span>${relTime(item.publishedAt)}</span></div>
    <h3>${esc(item.title)}</h3><p class="dek">${esc(item.dek)}</p>${state}</div>
    ${imgHTML(item, 'r-1x1', 300, 300, item.type === 'video' ? `<span class="dur">${fmtDur(item.durationSec)}</span>` : '')}</a>`;
}
function groupedByDay(items, opts) {
  let out = '', last = null;
  for (const it of items) { const d = dayLabel(it.publishedAt); if (d !== last) { out += `<div class="day-head">${d}</div>`; last = d; } out += listRow(it, opts); }
  return out;
}
const brandMark = () => `<a class="mark" href="#/" aria-label="Curated — Today">c</a>`;
function pageHead(title, sub = '', back = null) {
  const gear = title === 'Settings' ? '' : `<span class="spacer"></span><a class="icon-btn" href="#/settings" aria-label="Settings">${I.settings}</a>`;
  return `<header class="page-head"><div class="head-row">${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${I.back}</a>` : ''}<a class="wordmark" href="#/" aria-label="Curated — Today">curated</a>${gear}</div><h1 class="page-title">${esc(title)}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</header>`;
}

/* ============================================================ screens */
const screens = {};

screens.home = () => {
  renderNav('today');
  const reading = S.currentlyReading();
  const picks = S.worthYourTime();
  S.recordSurfaced(picks.map(p => p.item.id));
  const newCount = S.allNew().length;
  const todayCount = picks.filter(p => p.hours <= 24).length;
  const brief = S.inTheKnow(6, picks.map(p => p.item.id));
  const cont = reading.length ? `<section class="section" aria-labelledby="cr">
      <div class="section-head"><h2 class="kicker" id="cr">Continue ${reading[0].type === 'video' ? 'Watching' : 'Reading'}</h2>${reading.length > 1 ? '<a class="section-link" href="#/reading">All →</a>' : ''}</div>
      ${continueCard(reading[0])}
      ${reading.length > 1 ? `<div class="continue-more">${reading.slice(1, 3).map(miniRow).join('')}</div>` : ''}
    </section>` : '';
  const heading = picks.length >= 3 ? `${picks.length} Worth Your Time` : picks.length === 2 ? 'Two Worth Your Time' : 'One Worth Your Time';
  const three = picks.length ? `<section class="section" aria-labelledby="tw">
      <div class="section-head"><h2 class="kicker" id="tw">${heading}</h2>${todayCount < picks.length ? `<span class="section-note">${todayCount} from today</span>` : ''}</div>
      <div class="picks">${picks.map((p, i) => pickCard(p, i + 1)).join('')}</div>
    </section>` : `<section class="section"><div class="empty">Nothing new is waiting for you.<small>That's fine. ${reading.length ? 'Finish what you started, or ' : 'F'}ollow a source or two when you feel like it.</small></div></section>`;
  return `<header class="page-head"><div class="head-row"><a class="wordmark" href="#/" aria-label="Curated — Today">curated</a><span class="spacer"></span><a class="icon-btn" href="#/settings" aria-label="Settings">${I.settings}</a></div><div class="dateline">${todayLine()}</div></header>
    <div class="home-grid"><div>${cont}</div><div>${three}
    ${brief.length ? `<section class="section" aria-labelledby="itk">
      <div class="section-head"><h2 class="kicker" id="itk">In the Know</h2><span class="section-note">Shorter pieces</span></div>
      <div class="brief">${brief.map(briefRow).join('')}</div>
    </section>` : ''}
    ${newCount > 0 ? `<div class="see-all"><a href="#/new">See all ${newCount} new →</a></div>` : ''}</div></div>`;
};

let newFilter = { kind: 'all', source: '', topic: '' };
screens.new = () => {
  renderNav('');
  let items = S.allNew();
  if (newFilter.kind !== 'all') items = items.filter(i => i.type === newFilter.kind);
  if (newFilter.source) items = items.filter(i => i.sourceId === newFilter.source);
  if (newFilter.topic) items = items.filter(i => i.topics.includes(newFilter.topic));
  const sources = SOURCES.filter(s => S.isFollowed(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  const chip = (label, kind) => `<button class="chip" data-kind="${kind}" aria-pressed="${newFilter.kind === kind}">${label}</button>`;
  return pageHead('All New', `Everything from your sources in the last ${S.settings().archiveDays} days. Home keeps it to three; here you browse on purpose.`, '#/') +
    `<div class="filters">${chip('All', 'all')}${chip('Articles', 'article')}${chip('Videos', 'video')}
      <span class="chip select" aria-pressed="${!!newFilter.source}">${newFilter.source ? esc(S.sourceById(newFilter.source).name) : 'Source'}<select class="native" id="f-source" aria-label="Filter by source"><option value="">All sources</option>${sources.map(s => `<option value="${s.id}" ${newFilter.source === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></span>
      <span class="chip select" aria-pressed="${!!newFilter.topic}">${newFilter.topic ? esc(S.topicById(newFilter.topic).name) : 'Topic'}<select class="native" id="f-topic" aria-label="Filter by topic"><option value="">All topics</option>${TOPICS.map(t => `<option value="${t.id}" ${newFilter.topic === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></span>
    </div>
    <div class="list">${items.length ? groupedByDay(items, { showNew: true }) : '<div class="empty">Nothing matches.<small>Try a different filter.</small></div>'}</div>
    <p class="calm">Older pieces move to <a href="#/archive" style="text-decoration:underline">Archive</a> after ${S.settings().archiveDays} days. Nothing is deleted.</p>`;
};
screens.new.mount = (root) => {
  $$('.chip[data-kind]', root).forEach(b => b.onclick = () => { newFilter.kind = b.dataset.kind; render(); });
  $('#f-source', root).onchange = (e) => { newFilter.source = e.target.value; render(); };
  $('#f-topic', root).onchange = (e) => { newFilter.topic = e.target.value; render(); };
};

screens.topics = () => {
  renderNav('topics');
  return pageHead('Topics', 'Your sources, organised by what they cover.') +
    `<div class="topic-grid">${TOPICS.map(t => { const n = S.itemsForTopic(t.id).filter(S.isFresh).length; return `<a class="topic-card" href="#/topic/${t.id}"><h3>${esc(t.name)}</h3><p>${esc(t.blurb)}</p><div class="count">${n} recent</div></a>`; }).join('')}</div>`;
};

screens.topic = (id) => {
  renderNav('topics');
  const t = S.topicById(id); if (!t) return screens.topics();
  const items = S.itemsForTopic(id);
  const fresh = items.filter(S.isFresh), older = items.filter(i => !S.isFresh(i));
  const long = fresh.filter(i => (i.type === 'article' && i.readMinutes >= 12) || (i.type === 'video' && i.durationSec >= 30 * 60));
  return pageHead(t.name, esc(t.blurb), '#/topics') +
    (long.length ? `<section class="section"><div class="section-head"><h2 class="kicker">Long reads</h2></div><div class="list">${long.map(i => listRow(i)).join('')}</div></section>` : '') +
    `<section class="section"><div class="section-head"><h2 class="kicker">Latest</h2></div><div class="list grid">${fresh.length ? fresh.map(i => listRow(i)).join('') : '<div class="empty">Nothing recent here.</div>'}</div></section>` +
    (older.length ? `<section class="section"><div class="section-head"><h2 class="kicker">From the archive</h2></div><div class="list grid">${older.map(i => listRow(i)).join('')}</div></section>` : '');
};

screens.saved = () => {
  renderNav('saved');
  const items = S.savedItems();
  return pageHead('Saved', 'Set aside for when you have the time.') +
    `<div class="list grid">${items.length ? items.map(i => listRow(i)).join('') : '<div class="empty">Nothing saved yet.<small>Tap the bookmark on anything to keep it here.</small></div>'}</div>`;
};

screens.notes = () => {
  renderNav('');
  const notes = S.allNotes();
  const row = (n) => {
    const it = n.item;
    const when = n.at ? relTime(new Date(n.at).toISOString()) : '';
    return `<article class="note-card">
      <div class="note-body">${esc(n.body)}</div>
      <div class="note-foot">
        ${it ? `<a class="note-src" href="#/item/${it.id}">${esc(srcName(it))} · ${esc(it.title)}</a>`
             : `<span class="note-src gone">The piece this belongs to has left your feed</span>`}
        <span class="note-when">${when}</span>
      </div>
    </article>`;
  };
  return pageHead('Notebook', 'Everything you\u2019ve written, in one place. Private to this device.', '#/') +
    (notes.length ? `<div class="notebook-actions"><button class="btn ghost sm" id="nb-copy">Copy all</button><button class="btn ghost sm" id="nb-download">Download (.md)</button></div>` : '') +
    `<div class="notebook">${notes.length ? notes.map(row).join('') : '<div class="empty">No notes yet.<small>Open anything and tap the notes button while you read.</small></div>'}</div>`;
};
screens.notes.mount = (root) => {
  const md = () => {
    const lines = ['# Curated \u2014 notebook', '', `Exported ${new Date().toLocaleString('en-AU')}`, ''];
    for (const n of S.allNotes()) {
      const it = n.item;
      lines.push(it ? `## ${it.title}` : '## (piece no longer in your feed)');
      if (it) lines.push(`*${srcName(it)}${it.author ? ' \u2014 ' + it.author : ''}* \u00b7 [${it.url}](${it.url})`);
      lines.push('', n.body, '');
    }
    return lines.join('\n');
  };
  const copy = $('#nb-copy', root);
  if (copy) copy.onclick = async () => {
    try { await navigator.clipboard.writeText(md()); toast('Notebook copied', true); }
    catch (e) { toast('Couldn\u2019t copy \u2014 try Download'); }
  };
  const dl = $('#nb-download', root);
  if (dl) dl.onclick = () => {
    const blob = new Blob([md()], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `curated-notebook-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Notebook downloaded', true);
  };
};

screens.reading = () => {
  renderNav('');
  const items = S.currentlyReading();
  return pageHead('Currently Reading', 'Things you started. Finish one before starting another — or don’t.', '#/') +
    `<div class="list grid">${items.length ? items.map(i => listRow(i)).join('') : '<div class="empty">Nothing in progress.<small>Anything you open is remembered here automatically.</small></div>'}</div>`;
};

let archiveTab = 'older';
screens.archive = () => {
  renderNav('');
  const days = S.settings().archiveDays;
  const items = archiveTab === 'older' ? S.archived() : S.finished();
  return pageHead('Archive', `New content quietly moves here after ${days} days. It’s all still here, still searchable.`, '#/') +
    `<div class="filters"><button class="chip" data-tab="older" aria-pressed="${archiveTab === 'older'}">Older than ${days} days</button><button class="chip" data-tab="done" aria-pressed="${archiveTab === 'done'}">Finished</button></div>
    <div class="list grid">${items.length ? items.map(i => listRow(i)).join('') : `<div class="empty">${archiveTab === 'older' ? 'Nothing has aged out yet.' : 'Nothing finished yet.'}<small>${archiveTab === 'older' ? `Change the window in <a href="#/settings" style="text-decoration:underline">Settings</a>.` : 'Finished pieces land here so you can find them again.'}</small></div>`}</div>`;
};
screens.archive.mount = (root) => { $$('.chip[data-tab]', root).forEach(b => b.onclick = () => { archiveTab = b.dataset.tab; render(); }); };

screens.source = (id) => {
  renderNav('sources');
  const src = S.sourceById(id);
  if (!src) return screens.sources();
  const items = S.itemsForSource(id);
  const fresh = items.filter(i => S.isFresh(i) && !S.isCompleted(i.id));
  const older = items.filter(i => !S.isFresh(i) || S.isCompleted(i.id));
  const f = S.isFollowed(id);
  const { tone } = imageFor({ img: id });
  return pageHead(src.name, '', '#/sources').replace('</header>', `
      <div class="source-hero">
        <div class="avatar ${src.type === 'youtube' ? 'yt' : ''}" style="--tone:${tone}" aria-hidden="true">${esc(src.name[0])}</div>
        <div class="t"><p>${esc(src.tagline)}</p><div class="type">${SOURCE_TYPE_LABEL[src.type]}${src.metadataOnly ? ' · Headlines only' : ''} · ${items.length} in your library</div></div>
        ${src.unavailable ? '' : `<button class="btn sm ${f ? 'ghost' : 'primary'}" data-follow="${id}" aria-pressed="${f}">${f ? 'Following' : 'Follow'}</button>`}
      </div>
      <p class="hint" style="margin-top:14px"><a href="${src.home}" target="_blank" rel="noopener">Visit ${esc(src.name)} ${I.ext.replace('<svg', '<svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;vertical-align:-2px"')}</a></p>
    </header>`) +
    (fresh.length ? `<section class="section"><div class="section-head"><h2 class="kicker">Recent</h2></div><div class="list grid">${fresh.map(i => listRow(i)).join('')}</div></section>` : '')
    + (older.length ? `<section class="section"><div class="section-head"><h2 class="kicker">Earlier</h2></div><div class="list grid">${older.map(i => listRow(i)).join('')}</div></section>` : '')
    + (!items.length ? '<div class="empty">Nothing from this source yet.<small>It\u2019ll appear here as they publish.</small></div>' : '');
};
screens.source.mount = (root) => {
  $$('[data-follow]', root).forEach(b => b.onclick = () => {
    const id = b.dataset.follow; const s = S.sourceById(id); const now = !S.isFollowed(id);
    S.setFollowed(id, now); haptic(); toast(now ? `Following ${s.name}` : `Unfollowed ${s.name}`, now); render();
  });
};

let sourceQuery = '';
screens.sources = () => {
  renderNav('sources');
  const q = sourceQuery.trim().toLowerCase();
  const all = SOURCES.slice().sort((a, b) => a.name.localeCompare(b.name));
  const match = (s) => !q || s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q) || SOURCE_TYPE_LABEL[s.type].toLowerCase().includes(q);
  const followed = all.filter(s => S.isFollowed(s.id) && match(s));
  const discover = all.filter(s => !S.isFollowed(s.id) && match(s));
  const row = (s) => { const { tone } = imageFor({ img: s.id }); const f = S.isFollowed(s.id); const un = s.unavailable; const n = S.itemsForSource(s.id).length;
    return `<div class="source-row ${un ? 'unavailable' : ''}">
      <a class="source-open" href="#/source/${s.id}" aria-label="${esc(s.name)}">
        <div class="avatar ${s.type === 'youtube' ? 'yt' : ''}" style="--tone:${tone}" aria-hidden="true">${esc(s.name[0])}</div>
        <div class="t"><h3>${esc(s.name)}</h3><p>${esc(s.tagline)}</p>
          <div class="type">${SOURCE_TYPE_LABEL[s.type]}${un ? ` · <span class="warn">Unavailable — ${esc(un)}</span>` : s.metadataOnly ? ' · Headlines only' : ''}${n && !un ? ` · ${n} pieces` : ''}</div></div>
      </a>
      ${un ? '' : `<button class="btn sm ${f ? 'ghost' : 'primary'}" data-follow="${s.id}" aria-pressed="${f}">${f ? 'Following' : 'Follow'}</button>`}</div>`; };
  return pageHead('Sources', 'You decide who you trust. Curated only ever draws from this list.') +
    `<div class="search">${I.search}<input type="search" id="src-q" placeholder="Search sources…" value="${esc(sourceQuery)}" autocomplete="off"></div>
    ${q && !followed.length && !discover.length ? `<div class="empty">No source called “${esc(sourceQuery)}”.<small>Soon you’ll be able to paste any website or channel URL to follow it.</small></div>` : ''}
    ${followed.length ? `<section class="section"><div class="section-head"><h2 class="kicker">Following · ${followed.length}</h2></div><div class="list">${followed.map(row).join('')}</div></section>` : ''}
    ${discover.length ? `<section class="section"><div class="section-head"><h2 class="kicker">${q ? 'Results' : 'Worth considering'}</h2></div><div class="list">${discover.map(row).join('')}</div></section>` : ''}
    <p class="hint">Following a source adds everything it publishes to All New and makes it eligible for your three. Unfollowing removes it everywhere — nothing sneaks back in.</p>`;
};
screens.sources.mount = (root) => {
  const input = $('#src-q', root);
  input.oninput = () => { sourceQuery = input.value; const pos = input.selectionStart; render(); const el = $('#src-q'); el.focus(); el.setSelectionRange(pos, pos); };
  $$('[data-follow]', root).forEach(b => b.onclick = () => {
    const id = b.dataset.follow; const s = S.sourceById(id); const now = !S.isFollowed(id);
    S.setFollowed(id, now); haptic(); toast(now ? `Following ${s.name}` : `Unfollowed ${s.name}`, now); render();
  });
};

function accountGroup() {
  const u = A.currentUser();
  const st = Sync.syncState();
  if (!A.isSignedIn()) {
    return `<div class="group"><h2>Your account</h2>
      <p class="desc">Curated works perfectly well without one — everything stays on this device. Sign in only if you want your reading to follow you to another device.</p>
      <div class="options"><a class="opt link" href="#/signin"><span>Sign in<small>A link by email. No password.</small></span><span class="chev"></span></a></div></div>`;
  }
  const when = st.at ? relTime(new Date(st.at).toISOString()) : 'not yet';
  const label = st.status === 'syncing' ? 'Syncing…'
    : st.status === 'offline' ? 'Offline — will sync when you’re back'
    : st.status === 'error' ? 'Sync had trouble — it will retry'
    : `Last synced ${when}`;
  return `<div class="group"><h2>Your account</h2>
    <div class="options">
      <div class="opt"><span>${esc(u ? u.email : '')}<small>${esc(label)}</small></span></div>
      <button class="opt" id="sync-now"><span>Sync now</span></button>
      <button class="opt" id="sign-out"><span>Sign out<small>Your reading stays on this device</small></span></button>
      <button class="opt danger" id="delete-account"><span>Delete account<small>Removes everything stored on the server</small></span></button>
    </div></div>`;
}

screens.signin = () => {
  renderNav('');
  const u = A.currentUser();
  if (A.isSignedIn()) return screens.settings();
  return pageHead('Sign in', '', '#/settings') +
    `<div class="signin">
      <p class="signin-lead">Enter your email and we’ll send you a link. There’s no password to choose or remember.</p>
      <form id="signin-form" novalidate>
        <input id="signin-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" aria-label="Email address">
        <button class="btn primary" type="submit" id="signin-go">Send me a link</button>
      </form>
      <p class="signin-msg" id="signin-msg" role="status"></p>
      <p class="hint">Signing in syncs your progress, saves, follows and notes so they follow you between devices. Your notes are stored on a server you can delete at any time — they’re private to your account, but they’re no longer only on this phone.</p>
    </div>`;
};
screens.signin.mount = (root) => {
  const form = $('#signin-form', root), input = $('#signin-email', root), msg = $('#signin-msg', root), go = $('#signin-go', root);
  input.focus();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'That doesn’t look like an email address.'; msg.className = 'signin-msg bad'; return; }
    go.disabled = true; go.textContent = 'Sending…'; msg.textContent = ''; msg.className = 'signin-msg';
    const r = await A.sendMagicLink(email);
    go.disabled = false; go.textContent = 'Send me a link';
    if (r.ok) {
      msg.innerHTML = `Check <b>${esc(email)}</b> — the link will sign you in. It expires in an hour.`;
      msg.className = 'signin-msg good';
      form.hidden = true;
    } else { msg.textContent = r.error; msg.className = 'signin-msg bad'; }
  };
};

screens.settings = () => {
  renderNav('');
  const st = S.settings();
  const opt = (group, value, label, sub = '') => `<button class="opt" role="radio" data-set="${group}" data-val="${value}" aria-checked="${st[group] === value}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="check">${I.check}</span></button>`;
  return pageHead('Settings', '', '#/') + accountGroup() +
    `<div class="group"><h2>Archive after</h2><p class="desc">New content leaves the active feed after this long. It isn’t deleted — it moves to Archive.</p><div class="options" role="radiogroup">${[3, 7, 14, 30].map(d => opt('archiveDays', d, `${d} days`, d === 7 ? 'Default' : '')).join('')}</div></div>
    <div class="group"><h2>When you reach the end</h2><p class="desc">What Curated does when you finish a piece.</p><div class="options" role="radiogroup">${opt('completion', 'auto', 'Mark as finished automatically', 'It leaves Currently Reading on its own')}${opt('completion', 'ask', 'Ask me', 'A quick “finished?” at the end')}${opt('completion', 'manual', 'I’ll mark it myself', 'Nothing happens until you say so')}</div></div>
    <div class="group"><h2>How many on Today</h2><p class="desc">Curated picks these from your sources. Fewer means less to weigh up; more means more to browse.</p><div class="options" role="radiogroup">${opt('pickCount', 3, 'Three', 'Decide less')}${opt('pickCount', 5, 'Five')}${opt('pickCount', 10, 'Ten', 'Default')}${opt('pickCount', 15, 'Fifteen')}</div></div>
    <div class="group"><h2>Reading type</h2><div class="options" role="radiogroup">${opt('readingFont', 'serif', 'Serif', 'Newsreader \u2014 made for long reading')}${opt('readingFont', 'sans', 'Sans', 'Inter \u2014 plainer, a little more compact')}</div></div>
    <div class="group"><h2>Reading text size</h2><div class="options" role="radiogroup">${opt('textSize', 's', 'Smaller')}${opt('textSize', 'm', 'Default')}${opt('textSize', 'l', 'Larger')}</div></div>
    <div class="group"><h2>Appearance</h2><div class="options" role="radiogroup">${opt('theme', 'system', 'Match system')}${opt('theme', 'light', 'Light')}${opt('theme', 'dark', 'Dark')}</div></div>
    <div class="group"><h2>Library</h2><div class="options"><a class="opt link" href="#/notes"><span>Notebook</span><span class="chev"></span></a><a class="opt link" href="#/reading"><span>Currently Reading</span><span class="chev"></span></a><a class="opt link" href="#/archive"><span>Archive</span><span class="chev"></span></a></div></div>
    ${CONTENT.live ? `<div class="group"><h2>Content</h2><div class="options"><div class="opt"><span>Last refreshed<small>${relTime(CONTENT.generatedAt)} · ${SOURCES.filter(x => !x.unavailable).length} sources · keeps ${CONTENT.windowDays} days</small></span></div></div></div>` : ''}
    <div class="group"><h2>Prototype</h2><div class="options"><button class="opt danger" id="reset">Reset all reading data</button></div><p class="desc" style="margin-top:8px">Clears progress, saves, notes and reactions on this device. Notes never leave your browser.</p></div>
    <div class="about"><strong>Decide less. Read more.</strong>Curated shows you three things worth your time from the sources you chose — and nothing you didn’t ask for.</div>`;
};
screens.settings.mount = (root) => {
  $$('[data-set]', root).forEach(b => b.onclick = () => {
    const k = b.dataset.set; let v = b.dataset.val; if (k === 'archiveDays' || k === 'pickCount') v = Number(v);
    S.setSetting(k, v); applyPrefs(); haptic(); render();
  });
  const sn = $('#sync-now', root);
  if (sn) sn.onclick = async () => { toast('Syncing…'); const r = await Sync.sync(); toast(r.ok ? 'Up to date' : 'Couldn’t sync — will retry', r.ok); render(); };
  const so = $('#sign-out', root);
  if (so) so.onclick = () => sheet(`<h2>Sign out?</h2><p>Your reading stays on this device. Signing back in will bring everything together again.</p><div class="row-btns"><button class="btn ghost" id="s-no">Stay</button><button class="btn primary" id="s-yes">Sign out</button></div>`,
    { '#s-no': () => {}, '#s-yes': async () => { await A.signOut(); toast('Signed out'); render(); } });
  const da = $('#delete-account', root);
  if (da) da.onclick = () => sheet(`<h2>Delete your account?</h2><p style="text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink-2);font-weight:400">This permanently removes your progress, saves, follows and notes from the server, and cannot be undone. What's on this device stays until you clear it.</p><div class="row-btns"><button class="btn ghost" id="s-no">Keep it</button><button class="btn accent" id="s-yes">Delete</button></div>`,
    { '#s-no': () => {}, '#s-yes': async () => { const ok = await A.deleteAccount(); toast(ok ? 'Account deleted' : 'Couldn’t delete — try again', ok); render(); } });

  $('#reset', root).onclick = () => sheet(`<h2>Start fresh?</h2><p>This clears everything you’ve read, saved, reacted to and written on this device.</p><div class="row-btns"><button class="btn ghost" id="s-no">Keep it</button><button class="btn accent" id="s-yes">Reset</button></div>`,
    { '#s-no': () => {}, '#s-yes': () => { S.resetAll(); applyPrefs(); toast('Reset. Fresh start.', true); location.hash = '#/'; } });
};

/* ============================================================ reader */
let reader = null; // { id, onScroll, timer, askedThisSession }
const askedThisSession = new Set();

const NOTE_PROMPTS = ['What is the author’s main argument?', 'What evidence convinced me?', 'What am I sceptical about?', 'What would change my mind?'];
/* End-of-piece preview: the reflection moment stays, editing happens in the drawer. */
function notesHTML(item) {
  const note = S.noteOf(item.id);
  return `<section class="notes" aria-labelledby="nt"><div class="kicker" id="nt"><span>Your notes</span><span class="priv">Private · saved on this device</span></div>
    <div id="note-preview">${notePreviewHTML(note)}</div></section>`;
}
function notePreviewHTML(note) {
  return note.trim()
    ? `<div class="note-preview"><p>${esc(note)}</p><button class="btn ghost sm" data-open-notes>Edit note</button></div>`
    : `<div class="note-empty"><p>A thought, a quote, a question — while you read or once you’re done.</p><button class="btn ghost sm" data-open-notes>Add a note</button></div>`;
}
/* Floating notes drawer: bottom sheet on phones, side panel on desktop. */
function notesDrawerHTML(item) {
  return `<aside class="notes-drawer" id="nd" aria-label="Notes" aria-hidden="true">
    <div class="nd-head">
      <button class="nd-title" id="nd-toggle" aria-label="Expand or collapse notes"><span class="kicker">Notes</span><span class="nd-peek" id="nd-peek"></span></button>
      <button class="icon-btn" id="nd-min" aria-label="Minimise notes">${I.chevDown}</button>
      <button class="icon-btn" id="nd-close" aria-label="Close notes">${I.close}</button>
    </div>
    <div class="nd-body">
      <textarea id="note" placeholder="A thought, a quote, a question…" rows="5" aria-label="Your notes">${esc(S.noteOf(item.id))}</textarea>
      <div class="prompts" aria-label="Thinking prompts">${NOTE_PROMPTS.map(p => `<button type="button" data-prompt="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <div class="nd-foot"><span class="saved-state" id="note-state"></span><span class="nd-tip">Select text in the piece to quote it</span></div>
    </div>
  </aside>
  <button class="quote-btn" id="quote-btn" hidden>Quote</button>`;
}
function actionBarHTML(item) {
  const fb = S.feedbackOf(item.id);
  return `<div class="actionbar" role="toolbar" aria-label="Actions">
    <button id="a-save" aria-pressed="${S.isSaved(item.id)}" aria-label="Save">${I.bookmark}</button>
    <span class="sep"></span>
    <button id="a-up" aria-pressed="${fb === 'up'}" aria-label="More like this">${I.up}</button>
    <span class="sep"></span>
    <button id="a-note" aria-label="Notes">${I.note}${S.noteOf(item.id) ? '<span class="has-note"></span>' : ''}</button>
    <button id="a-type" aria-label="Text size and type">${I.type}</button>
    <button id="a-share" aria-label="Share">${I.share}</button>
  </div>`;
}
function finishHTML(item) {
  if (S.isCompleted(item.id)) return `<div class="finish"><span class="done">${I.check} Finished</span><button class="undo" id="unfinish">Mark as unread</button></div>`;
  const mode = S.settings().completion;
  return `<div class="finish">${mode === 'manual' ? '<div class="ttf">Done with this one?</div>' : ''}<button class="btn primary" id="finish">Mark as finished</button></div>`;
}
function readerTopHTML(item) {
  return `<div class="reader-top"><span class="rt-left"><a class="icon-btn" href="#/" id="back" aria-label="Back">${I.back}</a>${brandMark()}</span><a class="src-label" href="#/source/${item.sourceId}">${esc(src(item).name)}</a><span class="rt-right"></span><div class="progress"><i id="rp" style="width:${S.progressOf(item.id) * 100}%"></i></div></div>`;
}

screens.item = (id) => {
  const item = S.itemById(id); if (!item) return screens.home();
  renderNav('');
  document.body.classList.add('reading');
  S.open(id);
  return item.type === 'video' ? videoHTML(item) : articleHTML(item);
};

const topicLinks = (item) => (item.topics || [])
  .map(t => S.topicById(t))
  .filter(Boolean)
  .map(t => `<a class="topic" href="#/topic/${t.id}">${esc(t.name)}</a>`)
  .join('<span class="topic-sep">·</span>');

function articleHTML(item) {
  const p = S.progressOf(item.id);
  const hasBody = Array.isArray(item.body) && item.body.length > 0;
  // The drop cap only belongs on a proper opening paragraph, never on a short
  // label like "In short:".
  let leadDone = false;
  const body = hasBody ? item.body.map(b => {
    if (b.t === 'h2') return `<h2>${esc(b.text)}</h2>`;
    if (b.t === 'quote') return `<blockquote>${esc(b.text)}</blockquote>`;
    const lead = !leadDone && b.text.length > 120;
    if (lead) leadDone = true;
    return `<p${lead ? ' class="lead"' : ''}>${esc(b.text)}</p>`;
  }).join('') : '';
  const handoff = hasBody ? '' : `<div class="handoff"><p>${esc(src(item).name)} publishes this piece on its own site${src(item).metadataOnly ? ' — it’s behind their paywall, so Curated shows you the summary and hands you across' : ''}.</p><a class="btn primary" href="${item.url}" target="_blank" rel="noopener">Read on ${esc(src(item).name)} ${I.ext.replace('<svg', '<svg style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8"')}</a></div>`;
  return readerTopHTML(item) + `<article class="article ${hasBody ? '' : 'handoff-mode'}">
    ${imgHTML(item, 'hero r-16x9', 1200, 675)}
    <div class="kicker-row"><a href="#/source/${item.sourceId}">${esc(src(item).name)}</a>${topicLinks(item)}</div>
    <h1>${esc(item.title)}</h1>
    <p class="dek">${esc(item.dek)}</p>
    <div class="byline">${item.author ? `<b>${esc(item.author)}</b><span class="dot">·</span>` : ''}<span>${relTime(item.publishedAt)}</span>${hasBody ? `<span class="dot">·</span><span>${item.readMinutes} min read</span>` : ''}${hasBody && p > 0.04 && !S.isCompleted(item.id) ? `<span class="dot">·</span><span class="hint-cont">Resuming at ${pct(item)}%</span>` : ''}</div>
    ${hasBody ? `<div class="body" id="body">${body}</div><div class="body-end"><span>End</span></div>` : handoff}
    ${finishHTML(item)}
    <div class="publisher"><div class="t"><a href="#/source/${item.sourceId}"><b>${esc(src(item).name)}</b></a><br>Read this piece on the publisher’s site.</div><a class="btn ghost sm" href="${item.url}" target="_blank" rel="noopener">Open ${I.ext.replace('<svg', '<svg style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8"')}</a></div>
    ${notesHTML(item)}
  </article>` + actionBarHTML(item) + notesDrawerHTML(item);
}

function videoHTML(item) {
  const p = S.progressOf(item.id); const pos = p * item.durationSec;
  const real = !!item.youtubeId;
  const player = real
    ? `<div class="player embed" id="player"><iframe id="yt" src="https://www.youtube-nocookie.com/embed/${esc(item.youtubeId)}?start=${Math.floor(pos)}&rel=0&modestbranding=1" title="${esc(item.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
    : `<div class="player" id="player">${imgHTML(item, 'r-16x9', 1280, 720)}<button class="playbtn" id="play" aria-label="Play"><span>${I.play.replace('<svg', '<svg class="ic-play"')}</span></button></div>`;
  const dur = item.durationSec || 0;
  return readerTopHTML(item) + `<article class="video">
    ${player}
    <div class="scrub"><span id="t-cur">${fmtDur(pos)}</span><input type="range" id="scrub" min="0" max="${dur || 1}" step="1" value="${Math.round(pos)}" style="--pct:${p * 100}%" aria-label="${real ? 'Where you’re up to' : 'Playback position'}"><span>${dur ? fmtDur(dur) : '–:––'}</span></div>
    <p class="mock-note">${real ? 'Drag to mark where you’re up to — Curated remembers it and resumes the video there.' : 'Prototype player — press play to simulate watching, or drag to scrub.'}</p>
    <div class="video-meta"><h1>${esc(item.title)}</h1><div class="byline"><a href="#/source/${item.sourceId}"><b>${esc(src(item).name)}</b></a><span>·</span><span>${relTime(item.publishedAt)}</span><span>·</span><span>${Math.round(item.durationSec / 60)} min</span></div></div>
    <p class="desc">${esc(item.description || item.dek || '')}</p>
    ${(item.chapters || []).length ? `<div class="chapters" id="chapters"><div class="kicker" style="margin-bottom:6px">Chapters</div>${item.chapters.map(([t, name]) => `<button data-t="${t}"><span class="ts">${fmtDur(t)}</span><span>${esc(name)}</span></button>`).join('')}</div>` : ''}
    ${finishHTML(item)}
    <div class="publisher"><div class="t"><a href="#/source/${item.sourceId}"><b>${esc(src(item).name)}</b></a><br>Watch on YouTube.</div><a class="btn ghost sm" href="${item.url}" target="_blank" rel="noopener">Open ${I.ext.replace('<svg', '<svg style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8"')}</a></div>
    ${notesHTML(item)}
  </article>` + actionBarHTML(item) + notesDrawerHTML(item);
}

function mountReader(root, id) {
  const item = S.itemById(id);
  const back = $('#back', root);
  back.onclick = (e) => { e.preventDefault(); goBack(); };

  // Actions
  $('#a-save', root).onclick = (e) => { const on = S.toggleSaved(id); e.currentTarget.setAttribute('aria-pressed', on); haptic(); toast(on ? 'Saved for later' : 'Removed from Saved', on); };
  $('#a-up', root).onclick = (e) => { const fb = S.setFeedback(id, 'up'); e.currentTarget.setAttribute('aria-pressed', fb === 'up'); haptic(); if (fb) toast('Noted — more like this from your sources', true); };
  const typeBtn = $('#a-type', root);
  if (typeBtn) typeBtn.onclick = () => {
    haptic();
    const st = S.settings();
    const seg = (key, opts) => `<div class="seg" role="radiogroup">${opts.map(([v, label]) =>
      `<button role="radio" aria-checked="${st[key] === v}" data-type-set="${key}" data-type-val="${v}">${label}</button>`).join('')}</div>`;
    sheet(`<h2>Reading</h2>
      <p>Type</p>${seg('readingFont', [['serif', 'Serif'], ['sans', 'Sans']])}
      <p>Size</p>${seg('textSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']])}
      <div class="row-btns"><button class="btn primary" id="s-done">Done</button></div>`, { '#s-done': () => {} });
    $$('[data-type-set]', $('#sheet')).forEach(b => b.onclick = () => {
      S.setSetting(b.dataset.typeSet, b.dataset.typeVal);
      applyPrefs();
      $$(`[data-type-set="${b.dataset.typeSet}"]`, $('#sheet')).forEach(x => x.setAttribute('aria-checked', String(x === b)));
      haptic();
    });
  };

  $('#a-share', root).onclick = async () => {
    const data = { title: item.title, text: `${item.title} — ${srcName(item)}`, url: item.url };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(item.url); toast('Link copied', true); }
    catch (e) {
      sheet(`<h2>Share</h2><p style="text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink-2);font-weight:400">Copy the link to this piece:</p><input class="share-url" value="${esc(item.url)}" readonly><div class="row-btns"><button class="btn primary" id="s-ok">Done</button></div>`, { '#s-ok': () => {} });
      const inp = $('#sheet .share-url'); if (inp) inp.select();
    }
  };

  mountNotes(root, item);

  // Finish / unfinish
  const wireFinish = () => {
    const f = $('#finish', root); if (f) f.onclick = () => finishItem(id, root);
    const u = $('#unfinish', root); if (u) u.onclick = () => { S.uncomplete(id); toast('Marked as unread'); rerenderFinish(root, item); };
  };
  wireFinish();
  root._wireFinish = wireFinish;

  if (item.type === 'video') mountVideo(root, item); else mountArticle(root, item);
}
function mountNotes(root, item) {
  const id = item.id;
  const nd = $('#nd', root), note = $('#note', root), state = $('#note-state', root), peek = $('#nd-peek', root), quoteBtn = $('#quote-btn', root);
  const setMode = (mode) => { // 'open' | 'min' | 'closed'
    nd.classList.toggle('open', mode === 'open'); nd.classList.toggle('min', mode === 'min');
    nd.setAttribute('aria-hidden', mode === 'closed');
    document.body.classList.toggle('notes-open', mode === 'open');
    document.body.classList.toggle('notes-min', mode === 'min');
    $('#a-note', root).setAttribute('aria-pressed', mode !== 'closed');
    if (mode === 'open') setTimeout(() => note.focus({ preventScroll: true }), 350); else note.blur();
    refreshPeek();
  };
  const mode = () => nd.classList.contains('open') ? 'open' : nd.classList.contains('min') ? 'min' : 'closed';
  const refreshPeek = () => { const first = note.value.trim().split('\n').find(l => l.trim()) || ''; peek.textContent = first ? first : 'Tap to write'; };
  const syncDot = () => { const dot = $('#a-note .has-note', root); if (note.value.trim() && !dot) $('#a-note', root).insertAdjacentHTML('beforeend', '<span class="has-note"></span>'); if (!note.value.trim() && dot) dot.remove(); };
  const persist = () => { S.setNote(id, note.value); syncDot(); refreshPeek(); const pv = $('#note-preview', root); if (pv) { pv.innerHTML = notePreviewHTML(note.value); wireOpeners(); } };
  const wireOpeners = () => $$('[data-open-notes]', root).forEach(b => b.onclick = () => setMode('open'));

  $('#a-note', root).onclick = () => { haptic(); setMode(mode() === 'open' ? 'closed' : 'open'); };
  $('#nd-close', root).onclick = () => setMode('closed');
  $('#nd-min', root).onclick = () => setMode('min');
  $('#nd-toggle', root).onclick = () => setMode(mode() === 'min' ? 'open' : 'min');
  wireOpeners();

  let nt;
  note.oninput = () => { clearTimeout(nt); state.textContent = 'Saving…'; nt = setTimeout(() => { persist(); state.textContent = 'Saved'; setTimeout(() => { if (state.textContent === 'Saved') state.textContent = ''; }, 1500); }, 500); };
  $$('[data-prompt]', root).forEach(b => b.onclick = () => { append(b.dataset.prompt + '\n'); });
  const append = (text) => { note.value = (note.value.trim() ? note.value.replace(/\s*$/, '\n\n') : '') + text; note.focus({ preventScroll: true }); note.setSelectionRange(note.value.length, note.value.length); note.scrollTop = note.scrollHeight; note.dispatchEvent(new Event('input')); };

  // Quote a selection from the piece into the notes.
  const bodyEl = $('#body', root) || $('.desc', root);
  let selTimer;
  const onSel = () => { clearTimeout(selTimer); selTimer = setTimeout(() => {
    const sel = document.getSelection();
    const text = sel && !sel.isCollapsed ? sel.toString().trim() : '';
    if (!text || !bodyEl || !bodyEl.contains(sel.anchorNode)) { quoteBtn.hidden = true; return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    quoteBtn.hidden = false;
    quoteBtn.style.left = `${Math.max(12, Math.min(window.innerWidth - 90, r.left + r.width / 2 - 36))}px`;
    quoteBtn.style.top = `${Math.max(8, r.top - 44)}px`;
  }, 120); };
  document.addEventListener('selectionchange', onSel);
  quoteBtn.onclick = () => { const text = document.getSelection().toString().trim().replace(/\s+/g, ' '); if (!text) return; quoteBtn.hidden = true; document.getSelection().removeAllRanges(); setMode('open'); append(`“${text}”\n`); haptic(); };
  window.addEventListener('scroll', () => { if (!quoteBtn.hidden) quoteBtn.hidden = true; }, { passive: true });

  // Keep the drawer above the on-screen keyboard (iOS keeps fixed elements behind it otherwise).
  const vv = window.visualViewport;
  const onVV = () => { if (!vv) return; const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); nd.style.setProperty('--kb', `${kb}px`); };
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); }

  refreshPeek();
  if (S.noteOf(id).trim()) setMode('min');
  root._notesCleanup = () => { document.removeEventListener('selectionchange', onSel); if (vv) { vv.removeEventListener('resize', onVV); vv.removeEventListener('scroll', onVV); } document.body.classList.remove('notes-open', 'notes-min'); };
}

function rerenderFinish(root, item) { const f = $('.finish', root); f.outerHTML = finishHTML(item); root._wireFinish && root._wireFinish(); }

function finishItem(id, root) {
  const item = S.itemById(id);
  S.complete(id);
  celebrate();
  toast(item.type === 'video' ? 'Finished watching' : 'Finished reading', true);
  rerenderFinish(root, item);
  $('#rp') && ($('#rp').style.width = '100%');
}

function maybeComplete(id, root) {
  if (S.isCompleted(id) || askedThisSession.has(id)) return;
  const mode = S.settings().completion;
  if (mode === 'auto') { finishItem(id, root); }
  else if (mode === 'ask') {
    askedThisSession.add(id);
    const item = S.itemById(id);
    sheet(`<h2>Finished ${item.type === 'video' ? 'watching' : 'reading'}?</h2><p>It’ll leave Currently ${item.type === 'video' ? 'Watching' : 'Reading'} and you can always find it in Archive.</p><div class="row-btns"><button class="btn ghost" id="s-no">Not yet</button><button class="btn primary" id="s-yes">Yes, done</button></div>`,
      { '#s-no': () => {}, '#s-yes': () => finishItem(id, root) });
  }
}

function mountArticle(root, item) {
  const body = $('#body', root);
  const bar = $('#rp', root);
  if (!body) { reader = { id: item.id, cleanup: () => {} }; return; }
  // Restore position, then track the furthest point reached.
  const p = S.progressOf(item.id);
  requestAnimationFrame(() => {
    if (p > 0.04 && p < 0.95 && !S.isCompleted(item.id)) {
      const top = body.offsetTop + body.offsetHeight * p - window.innerHeight * 0.4;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
  });
  let ticking = false, dwell = null;
  const onScroll = () => {
    clearTimeout(dwell);
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const start = body.offsetTop, end = start + body.offsetHeight;
      const seen = window.scrollY + window.innerHeight;
      const frac = Math.min(1, Math.max(0, (seen - start) / (end - start)));
      bar.style.width = `${Math.max(frac, S.isCompleted(item.id) ? 1 : 0) * 100}%`;
      if (frac >= 0.04) S.setProgress(item.id, Math.min(frac, 0.99));
      // "Finished" only once the end of the text has risen into the top half of the
      // screen — i.e. the reader's eyes have actually passed the last line — and
      // they've paused there, so nothing pops up mid-scroll.
      const endPassed = end <= window.scrollY + window.innerHeight * 0.5;
      if (endPassed) dwell = setTimeout(() => { S.setProgress(item.id, 1); maybeComplete(item.id, root); }, 900);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  reader = { id: item.id, cleanup: () => { clearTimeout(dwell); window.removeEventListener('scroll', onScroll); } };
}

function mountVideo(root, item) {
  const player = $('#player', root), play = $('#play', root), scrub = $('#scrub', root), cur = $('#t-cur', root), bar = $('#rp', root), yt = $('#yt', root);
  if (!item.durationSec) { reader = { id: item.id, cleanup: () => {} }; return; }
  let pos = S.progressOf(item.id) * item.durationSec, playing = false, timer = null, lastSave = 0;
  const RATE = 30; // simulated seconds of video per real second — a prototype, not a player
  const paint = () => {
    const frac = pos / item.durationSec;
    scrub.value = Math.round(pos); scrub.style.setProperty('--pct', `${frac * 100}%`); cur.textContent = fmtDur(pos); bar.style.width = `${frac * 100}%`;
    $$('#chapters button', root).forEach(b => { b.classList.remove('active'); });
    const ch = (item.chapters || []).filter(c => c[0] <= pos).pop(); if (ch) { const b = $(`#chapters button[data-t="${ch[0]}"]`, root); b && b.classList.add('active'); }
  };
  const setPos = (v, persist = true) => {
    pos = Math.min(item.durationSec, Math.max(0, v)); paint();
    if (persist) S.setProgress(item.id, pos / item.durationSec);
    if (pos / item.durationSec >= 0.97) { stop(); maybeComplete(item.id, root); }
  };
  const start = () => { playing = true; player.classList.add('playing'); play.querySelector('span').innerHTML = I.pause; play.setAttribute('aria-label', 'Pause'); timer = setInterval(() => { const persist = Date.now() - lastSave > 1500; if (persist) lastSave = Date.now(); setPos(pos + RATE / 4, persist); }, 250); };
  const stop = () => { playing = false; player.classList.remove('playing'); play.querySelector('span').innerHTML = I.play.replace('<svg', '<svg class="ic-play"'); play.setAttribute('aria-label', 'Play'); clearInterval(timer); timer = null; S.setProgress(item.id, pos / item.durationSec); };
  if (play) play.onclick = () => { haptic(); playing ? stop() : start(); };
  const seekEmbed = () => { if (yt) yt.src = yt.src.replace(/([?&])start=\d+/, `$1start=${Math.floor(pos)}`) + (yt.src.includes('autoplay=1') ? '' : '&autoplay=1'); };
  scrub.oninput = () => setPos(Number(scrub.value), false);
  scrub.onchange = () => { S.setProgressExact(item.id, pos / item.durationSec); seekEmbed(); };
  $$('#chapters button', root).forEach(b => b.onclick = () => { setPos(Number(b.dataset.t)); S.setProgressExact(item.id, pos / item.durationSec); seekEmbed(); });
  paint();
  reader = { id: item.id, cleanup: () => { clearInterval(timer); } };
}

/* ============================================================ router */
const backStack = [];
function goBack() { if (backStack.length > 1) { backStack.pop(); const prev = backStack.pop(); location.hash = prev; } else location.hash = '#/'; }

function route() {
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/');
  const name = parts[0] || 'home';
  return { name, arg: parts[1] ? decodeURIComponent(parts[1]) : null, hash: h };
}

function render() {
  const { name, arg, hash } = route();
  if (reader) { reader.cleanup(); reader = null; }
  const prevRoot = $('#main'); if (prevRoot._notesCleanup) { prevRoot._notesCleanup(); prevRoot._notesCleanup = null; }
  document.body.classList.remove('reading', 'notes-open', 'notes-min');
  $('#sheet').hidden = true;
  const fn = screens[name] || screens.home;
  const root = $('#main');
  if (name === 'item') {
    const it = S.itemById(arg);
    if (it && it.body == null && it.bodyUrl) {
      document.body.classList.add('reading');
      root.innerHTML = readerTopHTML(it) + `<div class="loading"><div class="img r-3x2 hero" style="--tone:${imageFor(it).tone}"></div><h1>${esc(it.title)}</h1><p class="calm">Fetching the piece…</p></div>`;
      loadItemDetail(it).then(() => { if (location.hash === hash) render(); });
      return;
    }
  }
  root.innerHTML = fn(arg);
  if (fn.mount) fn.mount(root);
  $$('.img img', root).forEach(im => { if (im.complete && im.naturalWidth > 0) im.classList.add('loaded'); });
  if (name === 'item') mountReader(root, arg);
  if (backStack[backStack.length - 1] !== hash) backStack.push(hash);
  window.scrollTo({ top: 0, behavior: 'instant' }); // readers restore their own position after this
  const titles = { home: 'Curated', new: 'All New', topics: 'Topics', topic: 'Topics', source: 'Sources', saved: 'Saved', sources: 'Sources', reading: 'Currently Reading', archive: 'Archive', settings: 'Settings', notes: 'Notebook', signin: 'Sign in' };
  document.title = name === 'item' ? `${S.itemById(arg)?.title || 'Curated'} — Curated` : (titles[name] === 'Curated' ? 'Curated' : `${titles[name] || 'Curated'} — Curated`);
}

/* ---------- Pull to refresh ----------
   Only when the page is already at the top and the reader isn't open, so it
   never fights with scrolling or with the notes drawer. */
let refreshing = false;
function installPullToRefresh() {
  const el = document.createElement('div');
  el.className = 'ptr';
  el.innerHTML = `<span class="ptr-ring">${I.refresh}</span>`;
  document.body.appendChild(el);

  let startY = 0, pulling = false, dist = 0;
  const THRESHOLD = 72;

  const reset = (instant) => {
    pulling = false; dist = 0;
    el.style.transition = instant ? 'none' : 'transform .3s var(--ease), opacity .3s var(--ease)';
    el.style.transform = ''; el.style.opacity = '';
    el.classList.remove('ready');
  };

  window.addEventListener('touchstart', (e) => {
    if (refreshing || e.touches.length !== 1) return;
    if (window.scrollY > 0 || document.body.classList.contains('reading')) return;
    startY = e.touches[0].clientY; pulling = true; dist = 0;
    el.style.transition = 'none';
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    dist = e.touches[0].clientY - startY;
    if (dist <= 0) { reset(true); return; }
    const pull = Math.min(dist * 0.5, 110);          // resistance
    el.style.transform = `translate(-50%, ${pull}px) rotate(${pull * 3}deg)`;
    el.style.opacity = String(Math.min(1, pull / 50));
    el.classList.toggle('ready', pull >= THRESHOLD * 0.5);
  }, { passive: true });

  window.addEventListener('touchend', async () => {
    if (!pulling) return;
    const go = el.classList.contains('ready');
    pulling = false;
    if (!go) { reset(); return; }
    refreshing = true;
    el.classList.add('spinning');
    el.style.transition = 'transform .2s var(--ease)';
    el.style.transform = 'translate(-50%, 56px)';
    const before = S.allNew().length;
    const ok = await loadContent();
    S.syncSources(!!ok);
    el.classList.remove('spinning');
    reset();
    refreshing = false;
    if (ok) {
      render();
      const added = S.allNew().length - before;
      toast(added > 0 ? `${added} new ${added === 1 ? 'piece' : 'pieces'}` : 'You\u2019re up to date', added > 0);
    } else toast('Couldn\u2019t reach your sources');
  }, { passive: true });
}

function applyPrefs() {
  const st = S.settings();
  const root = document.documentElement;
  if (st.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', st.theme);
  root.style.setProperty('--reading-scale', { s: '0.92', m: '1', l: '1.12' }[st.textSize] || '1');
  root.style.setProperty('--reading-font', st.readingFont === 'sans' ? 'var(--sans)' : 'var(--serif)');
  const dark = st.theme === 'dark' || (st.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#121110' : '#f6f4ef'));
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs);
applyPrefs();
$('#main').innerHTML = '<div class="boot"><span class="wordmark">curated</span></div>';
function offlineScreen(retrying) {
  renderNav('today');
  $('#main').innerHTML = `<header class="page-head"><div class="head-row"><span class="wordmark">curated</span></div></header>
    <div class="empty" style="padding-top:60px">Couldn’t reach your content.
      <small>Curated only ever shows pieces from the sources you follow — so rather than invent something, it waits. Check your connection and try again.</small>
      <button class="btn primary" id="retry" style="margin-top:22px" ${retrying ? 'disabled' : ''}>${retrying ? 'Trying…' : 'Try again'}</button>
    </div>`;
  const b = $('#retry'); if (b) b.onclick = () => { offlineScreen(true); boot(); };
}

async function boot() {
  const cb = A.consumeCallback();
  const live = await Promise.race([loadContent(), new Promise(r => setTimeout(() => r(false), 12000))]);
  if (!live) { offlineScreen(false); return; }
  S.syncSources(true);
  window.removeEventListener('hashchange', render);
  window.addEventListener('hashchange', render);
  installPullToRefresh();
  render();
  if (cb && cb.ok) {
    toast('Signed in — bringing your reading together', true);
    await Sync.adoptLocalState();
    render();
  } else if (cb && !cb.ok) {
    toast(cb.error);
  }
  Sync.start();
  A.onAuthChange(() => render());
  Sync.onSyncChange(() => { if (route().name === 'settings') render(); });
}
boot();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
