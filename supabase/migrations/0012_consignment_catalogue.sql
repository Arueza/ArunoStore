-- Roadmap P1: the consignment catalogue, captured from live schema.
--
-- CAPTURED, NOT AUTHORED. `consignment_categories`, `consignors`,
-- `consignment_items` and `consignment_images` were created directly in the
-- Supabase dashboard by Alfreza and had no migration file in this repository.
-- Reconstructed from the running database on 2026-10-08.
--
-- Safe to paste twice. Everything that can live inside the statement is inline,
-- so `create table if not exists` skips an existing table whole. Each policy is
-- dropped first.
--
-- Requires 0010_identity.sql: consignment_items references public.admins.
-- Paste 0015 last, for the trigger.

create table if not exists public.consignment_categories (
  id uuid not null default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now(),

  constraint consignment_categories_pkey primary key (id)
);

create table if not exists public.consignors (
  id uuid not null default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now(),

  constraint consignors_pkey primary key (id)
);

create table if not exists public.consignment_items (
  id uuid not null default gen_random_uuid(),
  admin_id uuid not null,
  category_id uuid,
  consignor_id uuid,
  name text not null,
  description text,
  price numeric not null,
  stock integer not null default 1,
  condition text not null default 'baru'::text
    check (condition = any (array['baru'::text, 'bekas'::text])),
  status text not null default 'tersedia'::text
    check (status = any (array['tersedia'::text, 'terjual'::text, 'ditarik'::text])),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- admin_id is `not null` while its key says ON DELETE SET NULL. Postgres cannot
  -- satisfy both, so deleting an admin that owns an item fails on a not-null
  -- violation rather than cascading. Recorded as found: making the column
  -- nullable, or the key cascade, is a decision about live rows, not a capture.
  -- category_id and consignor_id are nullable, so set null works for those two.
  constraint consignment_items_admin_id_fkey
    foreign key (admin_id) references public.admins (id) on delete set null,
  constraint consignment_items_category_id_fkey
    foreign key (category_id) references public.consignment_categories (id) on delete set null,
  constraint consignment_items_consignor_id_fkey
    foreign key (consignor_id) references public.consignors (id) on delete set null,
  constraint consignment_items_pkey primary key (id)
);

-- `price` is numeric, like commission_orders.total_price. Recorded, not changed.
--
-- `stock` has no check for being non-negative, and handle_consignment_order_
-- confirmed() in 0015 decrements it. Negative stock is therefore reachable.

create table if not exists public.consignment_images (
  id uuid not null default gen_random_uuid(),
  item_id uuid not null,
  image_url text not null,
  is_thumbnail boolean default false,
  created_at timestamptz default now(),

  -- The dashboard's schema export shows this column with no foreign key. It has
  -- one. Capture from pg_constraint, never from the export.
  constraint consignment_images_item_id_fkey
    foreign key (item_id) references public.consignment_items (id) on delete cascade,
  constraint consignment_images_pkey primary key (id)
);

alter table public.consignment_categories enable row level security;
alter table public.consignment_items enable row level security;
alter table public.consignment_images enable row level security;
alter table public.consignors enable row level security;

-- Every "Admin kelola" policy resolves admin-ness by reading public.admins, and
-- that read is subject to RLS limited to the caller's own row. It works because
-- admins' own select policy permits exactly that row. Tighten that one policy and
-- all thirteen admin policies fail together, silently. See 0011.

drop policy if exists "Admin kelola consignment_categories" on public.consignment_categories;
create policy "Admin kelola consignment_categories"
  on public.consignment_categories
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "Public baca consignment_categories" on public.consignment_categories;
create policy "Public baca consignment_categories"
  on public.consignment_categories
  for select
  to public
  using (true);

drop policy if exists "Admin kelola consignors" on public.consignors;
create policy "Admin kelola consignors"
  on public.consignors
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

-- consignors is the one table here with no read policy for anyone but admins.
-- Addresses and phone numbers stay inside the staff side, which is the sensible
-- shape. Recorded because it is the only one.

drop policy if exists "Admin kelola consignment_items" on public.consignment_items;
create policy "Admin kelola consignment_items"
  on public.consignment_items
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

-- using (true): anon sees every item at every status, price included, with no
-- availability filter. There is no `active` column on this table to filter on,
-- unlike services. Recorded, because "public" here has no notion of sellable.

drop policy if exists "Public baca consignment_items" on public.consignment_items;
create policy "Public baca consignment_items"
  on public.consignment_items
  for select
  to public
  using (true);

-- The two policies below are dropped by looking names up in pg_policy rather than
-- by matching a literal, because these two were originally created misspelled with
-- `imaget_images`. A `drop policy if exists "… images"` matched nothing, the create
-- then added a second policy beside the typo, and the table ended up with four
-- instead of two. No access changed — the pairs were byte-identical in qual and
-- with_check — but it broke the paste-twice rule this file depends on.
--
-- 0016 repairs the live database. This is what stops it happening again, and it
-- works whatever the name happens to be. Scoped to the two prefixes that were
-- misspelled; every other policy here uses a plain `drop ... if exists`.

do $$
declare
  stale text;
begin
  for stale in
    select polname
      from pg_policy
     where polrelid = 'public.consignment_images'::regclass
       and (polname like 'Admin kelola consignment image%'
         or polname like 'Public baca consignment image%')
  loop
    execute format('drop policy if exists %I on public.consignment_images', stale);
  end loop;
end $$;

create policy "Admin kelola consignment images"
  on public.consignment_images
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

create policy "Public baca consignment images"
  on public.consignment_images
  for select
  to public
  using (true);

-- One trigger on this group: trg_consignment_items_updated_at, before update,
-- calling update_updated_at(). Defined in 0015.