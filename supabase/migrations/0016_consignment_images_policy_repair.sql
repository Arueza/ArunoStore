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
-- Safe to paste twice. Each drop is `if exists` and each create is preceded by
-- one, so this converges from either state: four policies, two, or none.

-- Both spellings, so the file is correct whether the database still holds the
-- typo or has already been repaired.
drop policy if exists "Admin kelola consignment imaget_images" on public.consignment_images;
drop policy if exists "Public baca consignment imaget_images" on public.consignment_images;
drop policy if exists "Admin kelola consignment images" on public.consignment_images;
drop policy if exists "Public baca consignment images" on public.consignment_images;

-- Recreated from 0012, unchanged. Read the migration as a whole: a comment is not
-- a policy, and these two lines are what the table ends up with.

drop policy if exists "Admin kelola consignment images" on public.consignment_images;
create policy "Admin kelola consignment images"
  on public.consignment_images
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "Public baca consignment images" on public.consignment_images;
create policy "Public baca consignment images"
  on public.consignment_images
  for select
  to public
  using (true);

-- After this file, `select count(*) from pg_policies where schemaname = 'public'`
-- is 37 and consignment_images holds 2.