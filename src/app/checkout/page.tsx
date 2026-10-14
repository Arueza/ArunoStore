import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { quoteTotal } from "@/lib/quote";
import { SnapButton } from "./SnapButton";

export const metadata: Metadata = {
  title: "Pembayaran — Aruno Store",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function CheckoutContent({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const { type, id } = await searchParams;

  if (type !== "commission" && type !== "titipan" && type !== "shop") {
    redirect("/commissions/mine");
  }

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/commissions/mine");
  }

  const claims = await getClaims();

  if (!claims?.sub) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Shop orders: created by createShopOrder from the cookie cart, status
  // "pending" until Snap settles. Amount is total_price, set at order time.
  if (type === "shop") {
    const { data: order, error } = await supabase
      .from("shop_orders")
      .select("id, buyer_id, status, total_price")
      .eq("id", id)
      .maybeSingle();

    if (error || !order || order.buyer_id !== claims.sub) {
      redirect("/shop");
    }

    if (order.status !== "pending") {
      redirect(`/shop/orders/${order.id}`);
    }

    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Pembayaran
        </h1>

        <p className="mt-4 text-sm text-[#6c6870]">Pesanan</p>

        <p className="mt-6 text-3xl font-semibold text-ink">
          {formatRupiah(order.total_price)}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-[#6c6870]">
          Kamu akan diarahkan ke halaman pembayaran Snap Midtrans. Setelah selesai,
          kamu kembali ke halaman pesanan.
        </p>

        <div className="mt-8">
          <SnapButton
            type="shop"
            id={order.id}
            redirectPath={`/shop/orders/${order.id}?saved=1`}
          />
        </div>
      </main>
    );
  }

  const { data: order, error } =
    type === "commission"
      ? await supabase
          .from("commissions")
          .select("id, buyer_id, status, quote_price")
          .eq("id", id)
          .maybeSingle()
      : await supabase
          .from("titipan_requests")
          .select(
            "id, buyer_id, status, quote_item_price, quote_shipping, quote_service_fee",
          )
          .eq("id", id)
          .maybeSingle();

  if (error || !order) {
    redirect("/commissions/mine");
  }

  if (order.buyer_id !== claims.sub) {
    redirect("/commissions/mine");
  }

  if (order.status !== "accepted") {
    redirect("/commissions/mine");
  }

  const amount =
    type === "commission"
      ? (order as { quote_price: number }).quote_price
      : quoteTotal({
          itemPrice: (order as { quote_item_price: number }).quote_item_price,
          shipping: (order as { quote_shipping: number }).quote_shipping,
          serviceFee: (order as { quote_service_fee: number }).quote_service_fee,
        });

  const label = type === "commission" ? "Commission" : "Titipan";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Pembayaran
      </h1>

      <p className="mt-4 text-sm text-[#6c6870]">{label}</p>

      <p className="mt-6 text-3xl font-semibold text-ink">
        {formatRupiah(amount)}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-[#6c6870]">
        Kamu akan diarahkan ke halaman pembayaran Snap Midtrans. Setelah selesai,
        kamu kembali ke halaman ini.
      </p>

      <div className="mt-8">
        <SnapButton type={type} id={id} />
      </div>
    </main>
  );
}

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  return (
    <Suspense>
      <CheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}
