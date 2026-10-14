-- Roadmap 5.9: extend payments to accept shop_orders alongside commissions / titipan_requests.
--
-- Adds shop_order_id (nullable) and widens the check constraint from
-- XOR to exactly-one-of-three. Re-runnable: drop constraint first, re-add.
--
-- Safe to paste twice.

alter table public.payments
  add column if not exists shop_order_id uuid references public.shop_orders (id) on delete restrict;

-- Drop the old two-way XOR constraint and replace with three-way exactly-one.
alter table public.payments
  drop constraint if exists payments_exactly_one_order;

alter table public.payments
  add constraint payments_exactly_one_order check (
    (commission_id is not null and titipan_request_id is null and shop_order_id is null)
    or (commission_id is null and titipan_request_id is not null and shop_order_id is null)
    or (commission_id is null and titipan_request_id is null and shop_order_id is not null)
  );

-- Verify after pasting:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.payments'::regclass and conname = 'payments_exactly_one_order';
