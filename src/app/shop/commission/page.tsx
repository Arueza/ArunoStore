import type { Metadata } from "next";
import Link from "next/link";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Katalog Commission — Aruno Store",
};

/**
 * Commission catalogue — items staff marked showcase = commission or keduanya.
 *
 * Reads no session so the page prerenders under cacheComponents. The request
 * flow itself lives on /commissions; this page is the browsable grid.
 */
export default async function ShopCommissionPage() {
  "use cache";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Katalog Commission
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Merchandise seni dan karya endorse yang siap kirim. Tidak ada yang cocok?
        Minta karya custom lewat commission.
      </p>

      <div className="mt-10">
        <ShopGrid showcase="commission" />
      </div>

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <Link
          href="/commissions/request"
          className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Minta commission
        </Link>

        <p className="mt-4 text-xs text-[#6c6870]">
          Ingin merchandise yang belum ada?{" "}
          <Link
            href="/commissions"
            className="font-semibold text-plum hover:underline"
          >
            Lihat layanan commission
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
