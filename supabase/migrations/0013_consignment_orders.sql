-- Roadmap P1: consignment orders, captured from live schema.
--
-- CAPTURED, NOT AUTHORED. `consignment_orders` and `consignment_order_items`
-- were created directly in the Supabase dashboard by Alfreza and had no migration
-- file in this repository. Reconstructed from the running database on
-- 2026-10-08.
--
-- Safe to paste twice. Everything that can live inside the statement is inline,
-- so `create table if not exists` skips an existing table whole. Each policy is
-- dropped first.
--
-- Requires 0010_identity.sql: consignment_orders references public.users.
-- Paste 0015 last, for the four triggers.

create table if not exists public.consignment_orders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  shipping_address text not null,
  shipping_service text not null,
  shipping_tracking text,
  shipping_cost numeric not null default 0,
  subtotal numeric not null,
  total_price numeric not null,
  payment_method text not null
    check (payment_method = any (array['transfer'::text, 'qris'::text])),
  payment_proof_url text,
  payment_status text not null default 'menunggu_pembayaran'::text
    check (payment_status = any (array['menunggu_pembayaran'::text, 'pembayaran_diterima'::text, 'pembayaran_ditolak'::text])),
  notes text,
  order_status text not null default 'pending'::text
    check (order_status = any (array['pending'::text, 'dikonfirmasi'::text, 'dikemas'::text, 'dikirim'::text, 'selesai'::text, 'dibatalkan'::text])),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint consignment_orders_pkey primary key (id),
  constraint consignment_orders_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade
);

-- Every money column here is numeric: shipping_cost, subtotal, total_price.
-- Recorded as found. Note that shipping_cost defaults to 0 while subtotal and
-- total_price are not null with no default, so the three are not symmetric.

-- The line items below store price_at_order, so a purchase keeps the price it was
-- made at and editing consignment_items.price does not rewrite history. That is
-- the one thing in this capture worth keeping.

create table if not exists public.consignment_order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  item_id uuid not null,
  quantity integer not null default 1,
  price_at_order numeric not null,
  created_at timestamptz default now(),

  -- Both foreign keys are absent from the dashboard's schema export. Two different
  -- actions: an order's lines go with the order, but an item is referenced by
  -- price history and so cannot be deleted out from under one.
  constraint consignment_order_items_order_id_fkey
    foreign key (order_id) references public.consignment_orders (id) on delete cascade,
  constraint consignment_order_items_item_id_fkey
    foreign key (item_id) references public.consignment_items (id) on delete restrict,
  constraint consignment_order_items_pkey primary key (id)
);

-- quantity has not null default 1 but no check (quantity > 0), unlike
-- titipan_requests.quantity from 0006 which has one. A line item can therefore
-- carry zero or a negative number. Recorded; adding the check is a decision.

alter table public.consignment_orders enable row level security;
alter table public.consignment_order_items enable row level security;

-- Every "Admin kelola" policy resolves admin-ness through public.admins under RLS.
-- See the note in 0011 before changing anything there.

drop policy if exists "Admin kelola consignment orders" on public.consignment_orders;
create policy "Admin kelola consignment orders"
  on public.consignment_orders
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "User buat consignment order" on public.consignment_orders;
create policy "User buat consignment order"
  on public.consignment_orders
  for insert
  to public
  with check (auth.uid() = user_id);

drop policy if exists "User lihat consignment order sendiri" on public.consignment_orders;
create policy "User lihat consignment order sendiri"
  on public.consignment_orders
  for select
  to public
  using (auth.uid() = user_id);

drop policy if exists "Admin kelola consignment order items" on public.consignment_order_items;
create policy "Admin kelola consignment order items"
  on public.consignment_order_items
  for all
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "User lihat item order sendiri" on public.consignment_order_items;
create policy "User lihat item order sendiri"
  on public.consignment_order_items
  for select
  to public
  using (
    exists (
      select 1 from consignment_orders
      where consignment_orders.id = consignment_order_items.order_id
        and consignment_orders.user_id = auth.uid()
    )
  );

drop policy if exists "User tambah item order sendiri" on public.consignment_order_items;
create policy "User tambah item order sendiri"
  on public.consignment_order_items
  for insert
  to public
  with check (
    exists (
      select 1 from consignment_orders
      where consignment_orders.id = consignment_order_items.order_id
        and consignment_orders.user_id = auth.uid()
    )
  );

-- Four triggers on this group, and unlike the commission side all four work.
-- Defined in 0015.