-- Roadmap P1 follow-up: repair the consignment_images policy names.
--
-- WHY THIS FILE EXISTS. The original policies on public.consignment_images were
-- created misspelled, with `imaget_images`:
--
--     Admin kelola consignment imaget_images
--     Public baca consignment imaget_images
--
-- 0012 drops each policy by its literal name before recreating it, which is the
-- rule every other migration here follows. Those literals did not match, so the
-- drops matched nothing and the creates added a second, correctly-spelled policy
-- beside the typo. `consignment_images` ended up with four policies instead of two.
--
-- **No access changed.** Both pairs are byte-identical in `qual` and `with_check`
--:
--     Admin kelola ...  (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()))
--     Public baca ...   true
--
-- and permissive policies OR together, so two copies of the same expression
-- behave exactly like one. This is tidiness and a restored idempotency
-- guarantee, not a security fix. Nothing was ever widened.
--
-- It is provably the only table affected. A drop followed by a create nets zero
-- when the name matches and one when it does not, and only consignment_images
-- gained a policy — so the other twenty-seven names in 0010 to 0014 matched the
-- live database exactly.
--
-- One statement, on purpose. The rest of this repository's migrations are a list
-- of separate statements, and the dashboard aborts a batch silently when one of
-- them fails — which rolls back the whole paste and leaves the database looking
-- untouched, with no error anyone reads. That is exactly how 0003 sat unapplied
-- for days. So this repair is a single `do` block: it either applies completely or
-- not at all, and there is nothing to sequence.
--
-- It drops every policy on the table by looking names up in pg_policy, so it
-- does not care what any of them are called. Both spellings that have existed
-- here are handled, and so is a third nobody has typed yet.
--
-- Safe to paste twice, and safe to paste after 0012 has already run.

do $$
declare
  stale text;
begin
  for stale in
    select polname
      from pg_policy
     where polrelid = 'public.consignment_images'::regclass
  loop
    execute format('drop policy if exists %I on public.consignment_images', stale);
  end loop;

  -- Recreated from 0012, unchanged. A comment is not a policy, and these two are
  -- what the table ends up with.
  execute $p$create policy "Admin kelola consignment images"
    on public.consignment_images
    for all
    to public
    using (exists (select 1 from admins where admins.id = auth.uid()))$p$;

  execute $p$create policy "Public baca consignment images"
    on public.consignment_images
    for select
    to public
    using (true)$p$;
end $$;

-- After this file:
--
--   select count(*) from pg_policies where schemaname = 'public';                                  -- 37
--   select count(*) from pg_policies where schemaname = 'public'
--    and tablename = 'consignment_images';                                                          -- 2