import Image from "next/image";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import { likePattern, pickThumb, type Showcase } from "@/lib/shop";

type ShopItem = {
  id: string;
  name: string;
  price: number;
  condition: "baru" | "bekas" | null;
  consignment_categories: { name: string }[] | null;
  consignment_images: { image_url: string; is_thumbnail: boolean | null }[] | null;
};

/**
 * Grid of available catalogue items, optionally filtered by showcase and by a
 * name search from /shop?q=.
 *
 * Used by /shop (no filter — everything), /commissions/catalog and
 * /titipan/catalog (filtered by the staff-set showcase column).
 * Cookie-less public client so each page prerenders under
 * cacheComponents with no session read and no <Suspense>.
 *
 * Cached per argument set, so one search term never serves another term's
 * rows and the unfiltered grid keeps the exact cache it had before search
 * existed. The search match is a literal contains on the name, case
 * insensitive — likePattern() keeps a typed % or _ from becoming a wildcard.
 *
 * ponytail: no description on the card, no category filter, no
 * detail page, no cart button. Price is shown but not purchasable; buying
 * needs the quote flow in Phase 4.
 */
export default async function ShopGrid({
  showcase,
  query,
  categoryId,
  condition,
  minPrice,
  maxPrice,
}: {
  showcase?: Showcase;
  query?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  "use cache";

  const supabase = createPublicClient();
  const search = query?.trim();
  const dbQuery = supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, category_id, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .eq("status", "tersedia")
    .order("created_at", { ascending: false });

  // PostgREST `in` with an empty list matches nothing; keduanya lands in both
  // catalogues, so the filter is showcase = commission OR keduanya.
  if (showcase) {
    dbQuery.in("showcase", [showcase, "keduanya"]);
  }

  if (search) {
    dbQuery.ilike("name", likePattern(search));
  }

  // 5.18: category, condition and price range narrow the same query. All
  // three are optional and compose with each other and with the search.
  if (categoryId) {
    dbQuery.eq("category_id", categoryId);
  }

  if (condition) {
    dbQuery.eq("condition", condition);
  }

  if (minPrice) {
    dbQuery.gte("price", Number(minPrice));
  }

  if (maxPrice) {
    dbQuery.lte("price", Number(maxPrice));
  }

  const { data: items } = await dbQuery;

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-[#6c6870]">
        Belum ada barang. Kembali lagi nanti.
      </p>
    );
  }

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item: ShopItem) => {
        const thumb = pickThumb(item.consignment_images);

        return (
          <Link key={item.id} href={`/shop/${item.id}`} className="group">
            <div className="relative aspect-[4/3] overflow-hidden border border-[#eeeae5] bg-cream">
              {thumb ? (
                <Image
                  src={thumb}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-[#b0acb5]">
                  Tanpa gambar
                </span>
              )}
            </div>

            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink group-hover:text-plum">
                {item.name}
              </p>
              {item.condition === "bekas" && (
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#b0acb5]">
                  Bekas
                </span>
              )}
            </div>

            <p className="mt-0.5 text-sm text-plum">
              {formatRupiah(item.price)}
            </p>

            {item.consignment_categories?.[0] && (
              <p className="mt-1 text-xs text-[#b0acb5]">
                {item.consignment_categories[0].name}
              </p>
            )}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
