import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { CommissionQueue } from "@/components/CommissionQueue";
import CatalogManager from "@/components/CatalogManager";

export const metadata: Metadata = {
  title: "Commissions — Aruno Store",
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  starting_price: number;
  duration_days: number | null;
};

async function ServicesList() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, starting_price, duration_days")
    .eq("active", true)
    .order("created_at");

  return (
    <div className="mt-5 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
      {(services ?? []).map((service: Service) => (
        <div key={service.id} className="py-6">
          <h3 className="font-display text-lg font-semibold text-ink">
            {service.name}
          </h3>
          {service.description && (
            <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
              {service.description}
            </p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-[#6c6870]">Mulai dari</dt>
              <dd className="font-medium text-ink">
                {formatRupiah(service.starting_price)}
              </dd>
            </div>
            {service.duration_days && (
              <div className="flex gap-2">
                <dt className="text-[#6c6870]">Pengerjaan</dt>
                <dd className="font-medium text-ink">
                  {service.duration_days} hari
                </dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

export default function CommissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    status?: string;
  }>;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Commissions
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Pilih komisi, ceritakan idemu, dan Nobu akan
        mengirim kutipan harga dan waktu pengerjaan.
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <section aria-labelledby="layanan">
            <h2
              id="layanan"
              className="font-display text-xl font-semibold text-ink"
            >
              Layanan
            </h2>

            <Suspense>
              <ServicesList />
            </Suspense>
          </section>

          <section aria-labelledby="katalog" className="mt-14">
            <h2
              id="katalog"
              className="font-display text-xl font-semibold text-ink"
            >
              Katalog
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870]">
              Merchandise seni dan karya endorse yang siap kirim. Kalau tidak ada
              yang cocok, minta karya custom lewat commission.
            </p>

            <Link
              href="/shop?side=commission"
              className="mt-6 inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
            >
              Lihat katalog
            </Link>
          </section>
        </div>

        {/* Role island for the rail: buyers get the call to action in the
            static shell, staff get the Kelola quick card once the session
            resolves. Same pattern as AuthSlot — no session read in the page
            body, so the route keeps prerendering. */}
        <aside className="h-fit border border-[#eeeae5] bg-white p-6 lg:sticky lg:top-24">
          <Suspense fallback={<BuyerCTA />}>
            <CommissionRail />
          </Suspense>
        </aside>
      </div>

      {/* Staff-only dashboard below the content. Buyers resolve to nothing,
          so there is no fallback markup and no flash for them. */}
      <Suspense fallback={null}>
        <CommissionDashboard searchParams={searchParams ?? Promise.resolve({})} />
      </Suspense>
    </main>
  );
}

/**
 * Rail card for the commissions page (roadmap 5.24, rail at 5.25).
 *
 * Staff are the commissioner side themselves, so they never start a request:
 * they get quick links where buyers get the CTA. Signed out and buyer
 * sessions render exactly the fallback above, with no flash.
 */
export async function CommissionRail() {
  const profile = await getProfile();

  if (profile?.role !== "staff") return <BuyerCTA />;

  return (
    <nav aria-label="Kelola commission">
      <p className="font-display text-lg font-semibold text-ink">Kelola</p>
      <ul className="mt-4 space-y-3 text-sm">
        <li>
          <a href="#kelola" className="font-semibold text-plum hover:underline">
            Permintaan masuk →
          </a>
        </li>
        <li>
          <a href="#kelola-katalog" className="font-semibold text-plum hover:underline">
            Kelola katalog →
          </a>
        </li>
        <li>
          <Link
            href="/commissions/request"
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
 * Staff dashboard for the commissions page: the incoming queue plus catalogue
 * management, full width below the content. Buyers resolve to nothing.
 */
export async function CommissionDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    cond?: string;
    min?: string;
    max?: string;
    status?: string;
  }>;
}) {
  const profile = await getProfile();

  if (profile?.role !== "staff") return null;

  return (
    <>
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
          <CommissionQueue />
        </Suspense>
      </section>

      <section
        aria-labelledby="kelola-katalog"
        className="mt-14 border-t border-[#eeeae5] pt-8"
      >
        <h2
          id="kelola-katalog"
          className="font-display text-xl font-semibold text-ink"
        >
          Kelola katalog
        </h2>

        <div className="mt-6">
          <Suspense>
            <CatalogManager
              side="commission"
              from="commissions"
              baseHref="/commissions"
              searchParams={searchParams}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function BuyerCTA() {
  return (
    <>
      <Link
        href="/commissions/request"
        className="inline-block bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Mulai commission
      </Link>

      <p className="mt-4 text-xs text-[#6c6870]">
        Belum punya akun?{" "}
        <Link href="/auth/sign-up" className="font-semibold text-plum hover:underline">
          Daftar
        </Link>{" "}
        atau{" "}
        <Link href="/login" className="font-semibold text-plum hover:underline">
          masuk
        </Link>
        .
      </p>
    </>
  );
}
