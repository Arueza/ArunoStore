-- Roadmap: close the commissions-side hole 0022 closed for titipan_requests.
--
-- 0018 granted update (quote_price, quote_note, status) to authenticated.
-- 0020 gave buyers an UPDATE policy on their own row. Grant + policy together
-- mean a buyer can write quote_price on their own commission — quote
-- themselves Rp 7.000 instead of Rp 700.000 and accept.
--
-- 0022 fixed this for titipan_requests with a BEFORE UPDATE trigger. This is
-- the same fix for commissions. No new policy, no new grant, no enum change.

-- Safe to paste twice: create or replace on the function, drop trigger if
-- exists before create, because a trigger has no `if not exists`.

create or replace function public.commission_quote_is_shop_only()
returns trigger
language plpgsql
as $$
begin
  if not public.is_staff() then
    new.quote_price := old.quote_price;
    new.quote_note  := old.quote_note;
  end if;

  return new;
end;
$$;

-- Only the two quote columns are pinned. `status` is deliberately not: 2.12
-- is the buyer writing it, and that is the whole point of giving them the
-- update policy in the first place.
drop trigger if exists "Commission quote is shop only" on public.commissions;
create trigger "Commission quote is shop only"
  before update on public.commissions
  for each row
  execute function public.commission_quote_is_shop_only();

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'commissions';
--   -- two select, one insert, two update (staff + buyer)
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'commissions'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by 1;
--   -- delivery_image, quote_price, quote_note, status
--
--   select tgname from pg_trigger
--   where tgrelid = 'public.commissions'::regclass and not tgisinternal;
--   -- Commission quote is shop only
