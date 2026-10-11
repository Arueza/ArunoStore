import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AccountDetails from "./details";

export const metadata: Metadata = {
  title: "Akun saya — Aruno Store",
};

/**
 * The signed-in visitor's own account page.
 *
 * Cottonink's equivalent lives at /account: the storefront stays the main
 * experience and this is where a customer sees who they are. There is no
 * /dashboard — signing in returns to the storefront and this is the one page
 * behind the account icon.
 *
 * The heading, the frame and the link back are static. Only the rows come from
 * the session, behind the boundary, which is what lets this route prerender.
 */
export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-[6%]">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Akun saya
      </h1>

      <Suspense fallback={<DetailsFallback />}>
        <AccountDetails />
      </Suspense>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/commissions/mine"
          className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Lihat Komisi saya
        </Link>
        <Link
          href="/titipan/mine"
          className="inline-block border border-[#e2ddd7] px-6 py-3 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-plum"
        >
          Lihat Titipan saya
        </Link>
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-plum hover:underline"
      >
        Kembali ke toko
      </Link>
    </main>
  );
}

// Holds the height of the three rows so the page does not jump when the profile
// arrives. Shows no placeholder values: a row reading "Peran —" before the
// session answers would be a lie for the moment it was on screen.
function DetailsFallback() {
  return <div aria-hidden="true" className="mt-8 h-[13.5rem] border-y border-[#eeeae5]" />;
}