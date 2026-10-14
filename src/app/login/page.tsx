import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/nextPath";
import LoginForm from "./LoginForm";

/**
 * Sign in, and come back to whatever the buyer was trying to reach.
 *
 * The proxy sends a signed-out visitor to /login?next=/titipan/mine when they
 * press "Lihat riwayat" on a public page, and to /login?next=/titipan/request
 * when they press "Mulai titipan". Without it they land here, sign in, and end
 * up on the storefront with no idea why — the destination was thrown away on the
 * way out.
 *
 * ?next= is treated as untrusted throughout. This page checks it before
 * rendering a hidden field for it, and the login action checks it again before
 * redirecting to it, because a hidden field is whatever the browser says it is.
 * Both ask safeNextPath(); neither trusts its own copy.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Masuk
        </h1>
        <p className="mb-8 text-center text-sm text-[#6c6870]">
          Selamat datang kembali di Aruno Store.
        </p>

        {/* Reading searchParams is a request read, so under cacheComponents it
            needs a boundary of its own and must not be awaited in this body.
            The heading stays in the static shell; only the form
            streams in. The placeholder reserves the form's height so the page
            does not jump under a typist who is already moving. */}
        <Suspense fallback={<div aria-hidden="true" className="h-72" />}>
          <LoginFormFromQuery searchParams={searchParams} />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[#6c6870]">
          Belum punya akun?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-plum hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}

/**
 * Awaits the query string, then hands the login form a destination that has
 * already been checked.
 *
 * Separate from the page body because awaiting here, inside a boundary, is what
 * lets /login prerender its shell at all — the same rule 1.12 and 1.13 rest on
 * for the rest of the site.
 */
async function LoginFormFromQuery({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <LoginForm next={safeNextPath(next)} />;
}
