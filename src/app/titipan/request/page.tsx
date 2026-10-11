import type { Metadata } from "next";
import Link from "next/link";
import TitipanRequestForm from "./TitipanRequestForm";

export const metadata: Metadata = {
  title: "Minta titipan — Aruno Store",
};

/**
 * The titipan request form, task 3.3.
 *
 * Behind the /titipan/request guard in proxy.ts, so a signed-out visitor never
 * reaches the form — the server action re-reads the session anyway, but the
 * guard saves them a dead page.
 *
 * Reads nothing. That is the whole difference from the commission form at 2.6,
 * which has to wait behind a Suspense boundary for its services dropdown: this
 * form has no options to fetch, so there is no session read, no boundary and no
 * reason for this route to wait on anything before it paints. It prerenders
 * whole, like the storefront (1.13).
 */
export default function TitipanRequestPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Minta titipan
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kirim tautan produknya, lalu staf akan mengecek barang itu dan mengirim
        kutipan: harga barang, ongkir, dan biaya layanan.
      </p>

      <div className="mt-10 border border-[#eeeae5] bg-white p-6">
        <TitipanRequestForm />
      </div>

      <Link
        href="/titipan"
        className="mt-8 inline-block text-sm font-semibold text-plum hover:underline"
      >
        Kembali ke penjelasan titipan
      </Link>
    </main>
  );
}