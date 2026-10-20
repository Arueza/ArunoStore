import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { quoteTotal } from "@/lib/quote";
import { SnapButton } from "./SnapButton";
import AddressForm from "./AddressForm";
import InstagramHelpBox from "@/components/InstagramHelpBox";
import PaymentStatusPoller from "@/components/PaymentStatusPoller";

export const metadata: Metadata = {
  title: "Pembayaran — Aruno Store",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  settled: "Lunas",
  paid: "Lunas",
  deny: "Ditolak",
  expire: "Kedaluwarsa",
};

async function CheckoutContent({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string; saved?: string }>;
}) {
  const { type, id, saved } = await searchParams;

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

  // Shop orders: created by createShopOrder from the cookie cart.
  // Shows full order receipt, items, status, and SnapButton when pending.
  if (type === "shop") {
    const { data: order, error } = await supabase
      .from("shop_orders")
      .select(
        "id, buyer_id, status, total_price, created_at, recipient_name, phone, address, city, province, postal_code, note, shop_order_items(item_id, size, quantity, price, consignment_items(name, consignment_images(image_url, is_thumbnail)))",
      )
      .eq("id", id)
      .maybeSingle<{
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .maybeSingle();

    const isStaff = profile?.role === "staff";

    if (error || !order || (!isStaff && order.buyer_id !== claims.sub)) {
      redirect("/shop");
    }

    const canPay = order.status === "pending" && order.buyer_id === claims.sub;

    const savedAddress = {
      recipient_name: order.recipient_name,
      phone: order.phone,
      address: order.address,
      city: order.city,
      province: order.province,
      postal_code: order.postal_code,
      note: order.note,
    };

    const addressComplete = Boolean(
      order.recipient_name?.trim() &&
        order.phone?.trim() &&
        order.address?.trim() &&
        order.city?.trim() &&
        order.province?.trim() &&
        order.postal_code?.trim(),
    );

    const savedMessage =
      order.status === "pending"
        ? "Pembayaran sedang diverifikasi. Status diperbarui otomatis."
        : order.status === "settled" || order.status === "paid"
          ? "Pembayaran berhasil."
          : "Pembayaran gagal atau kedaluwarsa.";

    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
        <Link
          href="/shop"
          className="text-xs uppercase tracking-[0.14em] text-[#6c6870] hover:text-plum"
        >
          ← Kembali ke katalog
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Pembayaran
        </h1>

        <p className="mt-3 text-sm text-[#6c6870]">
          Status:{" "}
          <span className="font-medium text-ink">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </p>

        {order.created_at && (
          <p className="mt-1 text-xs text-[#b0acb5]">
            {new Date(order.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}

        {saved === "1" && (
          <p className="mt-4 bg-[#f0f9f4] p-3 text-sm text-[#2d6a4f]" role="status">
            {savedMessage}
          </p>
        )}

        <PaymentStatusPoller
          active={saved === "1" && order.status === "pending"}
        />

        <ul className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          {order.shop_order_items?.map((item) => {
            const thumb =
              item.consignment_items?.consignment_images?.find(
                (img) => img.is_thumbnail,
              ) ??
              item.consignment_items?.consignment_images?.[0];

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
                      alt={item.consignment_items?.name ?? "Produk"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.consignment_items?.name ?? "Produk"}
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

        <div className="mt-10 border border-[#eeeae5] bg-cream p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            Alamat pengiriman
          </h2>

          {addressComplete ? (
            <>
              <dl className="mt-4 space-y-1 text-sm leading-relaxed text-[#6c6870]">
                <dt className="sr-only">Penerima</dt>
                <dd className="font-medium text-ink">
                  {order.recipient_name} · {order.phone}
                </dd>
                <dt className="sr-only">Alamat</dt>
                <dd>{order.address}</dd>
                <dd>
                  {order.city}, {order.province} {order.postal_code}
                </dd>
                {order.note && <dd>Catatan: {order.note}</dd>}
              </dl>

              {canPay && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-plum hover:underline">
                    Ubah alamat
                  </summary>
                  <AddressForm orderId={order.id} initial={savedAddress} />
                </details>
              )}
            </>
          ) : canPay ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
                Isi alamat pengiriman dulu — tombol bayar muncul setelah
                alamat disimpan.
              </p>

              <AddressForm orderId={order.id} initial={savedAddress} />
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
              Buyer belum mengisi alamat pengiriman.
            </p>
          )}
        </div>

        {canPay && addressComplete && (
          <>
            <p className="mt-6 text-sm leading-relaxed text-[#6c6870]">
              Kamu akan diarahkan ke halaman pembayaran Snap Midtrans. Setelah selesai,
              kamu kembali ke halaman ini.
            </p>

            <div className="mt-8">
              <SnapButton
                type="shop"
                id={order.id}
                redirectPath={`/checkout?type=shop&id=${order.id}&saved=1`}
              />
            </div>
          </>
        )}

        <InstagramHelpBox orderId={order.id} />
      </main>
    );
  }

  const { data: order, error } =
    type === "commission"
      ? await supabase
          .from("commissions")
          .select("id, buyer_id, status, quote_price, recipient_name, phone, address, city, province, postal_code, note")
          .eq("id", id)
          .maybeSingle()
      : await supabase
          .from("titipan_requests")
          .select(
            "id, buyer_id, status, quote_item_price, quote_shipping, quote_service_fee, recipient_name, phone, address, city, province, postal_code, note",
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

  const addressComplete = Boolean(
    (order as { recipient_name: string | null }).recipient_name?.trim() &&
      (order as { phone: string | null }).phone?.trim() &&
      (order as { address: string | null }).address?.trim() &&
      (order as { city: string | null }).city?.trim() &&
      (order as { province: string | null }).province?.trim() &&
      (order as { postal_code: string | null }).postal_code?.trim(),
  );

  const savedAddress = {
    recipient_name: (order as { recipient_name: string | null }).recipient_name,
    phone: (order as { phone: string | null }).phone,
    address: (order as { address: string | null }).address,
    city: (order as { city: string | null }).city,
    province: (order as { province: string | null }).province,
    postal_code: (order as { postal_code: string | null }).postal_code,
    note: (order as { note: string | null }).note,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Pembayaran
      </h1>

      <p className="mt-4 text-sm text-[#6c6870]">{label}</p>

      <p className="mt-6 text-3xl font-semibold text-ink">
        {formatRupiah(amount)}
      </p>

      <div className="mt-10 border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Alamat pengiriman
        </h2>

        {addressComplete ? (
          <>
            <dl className="mt-4 space-y-1 text-sm leading-relaxed text-[#6c6870]">
              <dt className="sr-only">Penerima</dt>
              <dd className="font-medium text-ink">
                {(order as { recipient_name: string }).recipient_name} ·{" "}
                {(order as { phone: string }).phone}
              </dd>
              <dt className="sr-only">Alamat</dt>
              <dd>{(order as { address: string }).address}</dd>
              <dd>
                {(order as { city: string }).city},{" "}
                {(order as { province: string }).province}{" "}
                {(order as { postal_code: string }).postal_code}
              </dd>
              {(order as { note: string | null }).note && (
                <dd>Catatan: {(order as { note: string }).note}</dd>
              )}
            </dl>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-plum hover:underline">
                Ubah alamat
              </summary>
              <AddressForm orderId={id} initial={savedAddress} type={type} />
            </details>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
              Isi alamat pengiriman dulu — tombol bayar muncul setelah alamat
              disimpan.
            </p>

            <AddressForm orderId={id} initial={savedAddress} type={type} />
          </>
        )}
      </div>

      {addressComplete && (
        <>
          <p className="mt-6 text-sm leading-relaxed text-[#6c6870]">
            Kamu akan diarahkan ke halaman pembayaran Snap Midtrans. Setelah
            selesai, kamu kembali ke halaman ini.
          </p>

          <div className="mt-8">
            <SnapButton type={type} id={id} />
          </div>
        </>
      )}

      <InstagramHelpBox orderId={id} />
    </main>
  );
}

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string; saved?: string }>;
}) {
  return (
    <Suspense>
      <CheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}
