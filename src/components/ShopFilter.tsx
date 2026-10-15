import { SORT_LABEL, type SortKey } from "@/lib/shop";

/**
 * Filter form for the shop catalogue (roadmap 5.18).
 *
 * A plain GET form — no client component, no state. Submitting reloads the
 * page with ?cat=, ?cond=, ?min=, ?max= and optionally ?status= / ?sort=,
 * which the list reads server-side. Shared by /shop and /staff/shop so the
 * two cannot drift into different wordings.
 *
 * Price inputs use inputMode numeric, same as quote boxes. The action's
 * whole-number check is the real validation; this just puts the right keyboard
 * on a phone.
 *
 * Layout "column" stacks the fields full-width for the /shop sidebar; the
 * default row keeps /staff/shop exactly as it was. `side` is carried as a
 * hidden field so submitting never drops the visitor's Commission/Titipan
 * choice — the toggle preserves filters, and the form returns the favour.
 */
export default function ShopFilter({
  categories,
  search,
  categoryId,
  condition,
  minPrice,
  maxPrice,
  status,
  statuses,
  baseHref,
  side,
  sort,
  showSort = false,
  layout = "row",
}: {
  categories: { id: string; name: string }[];
  search?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
  statuses?: { value: string; label: string }[];
  baseHref: string;
  side?: string;
  sort?: SortKey;
  showSort?: boolean;
  layout?: "row" | "column";
}) {
  const column = layout === "column";
  const filtered = Boolean(
    search ||
      categoryId ||
      condition ||
      minPrice ||
      maxPrice ||
      status ||
      (sort && sort !== "terbaru"),
  );

  const fieldWrap = column ? "w-full" : undefined;
  const selectClass = column
    ? "mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
    : undefined;

  return (
    <form
      method="get"
      className={
        column ? "flex flex-col gap-4" : "mt-8 flex flex-wrap items-end gap-3"
      }
    >
      <input type="hidden" name="q" value={search ?? ""} />
      {side && <input type="hidden" name="side" value={side} />}

      <div className={column ? "w-full" : "min-w-44 flex-1"}>
        <label
          htmlFor="cat"
          className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
        >
          Kategori
        </label>
        <select
          id="cat"
          name="cat"
          defaultValue={categoryId ?? ""}
          className={
            selectClass ??
            "mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          }
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldWrap}>
        <label
          htmlFor="cond"
          className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
        >
          Kondisi
        </label>
        <select
          id="cond"
          name="cond"
          defaultValue={condition ?? ""}
          className={
            selectClass ??
            "mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          }
        >
          <option value="">Semua kondisi</option>
          <option value="baru">Baru</option>
          <option value="bekas">Bekas</option>
        </select>
      </div>

      <div className={fieldWrap}>
        <label
          htmlFor="min"
          className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
        >
          Harga min
        </label>
        <input
          id="min"
          name="min"
          type="text"
          inputMode="numeric"
          defaultValue={minPrice ?? ""}
          placeholder="0"
          className={
            column
              ? "mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
              : "mt-2 w-28 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          }
        />
      </div>

      <div className={fieldWrap}>
        <label
          htmlFor="max"
          className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
        >
          Harga maks
        </label>
        <input
          id="max"
          name="max"
          type="text"
          inputMode="numeric"
          defaultValue={maxPrice ?? ""}
          placeholder="1000000"
          className={
            column
              ? "mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
              : "mt-2 w-28 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          }
        />
      </div>

      {showSort && (
        <div className={fieldWrap}>
          <label
            htmlFor="sort"
            className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
          >
            Urutan
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort ?? "terbaru"}
            className={
              selectClass ??
              "mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            }
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {statuses && (
        <div className={fieldWrap}>
          <label
            htmlFor="status"
            className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={
              selectClass ??
              "mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            }
          >
            <option value="">Semua status</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className={`bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-all duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed${column ? " w-full" : ""}`}
      >
        Filter
      </button>

      {filtered && (
        <a
          href={baseHref}
          className="px-1 py-2 text-sm font-semibold text-plum hover:underline"
        >
          Lihat semua
        </a>
      )}
    </form>
  );
}
