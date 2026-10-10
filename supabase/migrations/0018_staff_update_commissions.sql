-- Roadmap 2.10: writing the quote is the first update to a commissions row that
-- staff do not own, and 0005 deliberately ships no update policy. Without this,
-- the quote box at 2.9 saves nothing and says nothing about why.
--
-- Two separate questions, answered separately:
--
--   which rows   — the policy below
--   which columns — the grants further down
--
-- RLS is row-level only. It cannot say "you may change quote_price but not
-- buyer_id". Left at table-level UPDATE, any staff session holding the anon key
-- could rewrite buyer_id on any commission and hand someone else's request to
-- another account, or move status backwards. The server action only ever writes
-- three columns, but the action is not the only thing that can talk to the API.
--
-- delivery_image is absent on purpose. It belongs to task 2.13, which needs the
-- bucket policy as well as the column, and granting it here would be a promise
-- this file cannot keep.

alter table public.commissions enable row level security;

-- No `with check`. Postgres reuses `using` when it is missing, and here that is
-- is_staff() again, which is exactly the condition wanted: staff who could read
-- the row before the update must still be able to see it after.

-- Compared against 0005's "Staff read every commission", which repeats the
-- subquery inline. is_staff() is the same test with the recursion already
-- solved, so reusing it keeps one definition of "is this user staff" instead of
-- three copies that can drift apart.
drop policy if exists "Staff update commissions"
  on public.commissions;
create policy "Staff update commissions"
  on public.commissions
  for update
  to authenticated
  using (public.is_staff());

-- Supabase's default privileges gave authenticated UPDATE on the whole table.
-- Take it back before granting the three columns that are actually the shop's
-- half of a row: the quote, its note, and the status that says a quote exists.
--
-- buyer_id, service_id, brief, reference_links and created_at are the buyer's
-- half and stay read-only for everyone over the API. A quote is not a licence to
-- rewrite the request it is a quote for.
revoke update on table public.commissions from authenticated;

grant update (quote_price, quote_note, status)
  on table public.commissions
  to authenticated;

-- Nothing else is revoked. INSERT stays as 0005 left it, so 2.6's form keeps
-- working; SELECT is untouched, so 2.11's buyer list and 2.8's queue both keep
-- working. DELETE is left absent, exactly as 0005 left it: nobody deletes a
-- commission over the API.

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'commissions';
--   -- 4 rows: two select, one insert, one update
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'commissions'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
--   -- quote_price, quote_note, status — and nothing else
--
-- The second query is the one that matters. A missing revoke shows up here as
-- six columns, and it would show up nowhere else: the app works fine either way.