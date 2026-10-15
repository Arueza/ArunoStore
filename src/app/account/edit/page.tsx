import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getClaims, getProfile } from "@/lib/auth";
import { NameForm, PasswordForm } from "./client-forms";

export const metadata: Metadata = {
  title: "Ubah data akun — Aruno Store",
};

/**
 * The buyer's own settings. Email and role render read-only: changing the
 * email would orphan profiles.email (written only by the signup trigger) and
 * the role is staff-promoted by hand, never claimed from a form.
 *
 * The heading, the frame and the read-only rows are static. The name default
 * and the save notice arrive behind boundaries, which is what lets this route
 * prerender — the same rule as /account itself.
 */
export default function EditAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-[6%]">
      <Link
        href="/account"
        className="text-xs uppercase tracking-[0.14em] text-[#6c6870] hover:text-plum"
      >
        ← Kembali ke akun
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
        Ubah data akun
      </h1>

      <Suspense>
        <SaveNotice searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<FormsFallback />}>
        <EditForms />
      </Suspense>
    </main>
  );
}

async function SaveNotice({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  return (
    <p role="status" className="mt-4 min-h-5 text-sm text-[#6c6870]">
      {saved === "nama" && (
        <span className="font-medium text-ink">Nama tersimpan.</span>
      )}
      {saved === "password" && (
        <span className="font-medium text-ink">
          Password diganti. Gunakan yang baru saat masuk berikutnya.
        </span>
      )}
    </p>
  );
}

async function EditForms() {
  const [claims, profile] = await Promise.all([getClaims(), getProfile()]);

  return (
    <div className="mt-6 space-y-10">
      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Nama
        </h2>
        <div className="mt-4">
          <NameForm initialName={profile?.full_name?.trim() ?? ""} />
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Password
        </h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Tidak bisa diubah di sini
        </h2>
        <dl className="mt-4 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-24 shrink-0 text-sm text-[#6c6870]">Email</dt>
            <dd className="text-sm font-medium text-ink">
              {claims?.email ?? "—"}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-24 shrink-0 text-sm text-[#6c6870]">Peran</dt>
            <dd className="text-sm font-medium text-ink">
              {profile?.role === "staff" ? "Staff" : "Buyer"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-[#6c6870]">
          Email dan peran dikunci. Hubungi admin toko kalau emailmu sudah tidak
          aktif.
        </p>
      </section>
    </div>
  );
}

function FormsFallback() {
  return <div aria-hidden="true" className="mt-6 h-96" />;
}
