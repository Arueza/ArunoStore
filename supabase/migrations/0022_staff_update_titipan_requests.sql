-- Roadmap 3.6: writing the quote is the first update to a titipan_requests row
-- that staff do not own, and 0006 deliberately ships no update policy. Without
-- this, the quote box at 3.6 saves nothing and says nothing about why.
--
-- Two separate questions, answered separately:
--
--   which rows   — the policy below
--   which columns — the grants further down
--
-- RLS is row-level only. It cannot say "you may change quote_item_price but not
-- buyer_id". Left at table-level UPDATE, any staff session holding the anon key
-- could rewrite buyer_id on any request and hand someone else's parcel to
-- another account, or move status backwards to 'requested' and buy the same
-- item twice. The server action only ever writes five columns, but the action
-- is not the only thing that can talk to the API.
--
-- courier and tracking_number are absent on purpose. They belong to task 3.11,
-- and granting them here would be a promise this file cannot keep — the same
-- rule 0018 followed with delivery_image.

alter table public.titipan_requests enable row level security;

-- No `with check`. Postgres reuses `using` when it is missing, and here that is
-- is_staff() again, which is exactly the condition wanted: staff who could read
-- the row before the update must still be able to see it after.

-- Compared against 0006's "Staff read every titipan request", which repeats the
-- subquery inline. is_staff() is the same test with the recursion already
-- solved, so reusing it keeps one definition of "is this user staff" instead of
-- two copies that can drift apart. Same switch 0018 made on commissions.
drop policy if exists "Staff update titipan requests"
  on public.titipan_requests;
create policy "Staff update titipan requests"
  on public.titipan_requests
  for update
  to authenticated
  using (public.is_staff());

-- Supabase's default privileges gave authenticated UPDATE on the whole table.
-- Take it back before granting the five columns that are actually the shop's
-- half of a row: the three figures the quote is made of, its note, and the
-- status that says a quote exists.
--
-- buyer_id, product_link, size, color, quantity, budget and created_at are the
-- buyer's half and stay read-only for everyone over the API. A quote is not a
-- licence to rewrite the request it is a quote for.
revoke update on table public.titipan_requests from authenticated;

grant update (quote_item_price, quote_shipping, quote_service_fee, quote_note, status)
  on table public.titipan_requests
  to authenticated;

-- Nothing else is revoked. INSERT stays as 0006 left it, so 3.3's form keeps
-- working; SELECT is untouched, so 3.5's queue and 3.8's buyer list keep
-- working. DELETE is left absent, exactly as 0006 left it: nobody deletes a
-- titipan request over the API.

-- ── The quote belongs to the shop, whoever asks ─────────────────────────────

-- 3.9 gives a buyer an update policy on their own row so they can accept or
-- decline. That policy is what reopens the column grant above to the very
-- columns it was built to protect: a grant says what a role may write, a policy
-- says which rows, and together they say "a buyer may write quote_item_price on
-- their own row". A buyer who has been quoted Rp 700.000 can rewrite it to Rp
-- 7.000 and accept.
--
-- 0020 has this hole open on commissions today. It is closed here rather than
-- inherited, because this is the file that hands out the grant in the first
-- place and it is the last place that can take it back.
--
-- A BEFORE UPDATE trigger, because a policy cannot: RLS decides rows, a grant
-- decides columns, and neither can say "this column, but only for staff". The
-- trigger restores the previous values on any update where is_staff() is false,
-- so the buyer's UPDATE still succeeds and still moves status — it just cannot
-- move the money.
--
-- Silent by design. Refusing the whole statement instead would turn "a buyer
-- edited the quote" into a row-level security error on an action they never
-- wrote, which is the failure mode this file exists to avoid. The value simply
-- does not change, which is what they were already entitled to see.
--
-- plpgsql and not sql, for the reason 0019 gives: a `language sql` body is
-- inlined by the planner, which puts the inner read of profiles back under RLS.
-- is_staff() is plpgsql for the same reason and is called, not inlined into.
--
-- Not SECURITY DEFINER. It writes no data of its own and reads none — it calls
-- is_staff(), which is already SECURITY DEFINER and reads auth.uid() itself —
-- so there is nothing here for elevated rights to be needed for, and a trigger
-- that ran as its owner would be one more thing to trust if it were ever wrong.
--
-- Safe to paste twice: create or replace on the function, drop trigger if exists
-- before create, because a trigger has no `if not exists`.
create or replace function public.titipan_quote_is_shop_only()
returns trigger
language plpgsql
as $$
begin
  if not public.is_staff() then
    new.quote_item_price  := old.quote_item_price;
    new.quote_shipping    := old.quote_shipping;
    new.quote_service_fee := old.quote_service_fee;
    new.quote_note        := old.quote_note;
  end if;

  return new;
end;
$$;

-- Only the four quote columns are pinned. `status` is deliberately not: 3.9 and
-- 3.12 are the buyer writing it, and that is the whole point of giving them the
-- update policy in the first place.
drop trigger if exists "Titipan quote is shop only" on public.titipan_requests;
create trigger "Titipan quote is shop only"
  before update on public.titipan_requests
  for each row
  execute function public.titipan_quote_is_shop_only();

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'titipan_requests';
--   -- four rows: two select, one insert, one update
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'titipan_requests'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by 1;
--   -- quote_item_price, quote_service_fee, quote_note, quote_shipping, status
--
-- The second query is the one that matters. A missing revoke shows up here as
-- all fifteen columns, and it would show up nowhere else: the app works fine
-- either way, and the damage only shows up as somebody else's parcel bought
-- twice.
--
--   select tgname from pg_trigger
--   where tgrelid = 'public.titipan_requests'::regclass and not tgisinternal;
--   -- Titipan quote is shop only
--
-- The first two queries say the grant landed. The third says the trigger did.
-- A missing trigger is invisible from the app: everything still works, right up
-- until a buyer is the one editing.

-- ── How to prove the pinning actually holds ─────────────────────────────────
--
-- The queries above check that the pieces exist. This checks that they behave,
-- and it is the only thing that catches a trigger written with the wrong
-- condition — a policy that is present and an update that should have been
-- rewritten still both look fine in pg_catalog.
--
-- In the SQL editor, take any id:
--
--   select id, quote_item_price from public.titipan_requests limit 1;
--
--   update public.titipan_requests
--      set quote_item_price = 7, status = 'accepted'
--    where id = '<that id>';
--
--   select quote_item_price, status from public.titipan_requests
--    where id = '<the same id>';
--
-- quote_item_price comes back as it was; status says 'accepted'.
--
-- Why that is a real test rather than a formality: the editor runs as the table
-- owner, so RLS does not apply to it, and with no JWT on the connection
-- auth.uid() is null — is_staff() is therefore false and the pinning branch is
-- the one that runs. A quote_item_price of 7 means the trigger is not attached.
-- Check that 0019's is_staff() exists if the create trigger line errored: a
-- missing function fails there and leaves the trigger half-made.
--
-- Set status back to what it was afterwards. The quote figures were never
-- changed; only status was.
--
-- What this does NOT prove: that a real buyer session can and cannot write. The
-- owner bypasses every policy on the table, so the grant and the two update
-- policies only mean anything for a session carrying somebody's JWT. Testing
-- those needs the app signed in as each role, which is what 6.2 is for.
