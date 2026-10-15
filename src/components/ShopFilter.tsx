/**
 * Filter form for the shop catalogue (roadmap 5.18).
 *
 * A plain GET form — no client component, no state. Submitting reloads the
 * page with ?cat=, ?cond=, ?min=, ?max= and optionally ?status=, which the
 * list reads server-side. Shared by /shop and /staff/shop so the two cannot
 * drift into different wordings.
 *
 * Price inputs use inputMode numeric, same as quote boxes. The action's
 * whole-number check is the real validation; this just puts the right keyboard
 * on a phone.
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
}) {
  const filtered = Boolean(
    search || categoryId || condition || minPrice || maxPrice || status,
  );

  return (
    <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
      <input type="hidden" name="q" value={search ?? ""} />

      <div className="min-w-44 flex-1">
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
          className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
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
          className="mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        >
          <option value="">Semua kondisi</option>
          <option value="baru">Baru</option>
          <option value="bekas">Bekas</option>
        </select>
      </div>

      <div>
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
          className="mt-2 w-28 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        />
      </div>

      <div>
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
          className="mt-2 w-28 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        />
      </div>

      {statuses && (
        <div>
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
            className="mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
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
        className="bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
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
