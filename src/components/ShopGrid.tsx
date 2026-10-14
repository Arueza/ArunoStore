import Image from "next/image";
import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import { pickThumb, type Showcase } from "@/lib/shop";

type ShopItem = {
  id: string;
  name: string;
  price: number;
  condition: "baru" | "bekas" | null;
  consignment_categories: { name: string }[] | null;
  consignment_images: { image_url: string; is_thumbnail: boolean | null }[] | null;
};

/**
 * Grid of available catalogue items, optionally filtered by showcase.
 *
 * Used by /shop (no filter — everything), /shop/commission and /shop/titipan
 * (filtered). Cookie-less public client so each page prerenders under
 * cacheComponents with no session read and no <Suspense>.
 *
 * ponytail: no description on the card, no category filter, no search, no
 * detail page, no cart button. Price is shown but not purchasable; buying
 * needs the quote flow in Phase 4.
 */
export default async function ShopGrid({ showcase }: { showcase?: Showcase }) {
  const supabase = createPublicClient();
  const query = supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .eq("status", "tersedia")
    .order("created_at", { ascending: false });

  // PostgREST `in` with an empty list matches nothing; keduanya lands in both
  // catalogues, so the filter is showcase = commission OR keduanya.
  if (showcase) {
    query.in("showcase", [showcase, "keduanya"]);
  }

  const { data: items } = await query;

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-[#6c6870]">
        Belum ada barang. Kembali lagi nanti.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item: ShopItem) => {
        const thumb = pickThumb(item.consignment_images);

        return (
          <div key={item.id}>
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
              <p className="text-sm font-medium text-ink">{item.name}</p>
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
          </div>
        );
      })}
    </div>
  );
}
