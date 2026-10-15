import Link from "next/link";
import { statusLabel } from "@/lib/commissionStatus";

/**
 * Search + status filter for a buyer's own list (roadmap 5.2).
 *
 * A plain GET form — no client component, no state. Submitting reloads the
 * page with ?q= and ?status=, which the list reads server-side. Shared by
 * both buyer lists so the two cannot drift into different wordings.
 */
export default function ListFilter({
  search,
  statusFilter,
  statuses,
  searchPlaceholder,
  baseHref,
}: {
  search?: string;
  statusFilter?: string;
  statuses: string[];
  searchPlaceholder: string;
  baseHref: string;
}) {
  const filtered = Boolean(search || statusFilter);

  return (
    <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <label
          htmlFor="q"
          className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
        >
          Kata kunci
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={search ?? ""}
          placeholder={searchPlaceholder}
          className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        />
      </div>

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
          defaultValue={statusFilter ?? ""}
          className="mt-2 border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
        >
          <option value="">Semua status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Cari
      </button>

      {filtered && (
        <Link
          href={baseHref}
          className="px-1 py-2 text-sm font-semibold text-plum hover:underline"
        >
          Lihat semua
        </Link>
      )}
    </form>
  );
}
