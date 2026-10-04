create type public.user_role as enum (
  'buyer',
  'artist',
  'staff'
);

create type public.request_status as enum (
  'requested',
  'quoted'
);