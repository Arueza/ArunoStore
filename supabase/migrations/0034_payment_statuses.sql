-- Roadmap 4.4: payment status values as a check constraint.
--
-- Text + check rather than an enum: enum values cannot be added inside a
-- transaction block, and this stays re-runnable. Values match Midtrans
-- transaction_status: pending, settlement, capture, deny, expire, cancel,
-- failure.
--
-- Safe to paste twice: drop constraint if exists before add.

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'settlement', 'capture', 'deny', 'expire', 'cancel', 'failure'));

-- Verify after pasting:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.payments'::regclass and contype = 'c';
