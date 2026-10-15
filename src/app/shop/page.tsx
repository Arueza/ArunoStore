import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ShopGrid from "@/components/ShopGrid";
import ShopFilter from "@/components/ShopFilter";
import ShopSideToggle, { parseSide } from "@/components/ShopSideToggle";
import { createPublicClient } from "@/lib/supabase/public";
import { parseSort } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Belanja — Aruno Store",
};

/**
 * Ready-made goods from both sides of the store.
 *
 * Full-width catalogue in the Cottonink shape: filters in a left sidebar,
 * the grid on the right. Reads no session so the shell prerenders under
 * cacheComponents.
 *
 * ?q= filters the grid by product name (the header search lands here),
 * ?side= narrows it to one half of the store (the toggle in the sidebar),
 * and ?sort= orders it. The query string is a request read, so it is
 * awaited inside ShopGridFromQuery behind its own boundary — never in this
 * body, and never under "use cache", which forbids dynamic request data
 * even in nested children. The grid itself carries "use cache", so the
 * unfiltered catalogue keeps the exact cache it had before search existed.
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
    sort?: string;
  }>;
}) {
  return (
    <main className="w-full px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Belanja
      </h1>

      <div className="mt-10">
        <Suspense>
          <ShopGridFromQuery searchParams={searchParams} />
        </Suspense>
      </div>

      <div className="mx-auto mt-14 w-full max-w-5xl border-t border-[#eeeae5] pt-8">
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
 * Awaits the filter query string, then hands the sidebar and grid their
 * filters plus a result heading.
 *
 * Separate from the page body because awaiting here, inside a boundary, is
 * what keeps /shop's shell prerendered — the same rule 1.12 and 1.13 rest on
 * for the rest of the site. A blank query renders the plain grid, so clearing
 * the form and reloading differ in nothing.
 *
 * Category options come from consignment_categories via the same public
 * client — cookie-less, no session read, so the shell still prerenders.
 * On mobile the sidebar stacks above the grid; the single filter instance
 * keeps every label's htmlFor unique.
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
    sort?: string;
  }>;
}) {
  const { q, cat, cond, min, max, side: sideParam, sort: sortParam } = await searchParams;
  const search = q?.trim();
  const categoryId = cat?.trim() || undefined;
  const condition = cond?.trim() || undefined;
  const minPrice = min?.trim() || undefined;
  const maxPrice = max?.trim() || undefined;
  const side = parseSide(sideParam?.trim());
  const sort = parseSort(sortParam?.trim());
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

  const toggleParams = {
    q: search,
    cat: categoryId,
    cond: condition,
    min: minPrice,
    max: maxPrice,
    side,
    // The default sort stays off the URL: ?sort=terbaru behaves exactly
    // like no sort, so toggle links keep the address bar clean.
    sort: sort === "terbaru" ? undefined : sort,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
      <aside aria-label="Filter katalog" className="lg:sticky lg:top-24 lg:self-start">
        <ShopSideToggle params={toggleParams} layout="column" />
        <div className="mt-6">
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
            side={side}
            sort={sort}
            showSort
            layout="column"
          />
        </div>
      </aside>

      <div>
        {filtered && (
          <p className="mb-6 text-sm text-[#6c6870]">
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
          sort={sort}
        />
      </div>
    </div>
  );
}
