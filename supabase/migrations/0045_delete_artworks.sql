-- Roadmap 5.25: retire the artworks gallery. Art pieces are displayed through
-- the commission side of the shop (/shop?side=commission), so the standalone
-- gallery and its manager have no readers left.
--
-- Deletes every artwork row and every stored object in the 'artworks' bucket.
-- Both deletes are idempotent, so this is safe to paste twice. The bucket
-- itself stays: buckets cannot be dropped from SQL, remove it in the
-- dashboard if it should not exist at all. RLS policies on public.artworks
-- stay with the empty table, which is harmless.
--
-- Verify after pasting:
--   select count(*) from public.artworks;
--   -- 0
--   select count(*) from storage.objects where bucket_id = 'artworks';
--   -- 0

delete from public.artworks;

delete from storage.objects where bucket_id = 'artworks';
