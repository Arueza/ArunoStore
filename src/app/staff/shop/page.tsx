import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
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

async function ShopList() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, status, showcase, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .order("created_at", { ascending: false });

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

export default function StaffShopPage() {
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
        <Link href="/staff" className="font-semibold text-plum hover:underline">
          Permintaan commission
        </Link>
        <Link href="/staff/titipan" className="font-semibold text-plum hover:underline">
          Permintaan titipan
        </Link>
        <Link href="/staff/artworks" className="font-semibold text-plum hover:underline">
          Galeri karya
        </Link>
      </nav>

      <div className="mt-10 border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Tambah produk baru
        </h2>

        <AddItemForm />
      </div>

      <div className="mt-10">
        <Suspense>
          <ShopList />
        </Suspense>
      </div>
    </main>
  );
}


