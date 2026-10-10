-- Roadmap 2.13: staff upload the finished drawing; the buyer who owns the
-- commission sees it, and nobody else.
--
-- Unlike the artworks bucket at 2.4, this one is private: delivery images are
-- for one buyer, not the public gallery. The buyer reads the image through a
-- signed URL that the server generates after the RLS-gated commission read
-- confirms ownership, so the bucket never serves an image to a stranger.
--
-- Safe to paste twice. The bucket uses on conflict, each storage policy is
-- dropped first, and the column grant revokes before re-granting.

-- ── Storage bucket ──────────────────────────────────────────────────────────

-- public = false. Nobody reads these over the public URL; the server creates
-- a signed URL per request after the RLS check.
insert into storage.buckets (id, name, public)
values ('commission-deliveries', 'commission-deliveries', false)
on conflict (id) do nothing;

-- ── Storage policies ────────────────────────────────────────────────────────

-- Staff upload the finished drawing. Same pinned is_staff() check as 0017's
-- artwork policies; reuse the function 0019 created rather than repeating the
-- subquery, for exactly the reason 0018 switched to it.
drop policy if exists "Staff upload delivery images"
  on storage.objects;
create policy "Staff upload delivery images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'commission-deliveries'
    and public.is_staff()
  );

-- Authenticated read, so the server client (which carries the buyer's cookies)
-- can create a signed URL. The bucket is private, so there is no public URL to
-- guess; the path uses crypto.randomUUID(), so it is not guessable either; and
-- the server only asks for the signed URL after the RLS-gated read of the
-- commission row has confirmed the buyer owns it. Three layers, none of which
-- a stranger can satisfy.
drop policy if exists "Authenticated read delivery images"
  on storage.objects;
create policy "Authenticated read delivery images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'commission-deliveries');

-- Staff can delete, so a replacement upload can clear the old image.
drop policy if exists "Staff delete delivery images"
  on storage.objects;
create policy "Staff delete delivery images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'commission-deliveries'
    and public.is_staff()
  );

-- ── Column grant ────────────────────────────────────────────────────────────

-- 0018 revoked UPDATE on the whole table from authenticated, then granted
-- (quote_price, quote_note, status) — and left delivery_image out on purpose,
-- because granting it without the bucket policy would be a promise this file
-- could not keep. The bucket exists now, so the grant arrives here.
--
-- Re-granting all four keeps the set in one statement, which is easier to read
-- in the column_privileges query than two grants with different columns.
revoke update on table public.commissions from authenticated;

grant update (delivery_image, quote_price, quote_note, status)
  on table public.commissions
  to authenticated;

-- Verify after pasting:
--   select column_name from information_schema.column_privileges
--   where table_name = 'commissions'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
--   -- delivery_image, quote_price, quote_note, status — four, not three
--
--   select id, public from storage.buckets where id = 'commission-deliveries';
--   -- commission-deliveries | false
--
--   select policyname, cmd from pg_policies
--   where tablename = 'storage.objects' and qual like '%commission-deliveries%';
--   -- three rows: insert, select, delete
