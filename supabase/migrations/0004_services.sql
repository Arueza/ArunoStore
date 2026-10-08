-- Roadmap 2.1: the catalogue Verrel quotes from.
--
-- One row per thing he draws. The public page at 2.3 lists them, the request
-- form at 2.6 offers them as a choice, and the staff quote box at 2.9 prices
-- the real work against the row the buyer picked.
--
-- Every column here is named by a later task: 2.3 reads all of them to render the
-- list, 2.6 uses id as the choice, 2.3 and 6.1 hide anything inactive.
--
-- Safe to paste twice. Nothing in this repository records which migrations have
-- been applied, so the table uses if not exists and each policy is dropped
-- first. Same rule as 0006 and 0009, for the same reason: 0003 sat written but
-- unapplied for days.
--
-- No grant statements. 0001 created profiles without any and profiles works, so
-- Supabase's default privileges already cover a new table for anon as well as
-- authenticated.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),

  -- What the buyer reads on the list at 2.3.
  name text not null,
  description text,

  -- Whole rupiah only, never 15000.50 (AGENTS.md). An estimate to start from,
  -- not the price: 2.9 quotes the real figure on the commission itself, which is
  -- why nothing here is ever copied into a quote automatically.
  starting_price integer not null check (starting_price >= 0),

  -- Whole days, as a number rather than a sentence, so 2.3 can sort and format
  -- it. The real date the drawing lands is the commission's own, not this one's.
  duration_days integer check (duration_days is null or duration_days > 0),

  -- Hides a service from 2.3 without deleting the row, which matters because 2.2
  -- points at it: a deleted service would take commissions with it. Null is not
  -- the same as false, so a row can never be hidden by accident.
  active boolean not null default true,

  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

-- Signed-out visitors included, and it has to be them: task 2.3 is a *public*
-- page listing the services, so a policy limited to authenticated would leave the
-- shop's own front page empty for anyone not logged in.
--
-- `using (active)` and no staff exception. An inactive service is hidden from
-- the shop, staff included, because the list at 2.3 is one list and two
-- behaviours would mean two lists.
drop policy if exists "Anyone reads active services"
  on public.services;
create policy "Anyone reads active services"
  on public.services
  for select
  to anon, authenticated
  using (active);

-- No insert, update or delete policy. No task asks staff to edit this catalogue
-- from the app: 6.1 seeds it. The rows are written in the Supabase SQL editor,
-- which runs as postgres and ignores RLS, exactly like the migrations above.

-- No index yet. Nothing reads the table at scale and the policy filters on a
-- boolean, which a buyer reads only when the page is built. Add one the day a
-- query needs it, not before.