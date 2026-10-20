import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ruang Staf — Aruno Store",
};

/**
 * The staff hub (roadmap 1.8's guarded page, slimmed at 5.24, landing-only
 * at 5.26).
 *
 * Every management surface now lives where its readers are: request queues
 * on /commissions and /titipan, the full catalogue on the /shop Kelola tab.
 * This page is only the jump-off the navbar Staff link lands on.
 */
export default function StaffPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Ruang Staf
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kelola commission, titipan, katalog, dan pesanan dari halaman masing-masing.
      </p>

      <nav aria-label="Menu staf" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/commissions" className="font-semibold text-plum hover:underline">
          Kelola commission
        </Link>
        <Link href="/titipan" className="font-semibold text-plum hover:underline">
          Kelola titipan
        </Link>
        <Link href="/shop?tab=kelola" className="font-semibold text-plum hover:underline">
          Kelola katalog
        </Link>
        <Link href="/staff/orders" className="font-semibold text-plum hover:underline">
          Pesanan katalog
        </Link>
      </nav>
    </main>
  );
}
