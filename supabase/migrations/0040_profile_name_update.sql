-- Roadmap 5.14: buyers edit their own display name on /account/edit.
--
-- profiles shipped no update policy at all (0003 is select-only), so an
-- anon-key UPDATE is denied silently — RLS on with no policy denies every
-- row, and nothing reports why. Without this, the name form saves nothing
-- and says nothing about why.
--
-- Two separate questions, answered separately (the 0018 pattern):
--
--   which rows   — the policy below: exactly the visitor's own row
--   which columns — the grants further down: full_name only
--
-- RLS is row-level only. It cannot say "you may change full_name but not
-- role". Left at table-level UPDATE, any signed-in session holding the anon
-- key could promote itself to staff or rewrite someone's email. The server
-- action only ever writes full_name, but the action is not the only thing
-- that can talk to the API — 1.16's hardcoded buyer role would reopen here.
--
-- No `with check`. Postgres reuses `using` when it is missing, and id never
-- changes, so a row visible before the update is the same row after it.
--
-- Safe to paste twice.

alter table public.profiles enable row level security;

drop policy if exists "Users update own full_name"
  on public.profiles;
create policy "Users update own full_name"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid());

-- Supabase's default privileges gave authenticated UPDATE on the whole table.
-- Take it back before granting the one column that is actually the buyer's to
-- change. email, role and created_at stay read-only for everyone over the API.
revoke update on table public.profiles from authenticated;

grant update (full_name)
  on table public.profiles
  to authenticated;

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'profiles';
--   -- three rows: two select (0003, 0019) and one update
--
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--     where table_name = 'profiles' and privilege_type = 'UPDATE';
--   -- one row: authenticated / UPDATE / full_name
