-- Curated — account and sync schema.
--
-- Run once in the Supabase SQL editor. Every table is protected by row-level
-- security: a signed-in user can only ever see and change their own rows, and
-- that is enforced by Postgres rather than by application code. Private notes
-- are treated as exactly that.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  settings   jsonb not null default '{}'::jsonb,   -- archiveDays, completion, theme, textSize
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- follows
create table if not exists public.follows (
  user_id    uuid not null references auth.users on delete cascade,
  source_id  text not null,
  followed   boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

-- ---------------------------------------------------------------- item state
-- One row per piece the user has touched. Absent row = untouched.
create table if not exists public.item_state (
  user_id      uuid not null references auth.users on delete cascade,
  item_id      text not null,
  progress     real not null default 0 check (progress >= 0 and progress <= 1),
  opened_at    timestamptz,
  completed_at timestamptz,
  saved_at     timestamptz,
  feedback     text check (feedback in ('up')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists item_state_user_updated on public.item_state (user_id, updated_at desc);

-- ---------------------------------------------------------------- notes
-- Separate table so note text can be handled (and later encrypted) on its own.
create table if not exists public.notes (
  user_id    uuid not null references auth.users on delete cascade,
  item_id    text not null,
  body       text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists notes_user_updated on public.notes (user_id, updated_at desc);

-- ---------------------------------------------------------------- row-level security
alter table public.profiles   enable row level security;
alter table public.follows    enable row level security;
alter table public.item_state enable row level security;
alter table public.notes      enable row level security;

-- One policy per table: you may touch a row only if it is yours. `with check`
-- also stops a user writing a row under someone else's id.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'follows', 'item_state', 'notes'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- API access
-- Grant the signed-in role exactly what it needs, and never grant the
-- anonymous role anything: an unauthenticated visitor should not be able to
-- reach these tables at all. Row-level security above then decides *which*
-- rows a signed-in user may touch. Written explicitly so the project can keep
-- Supabase's "automatically expose new tables" switch turned off.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.follows, public.item_state, public.notes
  to authenticated;

-- ---------------------------------------------------------------- housekeeping
-- Keep updated_at honest; the sync merge relies on it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'follows', 'item_state', 'notes'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I
                      for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Give every new account a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- signups closed
-- Only these addresses may create an account. Add rows to open it up; the
-- check runs before a user record is created, so nothing is stored for others.
create table if not exists public.allowed_emails (
  email      text primary key,
  added_at   timestamptz not null default now()
);

-- No policies and no grants: the allowlist is server-side only, reachable by
-- the trigger below (which runs as definer) but not by the app.
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

create or replace function public.enforce_allowlist()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'This address is not on the invite list.' using errcode = 'unauthorized';
  end if;
  return new;
end $$;

drop trigger if exists check_allowlist on auth.users;
create trigger check_allowlist
  before insert on auth.users
  for each row execute function public.enforce_allowlist();

-- Your address. Add others here to let them in.
insert into public.allowed_emails (email) values ('s.kapoor.85@gmail.com') on conflict do nothing;
