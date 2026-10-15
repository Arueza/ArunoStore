import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { pickThumb } from "@/lib/shop";
import type { Side } from "@/components/ShopSideToggle";

type ShopItem = {
  id: string;
  name: string;
  price: number;
  condition: "baru" | "bekas" | null;
  status: string;
  showcase: string;
  consignment_categories: { name: string }[] | null;
  consignment_images: { image_url: string; is_thumbnail: boolean | null }[] | null;
};

const SHOWCASE_LABEL: Record<string, string> = {
  commission: "Commission",
  titipan: "Titipan",
  keduanya: "Keduanya",
};

export const STATUS_OPTIONS = [
  { value: "tersedia", label: "Tersedia" },
  { value: "terjual", label: "Terjual" },
  { value: "ditarik", label: "Ditarik" },
];

/**
 * Staff catalogue list: every status, newest first (roadmap 5.26).
 *
 * Shared by the three management surfaces: the Kelola tab on /shop (no
 * side — everything) and the Kelola katalog blocks on /commissions and
 * /titipan (their side plus `keduanya`, the same rule the public grid uses).
 * Reads through the staff session, so it only ever renders behind a
 * staff-gated boundary.
 *
 * `from` tags the detail links so the edit page's back-link returns to the
 * surface staff came from rather than guessing by showcase.
 */
export default async function StaffShopList({
  side,
  from,
  categoryId,
  condition,
  minPrice,
  maxPrice,
  status,
}: {
  side?: Side;
  from: "shop" | "commissions" | "titipan";
  categoryId?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
}) {
  const supabase = await createClient();

  const dbQuery = supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, status, showcase, category_id, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .order("created_at", { ascending: false });

  if (side) {
    dbQuery.in("showcase", [side, "keduanya"]);
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

  if (status) {
    dbQuery.eq("status", status);
  }

  const { data: items } = await dbQuery;

  const rows = items ?? [];

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Belum ada produk. Tambah produk pertama untuk mengisi katalog.
      </p>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
      {rows.map((item: ShopItem) => {
        const thumb = pickThumb(item.consignment_images);

        return (
          <li key={item.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-ink">
                <Link
                  href={`/staff/shop/${item.id}?from=${from}`}
                  className="hover:underline"
                >
                  {item.name}
                </Link>
              </p>
              <p className="text-xs text-[#6c6870]">
                {item.status === "tersedia" ? "Tersedia" : item.status === "terjual" ? "Terjual" : "Ditarik"}
              </p>
            </div>

            <div className="mt-1 flex items-center gap-4">
              <p className="text-sm text-plum">
                {formatRupiah(item.price)}
              </p>
              {item.condition === "bekas" && (
                <span className="text-[10px] uppercase tracking-wider text-[#b0acb5]">
                  Bekas
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider text-[#b0acb5]">
                {SHOWCASE_LABEL[item.showcase] ?? item.showcase}
              </span>
              <p className="text-xs text-[#b0acb5]">
                {item.consignment_categories?.[0]
                  ? item.consignment_categories[0].name
                  : "Tanpa kategori"}
              </p>
            </div>

            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
              <img
                src={thumb}
                alt={item.name}
                className="mt-2 h-16 w-16 border border-[#eeeae5] object-cover"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
