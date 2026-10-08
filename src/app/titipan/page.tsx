import type { Metadata } from "next";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { quoteTotal } from "@/lib/quote";

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

// One worked example, so "the total is the three added up" is not the only thing
// the buyer has to trust. The total comes from quoteTotal(), the same function
// task 3.6 will use in the staff quote box.
const EXAMPLE = {
  itemPrice: 500000,
  shipping: 180000,
  serviceFee: SERVICE_FEE,
};

const RULES = [
  "Tautannya harus produk yang masih bisa dibeli dan boleh dikirim ke Indonesia.",
  "Budget hanya perkiraan. Harga sebenarnya keluar di kutipan.",
  "Kalau produknya gagal dibeli atau tidak bisa dikirim, permintaan dibatalkan dan uangmu dikembalikan penuh.",
];

/**
 * What a titipan is and what it costs, for someone who has not asked for one yet.
 *
 * Roadmap 3.2, and the destination of the Titipan link in the hamburger, the
 * footer and the storefront — all three of which have pointed at nothing until
 * now.
 *
 * Reads no session. That is what lets this route prerender whole under
 * cacheComponents, like the storefront; a session read here would put a Supabase
 * round trip in front of the page and undo 1.12 and 1.13 on one route. So there is
 * no <Suspense> boundary either — the boundary exists only because of the read.
 *
 * The form arrives at 3.3 and the buttons below point at sign-up and login, which
 * both exist, so nothing here is a dead link in the meantime.
 */
export default function TitipanPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Titipan dari Jepang
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kamu mengirim tautan produk dari Jepang. Kami beli barang itu di sana,
        lalu kirim ke alamatmu di Indonesia.
      </p>

      <section aria-labelledby="cara" className="mt-14">
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

      {/* Both destinations exist and are already held by the nav link tests, so
          this ships no dead link before the form lands at 3.3. */}
      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        <Link
          href="/auth/sign-up"
          className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Mulai titipan
        </Link>

        <p className="mt-4 text-xs text-[#6c6870]">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-plum hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}