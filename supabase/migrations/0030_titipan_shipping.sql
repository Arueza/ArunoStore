-- Roadmap 3.11: staff add courier and tracking number; status becomes shipped.
--
-- Two things this migration adds:
--
--   1. The enum value. 'shipped' is new; alter type cannot run inside a
--      transaction, so it stands alone.
--
--   2. The column grant. 0022 deliberately left courier and tracking_number
--      out of the grant — "courier and tracking_number are absent on purpose.
--      They belong to task 3.11, and granting them here would be a promise
--      this file cannot keep — the same rule 0018 followed with delivery_image."
--      This file is that promise kept.
--
-- The staff update policy from 0022 already covers the row-level check, so no
-- new policy is needed here.
--
-- Safe to paste twice: add value if not exists on the enum, grant is idempotent.

alter type public.request_status
  add value if not exists 'shipped';

grant update (courier, tracking_number)
  on table public.titipan_requests
  to authenticated;

-- Verify after pasting:
--   select enumlabel from pg_enum
--   where enumtypid = (select oid from pg_type where typname = 'request_status');
--   -- requested, quoted, accepted, declined, purchased, shipped
--
--   select column_name from information_schema.column_privileges
--   where table_name = 'titipan_requests'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by 1;
--   -- courier, quote_item_price, quote_service_fee, quote_note,
--   --   quote_shipping, status, tracking_number
