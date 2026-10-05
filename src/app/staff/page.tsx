import Link from "next/link";

/**
 * The staff area. Bare by design: roadmap 2.8 fills it with the request queue.
 *
 * The page exists so the guard in src/proxy.ts can be verified by hand. A guard
 * on a route that 404s proves nothing, since a blocked buyer and an allowed
 * staff member would look identical.
 *
 * Access is decided entirely by the proxy, never here. This component renders
 * only after the guard has let the request through, so a role check in this file
 * would be a second, weaker copy of the same decision.
 */
export default function StaffPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Ruang Staf
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-[#6c6870]">
        Halaman ini untuk staf toko. Daftar permintaan commission dan titipan
        akan muncul di sini.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block text-sm font-semibold text-plum hover:underline"
      >
        Kembali ke toko
      </Link>
    </main>
  );
}