import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { statusLabel } from "@/lib/commissionStatus";
import { respondToQuote } from "./actions";

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
    .select("id, service_id, brief, status, quote_price, quote_note, created_at")
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
            <div className="mt-3">
              <p className="text-sm">
                <span className="text-[#6c6870]">Kutipan: </span>
                <span className="font-medium text-ink">
                  {formatRupiah(row.quote_price)}
                </span>
              </p>
              {row.quote_note && (
                <p className="mt-1 text-sm leading-relaxed text-[#6c6870]">
                  {row.quote_note}
                </p>
              )}
            </div>
          )}

          {/* Accept or decline a quote. Two plain forms posting to the same
              server action — no client component, no state. A decline is final
              and an accept is irreversible from this page, so the buttons only
              appear while the row is still quoted. */}
          {row.status === "quoted" && (
            <div className="mt-4 flex gap-3">
              <form action={respondToQuote}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="accept" />
                <button
                  type="submit"
                  className="bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
                >
                  Terima
                </button>
              </form>
              <form action={respondToQuote}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="decline" />
                <button
                  type="submit"
                  className="border border-[#e2ddd7] px-5 py-2 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-plum"
                >
                  Tolak
                </button>
              </form>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Commissions Saya
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Permintaan yang kamu kirim, dan statusnya sekarang.
      </p>

      <Suspense>
        <SaveNotice searchParams={searchParams} />
      </Suspense>

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

/**
 * What the server said about the last accept or decline.
 *
 * The action redirects with ?saved=1 or ?error=…, so the query string is the
 * whole of the feedback. Its own Suspense boundary because reading searchParams
 * is a request read: under cacheComponents that is a build error outside one.
 */
async function SaveNotice({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  return (
    <p role="status" className="mt-4 min-h-5 text-sm text-[#6c6870]">
      {error && <span className="font-medium text-plum">{error}</span>}
      {!error && saved === "1" && (
        <span className="font-medium text-ink">
          Keputusan tersimpan.
        </span>
      )}
    </p>
  );
}