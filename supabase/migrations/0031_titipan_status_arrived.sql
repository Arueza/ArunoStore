-- Roadmap 3.12: buyer marks a shipped parcel as arrived.
--
-- The buyer update policy from 0028 already covers this write. The column
-- grant from 0022 already covers status. Only the enum value is new.
--
-- Safe to paste twice: add value if not exists.

alter type public.request_status
  add value if not exists 'arrived';

-- Verify after pasting:
--   select enumlabel from pg_enum
--   where enumtypid = (select oid from pg_type where typname = 'request_status');
--   -- requested, quoted, accepted, declined, purchased, shipped, arrived
