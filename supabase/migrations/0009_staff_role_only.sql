-- Roadmap 1.15: two roles, buyer and staff.
--
-- Artist is not a role. Verrel and Alfreza are the sole sellers and are both
-- staff; what they sell differs, not what they can reach.
--
-- Three statements and the order is forced: the check constraint rejects an
-- 'artist' row, so the update has to empty them before it can be added.
--
-- Safe to run twice. The drop-if-exists on the constraint means a re-run is a
-- no-op rather than a duplicate-name error, which matters because migrations
-- here are pasted by hand and nothing tracks what has been applied.
--
-- signup never sends a role: src/app/auth/sign-up/actions.ts hardcodes
-- 'buyer', so this constraint is the only thing standing between a bad write
-- and a three-value column.

update public.profiles set role = 'staff' where role = 'artist';

-- Dead since 0002. profiles.role is text, so nothing reads or writes this type.
drop type if exists public.user_role;

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('buyer', 'staff'));