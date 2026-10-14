-- Fix: the webhook could never set 'paid' (Bayar button stuck after Sandbox pay).
--
-- 0035's `paid_status_is_shop_only()` restores old.status on any update where
-- `is_staff()` is false. The webhook writes via the service-role key with no
-- user JWT, so auth.uid() is null, is_staff() is false, and the trigger
-- silently reverted every settlement to 'accepted' — the webhook's 200 hid it.
--
-- This keeps the buyer guard but lets the service role through: only staff
-- sessions and the webhook (service_role, which bypasses RLS) can set 'paid'.
--
-- Safe to paste twice: create or replace, drop trigger if exists.

create or replace function public.paid_status_is_shop_only()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and old.status <> 'paid' then
    if not public.is_staff() and coalesce(auth.role(), '') <> 'service_role' then
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
--   select prosecdef from pg_proc where proname = 'paid_status_is_shop_only';
--   -- the body must mention service_role
--
--   select tgname from pg_trigger
--   where tgrelid in ('public.commissions'::regclass, 'public.titipan_requests'::regclass)
--     and not tgisinternal;
--   -- Paid status is shop only (on both tables)
