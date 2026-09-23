/* Curated — accounts.

   A small hand-written client rather than the Supabase SDK: the app has no
   build step, and everything needed here is a handful of HTTPS calls. Sign-in
   is a magic link, so no password is ever typed, stored or transmitted.

   The publishable key below is meant to be public. It grants nothing on its
   own: the database denies the anonymous role access to every table, and
   row-level security then limits a signed-in user to their own rows. */

const URL_BASE = 'https://avdnpoelxynmdoxfkesk.supabase.co';
const ANON_KEY = 'sb_publishable_NrhZw_F6egdWN2xHTm4CXQ_STwHnu2Q';
const SESSION_KEY = 'curated.session.v1';

let session = load();
const listeners = new Set();
export const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn(session));

function load() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
function store(s) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* private browsing */ }
  emit();
}

export const currentUser = () => (session && session.user) || null;
export const isSignedIn = () => !!(session && session.refresh_token);

/* ---------- sign in ---------- */

export async function sendMagicLink(email) {
  const redirect = location.origin + location.pathname;
  const r = await fetch(`${URL_BASE}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), create_user: true }),
  });
  if (r.ok) return { ok: true };
  let msg = 'Something went wrong. Try again in a moment.';
  try {
    const e = await r.json();
    const raw = e.msg || e.message || e.error_description || '';
    // The allowlist trigger refuses unknown addresses. Supabase reports a
    // trigger failure during signup as a generic database error, and that is
    // the only trigger on user creation here, so it means the same thing.
    if (/not on the invite list/i.test(raw) || /error saving new user/i.test(raw)) {
      msg = 'That address isn’t on the invite list.';
    } else if (r.status === 429) {
      msg = 'Too many attempts. Wait a minute or two, then try again.';
    } else if (/rate limit|too many/i.test(raw)) {
      msg = 'Too many emails sent for now. Try again shortly.';
    } else if (raw) { msg = raw; }
  } catch (e) { /* keep the generic message */ }
  return { ok: false, error: msg };
}

/* The link comes back with tokens in the URL fragment. Consume them and tidy
   the address bar so the tokens aren't left sitting in history. */
export function consumeCallback() {
  const hash = location.hash || '';
  if (!hash.includes('access_token=') && !hash.includes('error=')) return null;
  const params = new URLSearchParams(hash.replace(/^#/, '').split('&').filter(p => p.includes('=')).join('&'));
  const clean = () => history.replaceState(null, '', location.pathname + location.search + '#/');

  if (params.get('error') || params.get('error_description')) {
    const desc = params.get('error_description') || params.get('error');
    clean();
    return { ok: false, error: /expired|invalid/i.test(desc) ? 'That link has expired. Send a new one.' : desc };
  }
  const access_token = params.get('access_token'), refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  store({
    access_token, refresh_token,
    expires_at: Date.now() + (Number(params.get('expires_in')) || 3600) * 1000,
    user: decodeUser(access_token),
  });
  clean();
  return { ok: true };
}

function decodeUser(jwt) {
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { id: p.sub, email: p.email };
  } catch (e) { return null; }
}

/* ---------- session ---------- */

let refreshing = null;
async function refresh() {
  if (!session || !session.refresh_token) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!r.ok) { if (r.status === 400 || r.status === 401) store(null); return null; }
    const d = await r.json();
    store({
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      user: decodeUser(d.access_token),
    });
    return session;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function token() {
  if (!session) return null;
  if (Date.now() > session.expires_at - 60000) await refresh();
  return session && session.access_token;
}

export async function signOut() {
  const t = session && session.access_token;
  store(null);
  if (t) {
    try {
      await fetch(`${URL_BASE}/auth/v1/logout`, {
        method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${t}` },
      });
    } catch (e) { /* the local session is gone either way */ }
  }
}

/* ---------- database ---------- */

export async function db(path, { method = 'GET', body, prefer } = {}) {
  const t = await token();
  if (!t) throw new Error('not signed in');
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { await refresh(); throw new Error('session expired'); }
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export async function deleteAccount() {
  // Removing the auth user cascades to every row this person owns.
  const t = await token();
  if (!t) return false;
  const r = await fetch(`${URL_BASE}/auth/v1/user`, {
    method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${t}` },
  });
  if (r.ok) { store(null); return true; }
  return false;
}
