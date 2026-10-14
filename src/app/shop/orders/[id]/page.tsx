import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pesanan — Aruno Store",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  settled: "Lunas",
  deny: "Ditolak",
  expire: "Kedaluwarsa",
};

async function OrderLoader({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();

  const claims = await getClaims();

  if (!claims?.sub) redirect("/login");

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("shop_orders")
    .select(
      "id, status, total_price, created_at, shop_order_items(item_id, size, quantity, price, consignment_items(name, consignment_images(image_url, is_thumbnail)))",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      status: string;
      total_price: number;
      created_at: string;
      shop_order_items: {
        item_id: string;
        size: string | null;
        quantity: number;
        price: number;
        consignment_items: {
          name: string;
          consignment_images: { image_url: string; is_thumbnail: boolean | null }[];
        };
      }[];
    }>();

  if (!order || order.id !== id) notFound();

  // Guard: buyer sees own order, staff sees all.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();

  const isStaff = profile?.role === "staff";

  if (!isStaff) {
    const { data: ownership } = await supabase
      .from("shop_orders")
      .select("buyer_id")
      .eq("id", id)
      .maybeSingle();

    if (!ownership || ownership.buyer_id !== claims.sub) notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <Link
        href="/shop"
        className="text-xs uppercase tracking-[0.14em] text-[#6c6870] hover:text-plum"
      >
        ← Kembali ke katalog
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Pesanan
      </h1>

      <p className="mt-3 text-sm text-[#6c6870]">
        Status:{" "}
        <span className="font-medium text-ink">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </p>

      <p className="mt-1 text-xs text-[#b0acb5]">
        {new Date(order.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
        {order.shop_order_items.map((item) => {
          const thumb =
            item.consignment_items.consignment_images.find(
              (img) => img.is_thumbnail,
            ) ??
            item.consignment_items.consignment_images[0];

          return (
            <li
              key={`${item.item_id}-${item.size ?? "nosize"}`}
              className="flex items-center gap-4 py-4"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#eeeae5] bg-cream">
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
                  <img
                    src={thumb.image_url}
                    alt={item.consignment_items.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {item.consignment_items.name}
                </p>
                {item.size && (
                  <p className="mt-0.5 text-xs text-[#6c6870]">
                    Ukuran {item.size}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-[#6c6870]">
                  {item.quantity} × {formatRupiah(item.price)}
                </p>
              </div>

              <p className="text-sm font-semibold text-ink">
                {formatRupiah(item.price * item.quantity)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-sm text-[#6c6870]">Total</p>
        <p className="text-2xl font-semibold text-ink">
          {formatRupiah(order.total_price)}
        </p>
      </div>

      {order.status === "pending" && (
        <Link
          href={`/checkout?type=shop&id=${order.id}`}
          className="mt-8 inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Bayar sekarang
        </Link>
      )}
    </main>
  );
}

async function OrderContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderLoader id={id} />;
}

export default function ShopOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <OrderContent params={params} />
    </Suspense>
  );
}
