import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { quoteTotal } from "@/lib/quote";
import { TitipanQueue } from "@/components/TitipanQueue";

export const metadata: Metadata = {
  title: "Titipan dari Jepang — Aruno Store",
};

// ponytail: the standard service fee is a flat amount per item, set by Alfreza,
// and lives in this file only. Task 3.6 quotes the real fee per request, so
// nothing reads this constant back — it exists so the price a buyer is shown is
// one line rather than a paragraph. Move it to a settings row if it ever has to
// change without a deploy, or if the fee stops being the same for every request.
const SERVICE_FEE = 25000;

// The loop in the README, in the words a buyer reads it in.
const STEPS = [
  "Kamu mengirim tautan produk, ukuran, warna, jumlah, dan perkiraan budget.",
  "Staf mengecek produknya, lalu mengirim kutipan: harga barang, ongkir, dan biaya layanan.",
  "Kamu menerima kutipannya, lalu membayar.",
  "Barang dikirim ke alamatmu, dan nomor resinya kami kirim juga.",
];

const COSTS = [
  {
    label: "Harga barang",
    note: "Sesuai tautan yang kamu kirim, dicek staf sebelum barang dibeli.",
  },
  {
    label: "Ongkir ke Indonesia",
    note: "Dihitung dari berat barang, ukuran paket, dan alamat tujuan.",
  },
  {
    label: "Biaya layanan",
    note: `${formatRupiah(SERVICE_FEE)} per barang, tetap.`,
  },
  {
    label: "Total",
    note: "Jumlah ketiga angka di atas. Dihitung otomatis, selalu bilangan bulat.",
  },
];

const RULES = [
  "Tautannya harus produk yang masih bisa dibeli dan boleh dikirim ke Indonesia.",
  "Budget hanya perkiraan. Harga sebenarnya keluar di kutipan.",
  "Kalau produknya gagal dibeli atau tidak bisa dikirim, permintaan dibatalkan dan uangmu dikembalikan penuh.",
];

// One worked example, so "the total is the three added up" is not the only thing
// the buyer has to trust. The total comes from quoteTotal(), the same function
// task 3.6 will use in the staff quote box.
const EXAMPLE = {
  itemPrice: 500000,
  shipping: 180000,
  serviceFee: SERVICE_FEE,
};

/**
 * What a titipan is and what it costs, for someone who has not asked for one yet.
 *
 * Roadmap 3.2, and the destination of the Titipan link in the hamburger, the
 * footer and the storefront — all three of which have pointed at nothing until
 * now.
 *
 * Reads no session. That is what lets this route prerender whole under
 * cacheComponents, like the storefront; a session read here would put a Supabase
 * round trip in front of the page and undo 1.12 and 1.13 on one route. So the
 * role switch lives in islands below — the boundaries exist only because of
 * the read.
 *
 * The call to action points at the form, which arrived at 3.3. Signed out, the
 * proxy sends the visitor to the login page rather than to a form they cannot
 * submit, which is the same deal as the commission form at 2.6.
 */
export default function TitipanPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Titipan dari Jepang
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kamu mengirim tautan produk dari Jepang. Kami beli barang itu di sana,
        lalu kirim ke alamatmu di Indonesia.
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <section aria-labelledby="cara">
            <h2
              id="cara"
              className="font-display text-xl font-semibold text-ink"
            >
              Cara kerjanya
            </h2>

            {/* An ordered list rather than numbered characters, so the order is in
                the markup and not only in how it looks. marker: colors the numbers
                without reaching into the <li>. */}
            <ol className="mt-5 list-inside list-decimal space-y-3 text-sm leading-relaxed text-[#6c6870] marker:font-medium marker:text-plum">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="biaya" className="mt-14">
            <h2
              id="biaya"
              className="font-display text-xl font-semibold text-ink"
            >
              Biayanya
            </h2>

            <dl className="mt-5 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
              {COSTS.map((cost) => (
                <div
                  key={cost.label}
                  className="flex flex-wrap items-baseline gap-x-4 py-4"
                >
                  <dt className="w-40 shrink-0 text-sm font-medium text-ink">
                    {cost.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-[#6c6870]">
                    {cost.note}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-sm leading-relaxed text-[#6c6870]">
              {`Contoh: barang ${formatRupiah(EXAMPLE.itemPrice)} + ongkir ${formatRupiah(EXAMPLE.shipping)} + layanan ${formatRupiah(EXAMPLE.serviceFee)} = `}
              <b className="font-medium text-ink">
                {formatRupiah(quoteTotal(EXAMPLE))}
              </b>
            </p>
          </section>

          <section aria-labelledby="sebelum" className="mt-14">
            <h2
              id="sebelum"
              className="font-display text-xl font-semibold text-ink"
            >
              Sebelum kamu mengirim
            </h2>

            <ul className="mt-5 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-[#6c6870] marker:text-plum">
              {RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="katalog" className="mt-14">
            <h2
              id="katalog"
              className="font-display text-xl font-semibold text-ink"
            >
              Katalog
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870]">
              Barang dari Jepang yang sudah jadi dan siap kirim. Kalau tidak ada
              yang cocok, kirim tautan produk dan kami belikan untukmu.
            </p>

            <Link
              href="/shop?side=titipan"
              className="mt-6 inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
            >
              Lihat katalog
            </Link>
          </section>
        </div>

        {/* Role island for the rail: buyers get the call to action in the
            static shell, staff get the Kelola quick card once the session
            resolves. /titipan/request and /titipan/mine are guarded, so a
            signed-out visitor lands on the login page rather than on pages
            they cannot use. */}
        <aside className="h-fit border border-[#eeeae5] bg-white p-6 lg:sticky lg:top-24">
          <Suspense fallback={<BuyerCTA />}>
            <TitipanRail />
          </Suspense>
        </aside>
      </div>

      {/* Staff-only dashboard below the content. Buyers resolve to nothing,
          so there is no fallback markup and no flash for them. */}
      <Suspense fallback={null}>
        <TitipanDashboard />
      </Suspense>
    </main>
  );
}

/**
 * Rail card for the titipan page (roadmap 5.24, rail at 5.25).
 *
 * Staff run the titipan side themselves, so they never send a request: they
 * get quick links where buyers get the CTA. Signed out and buyer sessions
 * render exactly the fallback above, with no flash.
 */
export async function TitipanRail() {
  const profile = await getProfile();

  if (profile?.role !== "staff") return <BuyerCTA />;

  return (
    <nav aria-label="Kelola titipan">
      <p className="font-display text-lg font-semibold text-ink">Kelola</p>
      <ul className="mt-4 space-y-3 text-sm">
        <li>
          <a href="#kelola" className="font-semibold text-plum hover:underline">
            Permintaan masuk →
          </a>
        </li>
        <li>
          <Link
            href="/titipan/request"
            className="text-[#6c6870] hover:text-plum hover:underline"
          >
            Lihat form buyer
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Staff dashboard for the titipan page: the incoming queue, full width
 * below the content. Buyers resolve to nothing.
 */
export async function TitipanDashboard() {
  const profile = await getProfile();

  if (profile?.role !== "staff") return null;

  return (
    <section
      aria-labelledby="kelola"
      className="mt-14 border-t border-[#eeeae5] pt-8"
    >
      <h2
        id="kelola"
        className="font-display text-xl font-semibold text-ink"
      >
        Kelola permintaan
      </h2>

      <Suspense>
        <TitipanQueue />
      </Suspense>
    </section>
  );
}

function BuyerCTA() {
  return (
    <>
      <Link
        href="/titipan/request"
        className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Mulai titipan
      </Link>

      {/* The page a buyer lands on to answer "what happened to the parcel I
          sent". It is the one link here that only makes sense to somebody who
          has already sent something, so it sits under the call to action
          rather than beside it. */}
      <p className="mt-4 text-xs text-[#6c6870]">
        Sudah pernah mengirim?{" "}
        <Link
          href="/titipan/mine"
          className="font-semibold text-plum hover:underline"
        >
          Lihat permintaanmu
        </Link>
        .
      </p>

      <p className="mt-4 text-xs text-[#6c6870]">
        Belum punya akun?{" "}
        <Link
          href="/auth/sign-up"
          className="font-semibold text-plum hover:underline"
        >
          Daftar
        </Link>{" "}
        dulu, atau{" "}
        <Link href="/login" className="font-semibold text-plum hover:underline">
          masuk
        </Link>
        .
      </p>
    </>
  );
}
