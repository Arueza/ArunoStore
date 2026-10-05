-- Roadmap 1.9: /account shows the visitor's own name and role, which needs a
-- read of public.profiles.
--
-- RLS was switched on by 20261004133000_profiles_rls.sql but no policy was ever
-- added. RLS with zero policies denies every row, so the signed-in user could
-- not read their own profile and the account page had nothing to show.
--
-- Reads one row at a time: auth.uid() = id means a user can only ever see
-- themselves. Roadmap 1.8 needs staff to read other people's profiles for
-- /staff; that widens this policy and belongs in its own migration.
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);