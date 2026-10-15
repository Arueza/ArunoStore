import { createClient } from "@/lib/supabase/server";
import AddItemForm from "@/components/AddItemForm";
import ShopFilter from "@/components/ShopFilter";
import StaffShopList, { STATUS_OPTIONS } from "@/components/StaffShopList";
import type { Side } from "@/components/ShopSideToggle";

/**
 * Catalogue management block shared by the three staff surfaces (5.26):
 * the Kelola tab on /shop (no side — everything) and the Kelola katalog
 * blocks on /commissions and /titipan (their side plus `keduanya`).
 *
 * Add form on top, the same filter row the staff list always had, then the
 * all-statuses list into the per-item edit pages. Awaits its own query
 * string, so each embedding page renders this behind a boundary and keeps
 * its static shell — the same rule the /shop grid follows.
 */
export default async function CatalogManager({
  side,
  from,
  baseHref,
  searchParams,
}: {
  side?: Side;
  from: "shop" | "commissions" | "titipan";
  baseHref: string;
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

  // Only real statuses reach the query — a forged value falls back to
  // unfiltered rather than to zero rows.
  const rawStatus = status?.trim() || undefined;
  const safeStatus = STATUS_OPTIONS.some((s) => s.value === rawStatus)
    ? rawStatus
    : undefined;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("consignment_categories")
    .select("id, name")
    .order("name");

  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div>
      <div className="border border-[#eeeae5] bg-cream p-5">
        <h3 className="font-display text-lg font-semibold text-ink">
          Tambah produk baru
        </h3>

        <AddItemForm defaultShowcase={side ?? "keduanya"} />
      </div>

      <div className="mt-8">
        <ShopFilter
          categories={categoryOptions}
          categoryId={categoryId}
          condition={condition}
          minPrice={minPrice}
          maxPrice={maxPrice}
          status={safeStatus}
          statuses={STATUS_OPTIONS}
          baseHref={baseHref}
          side={side}
        />
      </div>

      <StaffShopList
        side={side}
        from={from}
        categoryId={categoryId}
        condition={condition}
        minPrice={minPrice}
        maxPrice={maxPrice}
        status={safeStatus}
      />
    </div>
  );
}
