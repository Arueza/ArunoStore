-- Roadmap P1: `email_notifications`, captured from live schema.
--
-- CAPTURED, NOT AUTHORED. This table was created directly in the Supabase
-- dashboard by Alfreza and had no migration file in this repository. Reconstructed
-- from the running database on 2026-10-08.
--
-- Safe to paste twice. Everything that can live inside the statement is inline, so
-- `create table if not exists` skips an existing table whole.

create table if not exists public.email_notifications (
  id uuid not null default gen_random_uuid(),
  recipient_email text not null,
  recipient_type text not null
    check (recipient_type = any (array['admin'::text, 'user'::text])),
  event_type text not null
    check (event_type = any (array['order_baru'::text, 'bukti_bayar_upload'::text, 'order_dibatalkan'::text, 'order_dikonfirmasi'::text])),
  store_type text not null
    check (store_type = any (array['art_commission'::text, 'consignment'::text])),
  order_id uuid not null,
  status text not null default 'pending'::text
    check (status = any (array['pending'::text, 'terkirim'::text, 'gagal'::text])),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now(),

  constraint email_notifications_pkey primary key (id)
);

-- order_id has no foreign key, and none was invented here. One order_id has to
-- mean one table, and there are two order tables, commission_orders and
-- consignment_orders, so store_type decides which one is meant rather than the
-- schema. That is the design as it stands.
--
-- status and sent_at are separate on purpose: a row can be pending with no
-- sent_at, failed with an error_message, and sent with both. Left as found.

alter table public.email_notifications enable row level security;

-- There is a writer after all: notify_commission_order() and
-- notify_consignment_order() in 0015 insert here, from triggers on the two order
-- tables. Nothing in src/ writes to it — the notification path is entirely
-- database-side.

drop policy if exists "Admin lihat log notifikasi" on public.email_notifications;
create policy "Admin lihat log notifikasi"
  on public.email_notifications
  for select
  to public
  using (exists (select 1 from admins where admins.id = auth.uid()));

-- Admin-only read, no insert policy for anyone, and the log holds every recipient
-- address the shop has ever notified. Recorded because it is a list of personal
-- email addresses behind a single staff gate.