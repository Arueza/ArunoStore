-- Buyer shipping address on commissions and titipan_requests.
--
-- Same gap 0041 fixed for shop_orders: commission and titipan checkout never
-- collected where to send the parcel. Buyer fills the address on
-- /checkout?type=commission or ?type=titipan before the Snap button appears;
-- staff reads it from the same page when packing.
--
-- Same split as 0041:
--
--   which rows   — the policy below: own order, still accepted (not yet paid)
--   which columns — the grants further down: the seven address columns only
--
-- RLS is row-level only. Left at table-level UPDATE, a buyer session holding
-- the anon key could rewrite quote_price/status on their own accepted order
-- and then pay the lowered amount through Snap. The server action only ever
-- writes the address columns, so the grant says exactly that.
--
-- Safe to paste twice.

-- ── Commissions ─────────────────────────────────────────────────────────────

alter table public.commissions
  add column if not exists recipient_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text,
  add column if not exists note text;

drop policy if exists "Buyers update their own accepted commission address"
  on public.commissions;
create policy "Buyers update their own accepted commission address"
  on public.commissions
  for update
  to authenticated
  using (buyer_id = auth.uid() and status = 'accepted');

revoke update on table public.commissions from authenticated;

grant update (recipient_name, phone, address, city, province, postal_code, note)
  on table public.commissions
  to authenticated;

-- ── Titipan requests ────────────────────────────────────────────────────────

alter table public.titipan_requests
  add column if not exists recipient_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text,
  add column if not exists note text;

drop policy if exists "Buyers update their own accepted titipan address"
  on public.titipan_requests;
create policy "Buyers update their own accepted titipan address"
  on public.titipan_requests
  for update
  to authenticated
  using (buyer_id = auth.uid() and status = 'accepted');

revoke update on table public.titipan_requests from authenticated;

grant update (recipient_name, phone, address, city, province, postal_code, note)
  on table public.titipan_requests
  to authenticated;

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'commissions';
--   -- should include "Buyers update their own accepted commission address"
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'commissions'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
--   -- recipient_name, phone, address, city, province, postal_code, note
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'titipan_requests'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
--   -- recipient_name, phone, address, city, province, postal_code, note
