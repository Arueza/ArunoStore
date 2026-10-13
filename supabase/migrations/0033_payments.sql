-- Roadmap 4.3: payments table for both halves (commissions and titipan).
--
-- One table serves both: exactly one of commission_id / titipan_request_id is set,
-- enforced by a check constraint. All writes go through the service-role key, so no
-- write policies for authenticated. Buyers read own, staff read all via is_staff().
--
-- Safe to paste twice.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  commission_id uuid references public.commissions (id) on delete restrict,
  titipan_request_id uuid references public.titipan_requests (id) on delete restrict,
  amount integer not null check (amount >= 0),
  order_id text not null unique,
  snap_token text not null,
  transaction_id text,
  payment_type text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint payments_exactly_one_order check (
    (commission_id is not null and titipan_request_id is null)
    or (commission_id is null and titipan_request_id is not null)
  )
);

alter table public.payments enable row level security;

drop policy if exists "Buyers read their own payments"
  on public.payments;
create policy "Buyers read their own payments"
  on public.payments
  for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "Staff read every payment"
  on public.payments;
create policy "Staff read every payment"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'payments';
--   -- two rows: both select
