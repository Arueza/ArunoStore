import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Belanja — Aruno Store",
};

/**
 * Ready-made goods from both sides of the store.
 *
 * Shows every available item regardless of showcase — the commission and
 * titipan catalogues filter by their own column. Reads no session so the
 * shell prerenders under cacheComponents.
 *
 * ?q= filters the grid by product name (the header search lands here). The
 * query string is a request read, so it is awaited inside ShopGridFromQuery
 * behind its own boundary — never in this body, and never under "use cache",
 * which forbids dynamic request data even in nested children. The grid itself
 * carries "use cache", so the unfiltered catalogue keeps the exact cache it
 * had before search existed.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
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
        <Suspense>
          <ShopGridFromQuery searchParams={searchParams} />
        </Suspense>
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

/**
 * Awaits ?q=, then hands the grid a name filter plus a result heading.
 *
 * Separate from the page body because awaiting here, inside a boundary, is
 * what keeps /shop's shell prerendered — the same rule 1.12 and 1.13 rest on
 * for the rest of the site. A blank query renders the plain grid, so clearing
 * the search and reloading differ in nothing.
 */
async function ShopGridFromQuery({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim();

  if (!search) {
    return <ShopGrid />;
  }

  return (
    <>
      <p className="mb-6 text-sm text-[#6c6870]">
        Hasil untuk <span className="font-semibold text-ink">{search}</span>{" "}
        <Link href="/shop" className="font-semibold text-plum hover:underline">
          Lihat semua
        </Link>
      </p>
      <ShopGrid query={search} />
    </>
  );
}
