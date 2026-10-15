-- Roadmap 5.3: buyer leaves a rating after delivery.
--
-- Two columns on each order table, same shape:
--
--   rating         integer 1-5, check (rating is null or rating between 1 and 5)
--   rating_note    text, nullable
--
-- Both nullable: a buyer is not forced to rate. A rating without a note is
-- allowed; a note without a rating is not — the UI only shows the note field
-- once a star is picked.
--
-- The buyer update policies from 0020/0028 already cover the row-level check
-- (buyer_id = auth.uid()). What is missing is the column grant: 0018 revoked
-- UPDATE on the whole table, then re-granted (quote_price, quote_note, status)
-- on commissions, and 0022/0021/0030 re-granted (quote_item_price, quote_shipping,
-- quote_service_fee, quote_note, status) + (courier, tracking_number) on titipan_requests.
-- Neither set includes rating or rating_note, so this migration adds them.
--
-- No pin trigger: staff are trusted to write these columns (they already can
-- write courier, tracking_number, delivery_image). The rating is buyer-owned,
-- not shop-owned, so there is nothing to guard against a buyer forging.
--
-- Safe to paste twice: add column if not exists, grant is idempotent.

alter table public.commissions
  add column if not exists rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  add column if not exists rating_note text;

alter table public.titipan_requests
  add column if not exists rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  add column if not exists rating_note text;

-- Extend the existing column grants to include the two new columns.
-- The revoke-then-grant pattern is the same as 0018/0021/0022/0030: take back
-- UPDATE on the whole table, then grant exactly what authenticated may write.
-- Re-granting all columns in one statement is idempotent and readable.
revoke update on table public.commissions from authenticated;

grant update (delivery_image, quote_price, quote_note, status, rating, rating_note)
  on table public.commissions
  to authenticated;

revoke update on table public.titipan_requests from authenticated;

grant update (quote_item_price, quote_shipping, quote_service_fee, quote_note, status, courier, tracking_number, rating, rating_note)
  on table public.titipan_requests
  to authenticated;

-- Verify after pasting:
--   select column_name from information_schema.column_privileges
--   where table_name = 'commissions'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by 1;
--   -- delivery_image, quote_price, quote_note, rating, rating_note, status
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'titipan_requests'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by 1;
--   -- courier, quote_item_price, quote_service_fee, quote_note,
--   --   quote_shipping, rating, rating_note, status, tracking_number
--
--   select column_name from information_schema.columns
--   where table_name = 'commissions' and column_name in ('rating', 'rating_note');
--   -- rating, rating_note
