# Accounts and sync

Curated works signed-out: everything stays in the browser on that device. Signing
in adds sync across devices, and a backup. Nothing about the reading experience
changes either way.

## What's here

- `schema.sql` — the whole backend. Run it once in the Supabase SQL editor.

## Setting it up

1. Create a project at supabase.com (free tier is ample).
2. Project security settings — safer than the defaults:
   - **Enable Data API**: on (the app talks to Postgres through it).
   - **Automatically expose new tables**: **off**. `schema.sql` grants access
     explicitly, so nothing is reachable by accident.
   - **Enable automatic RLS**: **on**. The schema turns row-level security on
     for every table it creates; this is a backstop for any table added later.
3. SQL Editor → paste `schema.sql` → Run.
4. Authentication → Providers: enable **Email** and leave magic links on.
   There are no passwords anywhere in this design.
5. Authentication → URL Configuration → Site URL `https://thecurated.fyi`, and
   add `https://thecurated.fyi/**` and `http://localhost:8745/**` as redirects.
6. Project Settings → API: copy the project URL and the **publishable** key into
   the app. Both are safe in client code. The secret/service key is not, and
   never appears here.

## How the guarantees work

Two layers, both in Postgres rather than in app code:

1. **Grants** decide who can reach a table at all. The anonymous role is granted
   nothing; the signed-in role gets exactly the four tables it needs.
2. **Row-level security** then decides which rows: you may read or write a row
   only if `user_id` matches the signed-in user.

So an app bug cannot expose one person's notes to another, and an unauthenticated
request cannot reach the tables in the first place.

Signups are closed. `allowed_emails` gates account creation with a trigger that
runs *before* a user record exists, so an address that isn't on the list leaves
no trace. Add a row to let someone in.

## Merging

Sync is local-first and merges per field, so a stale device can't undo progress:

| Field | Rule |
|---|---|
| progress | furthest point wins |
| completed | sticky once set |
| saved, follows, feedback, settings | most recent change wins |
| notes | most recent wins; a conflicting older version is kept as a copy |
