-- Roadmap 5.27: seed the commission merch catalogue.
--
-- 18 prints × two sizes (A4 Rp25.000 / A5 Rp20.000, stock 10 each) plus
-- 2 standees (Rp100.000, stock 5 each): 38 items, all `baru` / `tersedia` /
-- `showcase = 'commission'`. Sizes are separate rows because `product_sizes`
-- carries one shared price (fashion S–XXL) and cannot express per-size
-- pricing. Paper and finish live in `description`; money stays whole rupiah.
--
-- Two steps, in order. SQL cannot upload bytes, so first upload the 20 files
-- from `assets/forCommissions/` to the public `shop-images` bucket via the
-- Storage dashboard under the keys below (`seed/<slug>.png` — the working
-- filenames carry spaces and parens, hostile to URLs). Then paste this file.
--
-- Paste twice safe: categories use on conflict, items and images are guarded
-- by NOT EXISTS on name, and no existing row is ever deleted (unlike 0027).
-- Requires a staff row in public.profiles for admin_id.
--
-- Verify after pasting:
--   select count(*) from public.consignment_items
--    where showcase = 'commission' and status = 'tersedia';
--   -- 38
--   select count(*) from public.consignment_images i
--     join public.consignment_items c on c.id = i.item_id
--    where c.showcase = 'commission';
--   -- 38

insert into public.consignment_categories (name) values
  ('Print'),
  ('Standee')
on conflict (name) do nothing;

with v(name, description, price, stock, cat) as (
  values
    ('Maserati x Shiori — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Blue Wife — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Bronyers Railstar — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Executor, My Beloved — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Go White Girl Go — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina Comfy — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina, Please Be My Girlfriend — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina Swimsuit — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina Study — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina Thing — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Ina Vroom — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Jane Doe — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Kowakute Kawaii — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Leon Kennedy — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Inanis — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Shiori — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Shiori Vroom — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Teto Car — Print A4', 'Art print A4, kertas 260 gsm AC, laminasi doff.', 25000, 10, 'Print'),
    ('Maserati x Shiori — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Blue Wife — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Bronyers Railstar — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Executor, My Beloved — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Go White Girl Go — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina Comfy — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina, Please Be My Girlfriend — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina Swimsuit — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina Study — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina Thing — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Ina Vroom — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Jane Doe — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Kowakute Kawaii — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Leon Kennedy — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Inanis — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Shiori — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Shiori Vroom — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Teto Car — Print A5', 'Art print A5, kertas 260 gsm AC, laminasi doff.', 20000, 10, 'Print'),
    ('Comifuro XX — Standee', 'Standee 5 mm, custom UV print.', 100000, 5, 'Standee'),
    ('Comifuro XX Alt — Standee', 'Standee 5 mm, custom UV print.', 100000, 5, 'Standee')
)
insert into public.consignment_items
  (admin_id, category_id, name, description, price, stock, condition, status, showcase)
select
  (select id from public.profiles where role = 'staff' limit 1),
  (select id from public.consignment_categories where name = v.cat),
  v.name, v.description, v.price, v.stock, 'baru', 'tersedia', 'commission'
from v
where not exists (select 1 from public.consignment_items c where c.name = v.name);

with m(name, slug) as (
  values
    ('Maserati x Shiori — Print A4', 'maserati-x-shiori'),
    ('Blue Wife — Print A4', 'blue-wife'),
    ('Bronyers Railstar — Print A4', 'bronyers-railstar'),
    ('Executor, My Beloved — Print A4', 'executor-my-beloved'),
    ('Go White Girl Go — Print A4', 'go-white-girl-go'),
    ('Ina Comfy — Print A4', 'ina-comfy'),
    ('Ina, Please Be My Girlfriend — Print A4', 'ina-please-be-my-girlfriend'),
    ('Ina Swimsuit — Print A4', 'ina-swimsuit'),
    ('Ina Study — Print A4', 'ina-study'),
    ('Ina Thing — Print A4', 'ina-thing'),
    ('Ina Vroom — Print A4', 'ina-vroom'),
    ('Jane Doe — Print A4', 'jane-doe'),
    ('Kowakute Kawaii — Print A4', 'kowakute-kawaii'),
    ('Leon Kennedy — Print A4', 'leon-kennedy'),
    ('Inanis — Print A4', 'inanis'),
    ('Shiori — Print A4', 'shiori'),
    ('Shiori Vroom — Print A4', 'shiori-vroom'),
    ('Teto Car — Print A4', 'teto-car'),
    ('Maserati x Shiori — Print A5', 'maserati-x-shiori'),
    ('Blue Wife — Print A5', 'blue-wife'),
    ('Bronyers Railstar — Print A5', 'bronyers-railstar'),
    ('Executor, My Beloved — Print A5', 'executor-my-beloved'),
    ('Go White Girl Go — Print A5', 'go-white-girl-go'),
    ('Ina Comfy — Print A5', 'ina-comfy'),
    ('Ina, Please Be My Girlfriend — Print A5', 'ina-please-be-my-girlfriend'),
    ('Ina Swimsuit — Print A5', 'ina-swimsuit'),
    ('Ina Study — Print A5', 'ina-study'),
    ('Ina Thing — Print A5', 'ina-thing'),
    ('Ina Vroom — Print A5', 'ina-vroom'),
    ('Jane Doe — Print A5', 'jane-doe'),
    ('Kowakute Kawaii — Print A5', 'kowakute-kawaii'),
    ('Leon Kennedy — Print A5', 'leon-kennedy'),
    ('Inanis — Print A5', 'inanis'),
    ('Shiori — Print A5', 'shiori'),
    ('Shiori Vroom — Print A5', 'shiori-vroom'),
    ('Teto Car — Print A5', 'teto-car'),
    ('Comifuro XX — Standee', 'comifuro-xx'),
    ('Comifuro XX Alt — Standee', 'comifuro-xx-alt')
)
insert into public.consignment_images (item_id, image_url, is_thumbnail)
select
  c.id,
  'https://kzqnvcuhqtyfmzhwsciv.supabase.co/storage/v1/object/public/shop-images/seed/' || m.slug || '.png',
  true
from m
join public.consignment_items c on c.name = m.name
where not exists (select 1 from public.consignment_images i where i.item_id = c.id);
