-- Staff product image uploads for the shop catalogue.
--
-- Public bucket so /shop can render without a signed URL; RLS on the bucket
-- lets only staff write. The storage policies mirror 0017's artwork policies:
-- a subquery pinned to `p.id = auth.uid()`, because a bare `where role='staff'`
-- reads every profile and 0003 denies that.
--
-- Safe to paste twice. The bucket uses on conflict, each policy is dropped
-- first, and the check constraint is dropped before being re-added.

insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read shop images" on storage.objects;
create policy "Public read shop images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'shop-images');

drop policy if exists "Staff upload shop images" on storage.objects;
create policy "Staff upload shop images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shop-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

drop policy if exists "Staff delete shop images" on storage.objects;
create policy "Staff delete shop images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'shop-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );

-- Non-negative stock. 0012 has no check and handle_consignment_order_confirmed()
-- can decrement past zero.
alter table public.consignment_items
  drop constraint if exists consignment_items_stock_check;
alter table public.consignment_items
  add constraint consignment_items_stock_check check (stock >= 0);
