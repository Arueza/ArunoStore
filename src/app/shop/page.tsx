import type { Metadata } from "next";
import Link from "next/link";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Belanja — Aruno Store",
};

/**
 * Ready-made goods from both sides of the store.
 *
 * Shows every available item regardless of showcase — the commission and
 * titipan catalogues filter by their own column. Reads no session so the page
 * prerenders under cacheComponents with 'use cache'.
 */
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
