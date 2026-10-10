-- Roadmap 2.4: the artwork gallery — storage bucket, metadata table, and the
-- policies that gate them.
--
-- Staff upload finished drawings to show buyers what the shop can do. The
-- images live in Supabase Storage; one row in `artworks` holds the title and
-- the storage path so the gallery at 2.5 can list them with something to say
-- about each picture.
--
-- Safe to paste twice. Nothing in this repository records which migrations
-- have been applied, so the table uses if not exists, the bucket uses
-- on conflict, and each policy is dropped first. Same rule as 0004, 0005 and
-- 0009, for the same reason: 0003 sat written but unapplied for days.
--
-- No grant statements. 0001 created profiles without any and profiles works,
-- so Supabase's default privileges already cover a new table for anon as well
-- as authenticated.

-- ── Storage bucket ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

-- ── Storage policies ────────────────────────────────────────────────────────

-- Anyone can read artwork images. The gallery at 2.5 is a public page, so
-- this has to include anon, the same reason 0004's services policy does.
drop policy if exists "Public read artwork images"
  on storage.objects;
create policy "Public read artwork images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'artworks');

-- Only staff can upload. The subquery is pinned to `p.id = auth.uid()` and
-- cannot be loosened, for exactly the reason 0005's and 0006's are: RLS
-- applies inside it, and 0003 gives each signed-in user a select policy on
-- profiles covering exactly one row, their own. A bare `where p.role =
-- 'staff'` would read every profile, be denied by 0003, and leave staff
-- unable to upload with no error anywhere.
drop policy if exists "Staff upload artwork images"
  on storage.objects;
create policy "Staff upload artwork images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- Only staff can delete. Same staff check as insert.
drop policy if exists "Staff delete artwork images"
  on storage.objects;
create policy "Staff delete artwork images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- ── Artworks metadata table ─────────────────────────────────────────────────

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),

  -- What the buyer reads on the gallery at 2.5. The image itself is in
  -- storage; this is the title that goes with it.
  title text not null,

  -- Path to the image inside the 'artworks' bucket, as returned by
  -- storage.from('artworks').upload(). Not a foreign key: storage.objects
  -- is managed by Supabase and has no FK to this table.
  storage_path text not null,

  created_at timestamptz not null default now()
);

alter table public.artworks enable row level security;

-- Anyone can read artwork metadata. The gallery at 2.5 lists titles and
-- images together, so the metadata has to be as public as the images.
drop policy if exists "Anyone reads artworks"
  on public.artworks;
create policy "Anyone reads artworks"
  on public.artworks
  for select
  to anon, authenticated
  using (true);

-- Only staff can insert. Same pinned subquery as the storage policies.
drop policy if exists "Staff insert artworks"
  on public.artworks;
create policy "Staff insert artworks"
  on public.artworks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- Only staff can delete. Same staff check as insert.
drop policy if exists "Staff delete artworks"
  on public.artworks;
create policy "Staff delete artworks"
  on public.artworks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- No update policy. No task asks staff to edit an artwork's title or replace
-- its image: the upload form at 2.4 inserts, and the delete button removes.
-- If a title needs correcting, delete and re-upload is the path until a task
-- asks for an edit form.

-- What this task has not proved: that a staff member can actually insert.
-- The dashboard runs as postgres, which ignores RLS, so a shape smoke test
-- proves the column names and defaults and nothing about the policies. Real
-- proof arrives with the upload form at 2.4.
