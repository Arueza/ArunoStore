alter table public.consignment_items drop constraint consignment_items_admin_id_fkey;
alter table public.consignment_items add constraint consignment_items_admin_id_fkey
  foreign key (admin_id) references public.profiles(id) on delete restrict;

drop policy if exists "Admin kelola commission_categories" on public.commission_categories;
create policy "Staff manage commission_categories"
  on public.commission_categories
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola commission_images" on public.commission_images;
create policy "Staff manage commission_images"
  on public.commission_images
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola commission orders" on public.commission_orders;
create policy "Staff manage commission orders"
  on public.commission_orders
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola commission references" on public.commission_order_references;
create policy "Staff manage commission references"
  on public.commission_order_references
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignment_categories" on public.consignment_categories;
create policy "Staff manage consignment_categories"
  on public.consignment_categories
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignors" on public.consignors;
create policy "Staff manage consignors"
  on public.consignors
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignment_items" on public.consignment_items;
create policy "Staff manage consignment_items"
  on public.consignment_items
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignment images" on public.consignment_images;
create policy "Staff manage consignment images"
  on public.consignment_images
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignment orders" on public.consignment_orders;
create policy "Staff manage consignment orders"
  on public.consignment_orders
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin kelola consignment order items" on public.consignment_order_items;
create policy "Staff manage consignment order items"
  on public.consignment_order_items
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Admin lihat log notifikasi" on public.email_notifications;
create policy "Staff read email_notifications"
  on public.email_notifications
  for select to authenticated
  using (public.is_staff());

create or replace function public.notify_commission_order()
returns trigger
language plpgsql
security definer
as $$
DECLARE
  admin_email TEXT;
  user_email TEXT;
BEGIN
  SELECT email INTO admin_email
  FROM public.profiles
  WHERE role = 'staff'
  LIMIT 1;

  SELECT email INTO user_email
  FROM public.users
  WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_baru', 'art_commission', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.payment_proof_url IS NOT NULL
     AND OLD.payment_proof_url IS NULL THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'bukti_bayar_upload', 'art_commission', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.order_status = 'dibatalkan'
     AND OLD.order_status != 'dibatalkan' THEN
    INSERT INTO public.email_notifications
      (recipient_email, recipient_type, event_type, store_type, order_id)
    VALUES
      (admin_email, 'admin', 'order_dibatalkan', 'art_commission', NEW.id);
  END IF;

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
  FROM public.profiles
  WHERE role = 'staff'
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

insert into public.consignment_items (admin_id, category_id, name, description, price, stock, condition, status)
values
  ((select id from public.profiles where role = 'staff' limit 1),
   (select id from public.consignment_categories where name = 'Figures'),
   'Figma Jinx (Arcane)', 'Good Smile Company Figma #550. Some box wear.', 850000, 1, 'bekas', 'tersedia'),
  ((select id from public.profiles where role = 'staff' limit 1),
   (select id from public.consignment_categories where name = 'Plushies'),
   'Genshin Impact Diluc Plush', 'SEGA PM plush, approx 20cm. Like new.', 350000, 2, 'baru', 'tersedia');
