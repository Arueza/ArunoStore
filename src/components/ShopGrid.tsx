import Image from "next/image";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import {
  likePattern,
  pickThumb,
  remainingStock,
  type Showcase,
  type SortKey,
} from "@/lib/shop";

type ShopItem = {
  id: string;
  name: string;
  price: number;
  condition: "baru" | "bekas" | null;
  stock: number | null;
  product_sizes: { stock: number }[] | null;
  consignment_categories: { name: string }[] | null;
  consignment_images: { image_url: string; is_thumbnail: boolean | null }[] | null;
};

// "Almost gone" emphasis. The Sisa line itself shows on every card; at or
// below this the number turns plum so a nearly-empty shelf reads as urgent.
const LOW_STOCK = 5;

/**
 * Catalogue grid for /shop, with name search, showcase side, filters and
 * sort from the query string.
 *
 * Cookie-less public client so the page prerenders under cacheComponents
 * with no session read. Cached per argument set, so one filter set never
 * serves another's rows. The search match is a literal contains on the
 * name, case insensitive — likePattern() keeps a typed % or _ from becoming
 * a wildcard.
 *
 * Stock comes from the same rows checkout decrements: per-size sums for
 * fashion items, the item row otherwise. Rows with nothing left are dropped
 * here — a sized item can sit at status tersedia with every size at zero,
 * because only the sizeless path flips the status at checkout.
 */
export default async function ShopGrid({
  showcase,
  query,
  categoryId,
  condition,
  minPrice,
  maxPrice,
  sort = "terbaru",
}: {
  showcase?: Showcase;
  query?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: SortKey;
}) {
  "use cache";

  const supabase = createPublicClient();
  const search = query?.trim();
  const dbQuery = supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, stock, category_id, product_sizes(stock), consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .eq("status", "tersedia");

  // PostgREST `in` with an empty list matches nothing; keduanya lands in both
  // sides, so the filter is showcase = commission OR keduanya.
  if (showcase) {
    dbQuery.in("showcase", [showcase, "keduanya"]);
  }

  if (search) {
    dbQuery.ilike("name", likePattern(search));
  }

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

  if (sort === "termurah") {
    dbQuery.order("price", { ascending: true });
  } else if (sort === "termahal") {
    dbQuery.order("price", { ascending: false });
  } else if (sort === "nama") {
    dbQuery.order("name", { ascending: true });
  } else {
    dbQuery.order("created_at", { ascending: false });
  }

  const { data } = await dbQuery;

  const items = ((data ?? []) as ShopItem[]).filter(
    (item) => remainingStock(item) !== 0,
  );

  if (items.length === 0) {
    return (
      <p className="text-sm text-[#6c6870]">
        Belum ada barang. Kembali lagi nanti.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-[#6c6870]">{items.length} Produk</p>

      {/* Commission-side pieces read bigger three-up; everything else stays
          four-up. Driven purely by the showcase filter, so /shop, searches
          and the titipan side keep the denser grid. */}
      <div
        className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-8 ${showcase === "commission" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
      >
        {items.map((item) => {
          const thumb = pickThumb(item.consignment_images);
          const left = remainingStock(item);
          const low = left !== null && left <= LOW_STOCK;

          return (
            <Link key={item.id} href={`/shop/${item.id}`} className="group">
              <div className="relative aspect-[3/4] overflow-hidden border border-[#eeeae5] bg-white">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-[#b0acb5]">
                    Tanpa gambar
                  </span>
                )}
                {(low || item.condition === "bekas") && (
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    {low && (
                      <span className="bg-plum px-2 py-1 text-[10px] uppercase tracking-wider text-white">
                        Sisa {left}
                      </span>
                    )}
                    {item.condition === "bekas" && (
                      <span className="bg-ink/70 px-2 py-1 text-[10px] uppercase tracking-wider text-white">
                        Bekas
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-ink group-hover:text-plum">
                {item.name}
              </p>

              <p className="mt-0.5 text-sm text-plum">
                {formatRupiah(item.price)}
              </p>

              {left !== null && (
                <p
                  className={`mt-0.5 text-xs ${low ? "font-medium text-plum" : "text-[#b0acb5]"}`}
                >
                  Sisa {left}
                </p>
              )}

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
