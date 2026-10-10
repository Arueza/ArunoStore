-- Roadmap 2.12: a buyer who has been quoted can accept or decline it.
--
-- Until now request_status held only 'requested' and 'quoted' — the buyer
-- had no say beyond sending the brief. This adds the two values that close
-- that gap, and a policy that lets a buyer update their own row.
--
-- alter type add value cannot run inside a transaction block, so each
-- statement stands alone. The SQL editor runs them one at a time anyway,
-- which is the rule NOTES.md already states for every migration.
--
-- Safe to paste twice: if not exists on the values, drop policy if exists
-- on the policy.

alter type public.request_status
  add value if not exists 'accepted';

alter type public.request_status
  add value if not exists 'declined';

-- A buyer can update their own commission, and only their own.
--
-- 0018's staff update policy sits on the same table for the same command.
-- Postgres ORs every policy for a command together, so both can coexist:
-- staff update any row (is_staff()), buyers update their own
-- (buyer_id = auth.uid()). The column grant from 0018 already covers
-- status, so no new grant is needed here — the buyer can only touch
-- status, never quote_price or quote_note, because those columns are not
-- granted to them.
--
-- with check reuses the same condition: after the update the row must
-- still belong to the buyer. Without it a buyer could change buyer_id and
-- hand the row to somebody else, but the column grant blocks that anyway
-- — buyer_id is not in the granted set. Belt and braces.
alter table public.commissions enable row level security;

drop policy if exists "Buyers update their own commission"
  on public.commissions;
create policy "Buyers update their own commission"
  on public.commissions
  for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

-- No new column grant. 0018 already did:
--   grant update (quote_price, quote_note, status) to authenticated
-- and that is all a buyer needs. delivery_image stays ungranted until 2.13.
--
-- Verify after pasting:
--   select enumlabel from pg_enum
--   where enumtypid = (select oid from pg_type where typname = 'request_status');
--   -- requested, quoted, accepted, declined
--
--   select policyname, cmd from pg_policies where tablename = 'commissions';
--   -- two select, one insert, two update (staff + buyer)
