import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { STATUS_ORDER, statusLabel } from "@/lib/commissionStatus";
import { likePattern } from "@/lib/shop";
import ListFilter from "@/components/ListFilter";
import RatingForm from "@/components/RatingForm";
import SubmitButton from "@/components/SubmitButton";
import { respondToQuote, saveRating } from "./actions";

export const metadata: Metadata = {
  title: "Commissions Saya — Aruno Store",
};

// The statuses a buyer can filter by. request_status holds more values on the
// titipan side (purchased, shipped, arrived), so the list is per page rather
// than shared: a commission row can never carry those.
const STATUS_VALUES = STATUS_ORDER.filter((status) =>
  ["requested", "quoted", "accepted", "declined", "paid"].includes(status),
);

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
export async function MyCommissions({
  search,
  statusFilter,
}: {
  search?: string;
  statusFilter?: string;
} = {}) {
  // The proxy already sent a signed-out visitor to /login. This is the same
  // check a page can rely on without: getClaims() reads the verified token and
  // answers null for signed out, rather than trusting the route being guarded.
  const claims = await getClaims();

  if (!claims?.sub) {
    redirect("/login");
  }

  const supabase = await createClient();

  // 5.2: search matches the brief, filter matches the status. Both narrow the
  // same query the list already ran; the .eq("buyer_id") stays first so a
  // dropped policy still cannot hand one buyer everybody's rows.
  const filtered = Boolean(search || statusFilter);
  const dbQuery = supabase
    .from("commissions")
    .select("id, service_id, brief, status, quote_price, quote_note, delivery_image, rating, rating_note, created_at")
    .eq("buyer_id", claims.sub);

  if (statusFilter) {
    dbQuery.eq("status", statusFilter);
  }

  if (search) {
    dbQuery.ilike("brief", likePattern(search));
  }

  const { data: commissions } = await dbQuery.order("created_at", {
    ascending: false,
  });

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

  // Generate signed URLs for delivery images in one pass. The bucket is
  // private, so each image needs its own time-limited URL. Only rows that
  // actually have a delivery_image produce a request.
  const deliveryPaths = rows
    .map((row) => row.delivery_image)
    .filter((path): path is string => path !== null);

  const deliveryUrls = new Map<string, string>();

  if (deliveryPaths.length > 0) {
    const results = await Promise.all(
      deliveryPaths.map((path) =>
        supabase.storage
          .from("commission-deliveries")
          .createSignedUrl(path, 3600)
          .then(({ data }) => [path, data?.signedUrl ?? ""] as const),
      ),
    );

    for (const [path, url] of results) {
      if (url) deliveryUrls.set(path, url);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        {filtered ? (
          <>
            Tidak ada yang cocok.{" "}
            <Link
              href="/commissions/mine"
              className="font-semibold text-plum hover:underline"
            >
              Lihat semua
            </Link>
            .
          </>
        ) : (
          <>
            Kamu belum mengirim permintaan.{" "}
            <Link
              href="/commissions/request"
              className="font-semibold text-plum hover:underline"
            >
              Kirim yang pertama
            </Link>
            .
          </>
        )}
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
                <SubmitButton
                  pendingLabel="Memproses…"
                  className="bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white hover:opacity-90 disabled:opacity-50"
                >
                  Terima
                </SubmitButton>
              </form>
              <form action={respondToQuote}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="decline" />
                <SubmitButton
                  pendingLabel="Memproses…"
                  className="border border-[#e2ddd7] px-5 py-2 text-xs uppercase tracking-[0.18em] text-ink hover:border-plum disabled:opacity-50"
                >
                  Tolak
                </SubmitButton>
              </form>
            </div>
          )}

          {/* Bayar link for accepted orders — buyer pays before staff delivers. */}
          {row.status === "accepted" && (
            <div className="mt-4">
              <Link
                href={`/checkout?type=commission&id=${row.id}`}
                className="inline-block bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
              >
                Bayar
              </Link>
            </div>
          )}

          {/* The finished drawing, visible to this buyer only. The signed URL
              expires; the bucket is private, and only this buyer's RLS-gated
              read reached the path that produced it. */}
          {row.delivery_image && deliveryUrls.has(row.delivery_image) && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; next/image caches past expiry.
            <img
              src={deliveryUrls.get(row.delivery_image)!}
              alt="Hasil gambar"
              className="mt-4 w-full border border-[#eeeae5]"
            />
          )}

          {/* 5.3: rating form appears once the drawing has been delivered.
              The action re-checks delivery_image, so a forged form cannot
              rate an unfinished commission. */}
          {row.delivery_image && (
            <RatingForm
              action={saveRating}
              id={row.id}
              existingRating={row.rating}
              existingNote={row.rating_note}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    q?: string;
    status?: string;
  }>;
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

      {/* 5.2: reads ?q= and ?status= behind its own boundary — same rule as
          /shop's search, and for the same reason: searchParams is a request
          read, and awaiting it in the page body breaks the static shell. */}
      <Suspense>
        <FilteredList searchParams={searchParams} />
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
 * Awaits the filter query string, then hands the list its search and status.
 *
 * Separated from the page body because the page shell must prerender without
 * reading the request — /shop's ShopGridFromQuery for the same reason. A blank
 * query and no status render the plain list, so clearing the form and reloading
 * differ in nothing.
 */
async function FilteredList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const search = q?.trim() || undefined;
  const statusFilter = status?.trim() || undefined;

  // Only real statuses reach the query — a forged value would otherwise match
  // nothing and read as an empty list rather than as a bad filter. Unknown
  // values fall back to unfiltered rather than to zero rows.
  const safeStatus = STATUS_VALUES.includes(statusFilter ?? "")
    ? statusFilter
    : undefined;

  return (
    <>
      <ListFilter
        search={search}
        statusFilter={safeStatus}
        statuses={STATUS_VALUES}
        searchPlaceholder="Cari brief…"
        baseHref="/commissions/mine"
      />
      <MyCommissions search={search} statusFilter={safeStatus} />
    </>
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