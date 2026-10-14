-- Roadmap 5.9: shop orders for catalogue purchases.
--
-- Two tables:
--   shop_orders       — one row per purchase, tracks payment status
--   shop_order_items  — items in each order, with size and qty
--   product_sizes     — size variants per Fashion item (S/M/L/XL/XXL), stock only
--
-- shop_orders is the consignment_items equivalent of commissions / titipan_requests:
-- a buyer-facing order row that the payment webhook can mark as settled.
-- price is integer rupiah, no decimals.
--
-- Safe to paste twice.

create table if not exists public.product_sizes (
  id uuid not null default gen_random_uuid(),
  item_id uuid not null references public.consignment_items (id) on delete cascade,
  size text not null check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_sizes_pkey primary key (id),
  constraint product_sizes_item_size_key unique (item_id, size)
);

create table if not exists public.shop_orders (
  id uuid not null default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'settled', 'deny', 'expire')),
  total_price integer not null check (total_price >= 0),
  snap_token text,
  transaction_id text,
  payment_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shop_orders_pkey primary key (id)
);

create table if not exists public.shop_order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  item_id uuid not null references public.consignment_items (id) on delete restrict,
  size text,
  quantity integer not null check (quantity > 0),
  price integer not null check (price >= 0),
  created_at timestamptz not null default now(),

  constraint shop_order_items_pkey primary key (id)
);

alter table public.product_sizes enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- product_sizes: staff manage, public read (detail page needs stock visibility)
drop policy if exists "Staff manage product_sizes" on public.product_sizes;
create policy "Staff manage product_sizes"
  on public.product_sizes
  for all
  to public
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff'));

drop policy if exists "Public read product_sizes" on public.product_sizes;
create policy "Public read product_sizes"
  on public.product_sizes
  for select
  to public
  using (true);

-- shop_orders: buyers read and insert own, staff read all
drop policy if exists "Buyers read their own shop_orders" on public.shop_orders;
create policy "Buyers read their own shop_orders"
  on public.shop_orders
  for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "Buyers insert their own shop_orders" on public.shop_orders;
create policy "Buyers insert their own shop_orders"
  on public.shop_orders
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "Staff read every shop_order" on public.shop_orders;
create policy "Staff read every shop_order"
  on public.shop_orders
  for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff'));

-- shop_order_items: buyers read and insert own (via order), staff read all
drop policy if exists "Buyers read their own shop_order_items" on public.shop_order_items;
create policy "Buyers read their own shop_order_items"
  on public.shop_order_items
  for select
  to authenticated
  using (exists (
    select 1 from public.shop_orders o
    where o.id = shop_order_items.order_id and o.buyer_id = auth.uid()
  ));

drop policy if exists "Buyers insert their own shop_order_items" on public.shop_order_items;
create policy "Buyers insert their own shop_order_items"
  on public.shop_order_items
  for insert
  to authenticated
  with check (exists (
    select 1 from public.shop_orders o
    where o.id = shop_order_items.order_id and o.buyer_id = auth.uid()
  ));

drop policy if exists "Staff read every shop_order_item" on public.shop_order_items;
create policy "Staff read every shop_order_item"
  on public.shop_order_items
  for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff'));

-- Verify after pasting:
--   select shopname from pg_tables where schemaname='public' and tablename in ('product_sizes', 'shop_orders', 'shop_order_items');
--   -- 3 rows
