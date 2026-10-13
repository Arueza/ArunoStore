-- Roadmap 4.8: settled payment moves the order to 'paid'.
--
-- Two things this migration adds:
--
--   1. The enum value. 'paid' sits between 'accepted' and the delivery statuses
--      (purchased/shipped/arrived for titipan, delivery image for commissions).
--
--   2. A guard trigger. 0020/0028 give buyers an UPDATE policy on their own row,
--      and the column grants already cover status. Without a guard, a buyer could
--      set status='paid' themselves without paying. The trigger restores the old
--      value on any update where is_staff() is false, so only the webhook (which
--      writes via the service-role key, bypassing RLS) can set 'paid'.
--
-- Safe to paste twice: add value if not exists, drop trigger if exists.

alter type public.request_status
  add value if not exists 'paid';

-- ── The paid status belongs to the shop, whoever asks ─────────────────────────

create or replace function public.paid_status_is_shop_only()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and old.status <> 'paid' then
    if not public.is_staff() then
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists "Paid status is shop only" on public.commissions;
create trigger "Paid status is shop only"
  before update on public.commissions
  for each row
  execute function public.paid_status_is_shop_only();

drop trigger if exists "Paid status is shop only" on public.titipan_requests;
create trigger "Paid status is shop only"
  before update on public.titipan_requests
  for each row
  execute function public.paid_status_is_shop_only();

-- Verify after pasting:
--   select enumlabel from pg_enum
--   where enumtypid = (select oid from pg_type where typname = 'request_status');
--   -- requested, quoted, accepted, declined, paid, purchased, shipped, arrived
--
--   select tgname from pg_trigger
--   where tgrelid in ('public.commissions'::regclass, 'public.titipan_requests'::regclass)
--     and not tgisinternal;
--   -- Paid status is shop only (on both tables)
