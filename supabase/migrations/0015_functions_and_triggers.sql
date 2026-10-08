-- Roadmap P1: the trigger functions, the triggers, and the RLS event trigger.
--
-- CAPTURED, NOT AUTHORED. Every function below was created directly in the Supabase
-- dashboard by Alfreza and had no migration file in this repository. Reconstructed
-- from the running database on 2026-10-08.
--
-- TWO OF THESE FUNCTIONS DO NOT RUN. Captured unchanged, because the alternative is
-- inventing behaviour, and the breakage is now written down where it will be seen:
--
-- 1. handle_commission_order_confirmed() updates public.commissions, setting
--    used_slots and comparing against max_slots. Our commissions table from 0005
--    has neither column. It then sets status = 'closed', which is not a member of
--    the request_status enum — that holds only requested and quoted. This is an
--    AFTER UPDATE trigger, so the exception rolls back the statement: confirming a
--    commission order fails outright. It was written against a slot-capacity
--    commissions table that does not exist in this project. Fixing it means
--    deciding the 2.3 overlap question first.
--
-- 2. notify_commission_order() takes its recipient from
--    `select email from admins where store_role = 'art_commission' limit 1`. The
--    store_role column defaults to 'consignment', so unless an admin has been set
--    to art_commission by hand, admin_email is null. recipient_email is not null,
--    so the insert raises and takes the commission_orders insert down with it.
--
-- The consignment equivalents are sound — every column they touch exists.
--
-- Safe to paste twice. `create or replace function` is inherently re-runnable.
-- `create trigger` and `create event trigger` are not, and Postgres has no
-- `if not exists` for either, so each is preceded by a `drop ... if exists`.
-- Paste each drop/create pair as a single statement: a batch paste that aborts
-- part way leaves `pg_trigger` in a state nobody expects.
--
-- Paste this LAST. Every trigger below calls a function defined here, and a
-- trigger cannot be created before its function exists. The tables come from
-- 0010 to 0014.

-- ----------------------------------------------------------------------------
-- Functions
-- ----------------------------------------------------------------------------

-- The only function in the project that sets search_path, and the only one of the
-- six that is not security definer. The other five are, and all of them qualify
-- every name they touch, so there is nothing to hijack today. Supabase's advisor
-- will flag the inconsistency later.

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

create or replace function public.handle_commission_order_confirmed()
returns trigger
language plpgsql
security definer
as $$
BEGIN
  IF NEW.order_status = 'dikonfirmasi' AND OLD.order_status = 'pending' THEN
    UPDATE public.commissions
    SET used_slots = used_slots + 1
    WHERE id = NEW.commission_id;

    -- Tutup commission jika slot penuh
    UPDATE public.commissions
    SET status = 'closed'
    WHERE id = NEW.commission_id AND used_slots >= max_slots;
  END IF;
  RETURN NEW;
END;
$$;

-- The used_slots and max_slots columns above do not exist, and 'closed' is not in
-- request_status. See the header. Creating this function still succeeds: plpgsql
-- does not resolve table columns at create time, which is why it exists today and
-- why it fails only when a trigger fires.

create or replace function public.handle_consignment_order_confirmed()
returns trigger
language plpgsql
security definer
as $$
BEGIN
  IF NEW.order_status = 'dikonfirmasi' AND OLD.order_status = 'pending' THEN
    -- Kurangi stok tiap item dalam order
    UPDATE public.consignment_items ci
    SET stock = ci.stock - coi.quantity
    FROM public.consignment_order_items coi
    WHERE coi.order_id = NEW.id AND coi.item_id = ci.id;

    -- Update status jadi "terjual" jika stok habis
    UPDATE public.consignment_items
    SET status = 'terjual'
    WHERE id IN (
      SELECT item_id FROM public.consignment_order_items WHERE order_id = NEW.id
    ) AND stock <= 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Sound as written. Two things recorded: stock has no non-negative check, so this
-- decrement can go below zero; and status only ever moves to 'terjual', never back
-- to 'tersedia', so a restocked item stays marked sold.

-- SECURITY DEFINER, and that is what lets it read every admins row regardless of
-- the RLS policies on admins. Intended here — it needs the admin's address, not
-- the caller's own row.
--
-- The four event guards are sequential rather than exclusive, so an update that
-- both uploads a proof and cancels inserts two rows. Recorded as found.
--
-- OLD is null on an insert, but every OLD reference sits behind a `TG_OP = 'UPDATE'`
-- test and plpgsql short-circuits, so it is never touched. That is correct already;
-- noted so nobody "fixes" it into a real bug.

create or replace function public.notify_commission_order()
returns trigger
language plpgsql
security definer
as $$
DECLARE
  admin_email TEXT;
  user_email TEXT;
BEGIN
  -- Ambil email admin art_commission
  SELECT email INTO admin_email
  FROM public.admins
  WHERE store_role = 'art_commission'
  LIMIT 1;

  -- Ambil email user yang order
  SELECT email INTO user_email
  FROM public.users
  WHERE id = NEW.user_id;

  -- Event: order baru
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_baru', 'art_commission', NEW.id);
  END IF;

  -- Event: bukti bayar diupload
  IF TG_OP = 'UPDATE' AND NEW.payment_proof_url IS NOT NULL
     AND OLD.payment_proof_url IS NULL THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'bukti_bayar_upload', 'art_commission', NEW.id);
  END IF;

  -- Event: order dibatalkan
  IF TG_OP = 'UPDATE' AND NEW.order_status = 'dibatalkan'
     AND OLD.order_status != 'dibatalkan' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_dibatalkan', 'art_commission', NEW.id);
  END IF;

  -- Event: admin konfirmasi -> kirim email ke user
  IF TG_OP = 'UPDATE' AND NEW.order_status = 'dikonfirmasi'
     AND OLD.order_status != 'dikonfirmasi' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (user_email, 'user', 'order_dikonfirmasi', 'art_commission', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

create or replace function public.notify_consignment_order()
returns trigger
language plpgsql
security definer
as $$
DECLARE
  admin_email TEXT;
  user_email TEXT;
BEGIN
  SELECT email INTO admin_email
  FROM public.admins
  WHERE store_role = 'consignment'
  LIMIT 1;

  SELECT email INTO user_email
  FROM public.users
  WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_baru', 'consignment', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.payment_proof_url IS NOT NULL
     AND OLD.payment_proof_url IS NULL THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'bukti_bayar_upload', 'consignment', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.order_status = 'dibatalkan'
     AND OLD.order_status != 'dibatalkan' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_dibatalkan', 'consignment', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.order_status = 'dikonfirmasi'
     AND OLD.order_status != 'dikonfirmasi' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (user_email, 'user', 'order_dikonfirmasi', 'consignment', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- notify_consignment_order() picks the consignment admin rather than art_commission,
-- and store_role defaults to 'consignment', so the first admin created is found. The
-- commission function has no such luck. See the header.

-- The reason all seventeen tables have RLS on. Any CREATE TABLE in public gets
-- enable row level security applied automatically, which is a safety net nothing
-- else in this repository provides — 0004, 0005 and 0006 each enable it by hand as
-- well. Lose this and a future migration that forgets becomes world-readable.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- The event trigger
-- ----------------------------------------------------------------------------
--
-- An event trigger is created by CREATE EVENT TRIGGER, which is why the query
-- against pg_trigger that found the eleven triggers below returned nothing for
-- this one: event triggers live in pg_event_trigger instead.
--
-- Only ensure_rls is captured. The other six in the project — pgrst_ddl_watch,
-- pgrst_drop_watch, issue_pg_net_access, issue_pg_cron_access,
-- issue_pg_graphql_access and issue_graphql_placeholder — belong to the Supabase
-- platform. Writing them into a project migration would recreate platform
-- machinery we do not own, which is where breakage comes from.

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
--
-- Eleven of them: five keeping updated_at honest, four on the order tables for
-- confirmation and notification, and the two commission triggers that cannot run.

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();

drop trigger if exists trg_admins_updated_at on public.admins;
create trigger trg_admins_updated_at
  before update on public.admins
  for each row execute function public.update_updated_at();

drop trigger if exists trg_commission_orders_updated_at on public.commission_orders;
create trigger trg_commission_orders_updated_at
  before update on public.commission_orders
  for each row execute function public.update_updated_at();

drop trigger if exists trg_consignment_items_updated_at on public.consignment_items;
create trigger trg_consignment_items_updated_at
  before update on public.consignment_items
  for each row execute function public.update_updated_at();

drop trigger if exists trg_consignment_orders_updated_at on public.consignment_orders;
create trigger trg_consignment_orders_updated_at
  before update on public.consignment_orders
  for each row execute function public.update_updated_at();

-- The four that work. An update can fire two of them at once — uploading a
-- payment proof on a row that is also being cancelled runs both the proof event
-- and the cancellation event.

drop trigger if exists trg_notify_consignment_order_insert on public.consignment_orders;
create trigger trg_notify_consignment_order_insert
  after insert on public.consignment_orders
  for each row execute function public.notify_consignment_order();

drop trigger if exists trg_notify_consignment_order_update on public.consignment_orders;
create trigger trg_notify_consignment_order_update
  after update on public.consignment_orders
  for each row execute function public.notify_consignment_order();

drop trigger if exists trg_consignment_order_confirmed on public.consignment_orders;
create trigger trg_consignment_order_confirmed
  after update on public.consignment_orders
  for each row execute function public.handle_consignment_order_confirmed();

-- The two that cannot run. Both are defined above and both are described in the
-- header. Captured so the breakage is on record; do not paste these expecting the
-- commission order flow to work.

drop trigger if exists trg_notify_commission_order_insert on public.commission_orders;
create trigger trg_notify_commission_order_insert
  after insert on public.commission_orders
  for each row execute function public.notify_commission_order();

drop trigger if exists trg_notify_commission_order_update on public.commission_orders;
create trigger trg_notify_commission_order_update
  after update on public.commission_orders
  for each row execute function public.notify_commission_order();

drop trigger if exists trg_commission_order_confirmed on public.commission_orders;
create trigger trg_commission_order_confirmed
  after update on public.commission_orders
  for each row execute function public.handle_commission_order_confirmed();

-- ----------------------------------------------------------------------------
-- What this file does not capture
-- ----------------------------------------------------------------------------
--
-- handle_new_user() and its trigger on auth.users live in
-- 20261004150000_create_profile_on_signup.sql and are deliberately not repeated
-- here. One definition each: a second copy would drift the day either is edited.
--
-- No indexes. Every index in the project is a primary key or a unique constraint,
-- which the create table statements already produce. There is no index on any
-- foreign key, on any status column, or on any created_at — including ours in
-- 0005 and 0006. A staff queue or a buyer's order list is a sequential scan
-- until one is added.
--
-- handle_new_user() is security definer with `set search_path to 'public'`, and
-- rls_auto_enable() has `set search_path to 'pg_catalog'`. The five order
-- functions have neither.