import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { statusLabel } from "@/lib/commissionStatus";

export const metadata: Metadata = {
  title: "Commissions Saya — Aruno Store",
};

/**
 * A buyer's own requests and where each one has got to.
 *
 * Roadmap 2.11. Reads the same rows the buyer wrote at 2.7, filtered to their own,
 * and nothing else — 0005's "Buyers read their own commissions" policy already
 * restricts this query to one buyer, and the .eq() below repeats that in the
 * application rather than leaning on the policy alone.
 *
 * The duplication is deliberate. If the policy were ever dropped or misspelled,
 * RLS alone would hand one buyer every commission in the table, and nothing would
 * look wrong. With the .eq() the worst case is an empty list.
 */
async function MyCommissions() {
  // The proxy already sent a signed-out visitor to /login. This is the same
  // check a page can rely on without: getClaims() reads the verified token and
  // answers null for signed out, rather than trusting the route being guarded.
  const claims = await getClaims();

  if (!claims?.sub) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: commissions } = await supabase
    .from("commissions")
    .select("id, service_id, brief, status, quote_price, created_at")
    .eq("buyer_id", claims.sub)
    .order("created_at", { ascending: false });

  const rows = commissions ?? [];

  // Same reason as the staff queue: no foreign key to services on the join path
  // we would want, and one mechanism for looking a name up is shorter than two.
  const serviceIds = [...new Set(rows.map((row) => row.service_id))];

  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] as { id: string; name: string }[] };

  const serviceNames = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Kamu belum mengirim permintaan.{" "}
        <Link
          href="/commissions/request"
          className="font-semibold text-plum hover:underline"
        >
          Kirim yang pertama
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
      {rows.map((row) => (
        <li key={row.id} className="py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-medium text-ink">
              {serviceNames.get(row.service_id) ?? "Layanan tidak tersedia"}
            </p>
            <p className="text-xs text-[#6c6870]">
              {statusLabel(row.status)} · {formatDate(row.created_at)}
            </p>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6c6870]">
            {row.brief}
          </p>

          {/* The quote only exists once staff has sent one. Showing a price before
              then would imply a price was agreed. */}
          {row.quote_price !== null && (
            <p className="mt-3 text-sm">
              <span className="text-[#6c6870]">Kutipan: </span>
              <span className="font-medium text-ink">
                {formatRupiah(row.quote_price)}
              </span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyCommissionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Commissions Saya
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Permintaan yang kamu kirim, dan statusnya sekarang.
      </p>

      <Suspense>
        <MyCommissions />
      </Suspense>

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <Link
          href="/commissions/request"
          className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Kirim permintaan lain
        </Link>
      </div>
    </main>
  );
}