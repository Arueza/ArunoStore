import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import { countByStatus, statusLabel } from "@/lib/commissionStatus";

export const metadata: Metadata = {
  title: "Titipan — Ruang Staf",
};

// Spelled out because Supabase has no generated types for this project, so a
// select() string is the only description of the row. Matches 0006's columns and
// nothing else — every one of them is read below.
type TitipanRequest = {
  id: string;
  buyer_id: string;
  product_link: string;
  size: string | null;
  color: string | null;
  quantity: number;
  budget: number | null;
  status: string;
  created_at: string;
};

/**
 * The titipan queue: every request, newest first, for both sellers.
 *
 * Roadmap 3.5, and Alfreza's half of what 1.8's guard was built to protect.
 *
 * Access is decided entirely by the proxy, never here. This component renders
 * only after the guard has let the request through, so a role check in this file
 * would be a second, weaker copy of the same decision.
 *
 * The buyer's name is fetched separately and joined in JavaScript rather than
 * asked for as a PostgREST embed, for the reason 2.8 gives: titipan_requests
 * .buyer_id references auth.users, not profiles, so there is no foreign key for
 * PostgREST to follow.
 *
 * Rows carry two links rather than being one big link themselves: the product
 * link out to the shop, and the link to the detail page where the quote is
 * written. One link wrapping the row would put an <a> inside an <a>, which is
 * invalid and unpredictable to click.
 */
export async function TitipanQueue() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("titipan_requests")
    .select(
      "id, buyer_id, product_link, size, color, quantity, budget, status, created_at",
    )
    // Newest first, the order a queue is read in. 0006 has no index on
    // created_at, so this is a sequential scan until one exists.
    .order("created_at", { ascending: false });

  const rows: TitipanRequest[] = requests ?? [];

  // profiles has no write policy but 0019 lets staff read every row, so one
  // lookup covers every buyer in the queue. An id with no row leaves the label
  // as a dash rather than dropping the request, because a request whose buyer
  // cannot be named is still a request.
  const buyerIds = [...new Set(rows.map((row) => row.buyer_id))];

  const { data: buyers } = buyerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", buyerIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };

  const buyerNames = new Map(
    ((buyers ?? []) as { id: string; full_name: string | null; email: string }[]).map(
      (buyer) => [buyer.id, buyer.full_name || buyer.email],
    ),
  );

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Belum ada permintaan titipan. Yang dikirim buyer dari halaman{" "}
        <Link
          href="/titipan/request"
          className="font-semibold text-plum hover:underline"
        >
          minta titipan
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
        {rows.map((row) => {
          // What the buyer already told staff, in one line. Quantity only shows
          // above one: "1 barang" on every row is noise, and a quantity of one is
          // what most rows will say.
          const details = [
            row.size,
            row.color,
            row.quantity > 1 ? `${row.quantity} barang` : null,
          ].filter((part): part is string => Boolean(part));

          return (
            <li key={row.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium text-ink">
                  {buyerNames.get(row.buyer_id) ?? "Pembeli tanpa profil"}
                </p>
                <p className="text-xs text-[#6c6870]">
                  {statusLabel(row.status)} · {formatDate(row.created_at)}
                </p>
              </div>

              {/* The one thing staff need before they can price anything. 0006
                  stores it as plain text and 3.3 refuses anything but http/https,
                  so rendering it as an href cannot execute what the buyer typed. */}
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

              {/* The buyer's guess, labelled as one. A quote does not exist yet —
                  0006 ships no update policy — and a bare figure would read as a
                  price the shop has agreed to. */}
              {row.budget !== null && (
                <p className="mt-1 text-xs text-[#6c6870]">
                  Perkiraan budget {formatRupiah(row.budget)}
                </p>
              )}

              <Link
                href={`/staff/titipan/${row.id}`}
                className="mt-3 inline-block text-sm font-semibold text-plum hover:underline"
              >
                Buka & tulis kutipan →
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Counts of open requests per status (roadmap 5.1).
 *
 * Same shape as the commission queue: groups the rows already read, renders
 * `{label} ({count})` lines, nothing to click.
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

export default function StaffTitipanPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Permintaan titipan
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Permintaan titipan yang masuk, terbaru lebih dulu.
      </p>

      <nav aria-label="Menu staf" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/staff" className="font-semibold text-plum hover:underline">
          Permintaan commission
        </Link>
        <Link href="/staff/artworks" className="font-semibold text-plum hover:underline">
          Galeri karya
        </Link>
      </nav>

      {/* The queue reads cookies through createClient(), so it cannot be
          prerendered. The boundary is what lets the heading above ship in the
          static shell while the list streams in behind it. */}
      <Suspense>
        <TitipanQueue />
      </Suspense>
    </main>
  );
}