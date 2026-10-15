import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { STATUS_ORDER, statusLabel } from "@/lib/commissionStatus";
import { quoteTotal } from "@/lib/quote";
import { likePattern } from "@/lib/shop";
import ListFilter from "@/components/ListFilter";
import RatingForm from "@/components/RatingForm";
import { markAsArrived, respondToQuote, saveRating } from "./actions";

export const metadata: Metadata = {
  title: "Titipan Saya — Aruno Store",
};

// Every value request_status can hold on this side. Shared with the commissions
// list's STATUS_ORDER so both dropdowns read in the same order.
const STATUS_VALUES = STATUS_ORDER;

// Spelled out because Supabase has no generated types for this project, so a
// select() string is the only description of the row. Matches 0006's columns the
// buyer is allowed to know about, and nothing else.
type TitipanRequest = {
  id: string;
  product_link: string;
  size: string | null;
  color: string | null;
  quantity: number;
  status: string;
  quote_item_price: number | null;
  quote_shipping: number | null;
  quote_service_fee: number | null;
  quote_note: string | null;
  courier: string | null;
  tracking_number: string | null;
  rating: number | null;
  rating_note: string | null;
  created_at: string;
};

/**
 * A buyer's own requests and where each one has got to.
 *
 * Roadmap 3.8. Reads the rows the buyer wrote at 3.4, filtered to their own, and
 * nothing else — 0006's "Buyers read their own titipan requests" policy already
 * restricts this query to one buyer, and the .eq() below repeats that in the
 * application rather than leaning on the policy alone.
 *
 * The duplication is deliberate, and it is 2.11's reason repeated: if the policy
 * were ever dropped or misspelled, RLS alone would hand one buyer every request
 * in the table and nothing would look wrong. With the .eq() the worst case is an
 * empty list.
 */
export async function MyTitipanRequests({
  search,
  statusFilter,
}: {
  search?: string;
  statusFilter?: string;
} = {}) {
  // The proxy already sent a signed-out visitor to /login. This is the check a
  // page can rely on without: getClaims() reads the verified token and answers
  // null when signed out, rather than trusting the route being guarded.
  const claims = await getClaims();

  if (!claims?.sub) {
    redirect("/login");
  }

  const supabase = await createClient();

  // 5.2: search matches the product link, filter matches the status. Same shape
  // as the commissions list: .eq("buyer_id") stays first so a dropped policy
  // still cannot hand one buyer everybody's parcels.
  const filtered = Boolean(search || statusFilter);
  const dbQuery = supabase
    .from("titipan_requests")
    .select(
      "id, product_link, size, color, quantity, status, quote_item_price, quote_shipping, quote_service_fee, quote_note, courier, tracking_number, rating, rating_note, created_at",
    )
    .eq("buyer_id", claims.sub);

  if (statusFilter) {
    dbQuery.eq("status", statusFilter);
  }

  if (search) {
    dbQuery.ilike("product_link", likePattern(search));
  }

  const { data: requests } = await dbQuery.order("created_at", {
    ascending: false,
  });

  const rows: TitipanRequest[] = requests ?? [];

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        {filtered ? (
          <>
            Tidak ada yang cocok.{" "}
            <Link
              href="/titipan/mine"
              className="font-semibold text-plum hover:underline"
            >
              Lihat semua
            </Link>
            .
          </>
        ) : (
          <>
            Kamu belum mengirim permintaan titipan.{" "}
            <Link
              href="/titipan/request"
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
      {rows.map((row) => {
        const details = [
          row.size,
          row.color,
          row.quantity > 1 ? `${row.quantity} barang` : null,
        ].filter((part): part is string => Boolean(part));

        // All three or none. saveTitipanQuote refuses to write a quote unless
        // every figure is a whole number, so a row cannot hold two of them — and
        // a total computed from a missing figure would be an under-quote the
        // buyer then pays. So the breakdown appears whole or not at all.
        //
        // Shaped as null-or-complete rather than a boolean, because that is what
        // makes the narrowing work: `quoted &&` would leave every field as
        // `number | null` here and the figures would need `!` on all nine. This
        // way TypeScript follows the real conditional and the object that gets
        // through it is complete by construction.
        const quote =
          row.quote_item_price === null ||
          row.quote_shipping === null ||
          row.quote_service_fee === null
            ? null
            : {
                itemPrice: row.quote_item_price,
                shipping: row.quote_shipping,
                serviceFee: row.quote_service_fee,
              };

        return (
          <li key={row.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-ink">
                {statusLabel(row.status)}
              </p>
              <p className="text-xs text-[#6c6870]">
                {formatDate(row.created_at)}
              </p>
            </div>

            {/* The shop the buyer chose. 3.3 refuses anything but http/https, so
                rendering it as an href cannot execute what they typed. */}
            <p className="mt-2 text-sm">
              <a
                href={row.product_link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-plum hover:underline"
              >
                {row.product_link}
              </a>
            </p>

            {details.length > 0 && (
              <p className="mt-1 text-xs text-[#6c6870]">{details.join(" · ")}</p>
            )}

            {/* The quote staff wrote at 3.6, broken into the three parts the
                shop actually charged and the sum of them. No total is stored
                beside them on purpose, and quoteTotal() is the same function the
                staff box and the /titipan worked example call — one sum in the
                repository, not three that can disagree. */}
            {quote && (
              <dl className="mt-3 space-y-1">
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-[#6c6870]">Harga barang</dt>
                  <dd>{formatRupiah(quote.itemPrice)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-[#6c6870]">Ongkir</dt>
                  <dd>{formatRupiah(quote.shipping)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-[#6c6870]">Biaya layanan</dt>
                  <dd>{formatRupiah(quote.serviceFee)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#eeeae5] pt-1 text-sm font-medium">
                  <dt>Total</dt>
                  <dd>{formatRupiah(quoteTotal(quote))}</dd>
                </div>
              </dl>
            )}

            {/* null rather than "" is what a blank note is stored as, so this
                distinguishes "staff had nothing to add" from a broken cell. */}
            {quote && row.quote_note && (
              <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
                {row.quote_note}
              </p>
            )}
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

            {row.status === "accepted" && (
              <div className="mt-4">
                <Link
                  href={`/checkout?type=titipan&id=${row.id}`}
                  className="inline-block bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
                >
                  Bayar
                </Link>
              </div>
            )}

            {(row.status === "shipped" || row.status === "arrived") &&
              row.courier &&
              row.tracking_number && (
                <div className="mt-3 text-sm">
                  <span className="text-[#6c6870]">Pengiriman: </span>
                  <span className="font-medium text-ink">
                    {row.courier} · {row.tracking_number}
                  </span>
                </div>
              )}

            {row.status === "shipped" && (
              <form action={markAsArrived} className="mt-4">
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="border border-[#e2ddd7] px-5 py-2 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-plum"
                >
                  Tandai sudah sampai
                </button>
              </form>
            )}

            {/* 5.3: rating form appears once the parcel has arrived. The action
                re-checks status='arrived', so a forged form cannot rate a
                parcel still in transit. */}
            {row.status === "arrived" && (
              <RatingForm
                action={saveRating}
                id={row.id}
                existingRating={row.rating}
                existingNote={row.rating_note}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MyTitipanRequestsPage({
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
        Titipan Saya
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Permintaan yang kamu kirim, dan kutipannya kalau sudah keluar.
      </p>

      <Suspense>
        <SaveNotice searchParams={searchParams} />
      </Suspense>

      {/* 5.2: reads ?q= and ?status= behind its own boundary — same rule as the
          commissions list, and for the same reason: searchParams is a request
          read, and awaiting it in the page body breaks the static shell. */}
      <Suspense>
        <FilteredList searchParams={searchParams} />
      </Suspense>

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <Link
          href="/titipan/request"
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
 * A blank query and no status render the plain list, so clearing the form and
 * reloading differ in nothing.
 */
async function FilteredList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const search = q?.trim() || undefined;
  const statusFilter = status?.trim() || undefined;

  // Only real statuses reach the query — same reason as the commissions list.
  const safeStatus = STATUS_VALUES.includes(statusFilter ?? "")
    ? statusFilter
    : undefined;

  return (
    <>
      <ListFilter
        search={search}
        statusFilter={safeStatus}
        statuses={STATUS_VALUES}
        searchPlaceholder="Cari link produk…"
        baseHref="/titipan/mine"
      />
      <MyTitipanRequests search={search} statusFilter={safeStatus} />
    </>
  );
}

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
