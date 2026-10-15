import Link from "next/link";
import { SHOWCASE_LABEL, type Showcase } from "@/lib/shop";

// The two halves of the store. `keduanya` is not a choice here — those rows
// appear under both sides, so there is nothing to toggle to.
export type Side = Exclude<Showcase, "keduanya">;

const SIDES: Side[] = ["commission", "titipan"];

/**
 * Anything but a real side falls back to unfiltered, the same rule the
 * category filter follows for forged ids — a bad value shows everything
 * rather than zero rows.
 */
export function parseSide(value: string | undefined): Side | undefined {
  return value === "commission" || value === "titipan" ? value : undefined;
}

export type SideParams = {
  q?: string;
  cat?: string;
  cond?: string;
  min?: string;
  max?: string;
  side?: Side;
  sort?: string;
};

/**
 * Segmented Commission/Titipan toggle for the /shop catalogue.
 *
 * Plain links, no client component — each href carries the current filters
 * and sort so switching sides never clears them. /shop only; /staff/shop
 * never imports this. In the sidebar it stacks full-width (layout
 * "column"); anywhere else it stays a row.
 */
export default function ShopSideToggle({
  params,
  layout = "row",
}: {
  params: SideParams;
  layout?: "row" | "column";
}) {
  const hrefFor = (side: Side | undefined) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.cat) query.set("cat", params.cat);
    if (params.cond) query.set("cond", params.cond);
    if (params.min) query.set("min", params.min);
    if (params.max) query.set("max", params.max);
    if (params.sort) query.set("sort", params.sort);
    if (side) query.set("side", side);
    const queryString = query.toString();
    return queryString ? `/shop?${queryString}` : "/shop";
  };

  const linkClass = (selected: boolean) =>
    selected
      ? "bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white"
      : "border border-[#e2ddd7] bg-white px-5 py-2 text-xs uppercase tracking-[0.18em] text-[#6c6870] transition-colors hover:border-plum hover:text-plum";

  const column = layout === "column";

  return (
    <div
      role="group"
      aria-label="Sisi toko"
      className={column ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}
    >
      <Link
        href={hrefFor(undefined)}
        aria-current={params.side === undefined ? "true" : undefined}
        className={`${linkClass(params.side === undefined)}${column ? " block text-center" : ""}`}
      >
        Semua
      </Link>
      {SIDES.map((side) => (
        <Link
          key={side}
          href={hrefFor(side)}
          aria-current={params.side === side ? "true" : undefined}
          className={`${linkClass(params.side === side)}${column ? " block text-center" : ""}`}
        >
          {SHOWCASE_LABEL[side]}
        </Link>
      ))}
    </div>
  );
}
