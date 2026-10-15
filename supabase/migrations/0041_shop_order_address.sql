-- Buyer shipping address on shop orders.
--
-- The shop checkout never collected where to send the parcel: shop_orders has
-- buyer_id, status and total_price only. Buyer fills the address on
-- /checkout?type=shop before the Snap button appears; staff reads it from the
-- same page when packing.
--
-- Two separate questions, answered separately (same split as 0018):
--
--   which rows   — the policy below: own order, still pending
--   which columns — the grants further down: the seven address columns only
--
-- RLS is row-level only. Left at table-level UPDATE, a buyer session holding
-- the anon key could rewrite total_price on their own pending order and then
-- pay the lowered amount through Snap, which charges whatever the row says.
-- The server action only ever writes the address columns, so the grant says
-- exactly that. status stays read-only for everyone over the API: only the
-- webhook (service-role) moves pending to settled/deny/expire.
--
-- Safe to paste twice.

alter table public.shop_orders
  add column if not exists recipient_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text,
  add column if not exists note text;

-- No `with check`. Postgres reuses `using` when it is missing, and here that
-- is exactly the condition wanted: a buyer who could see the row before the
-- update must still own it and it must still be pending after.
drop policy if exists "Buyers update their own pending shop_orders"
  on public.shop_orders;
create policy "Buyers update their own pending shop_orders"
  on public.shop_orders
  for update
  to authenticated
  using (buyer_id = auth.uid() and status = 'pending');

-- Supabase's default privileges gave authenticated UPDATE on the whole table.
-- Take it back before granting the seven address columns. buyer_id, status,
-- total_price and the Midtrans columns stay read-only for everyone over the
-- API; an address is not a licence to reprice the order it ships with.
revoke update on table public.shop_orders from authenticated;

grant update (recipient_name, phone, address, city, province, postal_code, note)
  on table public.shop_orders
  to authenticated;

-- Nothing else is revoked. INSERT stays as 0037 left it, so createShopOrder
-- keeps working; SELECT is untouched for buyer history, staff packing view
-- and the checkout receipt. DELETE stays absent, exactly as 0037 left it.

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'shop_orders';
--   -- 4 rows: two select, one insert, one update
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'shop_orders'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
--   -- recipient_name, phone, address, city, province, postal_code, note
--
-- The second query is the one that matters. A missing revoke shows up here as
-- every column, and it would show up nowhere else: the app works fine either
-- way while a buyer can silently reprice their own order.
