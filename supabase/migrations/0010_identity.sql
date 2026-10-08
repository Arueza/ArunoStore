-- Roadmap P1: `users` and `admins`, captured from live schema.
--
-- CAPTURED, NOT AUTHORED. Both tables were created directly in the Supabase
-- dashboard by Alfreza and had no migration file anywhere in this repository, so
-- nothing here could rebuild them. Reconstructed from the running database on
-- 2026-10-08.
--
-- Read that as a warning about every line below. A captured constraint records
-- what exists, not what someone decided: if a check or a default looks
-- unreasonable, it is evidence about the dashboard, not a mistake to fix.
--
-- Safe to paste twice. `create table if not exists` covers the whole table —
-- primary key, unique, check and foreign key are all inline, so an existing table
-- is skipped whole. Each policy is dropped first. Same rule as 0003, 0006, 0009.
--
-- Functions and triggers for these tables live in 0015, because a trigger cannot
-- be created before the function it calls exists. Paste 0015 last.

create table if not exists public.users (
  id uuid not null,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  date_of_birth date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

create table if not exists public.admins (
  id uuid not null,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  date_of_birth date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- The three-role model this repository deleted in migration 0009. Recorded
  -- unchanged; nothing in the app reads it.
  store_role text not null default 'consignment'::text
    check (store_role = any (array['art_commission'::text, 'consignment'::text, 'super_admin'::text])),

  constraint admins_pkey primary key (id),
  constraint admins_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

alter table public.users enable row level security;
alter table public.admins enable row level security;

-- Both policies on admins are `to public`, which in Postgres means every role
-- including anon — not "guests". Every policy on these two tables is written that
-- way, and it is safe only because `auth.uid()` is null for anon, so each `using`
-- clause evaluates false. Recorded as found.

drop policy if exists "Admin baca semua users" on public.users;
create policy "Admin baca semua users"
  on public.users
  for select
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "User baca data sendiri" on public.users;
create policy "User baca data sendiri"
  on public.users
  for select
  to public
  using (auth.uid() = id);

drop policy if exists "User edit data sendiri" on public.users;
create policy "User edit data sendiri"
  on public.users
  for update
  to public
  using (auth.uid() = id);

-- No with_check on the update policy, so Postgres reuses the using clause. A user
-- may therefore rewrite every column of their own row.

drop policy if exists "Admin baca data sendiri" on public.admins;
create policy "Admin baca data sendiri"
  on public.admins
  for select
  to public
  using (auth.uid() = id);

-- Same missing with_check, and here it reaches `store_role`: an admin can change
-- their own store_role by updating their own row. Recorded, not fixed.

drop policy if exists "Admin edit data sendiri" on public.admins;
create policy "Admin edit data sendiri"
  on public.admins
  for update
  to public
  using (auth.uid() = id);

-- There is no policy letting an admin read another admin's row, while `users`
-- above has one letting admins read every user. Asymmetric, and recorded as found.

-- `updated_at` does move: trg_users_updated_at and trg_admins_updated_at, both
-- before update, both calling update_updated_at(). Defined in 0015.