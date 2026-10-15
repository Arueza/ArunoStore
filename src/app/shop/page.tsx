import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ShopGrid from "@/components/ShopGrid";
import ShopFilter from "@/components/ShopFilter";
import ShopSideToggle, { parseSide } from "@/components/ShopSideToggle";
import { createPublicClient } from "@/lib/supabase/public";

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
 * ?q= filters the grid by product name (the header search lands here) and
 * ?side= narrows it to one half of the store (the toggle above the form).
 * The query string is a request read, so it is awaited inside ShopGridFromQuery
 * behind its own boundary — never in this body, and never under "use cache",
 * which forbids dynamic request data even in nested children. The grid itself
 * carries "use cache", so the unfiltered catalogue keeps the exact cache it
 * had before search existed.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    side?: string;
  }>;
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
 * Awaits the filter query string, then hands the grid its filters plus a
 * result heading.
 *
 * Separate from the page body because awaiting here, inside a boundary, is
 * what keeps /shop's shell prerendered — the same rule 1.12 and 1.13 rest on
 * for the rest of the site. A blank query renders the plain grid, so clearing
 * the form and reloading differ in nothing.
 *
 * Category options come from consignment_categories via the same public
 * client — cookie-less, no session read, so the shell still prerenders.
 */
async function ShopGridFromQuery({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    side?: string;
  }>;
}) {
  const { q, cat, cond, min, max, side: sideParam } = await searchParams;
  const search = q?.trim();
  const categoryId = cat?.trim() || undefined;
  const condition = cond?.trim() || undefined;
  const minPrice = min?.trim() || undefined;
  const maxPrice = max?.trim() || undefined;
  const side = parseSide(sideParam?.trim());

  // Fetch categories for the dropdown. Only real ids reach the query; a
  // forged value falls back to unfiltered rather than to zero rows.
  const supabase = createPublicClient();
  const { data: categories } = await supabase
    .from("consignment_categories")
    .select("id, name")
    .order("name");

  const filtered = Boolean(
    search || categoryId || condition || minPrice || maxPrice || side,
  );

  return (
    <>
      <ShopSideToggle
        params={{
          q: search,
          cat: categoryId,
          cond: condition,
          min: minPrice,
          max: maxPrice,
          side,
        }}
      />
      <ShopFilter
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        search={search}
        categoryId={categoryId}
        condition={condition}
        minPrice={minPrice}
        maxPrice={maxPrice}
        baseHref="/shop"
      />
      {filtered && (
        <p className="mt-8 text-sm text-[#6c6870]">
          Hasil untuk{" "}
          <span className="font-semibold text-ink">
            {search || "semua barang"}
          </span>
          {categoryId && (
            <>
              {" "}
              di kategori{" "}
              <span className="font-semibold text-ink">
                {(categories ?? []).find((c) => c.id === categoryId)?.name ??
                  categoryId}
              </span>
            </>
          )}
          {side && (
            <>
              {" "}
              · sisi{" "}
              <span className="font-semibold text-ink">
                {side === "commission" ? "Commission" : "Titipan"}
              </span>
            </>
          )}
        </p>
      )}
      <ShopGrid
        query={search}
        categoryId={categoryId}
        condition={condition}
        minPrice={minPrice}
        maxPrice={maxPrice}
        showcase={side}
      />
    </>
  );
}
