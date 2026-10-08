-- Roadmap 3.1: the table behind titipan requests.
--
-- A buyer sends a Japanese product link, staff quote item price + shipping +
-- service fee, the buyer pays, and the request ends in a tracking number.
-- Phase 2's commissions table runs the same first three steps and differs only
-- after payment; the two tables are independent of each other.
--
-- Every column here is named by a later task in the roadmap, which is why each
-- one exists and why there are no others. /titipan as a route is task 3.2.
--
-- Safe to paste twice. Nothing in this repository records which migrations have
-- been applied, so every statement below is written to be re-runnable: the table
-- uses if not exists, and each policy is dropped first. Same rule as 0009, for
-- the same reason: 0003 sat written but unapplied for days.
--
-- No grant statements. 0001 created profiles without any and profiles works, so
-- Supabase's default privileges already cover a new table.

create table if not exists public.titipan_requests (
  id uuid primary key default gen_random_uuid(),

  -- Owning buyer. auth.users rather than public.profiles, matching 0001's shape.
  -- Cascade, so deleting the account takes its requests with it.
  buyer_id uuid not null references auth.users (id) on delete cascade,

  -- What the buyer sends in task 3.3.
  product_link text not null,
  size text,
  color text,
  quantity integer not null default 1 check (quantity > 0),

  -- Whole rupiah only, never 15000.50: decimals in a column cause rounding bugs
  -- (AGENTS.md). Nullable because a buyer is allowed to have no idea.
  budget integer check (budget is null or budget >= 0),

  -- The existing enum from 0002, unchanged by this migration. 3.4 writes
  -- 'requested' and 3.7 writes 'quoted', which are the only two values either
  -- task needs. 'accepted' and 'declined' arrive with Phase 2's task 2.12;
  -- 'purchased', 'shipped' and 'arrived' arrive at 3.10 in a migration of their
  -- own. Widening it here would be guessing at that wording.
  status public.request_status not null default 'requested',

  -- What staff fill in at 3.6. The quote_ prefix marks these four as the shop's
  -- half of the row rather than the buyer's. All money, all whole rupiah.
  quote_item_price integer,
  quote_shipping integer,
  quote_service_fee integer,
  quote_note text,

  -- What staff fill in at 3.11, once the parcel is on its way.
  courier text,
  tracking_number text,

  -- The staff queue in 3.5 is newest first, which is an order by created_at.
  created_at timestamptz not null default now()
);

-- No total column on purpose. Task 3.6 computes the total, and storing a sum
-- next to its own three parts would leave two copies of one number to disagree
-- the day staff edit a part without it. quoteTotal() in src/lib/quote.ts is the
-- single place a total comes from.

alter table public.titipan_requests enable row level security;

-- A buyer writes their own row and nobody else's. `with check`, not `using`: on
-- an insert there is no existing row for `using` to test, so it would be checked
-- instead and a forged buyer_id would slip through.
drop policy if exists "Buyers insert their own titipan request"
  on public.titipan_requests;
create policy "Buyers insert their own titipan request"
  on public.titipan_requests
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

-- One row per request, so a buyer reading their own is the same rule as 0003
-- uses on profiles.
drop policy if exists "Buyers read their own titipan requests"
  on public.titipan_requests;
create policy "Buyers read their own titipan requests"
  on public.titipan_requests
  for select
  to authenticated
  using (buyer_id = auth.uid());

-- The staff queue in 3.5 needs both sellers to see every request.
--
-- The subquery is pinned to `p.id = auth.uid()` and cannot be loosened. RLS
-- applies inside it, and 0003 gives each signed-in user a select policy on
-- profiles covering exactly one row: their own. A bare `where p.role = 'staff'`
-- would read every profile, be denied by 0003, and leave staff staring at an
-- empty queue with no error anywhere. Same fail-closed reasoning as isStaff() in
-- src/proxy.ts.
drop policy if exists "Staff read every titipan request"
  on public.titipan_requests;
create policy "Staff read every titipan request"
  on public.titipan_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- No update or delete policy here. Task 3.7 is the first write to a row staff do
-- not own, and it brings its own migration. Until then the table is deliberately
-- not editable by anyone, which is the correct state for a table no form has
-- reached yet.