import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import ListFilter from "@/components/ListFilter";
import ShopOrderStatus from "@/components/ShopOrderStatus";
import {
  SHOP_ORDER_STATUSES,
  shopOrderStatusGroup,
  shopOrderStatusLabel,
} from "@/lib/paymentStatus";

export const metadata: Metadata = {
  title: "Pesanan katalog — Ruang Staf",
};

/**
 * Staff purchase history (roadmap 5.33).
 *
 * shop_orders is the order row for catalogue purchases: one row per basket,
 * status moved by the payment webhook. Staff could already read the table
 * (0037's "Staff read every shop_order"), but nothing on the site listed it,
 * so the order ID the buyer is told to send on Instagram had nowhere for staff
 * to be looked up.
 *
 * The list joins in JavaScript, not in a PostgREST embed, for the same reason
 * as the commission and titipan queues: shop_orders.buyer_id references
 * auth.users, not profiles, so there is no foreign key for Supabase to follow.
 *
 * `ponytail:` search and status filter run over every row already fetched.
 * Move them into SQL (`ilike` on the joined names, pagination) when orders
 * exceed a few hundred.
 */
type OrderRow = {
  id: string;
  buyer_id: string;
  status: string;
  total_price: number;
  created_at: string;
};

type Buyer = {
  id: string;
  full_name: string;
  email: string;
};

type ItemRow = {
  order_id: string;
  quantity: number;
  consignment_items: { name: string } | { name: string }[] | null;
};

type Entry = {
  order: OrderRow;
  buyerName: string;
  itemSummary: string;
};

const SHOP_ORDER_LABELS: Record<string, string> = Object.fromEntries(
  SHOP_ORDER_STATUSES.map((status) => [status, shopOrderStatusLabel(status)]),
);

const SUMMARY_GROUPS = [
  { group: "pending", label: "Menunggu pembayaran" },
  { group: "settled", label: "Lunas" },
  { group: "failed", label: "Gagal / kedaluwarsa" },
] as const;

function itemSummary(lines: { name: string; quantity: number }[]): string {
  if (lines.length === 0) return "Barang tanpa nama";

  const first = `${lines[0].name} ×${lines[0].quantity}`;
  if (lines.length === 1) return first;

  return `${first} +${lines.length - 1} lainnya`;
}

async function StaffOrderList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q: qParam, status: statusParam } = await searchParams;

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("shop_orders")
    .select("id, buyer_id, status, total_price, created_at")
    .order("created_at", { ascending: false });

  const rows: OrderRow[] = orders ?? [];

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
        Belum ada pembelian katalog. Pesanan dari{" "}
        <Link href="/shop" className="font-semibold text-plum hover:underline">
          katalog
        </Link>{" "}
        akan muncul di sini.
      </p>
    );
  }

  const orderIds = rows.map((row) => row.id);
  const buyerIds = [...new Set(rows.map((row) => row.buyer_id))];

  const [itemsResult, buyersResult] = await Promise.all([
    supabase
      .from("shop_order_items")
      .select("order_id, quantity, consignment_items(name)")
      .in("order_id", orderIds),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerIds),
  ]);

  const buyerNames = new Map(
    (buyersResult.data ?? []).map((buyer: Buyer) => [
      buyer.id,
      buyer.full_name || buyer.email || "Pembeli tanpa profil",
    ]),
  );

  const linesByOrder = new Map<string, { name: string; quantity: number }[]>();
  for (const item of (itemsResult.data ?? []) as ItemRow[]) {
    const nested = item.consignment_items;
    const name = Array.isArray(nested) ? nested[0]?.name : nested?.name;
    if (!name) continue;

    const lines = linesByOrder.get(item.order_id) ?? [];
    lines.push({ name, quantity: item.quantity });
    linesByOrder.set(item.order_id, lines);
  }

  const entries: Entry[] = rows.map((order) => {
    const lines = linesByOrder.get(order.id) ?? [];
    return {
      order,
      buyerName: buyerNames.get(order.buyer_id) ?? "Pembeli tanpa profil",
      itemSummary: itemSummary(lines),
    };
  });

  const counts = { pending: 0, settled: 0, failed: 0 };
  for (const row of rows) {
    counts[shopOrderStatusGroup(row.status)] += 1;
  }

  const safeStatus = SHOP_ORDER_STATUSES.includes(statusParam ?? "")
    ? statusParam
    : undefined;
  const query = qParam?.trim().replace(/^#/, "").toLowerCase();

  const filtered = entries.filter((entry) => {
    if (safeStatus && entry.order.status !== safeStatus) return false;
    if (!query) return true;

    return (
      entry.order.id.toLowerCase().includes(query) ||
      entry.buyerName.toLowerCase().includes(query) ||
      entry.itemSummary.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <p className="mt-6 text-sm text-[#6c6870]">
        {rows.length} pesanan —{" "}
        {SUMMARY_GROUPS.map(
          (group) => `${group.label} (${counts[group.group]})`,
        ).join(" · ")}
      </p>

      <ListFilter
        search={qParam?.trim()}
        statusFilter={safeStatus}
        statuses={SHOP_ORDER_STATUSES}
        labels={SHOP_ORDER_LABELS}
        searchPlaceholder="Cari nama, email, barang, atau ID…"
        baseHref="/staff/orders"
      />

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm leading-relaxed text-[#6c6870]">
          Tidak ada yang cocok. Coba kata kunci atau status lain.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          {filtered.map((entry) => (
            <li key={entry.order.id} className="py-5">
              <Link
                href={`/staff/orders/${entry.order.id}`}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {entry.buyerName}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-[#6c6870]">
                    {entry.itemSummary}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#b0acb5]">
                    #{entry.order.id.slice(0, 8)}
                  </p>
                </div>

                <div className="text-right">
                  <ShopOrderStatus status={entry.order.status} />
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                    {formatRupiah(entry.order.total_price)}
                  </p>
                  <p className="text-xs text-[#6c6870]">
                    {formatDate(entry.order.created_at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Pesanan katalog
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Semua pembelian dari katalog, terbaru dulu.
      </p>

      <Suspense>
        <StaffOrderList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
