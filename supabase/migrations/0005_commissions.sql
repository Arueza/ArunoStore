-- Roadmap 2.2: the table behind commissions, Verrel's half.
--
-- A buyer asks for a piece of custom work, staff quote a price, the buyer pays,
-- and the commission ends in a finished drawing. 0006's titipan table runs the
-- same first three steps and differs only after payment; the two tables are
-- independent of each other.
--
-- Every column here is named by a later task, which is why each one exists and
-- why there are no others. /commissions as a route is task 2.3.
--
-- Safe to paste twice. Nothing in this repository records which migrations have
-- been applied, so the table uses if not exists and each policy is dropped
-- first. Same rule as 0006 and 0009, for the same reason: 0003 sat written but
-- unapplied for days.
--
-- No grant statements. 0001 created profiles without any and profiles works, so
-- Supabase's default privileges already cover a new table.

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),

  -- Owning buyer. auth.users rather than public.profiles, matching 0001's shape
  -- and 0006's. Cascade, so deleting the account takes its commissions with it.
  buyer_id uuid not null references auth.users (id) on delete cascade,

  -- Which of 0004's rows the buyer chose at 2.6. Not nullable: a commission is
  -- always for one of the things on offer, and restrict rather than cascade so
  -- that finishing or invoicing an old commission cannot be undone by tidying
  -- the catalogue. Hiding a service is what `active` on services is for.
  service_id uuid not null references public.services (id) on delete restrict,

  -- What the buyer writes at 2.6. This is the request itself; every other
  -- column is the shop's half of it.
  brief text not null,

  -- Reference links the buyer adds at 2.6. An array rather than a second table:
  -- they are read and written whole with the rest of the form, never queried on
  -- their own, so a join would be a table that exists to be read once. No check
  -- on the shape of a URL — the link is a hint for the artist, not a fetch.
  reference_links text[] not null default '{}',

  -- The existing enum from 0002, unchanged by this migration. 2.7 writes
  -- 'requested' and 2.10 writes 'quoted', which are the only two values either
  -- task needs. 'accepted' and 'declined' arrive with task 2.12 in a migration
  -- of their own. Widening it here would be guessing at 2.12's wording, which
  -- is the same call 0006 made and the same reason.
  status public.request_status not null default 'requested',

  -- What staff fill in at 2.9. The quote_ prefix marks these two as the shop's
  -- half of the row rather than the buyer's. All money, all whole rupiah.
  quote_price integer check (quote_price is null or quote_price >= 0),
  quote_note text,

  -- What staff upload at 2.13, once the drawing is finished. Text holding a
  -- path or URL rather than a table of its own: this is a picture attached to
  -- one row. The Storage bucket and the policies on it are not this migration's
  -- job — 2.4 builds the bucket for the gallery, and 2.13's is what makes the
  -- finished drawing readable by that one buyer.
  delivery_image text,

  -- The staff queue in 2.8 is newest first, which is an order by created_at.
  created_at timestamptz not null default now()
);

-- No total column, and none is needed here the way 0006 refuses one: a
-- commission quote is a single figure set by the artist, so there is nothing to
-- add up.

alter table public.commissions enable row level security;

-- A buyer writes their own row and nobody else's. `with check`, not `using`: on
-- an insert there is no existing row for `using` to test, so it would be checked
-- instead and a forged buyer_id would slip through.
drop policy if exists "Buyers insert their own commission"
  on public.commissions;
create policy "Buyers insert their own commission"
  on public.commissions
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

-- One row per request, so a buyer reading their own is the same rule as 0003
-- uses on profiles and 0006 uses on titipan_requests.
--
-- This is also the policy 2.11 hangs off, and the one that makes 2.13's promise
-- work: the buyer sees the finished drawing because it arrives on their own
-- row, not because anyone was given the storage bucket.
drop policy if exists "Buyers read their own commissions"
  on public.commissions;
create policy "Buyers read their own commissions"
  on public.commissions
  for select
  to authenticated
  using (buyer_id = auth.uid());

-- The staff queue in 2.8 needs both sellers to see every commission, so that one
-- of them can answer it.
--
-- The subquery is pinned to `p.id = auth.uid()` and cannot be loosened, for
-- exactly the reason 0006's is: RLS applies inside it, and 0003 gives each
-- signed-in user a select policy on profiles covering exactly one row, their
-- own. A bare `where p.role = 'staff'` would read every profile, be denied by
-- 0003, and leave staff staring at an empty queue with no error anywhere.
drop policy if exists "Staff read every commission"
  on public.commissions;
create policy "Staff read every commission"
  on public.commissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- No update or delete policy here, same call as 0006. Task 2.10 is the first
-- write to a row staff do not own and it brings its own migration; until then
-- nobody can edit anything, which is the correct state for a table no form has
-- reached yet.

-- What this task has not proved: that a buyer can actually insert. The dashboard
-- runs as postgres, which ignores RLS, so a shape smoke test proves the column
-- names and defaults and nothing about the policies. Real proof arrives with the
-- form at 2.7.