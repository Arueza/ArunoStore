import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import { pickThumb } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Belanja — Aruno Store",
};

// Reads consignment_items (proxy-shopping goods) and consignment_categories.
// The "consignment" name is a misnomer — these are goods for sale, not
// consigned merchandise. Typed here as ShopItem to match the site, not the
// table.
//
// price is numeric in the captured schema, not integer. formatRupiah rounds at
// display time, which is enough until the Phase 4 payment migration opens this
// column anyway. ponytail: change the column to integer in that migration
// rather than writing a new one here.
//
// Both embeds are arrays, not single objects: PostgREST cannot prove the
// category is unique, and consignment_images is genuinely one-to-many.

type ShopItem = {
  id: string;
  name: string;
  price: number;
  condition: "baru" | "bekas" | null;
  consignment_categories: { name: string }[] | null;
  consignment_images: { image_url: string; is_thumbnail: boolean | null }[] | null;
};

/**
 * Ready-made goods from both sides of the store.
 *
 * Reads consignment_items where status = 'tersedia' (available), joined to
 * consignment_categories for the label and consignment_images for the thumbnail.
 * Uses a cookie-less Supabase client so the page can prerender fully at build
 * time with 'use cache' — no session read, no <Suspense>.
 *
 * ponytail: no description on the card, no category filter, no search, no
 * detail page, no cart button. Add them when there are enough items that
 * scrolling is hard. Price is shown but not purchasable; buying needs the
 * quote flow in Phase 4.
 */
async function ShopGrid() {
  const supabase = createPublicClient();
  const { data: items } = await supabase
    .from("consignment_items")
    .select(
      "id, name, price, condition, consignment_categories(name), consignment_images(image_url, is_thumbnail)",
    )
    .eq("status", "tersedia")
    .order("created_at", { ascending: false });

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

export default async function ShopPage() {
  "use cache";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Belanja
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Barang siap kirim dari endorse kami — merchandise seni dan barang dari
        Jepang yang bisa dibeli langsung.
      </p>

      <div className="mt-10">
        <ShopGrid />
      </div>

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <p className="text-sm text-[#6c6870]">
          Ingin sesuatu yang belum ada di daftar?{" "}
          <Link
            href="/commissions"
            className="font-semibold text-plum hover:underline"
          >
            Minta komisi
          </Link>{" "}
          untuk karya seni, atau{" "}
          <Link
            href="/titipan"
            className="font-semibold text-plum hover:underline"
          >
            kirim titipan
          </Link>{" "}
          untuk barang dari Jepang yang belum ada.
        </p>
      </div>
    </main>
  );
}