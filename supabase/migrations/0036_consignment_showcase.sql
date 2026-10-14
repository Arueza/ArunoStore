-- Roadmap 5.8: staff picks where a catalogue item appears.
--
-- Adds `consignment_items.showcase`: 'commission' | 'titipan' | 'keduanya'.
-- Default 'keduanya' so every existing row lands in both catalogues with no
-- backfill. /shop ignores the column (shows all); /shop/commission and
-- /shop/titipan filter on it.
--
-- Safe to paste twice: add column if not exists, drop constraint if exists.
-- RLS unchanged: same read/write policies cover the new column.
--
-- Requires 0012_consignment_catalogue.sql.

alter table public.consignment_items
  add column if not exists showcase text not null default 'keduanya';

alter table public.consignment_items
  drop constraint if exists consignment_items_showcase_check;

alter table public.consignment_items
  add constraint consignment_items_showcase_check
  check (showcase = any (array['commission'::text, 'titipan'::text, 'keduanya'::text]));

-- Verify after pasting:
--   select column_name, column_default
--   from information_schema.columns
--   where table_name = 'consignment_items' and column_name = 'showcase';
--   -- showcase | 'keduanya'::text
