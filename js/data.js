/* Curated — content model.
   Real content comes from data/index.json, produced by ingest/ingest.py from
   the feeds listed in ingest/sources.json. Nothing here is invented: if the
   index can't be loaded the app says so rather than showing sample articles. */

export const TOPICS = [
  { id: 'australia',   name: 'Australia',     blurb: 'Politics, policy and life at home.' },
  { id: 'economics',   name: 'Economics',     blurb: 'Markets, money and the real economy.' },
  { id: 'geopolitics', name: 'Geopolitics',   blurb: 'Power, alliances and the Indo-Pacific.' },
  { id: 'defence',     name: 'Defence',       blurb: 'Strategy, capability and security.' },
  { id: 'technology',  name: 'Technology',    blurb: 'Platforms, chips and what they change.' },
  { id: 'science',     name: 'Science',       blurb: 'Energy, climate and discovery.' },
  { id: 'policy',      name: 'Policy',        blurb: 'How the machinery of government works.' },
];


/* Populated by loadContent(). Empty until then. */
export const SOURCES = [];
export const ITEMS = [];

/* Where a source looks, not where it is published from. The Sources screen
   groups by this so the shape of your reading is visible at a glance. */
export const REGIONS = [
  { id: 'australia',   name: 'Australia',     blurb: 'Home — politics, policy and Australia in the world.' },
  { id: 'india',       name: 'India',         blurb: 'India as a power: its foreign policy and the wider order.' },
  { id: 'asiapacific', name: 'Asia-Pacific',  blurb: 'The neighbourhood — Southeast Asia, the Pacific, East Asia.' },
  { id: 'global',      name: 'Wider world',   blurb: 'Everything else, when the stakes reach this far.' },
];
export const regionById = (id) => REGIONS.find(r => r.id === id);

export const SOURCE_TYPE_LABEL = {
  publication: 'Publication', blog: 'Blog', youtube: 'YouTube channel', website: 'Website', research: 'Research',
};

/* Image helper: the publisher's image where there is one, over a warm tone
   that also stands in when there isn't. */
const TONES = ['#8a6f5c', '#5c6f7a', '#6f7a5c', '#7a5c6a', '#5c5c7a', '#7a6f5c', '#5c7a73'];
export function imageFor(item, w = 900, h = 600) {
  const seed = `curated-${item.img || item.id}`;
  let n = 0; for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = TONES[n % TONES.length];
  return { src: item.image || '', tone };
}

/* ---------- Live content ----------
   data/index.json is produced by ingest/ingest.py on a schedule and refreshed
   by GitHub Actions. The single-file build inlines it as window.__CURATED_INDEX__. */
export const CONTENT = { live: false, generatedAt: null, windowDays: 30 };

export async function loadContent() {
  let idx = window.__CURATED_INDEX__ || null;
  if (!idx) {
    try {
      const r = await fetch(`data/index.json?t=${Math.floor(Date.now() / 300000)}`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      idx = await r.json();
    } catch (e) { return false; }
  }
  if (!idx || !Array.isArray(idx.items) || !idx.items.length) return false;
  SOURCES.length = 0;
  for (const s of idx.sources) SOURCES.push({ ...s, followed: !s.unavailable });
  ITEMS.length = 0;
  for (const it of idx.items) ITEMS.push({ ...it, body: null, bodyUrl: `data/items/${it.id}.json` });
  CONTENT.live = true; CONTENT.generatedAt = idx.generatedAt; CONTENT.windowDays = idx.windowDays || 30;
  return true;
}

/* Fetch an item's body (article blocks, or video description + chapters) on demand. */
export async function loadItemDetail(item) {
  if (item.body !== null && item.body !== undefined) return item;
  if (!item.bodyUrl) return item;
  try {
    const r = await fetch(item.bodyUrl, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (item.type === 'video') { item.description = d.description || ''; item.chapters = d.chapters || []; item.transcript = d.transcript || null; item.body = []; }
    else item.body = Array.isArray(d.body) ? d.body : [];
  } catch (e) { item.body = []; item.bodyError = true; }
  return item;
}
