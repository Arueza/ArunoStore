import type { Metadata } from "next";
import { Suspense } from "react";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import { statusLabel } from "@/lib/commissionStatus";
import { saveQuote } from "./actions";
import DeliveryUpload from "./DeliveryUpload";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = {
  title: "Permintaan — Ruang Staf",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Spelled out because Supabase has no generated types for this project, so a
// select() string is the only description of the row. Matches 0005's columns and
// nothing else — every one of them is read below.
type Commission = {
  id: string;
  buyer_id: string;
  service_id: string;
  brief: string;
  reference_links: string[];
  status: string;
  quote_price: number | null;
  quote_note: string | null;
  delivery_image: string | null;
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

  const { data: commission } = await supabase
    .from("commissions")
    .select("id, buyer_id, service_id, brief, reference_links, status, quote_price, quote_note, delivery_image, recipient_name, phone, address, city, province, postal_code, note, created_at")
    .eq("id", id)
    .maybeSingle<Commission>();

  // RLS is what answers this, not a role check: a buyer cannot read another
  // buyer's row, so staff sees a 404 for a request that is not theirs to see.
  if (!commission) {
    notFound();
  }

  const [{ data: service }, { data: buyer }] = await Promise.all([
    supabase
      .from("services")
      .select("name, starting_price, duration_days")
      .eq("id", commission.service_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", commission.buyer_id)
      .maybeSingle(),
  ]);

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div>
        <BackButton fallback="/commissions#kelola">
          ← Semua permintaan
        </BackButton>

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
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Layanan</dt>
            <dd className="text-sm text-ink">
              {service?.name ?? "Layanan tidak tersedia"}
              {service && (
                <span className="block text-xs text-[#6c6870]">
                  Mulai dari {formatRupiah(service.starting_price)}
                  {service.duration_days &&
                    ` · sekitar ${service.duration_days} hari`}
                </span>
              )}
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Masuk</dt>
            <dd className="text-sm text-ink">{formatDate(commission.created_at)}</dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Status</dt>
            <dd className="text-sm font-medium text-ink">
              {statusLabel(commission.status)}
            </dd>
          </div>
        </dl>

        <h2 className="mt-10 font-display text-lg font-semibold text-ink">Brief</h2>
        {/* whitespace-pre-wrap: a buyer writes this as prose, and collapsing it
            into one line loses the paragraph breaks they wrote it with. */}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#6c6870]">
          {commission.brief}
        </p>

        {commission.reference_links.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-lg font-semibold text-ink">
              Referensi
            </h2>
            <ul className="mt-3 space-y-2">
              {commission.reference_links.map((link) => (
                <li key={link} className="text-sm">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-plum hover:underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {commission.recipient_name && (
        <div className="mt-8 border border-[#eeeae5] bg-cream p-5 text-sm leading-relaxed">
          <p className="font-semibold text-ink">Alamat pengiriman</p>
          <p className="mt-2 text-[#6c6870]">
            {commission.recipient_name} · {commission.phone}
          </p>
          <p className="text-[#6c6870]">{commission.address}</p>
          <p className="text-[#6c6870]">
            {commission.city}, {commission.province} {commission.postal_code}
          </p>
          {commission.note && (
            <p className="text-[#6c6870]">Catatan: {commission.note}</p>
          )}
        </div>
      )}

      <div className="space-y-6">
        <QuoteBox
          id={commission.id}
          status={commission.status}
          quotePrice={commission.quote_price}
          quoteNote={commission.quote_note}
        />

        {/* The delivery upload appears once the buyer has accepted the quote
            (or paid it). The drawing starts after the price is agreed. */}
        {(commission.status === "accepted" || commission.status === "paid") && (
          <DeliveryUpload
            commissionId={commission.id}
            existingPath={commission.delivery_image}
          />
        )}

        {/* If a delivery image exists, show it so staff can see what was sent.
            The signed URL is private; only staff (who can read every commission)
            reaches this page. */}
        {commission.delivery_image && (
          <DeliveryImage path={commission.delivery_image} />
        )}
      </div>
    </div>
  );
}

/**
 * Renders a delivery image from the private bucket via a signed URL.
 *
 * The bucket is not public, so the URL must be signed. The server client
 * carries the staff session, which 0021's "Authenticated read delivery
 * images" policy lets through.
 */
async function DeliveryImage({ path }: { path: string }) {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("commission-deliveries")
    .createSignedUrl(path, 300);

  if (!data?.signedUrl) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; next/image caches past expiry.
    <img
      src={data.signedUrl}
      alt="Gambar hasil"
      className="w-full border border-[#eeeae5]"
    />
  );
}

/**
 * The quote box: price and note, plus the button that turns the row to `quoted`.
 *
 * A plain form posting to a server action. No client component, no state, no
 * fetch — the result is a redirect the server decides, so `?saved=1` and
 * `?error=…` on the URL are the whole of the feedback and there is no second
 * code path that could disagree about what was saved.
 */
function QuoteBox({
  id,
  status,
  quotePrice,
  quoteNote,
}: {
  id: string;
  status: string;
  quotePrice: number | null;
  quoteNote: string | null;
}) {
  return (
    <form action={saveQuote} className="lg:sticky lg:top-24 lg:self-start">
      <h2 className="font-display text-lg font-semibold text-ink">Kutipan</h2>

      <input type="hidden" name="id" value={id} />

      <label
        htmlFor="quotePrice"
        className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
      >
        Harga (Rp)
      </label>
      {/* inputMode numeric rather than type number: a number input allows "e" and
          the browser will happily submit 1e5. The pattern in the action is the
          real check; this just puts the right keyboard on a phone. */}
      <input
        id="quotePrice"
        name="quotePrice"
        type="text"
        inputMode="numeric"
        defaultValue={quotePrice ?? ""}
        placeholder="150000"
        className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
      />

      <label
        htmlFor="quoteNote"
        className="mt-5 block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
      >
        Catatan untuk buyer
      </label>
      <textarea
        id="quoteNote"
        name="quoteNote"
        rows={5}
        defaultValue={quoteNote ?? ""}
        placeholder="Opsional. Contoh: revisi gratis dua kali."
        className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm leading-relaxed text-ink focus:border-plum focus:outline-none"
      />

      <SubmitButton
        pendingLabel="Menyimpan…"
        className="mt-6 w-full bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "quoted" ? "Perbarui kutipan" : "Kirim kutipan"}
      </SubmitButton>

      {status === "quoted" && (
        <p className="mt-3 text-xs leading-relaxed text-[#6c6870]">
          Kutipan sudah terkirim. Memperbarui akan menimpanya, dan buyer melihat
          angka yang baru.
        </p>
      )}
    </form>
  );
}

export default function StaffCommissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Permintaan
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