delete from public.commissions;
delete from public.titipan_requests;
delete from public.consignment_items;
delete from public.consignment_categories;
delete from public.services;

insert into public.services (name, description, starting_price, duration_days) values
  ('Custom Portrait', 'Bust-up or half-body portrait in your choice of style. Includes one revision.', 350000, 7),
  ('Full Body Illustration', 'Full character illustration with background. Two revisions included.', 750000, 14),
  ('Chibi / SD', 'Super-deformed character, great for stickers or avatars. One revision.', 150000, 3),
  ('Landsheet Background', 'Illustrated background scene for your character. No character included.', 500000, 10);

insert into public.commissions (buyer_id, service_id, brief, reference_links, status, quote_price, quote_note) values
  ((select id from auth.users where email = 'alamak@gmail.com'),
   (select id from public.services where name = 'Custom Portrait'),
   'Portrait of my OC, silver hair, gentle smile. Prefers soft lighting.',
   array['https://example.com/ref1'],
   'quoted', 400000, 'Slightly more detail than standard portrait.'),
  ((select id from auth.users where email = 'alamak@gmail.com'),
   (select id from public.services where name = 'Chibi / SD'),
   'Chibi version of my cat, orange tabby, sitting pose.',
   array[]::text[],
   'requested', null, null);

insert into public.titipan_requests (buyer_id, product_link, size, color, quantity, budget, status, quote_item_price, quote_shipping, quote_service_fee, quote_note) values
  ((select id from auth.users where email = 'alamak@gmail.com'),
   'https://www.example.jp/product/123', 'M', 'Black', 1, 500000,
   'quoted', 320000, 85000, 25000, 'Item price from Yahoo Japan auction.'),
  ((select id from auth.users where email = 'alamak@gmail.com'),
   'https://www.example.jp/product/456', 'One Size', 'White', 2, 300000,
   'requested', null, null, null, null);

insert into public.consignment_categories (name) values
  ('Figures'),
  ('Plushies');

insert into public.consignment_items (admin_id, category_id, name, description, price, stock, condition, status) values
  ((select id from public.admins limit 1),
   (select id from public.consignment_categories where name = 'Figures'),
   'Figma Jinx (Arcane)', 'Good Smile Company Figma #550. Some box wear.', 850000, 1, 'bekas', 'tersedia'),
  ((select id from public.admins limit 1),
   (select id from public.consignment_categories where name = 'Plushies'),
   'Genshin Impact Diluc Plush', 'SEGA PM plush, approx 20cm. Like new.', 350000, 2, 'baru', 'tersedia');
