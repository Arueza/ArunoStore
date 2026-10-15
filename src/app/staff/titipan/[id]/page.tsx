import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import { statusLabel } from "@/lib/commissionStatus";
import QuoteBox from "./QuoteBox";
import SubmitButton from "@/components/SubmitButton";
import { markAsPurchased, saveShipping } from "./actions";

export const metadata: Metadata = {
  title: "Titipan — Ruang Staf",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  quote_item_price: number | null;
  quote_shipping: number | null;
  quote_service_fee: number | null;
  quote_note: string | null;
  courier: string | null;
  tracking_number: string | null;
  recipient_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  note: string | null;
  created_at: string;
};

async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  // Awaited here, not in the page body. With cacheComponents on, reading request
  // data outside a Suspense boundary is a build error, and the boundary is what
  // streams this in behind the heading rather than holding the whole page.
  const { id } = await params;
  const supabase = await createClient();

  // Checked here as well as in the action. The action's check protects the write;
  // this one keeps a wrong id in the URL a 404 rather than an empty page that
  // looks like a request with nothing on it.
  if (!UUID.test(id)) {
    notFound();
  }

  const { data: request } = await supabase
    .from("titipan_requests")
    .select(
      "id, buyer_id, product_link, size, color, quantity, budget, status, quote_item_price, quote_shipping, quote_service_fee, quote_note, courier, tracking_number, recipient_name, phone, address, city, province, postal_code, note, created_at",
    )
    .eq("id", id)
    .maybeSingle<TitipanRequest>();

  // RLS is what answers this, not a role check: a buyer cannot read another
  // buyer's row, so staff sees a 404 for a request that is not theirs to see.
  if (!request) {
    notFound();
  }

  const { data: buyer } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", request.buyer_id)
    .maybeSingle();

  const variant = [request.size, request.color].filter(Boolean).join(" · ");

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div>
        <Link
          href="/titipan"
          className="text-sm font-semibold text-plum hover:underline"
        >
          ← Semua permintaan titipan
        </Link>

        <dl className="mt-6 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Pembeli</dt>
            <dd className="text-sm text-ink">
              {buyer?.full_name || "—"}
              {buyer?.email && (
                <span className="block text-xs text-[#6c6870]">{buyer.email}</span>
              )}
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Produk</dt>
            <dd className="min-w-0 text-sm">
              {/* 3.3 refuses anything but http/https, so this href cannot execute
                  what the buyer typed — it is a link out to the shop, not markup
                  they chose. */}
              <a
                href={request.product_link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-plum hover:underline"
              >
                {request.product_link}
              </a>
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Varian</dt>
            <dd className="text-sm text-ink">
              {variant || "—"}
              <span className="block text-xs text-[#6c6870]">
                {request.quantity} barang
              </span>
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Budget buyer</dt>
            <dd className="text-sm text-ink">
              {request.budget === null ? (
                "—"
              ) : (
                <>{formatRupiah(request.budget)}</>
              )}
              <span className="block text-xs text-[#6c6870]">
                Perkiraan dari buyer. Harga sebenarnya keluar di kutipan.
              </span>
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Masuk</dt>
            <dd className="text-sm text-ink">{formatDate(request.created_at)}</dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Status</dt>
            <dd className="text-sm font-medium text-ink">
              {statusLabel(request.status)}
            </dd>
          </div>
        </dl>

        {request.recipient_name && (
          <div className="mt-6 border border-[#eeeae5] bg-cream p-5 text-sm leading-relaxed">
            <p className="font-semibold text-ink">Alamat pengiriman</p>
            <p className="mt-2 text-[#6c6870]">
              {request.recipient_name} · {request.phone}
            </p>
            <p className="text-[#6c6870]">{request.address}</p>
            <p className="text-[#6c6870]">
              {request.city}, {request.province} {request.postal_code}
            </p>
            {request.note && (
              <p className="text-[#6c6870]">Catatan: {request.note}</p>
            )}
          </div>
        )}

        {(request.status === "accepted" || request.status === "paid") && (
          <div className="mt-6 border-t border-[#eeeae5] pt-6">
            <form action={markAsPurchased}>
              <input type="hidden" name="id" value={request.id} />
              <SubmitButton
                pendingLabel="Menyimpan…"
                className="bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white hover:opacity-90 disabled:opacity-50"
              >
                Tandai sudah dibeli
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs leading-relaxed text-[#6c6870]">
              Konfirmasi bahwa barang sudah dibeli dari toko di Jepang.
            </p>
          </div>
        )}

        {request.status === "purchased" && (
          <div className="mt-6 border-t border-[#eeeae5] pt-6">
            <form action={saveShipping} className="space-y-4">
              <input type="hidden" name="id" value={request.id} />
              <div>
                <label
                  htmlFor="courier"
                  className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
                >
                  Nama kurir
                </label>
                <input
                  id="courier"
                  name="courier"
                  type="text"
                  placeholder="JNE, J&T, Kuroneko, dll."
                  className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="tracking_number"
                  className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
                >
                  Nomor resi
                </label>
                <input
                  id="tracking_number"
                  name="tracking_number"
                  type="text"
                  placeholder="JD0123456789"
                  className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
                />
              </div>
              <SubmitButton
                pendingLabel="Menyimpan…"
                className="bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white hover:opacity-90 disabled:opacity-50"
              >
                Tandai dikirim
              </SubmitButton>
            </form>
          </div>
        )}

        {(request.status === "shipped" || request.status === "arrived") &&
          request.courier &&
          request.tracking_number && (
            <div className="mt-6 border-t border-[#eeeae5] pt-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
                Info pengiriman
              </p>
              <p className="mt-2 text-sm text-ink">
                {request.courier} · {request.tracking_number}
              </p>
            </div>
          )}
      </div>

      <QuoteBox
        id={request.id}
        status={request.status}
        quantity={request.quantity}
        quoteItemPrice={request.quote_item_price}
        quoteShipping={request.quote_shipping}
        quoteServiceFee={request.quote_service_fee}
        quoteNote={request.quote_note}
      />
    </div>
  );
}

export default function StaffTitipanRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Permintaan titipan
      </h1>

      <Suspense>
        <SaveNotice searchParams={searchParams} />
      </Suspense>

      <Suspense>
        <RequestDetail params={params} />
      </Suspense>
    </main>
  );
}

/**
 * What the server said about the last save.
 *
 * The action redirects with ?saved=1 or ?error=…, so the query string is the
 * whole of the feedback. No client component, no state that could disagree with
 * what was actually written.
 *
 * Its own boundary because reading searchParams is a request read: under
 * cacheComponents that is a build error outside one. role="status" rather than
 * role="alert" — this answers a button press, so it should be announced when it
 * appears without interrupting whatever the staff member was doing.
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
          Kutipan tersimpan. Buyer bisa melihatnya sekarang.
        </span>
      )}
    </p>
  );
}