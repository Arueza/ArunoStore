import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import ShopFilter from "@/components/ShopFilter";
import AddItemForm from "./AddItemForm";

export const metadata: Metadata = {
  title: "Katalog — Ruang Staf",
};

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

const STATUS_OPTIONS = [
  { value: "tersedia", label: "Tersedia" },
  { value: "terjual", label: "Terjual" },
  { value: "ditarik", label: "Ditarik" },
];

async function ShopList({
  categoryId,
  condition,
  minPrice,
  maxPrice,
  status,
}: {
  categoryId?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
}) {
  const supabase = await createClient();

  // 5.18: category, condition, price range and status narrow the same query.
  // All four are optional and compose with each other.
  const dbQuery = supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, status, showcase, category_id, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .order("created_at", { ascending: false });

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
        const thumb = item.consignment_images?.find(
          (img) => img.is_thumbnail,
        )?.image_url;

        return (
          <li key={item.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-ink">
                <Link
                  href={`/staff/shop/${item.id}`}
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

export default function StaffShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    status?: string;
  }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Katalog
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kelola produk yang ditampilkan di halaman belanja. Tambah produk baru,
        ubah harga dan stok, atau tarik barang dari katalog.
      </p>

      <nav aria-label="Menu staf" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/commissions" className="font-semibold text-plum hover:underline">
          Kelola commission
        </Link>
        <Link href="/titipan" className="font-semibold text-plum hover:underline">
          Kelola titipan
        </Link>
        <Link href="/staff" className="font-semibold text-plum hover:underline">
          Ruang staf
        </Link>
      </nav>

      <div className="mt-10 border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Tambah produk baru
        </h2>

        <AddItemForm />
      </div>

      <div className="mt-10">
        {/* 5.18: reads filter params behind its own boundary — same rule as
            /shop. Staff sees all statuses, so no status filter by default. */}
        <Suspense>
          <FilteredList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

/**
 * Awaits the filter query string, fetches categories, then hands the list
 * its filters. Same boundary rule as /shop: searchParams is a request read.
 */
async function FilteredList({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    status?: string;
  }>;
}) {
  const { cat, cond, min, max, status } = await searchParams;
  const categoryId = cat?.trim() || undefined;
  const condition = cond?.trim() || undefined;
  const minPrice = min?.trim() || undefined;
  const maxPrice = max?.trim() || undefined;
  const statusFilter = status?.trim() || undefined;

  // Only real statuses reach the query — a forged value falls back to
  // unfiltered rather than to zero rows.
  const safeStatus = STATUS_OPTIONS.some((s) => s.value === statusFilter)
    ? statusFilter
    : undefined;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("consignment_categories")
    .select("id, name")
    .order("name");

  return (
    <>
      <ShopFilter
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        categoryId={categoryId}
        condition={condition}
        minPrice={minPrice}
        maxPrice={maxPrice}
        status={safeStatus}
        statuses={STATUS_OPTIONS}
        baseHref="/staff/shop"
      />
      <ShopList
        categoryId={categoryId}
        condition={condition}
        minPrice={minPrice}
        maxPrice={maxPrice}
        status={safeStatus}
      />
    </>
  );
}


