import type { Metadata } from "next";
import Link from "next/link";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Katalog Titipan — Aruno Store",
};

/**
 * Titipan catalogue — items staff marked showcase = titipan or keduanya.
 *
 * Reads no session so the page prerenders under cacheComponents. The request
 * flow itself lives on /titipan; this page is the browsable grid.
 */
export default async function ShopTitipanPage() {
  "use cache";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Katalog Titipan
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Barang dari Jepang yang sudah jadi dan siap kirim. Tidak ada yang cocok?
        Kirim tautan produk dan kami belikan untukmu.
      </p>

      <div className="mt-10">
        <ShopGrid showcase="titipan" />
      </div>

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <Link
          href="/titipan/request"
          className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Kirim titipan
        </Link>

        <p className="mt-4 text-xs text-[#6c6870]">
          Butuh barang dari Jepang yang belum ada?{" "}
          <Link
            href="/titipan"
            className="font-semibold text-plum hover:underline"
          >
            Lihat cara kerja titipan
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
