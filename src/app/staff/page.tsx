import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ruang Staf — Aruno Store",
};

/**
 * The staff hub (roadmap 1.8's guarded page, slimmed at 5.24).
 *
 * The commission and titipan queues used to live here and under
 * /staff/titipan; both now render as Kelola blocks on /commissions and
 * /titipan for staff sessions. The artworks gallery retired at 5.25, so
 * this page keeps only catalogue management, which moves to the section
 * dashboards at 5.26.
 */
export default function StaffPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Ruang Staf
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Kelola katalog belanja. Permintaan commission dan
        titipan dikelola dari halaman masing-masing.
      </p>

      <nav aria-label="Menu staf" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/staff/shop" className="font-semibold text-plum hover:underline">
          Katalog
        </Link>
      </nav>
    </main>
  );
}
