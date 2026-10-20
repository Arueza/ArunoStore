import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import BackButton from "@/components/BackButton";
import ShopOrderStatus from "@/components/ShopOrderStatus";

export const metadata: Metadata = {
  title: "Pesanan — Ruang Staf",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Order = {
  id: string;
  buyer_id: string;
  status: string;
  total_price: number;
  created_at: string;
  recipient_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  note: string | null;
};

type Buyer = {
  full_name: string;
  email: string;
};

type ItemRow = {
  id: string;
  size: string | null;
  quantity: number;
  price: number;
  consignment_items: {
    name: string;
    consignment_images: {
      image_url: string;
      is_thumbnail: boolean | null;
    }[];
  } | null;
};

type Item = {
  id: string;
  size: string | null;
  quantity: number;
  price: number;
  name: string;
  thumb: string | null;
};

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!UUID.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("shop_orders")
    .select(
      "id, buyer_id, status, total_price, created_at, recipient_name, phone, address, city, province, postal_code, note",
    )
    .eq("id", id)
    .maybeSingle<Order>();

  // RLS answers this for staff; a bad id is a 404 rather than an empty page
  // that looks like an order with nothing on it.
  if (!order) {
    notFound();
  }

  const [buyerResult, itemsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", order.buyer_id)
      .maybeSingle<Buyer>(),
    supabase
      .from("shop_order_items")
      .select(
        "id, size, quantity, price, consignment_items(name, consignment_images(image_url, is_thumbnail))",
      )
      .eq("order_id", order.id)
      .order("created_at"),
  ]);

  const items: Item[] = ((itemsResult.data ?? []) as unknown as ItemRow[]).map(
    (row) => {
    const images = row.consignment_items?.consignment_images ?? [];
    const thumb = images.find((image) => image.is_thumbnail) ?? images[0];

    return {
      id: row.id,
      size: row.size,
      quantity: row.quantity,
      price: row.price,
      name: row.consignment_items?.name ?? "Produk",
      thumb: thumb?.image_url ?? null,
    };
  });

  const addressComplete = Boolean(
    order.recipient_name?.trim() &&
      order.phone?.trim() &&
      order.address?.trim() &&
      order.city?.trim() &&
      order.province?.trim() &&
      order.postal_code?.trim(),
  );

  return (
    <div className="mt-8">
      <BackButton fallback="/staff/orders">← Semua pesanan</BackButton>

      <h1 className="mt-6 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Pesanan #{order.id.slice(0, 8)}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ShopOrderStatus status={order.status} />
        <p className="text-xs text-[#6c6870]">
          {formatDate(order.created_at)}
        </p>
      </div>

      <dl className="mt-6 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">ID pesanan</dt>
          <dd className="min-w-0 break-all font-mono text-xs text-ink">
            {order.id}
          </dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Total</dt>
          <dd className="text-sm font-semibold tabular-nums text-ink">
            {formatRupiah(order.total_price)}
          </dd>
        </div>
      </dl>

      <section className="mt-6 border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Pembeli</h2>
        <p className="mt-2 text-sm text-ink">
          {buyerResult.data?.full_name || "Pembeli tanpa profil"}
        </p>
        {buyerResult.data?.email && (
          <p className="mt-1 text-xs text-[#6c6870]">
            {buyerResult.data.email}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Barang
        </h2>

        <ul className="mt-3 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              {item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
                <img
                  src={item.thumb}
                  alt={item.name}
                  className="h-14 w-14 shrink-0 border border-[#eeeae5] object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 border border-[#eeeae5] bg-white" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-[#6c6870]">
                  {item.size && `Ukuran ${item.size} · `}
                  {item.quantity} × {formatRupiah(item.price)}
                </p>
              </div>

              <p className="text-sm font-semibold tabular-nums text-ink">
                {formatRupiah(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-baseline justify-between border-t border-[#eeeae5] pt-3">
          <p className="text-sm text-[#6c6870]">Total</p>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {formatRupiah(order.total_price)}
          </p>
        </div>
      </section>

      {addressComplete ? (
        <section className="mt-6 border border-[#eeeae5] bg-cream p-5 text-sm leading-relaxed">
          <h2 className="font-display text-lg font-semibold text-ink">
            Alamat pengiriman
          </h2>
          <p className="mt-2 font-medium text-ink">
            {order.recipient_name} · {order.phone}
          </p>
          <p className="text-[#6c6870]">{order.address}</p>
          <p className="text-[#6c6870]">
            {order.city}, {order.province} {order.postal_code}
          </p>
          {order.note && (
            <p className="text-[#6c6870]">Catatan: {order.note}</p>
          )}
        </section>
      ) : (
        <p className="mt-6 border border-[#eeeae5] bg-cream p-5 text-sm text-[#6c6870]">
          Buyer belum mengisi alamat pengiriman.
        </p>
      )}

      <p className="mt-6 text-xs leading-relaxed text-[#b0acb5]">
        Pengiriman katalog diatur lewat DM Instagram.
      </p>
    </div>
  );
}

export default function StaffOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <Suspense>
        <OrderDetail params={params} />
      </Suspense>
    </main>
  );
}
