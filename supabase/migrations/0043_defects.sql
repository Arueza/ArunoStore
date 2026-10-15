-- Defect fixes: broken commission-order trigger, missing indexes, stock status restore.
--
-- 1. handle_commission_order_confirmed() is broken: it updates used_slots/max_slots
--    (columns that don't exist on commissions) and sets status='closed' (not in the
--    enum). The AFTER UPDATE trigger rolls back every commission_orders write. The
--    commission_orders table is unused by the app (P1 legacy — src/ never reads it),
--    so the safe fix is to drop the trigger and function. If the overlap decision
--    ever materializes, rewrite both from scratch.
--
-- 2. No index on any FK, status or created_at across the project. Staff queues and
--    buyer lists seq-scan. Add covering indexes.
--
-- 3. consignment_items.status: handle_consignment_order_confirmed() sets 'terjual'
--    when stock hits 0 but never restores 'tersedia'. The shop checkout flow
--    (createShopOrder) decrements stock without touching status, so an item that
--    was manually marked 'terjual' stays that way forever. Fix in app code
--    (src/app/shop/actions.ts) — after decrement, set status='tersedia' when stock > 0.
--
-- Safe to paste twice: drop if exists, create index if not exists.

-- ── 1. Drop broken commission-order trigger ─────────────────────────────────

drop trigger if exists trg_commission_order_confirmed on public.commission_orders;
drop function if exists public.handle_commission_order_confirmed();

-- ── 2. Add missing indexes ─────────────────────────────────────────────────

-- Commissions: staff queue (status, created_at) + buyer list (buyer_id)
create index if not exists commissions_buyer_id_idx on public.commissions(buyer_id);
create index if not exists commissions_status_idx on public.commissions(status);
create index if not exists commissions_created_at_idx on public.commissions(created_at);

-- Titipan requests: staff queue (status, created_at) + buyer list (buyer_id)
create index if not exists titipan_requests_buyer_id_idx on public.titipan_requests(buyer_id);
create index if not exists titipan_requests_status_idx on public.titipan_requests(status);
create index if not exists titipan_requests_created_at_idx on public.titipan_requests(created_at);

-- Payments: buyer history
create index if not exists payments_buyer_id_idx on public.payments(buyer_id);

-- Shop orders: buyer history
create index if not exists shop_orders_buyer_id_idx on public.shop_orders(buyer_id);

-- Verify after pasting:
--   select tablename, indexname from pg_indexes
--   where schemaname='public' and indexname like '%_idx'
--   order by tablename, indexname;
--   -- 9 rows: commissions(3), titipan_requests(3), payments(1), shop_orders(1)
--
--   select tgname from pg_trigger
--   where tgrelid = 'public.commission_orders'::regclass and not tgisinternal;
--   -- should NOT contain trg_commission_order_confirmed
