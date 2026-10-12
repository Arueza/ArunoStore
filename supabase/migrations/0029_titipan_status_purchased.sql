-- Roadmap 3.10: staff mark an accepted titipan request as purchased.
--
-- The staff update policy from 0022 already covers this write — staff can
-- update any row. The column grant from 0022 already covers status. Only the
-- enum value is new.
--
-- Safe to paste twice: add value if not exists.

alter type public.request_status
  add value if not exists 'purchased';

-- Verify after pasting:
--   select enumlabel from pg_enum
--   where enumtypid = (select oid from pg_type where typname = 'request_status');
--   -- requested, quoted, accepted, declined, purchased
