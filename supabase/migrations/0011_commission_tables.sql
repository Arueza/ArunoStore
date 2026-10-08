-- Roadmap P1: the four commission tables, captured from live schema.
--
-- CAPTURED, NOT AUTHORED. `commission_categories`, `commission_images`,
-- `commission_orders` and `commission_order_references` were created directly in
-- the Supabase dashboard by Alfreza and had no migration file in this repository.
-- Reconstructed from the running database on 2026-10-08.
--
-- Captured means a constraint records what exists, not what someone decided.
--
-- Safe to paste twice. Everything that can live inside the statement — primary
-- key, unique, check, foreign key — is inline, so `create table if not exists`
-- skips an existing table whole. Each policy is dropped first.
--
-- Requires 0010_identity.sql: commission_orders references public.users.
-- Paste 0015 last, for the triggers.

create table if not exists public.commission_categories (
  id uuid not null default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now(),

  constraint commission_categories_pkey primary key (id)
);

create table if not exists public.commission_images (
  id uuid not null default gen_random_uuid(),

  -- No foreign key on commission_id, and none was invented here. An image can
  -- name a commission that does not exist.
  commission_id uuid not null,
  image_url text not null,
  is_thumbnail boolean default false,
  created_at timestamptz default now(),

  constraint commission_images_pkey primary key (id)
);

create table if not exists public.commission_orders (
  id uuid not null default gen_random_uuid(),

  -- user_id is enforced. commission_id is not, and that asymmetry is real.
  user_id uuid not null,
  commission_id uuid not null,
  orderer_name text not null,
  request_description text not null,
  notes text,
  deadline date,
  total_price numeric not null,
  payment_method text not null
    check (payment_method = any (array['transfer'::text, 'qris'::text])),
  payment_proof_url text,
  payment_status text not null default 'menunggu_pembayaran'::text
    check (payment_status = any (array['menunggu_pembayaran'::text, 'pembayaran_diterima'::text, 'pembayaran_ditolak'::text])),
  order_status text not null default 'pending'::text
    check (order_status = any (array['pending'::text, 'dikonfirmasi'::text, 'proses'::text, 'revisi'::text, 'selesai'::text, 'dibatalkan'::text])),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint commission_orders_pkey primary key (id),
  constraint commission_orders_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade
);

-- `total_price` is numeric, not integer. AGENTS.md says money is whole rupiah and
-- that decimals cause rounding bugs, so anything reading this column converts
-- rather than assigns. Recorded as found — changing the column would rewrite live
-- money, and the whole-rupiah rule governs what this repository writes.

create table if not exists public.commission_order_references (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  image_url text not null,
  created_at timestamptz default now(),

  -- The dashboard's schema export shows this column with no foreign key. It has
  -- one. Capture from pg_constraint, never from the export.
  constraint commission_order_references_order_id_fkey
    foreign key (order_id) references public.commission_orders (id) on delete cascade,
  constraint commission_order_references_pkey primary key (id)
);

alter table public.commission_categories enable row level security;
alter table public.commission_images enable row level security;
alter table public.commission_orders enable row level security;
alter table public.commission_order_references enable row level security;

-- Every "Admin kelola" policy in this capture, and in 0011 to 0014, resolves
-- admin-ness by reading public.admins. That read is itself subject to RLS, and
-- admins' only select policy covers one row: their own. So it works, and it is
-- fail-closed — one row, and only when it is their own.
--
-- That also makes it fragile. Tighten or drop "Admin baca data sendiri" on
-- admins and every one of the thirteen admin policies below returns false at
-- once: no error anywhere, just empty tables everywhere. Same failure class as
-- 0003, and invisible from any single policy.

drop policy if exists "Admin kelola commission_categories" on public.commission_categories;
create policy "Admin kelola commission_categories"
  on public.commission_categories
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "Public baca commission_categories" on public.commission_categories;
create policy "Public baca commission_categories"
  on public.commission_categories
  for select
  to public
  using (true);

-- All policies are PERMISSIVE, so they OR together. The public policy above
-- allows every row to everyone, which makes the admin policy redundant for select
-- and unable to restrict anything. Worth knowing before adding a restrictive
-- policy here and expecting it to hold.

drop policy if exists "Admin kelola commission_images" on public.commission_images;
create policy "Admin kelola commission_images"
  on public.commission_images
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "Public baca commission_images" on public.commission_images;
create policy "Public baca commission_images"
  on public.commission_images
  for select
  to public
  using (true);

drop policy if exists "Admin kelola commission orders" on public.commission_orders;
create policy "Admin kelola commission orders"
  on public.commission_orders
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "User buat commission order" on public.commission_orders;
create policy "User buat commission order"
  on public.commission_orders
  for insert
  to public
  with check (auth.uid() = user_id);

drop policy if exists "User lihat commission order sendiri" on public.commission_orders;
create policy "User lihat commission order sendiri"
  on public.commission_orders
  for select
  to public
  using (auth.uid() = user_id);

drop policy if exists "Admin kelola commission references" on public.commission_order_references;
create policy "Admin kelola commission references"
  on public.commission_order_references
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

-- The subquery reads commission_orders, whose own RLS lets this caller see only
-- their orders, so it stays fail-closed rather than reading every order.

drop policy if exists "User lihat referensi order sendiri" on public.commission_order_references;
create policy "User lihat referensi order sendiri"
  on public.commission_order_references
  for select
  to public
  using (
    exists (
      select 1 from commission_orders
      where commission_orders.id = commission_order_references.order_id
        and commission_orders.user_id = auth.uid()
    )
  );

drop policy if exists "User upload referensi order sendiri" on public.commission_order_references;
create policy "User upload referensi order sendiri"
  on public.commission_order_references
  for insert
  to public
  with check (
    exists (
      select 1 from commission_orders
      where commission_orders.id = commission_order_references.order_id
        and commission_orders.user_id = auth.uid()
    )
  );

-- commission_orders has four triggers, including two that cannot currently run.
-- Both are defined in 0015 and described there. `updated_at` does move, via
-- trg_commission_orders_updated_at.