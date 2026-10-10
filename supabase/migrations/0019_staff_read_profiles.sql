-- Roadmap 2.8: the staff queue has to say who sent each request, and 0003 lets a
-- signed-in user read exactly one profiles row — their own.
--
-- Numbered 0019, not 0017. Task 2.4 already took 0017 for the artworks bucket,
-- and 0018 was taken by the update policy in the same phase. Two files with one
-- number is harmless to the SQL editor, which never sees a filename, and
-- confusing in git, which does. The SQL below was applied to the database as
-- 0017 and nothing about it changed.
--
-- The obvious policy does not work:
--
--   on public.profiles for select
--   using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff'))
--
-- That subquery reads the table the policy is attached to, so RLS applies to it,
-- which evaluates the policy again, which reads the table again. Postgres stops it
-- with `ERROR: infinite recursion detected in policy for relation "profiles"`.
--
-- 0005 gets away with the same shape because its policy sits on commissions and
-- the subquery reads profiles — two different tables, no loop. Loosen that one to
-- a bare `where p.role = 'staff'` and it stops being denied by 0003 and starts
-- being denied by this. Pinned to p.id = auth.uid() for a reason.
--
-- is_staff() breaks the loop the way Postgres documents: a SECURITY DEFINER
-- function. It runs with its owner's privileges, and the owner of public.profiles
-- bypasses RLS because Supabase does not FORCE ROW LEVEL SECURITY, so the inner
-- read is unrestricted and the policy never re-enters itself.
--
-- plpgsql rather than sql, deliberately. A `language sql` function is inlined
-- into the calling policy expression by the planner, which puts the inner query
-- back under RLS and the recursion comes straight back. plpgsql is never inlined.
--
-- auth.uid() is read inside the function rather than passed in as an argument. A
-- parameter would be a way to ask "is this uid staff" about somebody else, and a
-- buyer who got a true back would then satisfy the policy below and read every
-- profile in the table.
--
-- Safe to paste twice: create or replace, and the policy is dropped first.

create or replace function public.is_staff()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
  );
end;
$$;

-- Executable by public by default, which is how authenticated gets to call it from
-- a policy expression. Left alone on purpose: revoking execute would make this
-- policy permanently false and the queue silently empty, which is the failure
-- mode this file exists to avoid.

-- Staff see every profile. Narrower than it looks: it grants names and email
-- addresses to the two people who run the shop, and to nobody else. Every other
-- policy on this table stays exactly as 0003 left it.
drop policy if exists "Staff read every profile"
  on public.profiles;
create policy "Staff read every profile"
  on public.profiles
  for select
  to authenticated
  using (public.is_staff());

-- Verify after pasting:
--   select policyname from pg_policies where tablename = 'profiles';
--   -- "Staff read every profile", "Users can read their own profile"
--
-- And that the function is there and definers:
--   select prosecdef, provolatile from pg_proc where proname = 'is_staff';