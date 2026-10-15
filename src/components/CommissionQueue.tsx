import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import { countByStatus, statusLabel } from "@/lib/commissionStatus";

/**
 * The commission queue: every request, newest first, for both sellers.
 *
 * Roadmap 2.8, and the thing 1.8's guard was built to protect. Rendered for
 * staff inside the Kelola block on /commissions — never for buyers, and
 * never without the proxy's staff gate having run first on the detail links'
 * targets (the queue itself carries no buyer actions, only reads).
 *
 * The service name and the buyer's name are fetched separately and joined in
 * JavaScript rather than asked for as a PostgREST embed. commissions.buyer_id
 * references auth.users, not profiles, so there is no foreign key for PostgREST
 * to follow — the join has to happen on this side either way, and having one
 * mechanism for both columns is shorter than embedding the one that does have a
 * key and hand-joining the other.
 */
export async function CommissionQueue() {
  const supabase = await createClient();

  const { data: commissions } = await supabase
    .from("commissions")
    .select("id, buyer_id, service_id, brief, status, quote_price, created_at")
    .order("created_at", { ascending: false });

  const rows = commissions ?? [];

  // services has no write policy, so it is seeded by hand at 6.1 and can be
  // shorter than the queue. Both ids go through .in() with whatever is there, and
  // a lookup that returns nothing leaves the label blank rather than dropping the
  // row, because a request with no readable service name is still a request.
  const serviceIds = [...new Set(rows.map((row) => row.service_id))];
  const buyerIds = [...new Set(rows.map((row) => row.buyer_id))];

  const [{ data: services }, { data: buyers }] = await Promise.all([
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    buyerIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", buyerIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string; email: string }[],
        }),
  ]);

  const serviceNames = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );
  const buyerNames = new Map(
    (buyers ?? []).map((buyer) => [
      buyer.id,
      buyer.full_name || buyer.email,
    ]),
  );

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Belum ada permintaan. Permintaan yang dikirim buyer dari halaman{" "}
        <Link href="/commissions/request" className="font-semibold text-plum hover:underline">
          commissions
        </Link>{" "}
        akan muncul di sini.
      </p>
    );
  }

  return (
    <>
      <StatusSummary
        counts={countByStatus(rows.map((row) => ({ status: row.status })))}
      />
      <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/staff/commissions/${row.id}`}
              className="block py-5 transition-opacity hover:opacity-80"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium text-ink">
                  {buyerNames.get(row.buyer_id) ?? "Pembeli tanpa profil"}
                </p>
                <p className="text-xs text-[#6c6870]">
                  {statusLabel(row.status)} · {formatDate(row.created_at)}
                </p>
              </div>

              <p className="mt-1 text-xs text-[#6c6870]">
                {serviceNames.get(row.service_id) ?? "Layanan tidak tersedia"}
                {row.quote_price !== null && ` · ${formatRupiah(row.quote_price)}`}
              </p>

              {/* line-clamp keeps a long brief from pushing the queue's rhythm
                  apart. The full text is one click away on the detail page. */}
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6c6870]">
                {row.brief}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Counts of open requests per status (roadmap 5.1).
 *
 * No extra query: the queue already read every row, so this groups the same
 * statuses in JavaScript. Renders `{label} ({count})` lines; nothing to click.
 */
function StatusSummary({
  counts,
}: {
  counts: Array<{ status: string; count: number }>;
}) {
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <p className="mt-6 text-sm text-[#6c6870]">
      {total} permintaan —{" "}
      {counts.map((entry) => `${statusLabel(entry.status)} (${entry.count})`).join(" · ")}
    </p>
  );
}
