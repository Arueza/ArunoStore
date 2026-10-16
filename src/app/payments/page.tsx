import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  paymentGroup,
  paymentStatusLabel,
} from "@/lib/paymentStatus";
import InstagramHelpBox from "@/components/InstagramHelpBox";

export const metadata: Metadata = {
  title: "Riwayat transaksi — Aruno Store",
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  payment_type: string | null;
  transaction_id: string | null;
  commission_id: string | null;
  titipan_request_id: string | null;
  shop_order_id: string | null;
  created_at: string;
};

type HistoryEntry = {
  key: string;
  kind: "commission" | "titipan" | "shop";
  orderId: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  paymentType: string | null;
  createdAt: string;
  payHref: string | null;
  detailHref: string;
};

/**
 * The buyer's payment history: one row per order, newest Snap attempt shown.
 *
 * Reads `payments` — the one table all three halves write through
 * /api/checkout — filtered to this buyer. 0033's "Buyers read their own
 * payments" policy already restricts the query, and the .eq() below repeats
 * that in the application rather than leaning on the policy alone: if the
 * policy were ever dropped, RLS alone would hand one buyer every payment in
 * the table. Same deliberate duplication as the commissions and titipan lists.
 *
 * Labels are joined in JavaScript, not in a PostgREST embed — the same reason
 * as both staff queues. Sections are pending first (with a pay link), then
 * settled, then failed, each newest first.
 */
async function PaymentHistory() {
  const claims = await getClaims();

  if (!claims?.sub) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, status, payment_type, transaction_id, commission_id, titipan_request_id, shop_order_id, created_at",
    )
    .eq("buyer_id", claims.sub)
    .order("created_at", { ascending: false });

  const rows: PaymentRow[] = payments ?? [];

  // Newest attempt per order wins. Rows arrive newest first, so the first row
  // seen for an order is the one the buyer acted on last.
  const latest = new Map<string, PaymentRow>();
  for (const row of rows) {
    const key = row.commission_id ?? row.titipan_request_id ?? row.shop_order_id;
    if (key && !latest.has(key)) {
      latest.set(key, row);
    }
  }

  if (latest.size === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Kamu belum melakukan pembayaran.{" "}
        <Link href="/shop" className="font-semibold text-plum hover:underline">
          Mulai belanja
        </Link>
        .
      </p>
    );
  }

  const commissionIds = [...latest.values()].map((r) => r.commission_id).filter(
    (id): id is string => id !== null,
  );
  const titipanIds = [...latest.values()].map((r) => r.titipan_request_id).filter(
    (id): id is string => id !== null,
  );
  const shopIds = [...latest.values()].map((r) => r.shop_order_id).filter(
    (id): id is string => id !== null,
  );

  const { data: commissions } = commissionIds.length
    ? await supabase
        .from("commissions")
        .select("id, brief, service_id")
        .in("id", commissionIds)
    : { data: [] as { id: string; brief: string; service_id: string }[] };

  const serviceIds = [...new Set((commissions ?? []).map((c) => c.service_id))];
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] as { id: string; name: string }[] };
  const serviceNames = new Map((services ?? []).map((s) => [s.id, s.name]));

  const { data: titipanRows } = titipanIds.length
    ? await supabase
        .from("titipan_requests")
        .select("id, product_link, size, color, quantity")
        .in("id", titipanIds)
    : {
        data: [] as {
          id: string;
          product_link: string;
          size: string | null;
          color: string | null;
          quantity: number;
        }[],
      };

  const { data: shopItems } = shopIds.length
    ? await supabase
        .from("shop_order_items")
        .select("order_id, quantity, consignment_items(name)")
        .in("order_id", shopIds)
    : {
        data: [] as {
          order_id: string;
          quantity: number;
          consignment_items: { name: string } | { name: string }[] | null;
        }[],
      };

  const titipanById = new Map((titipanRows ?? []).map((t) => [t.id, t]));
  const shopByOrder = new Map<string, { name: string; quantity: number }[]>();
  for (const item of shopItems ?? []) {
    const name = Array.isArray(item.consignment_items)
      ? item.consignment_items[0]?.name
      : item.consignment_items?.name;
    if (!name) continue;
    const lines = shopByOrder.get(item.order_id) ?? [];
    lines.push({ name, quantity: item.quantity });
    shopByOrder.set(item.order_id, lines);
  }

  const entries: HistoryEntry[] = [];
  for (const [key, row] of latest) {
    if (row.commission_id) {
      const order = (commissions ?? []).find((c) => c.id === key);
      entries.push({
        key,
        kind: "commission",
        orderId: key,
        title: `Commission — ${serviceNames.get(order?.service_id ?? "") ?? "Layanan"}`,
        description: order?.brief ?? null,
        amount: row.amount,
        status: row.status,
        paymentType: row.payment_type,
        createdAt: row.created_at,
        payHref:
          row.status === "pending"
            ? `/checkout?type=commission&id=${key}`
            : null,
        detailHref: "/commissions/mine",
      });
    } else if (row.titipan_request_id) {
      const order = titipanById.get(key);
      const details = [
        order?.size,
        order?.color,
        order && order.quantity > 1 ? `${order.quantity} barang` : null,
      ].filter((part): part is string => Boolean(part));
      entries.push({
        key,
        kind: "titipan",
        orderId: key,
        title: "Titipan",
        description: order
          ? [order.product_link, details.join(" · ")]
              .filter(Boolean)
              .join(" — ")
          : null,
        amount: row.amount,
        status: row.status,
        paymentType: row.payment_type,
        createdAt: row.created_at,
        payHref:
          row.status === "pending" ? `/checkout?type=titipan&id=${key}` : null,
        detailHref: "/titipan/mine",
      });
    } else if (row.shop_order_id) {
      const lines = shopByOrder.get(key) ?? [];
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      entries.push({
        key,
        kind: "shop",
        orderId: key,
        title:
          lines.length === 0
            ? "Belanja katalog"
            : lines.length === 1
              ? lines[0].name
              : `${lines[0].name} +${lines.length - 1} lainnya`,
        description:
          lines.length === 0
            ? null
            : `${totalQty} barang — ${lines.map((l) => `${l.name} ×${l.quantity}`).join(", ")}`,
        amount: row.amount,
        status: row.status,
        paymentType: row.payment_type,
        createdAt: row.created_at,
        payHref:
          row.status === "pending" ? `/checkout?type=shop&id=${key}` : null,
        // The unified checkout doubles as the shop receipt once paid.
        detailHref: `/checkout?type=shop&id=${key}`,
      });
    }
  }

  const pending = entries.filter((e) => paymentGroup(e.status) === "pending");
  const settled = entries.filter((e) => paymentGroup(e.status) === "settled");
  const failed = entries.filter((e) => paymentGroup(e.status) === "failed");

  return (
    <>
      <HistorySection
        title="Menunggu pembayaran"
        entries={pending}
        empty="Tidak ada tagihan menunggu."
      />
      <HistorySection
        title="Sudah lunas"
        entries={settled}
        empty="Belum ada pembayaran lunas."
        instagram
      />
      <HistorySection
        title="Gagal atau kedaluwarsa"
        entries={failed}
        empty="Tidak ada pembayaran gagal."
      />
    </>
  );
}

function HistorySection({
  title,
  entries,
  empty,
  instagram,
}: {
  title: string;
  entries: HistoryEntry[];
  empty: string;
  instagram?: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        {title} ({entries.length})
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-[#6c6870]">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          {entries.map((entry) => (
            <li key={entry.key} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium text-ink">{entry.title}</p>
                <p className="text-xs text-[#6c6870]">
                  {paymentStatusLabel(entry.status)} · {formatDate(entry.createdAt)}
                </p>
              </div>

              {entry.description && (
                <p className="mt-2 line-clamp-2 break-all text-sm leading-relaxed text-[#6c6870]">
                  {entry.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm">
                  <span className="text-[#6c6870]">
                    {entry.paymentType ?? "Metode belum diketahui"} ·{" "}
                  </span>
                  <span className="font-medium text-ink">
                    {formatRupiah(entry.amount)}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                {entry.payHref && (
                  <Link
                    href={entry.payHref}
                    className="inline-block bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
                  >
                    Bayar
                  </Link>
                )}
                <Link
                  href={entry.detailHref}
                  className="inline-block border border-[#e2ddd7] px-5 py-2 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-plum"
                >
                  Lihat pesanan
                </Link>
              </div>

              {/* Settled orders resolve delivery over Instagram DMs: the
                  buyer sends the paid screenshot, staff finishes shipping. */}
              {instagram && <InstagramHelpBox orderId={entry.orderId} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PaymentHistoryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Riwayat transaksi
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Semua pembayaran kamu — yang menunggu dan yang sudah lunas.
      </p>

      <Suspense>
        <PaymentHistory />
      </Suspense>
    </main>
  );
}
