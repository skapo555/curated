# Accounts and sync

Curated works signed-out: everything stays in the browser on that device. Signing
in adds sync across devices, and a backup. Nothing about the reading experience
changes either way.

## What's here

- `schema.sql` — the whole backend. Run it once in the Supabase SQL editor.

## Setting it up

1. Create a project at supabase.com (free tier is ample).
2. SQL Editor → paste `schema.sql` → Run.
3. Authentication → Providers: enable **Email**, turn **off** "Confirm password"
   (there are no passwords) and leave magic links on.
4. Authentication → URL Configuration → add the app's URL to redirect URLs.
5. Project Settings → API: copy the project URL and the **publishable** key into
   the app. Both are safe in client code. The service key is not and never
   appears here.

## How the guarantees work

Every table has row-level security with a single policy: you may read or write a
row only if `user_id` matches the signed-in user. Postgres enforces it, so an
app bug cannot expose one person's notes to another.

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
