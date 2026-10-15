import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { CommissionQueue } from "@/components/CommissionQueue";

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

export default function CommissionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Commissions
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Pilih komisi, ceritakan idemu, dan Nobu akan
        mengirim kutipan harga dan waktu pengerjaan.
      </p>

      <section aria-labelledby="layanan" className="mt-14">
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

      <div className="mt-14 border-t border-[#eeeae5] pt-8">
        {/* The call to action for buyers ships in the static shell; staff get
            the Kelola dashboard once the session resolves. Same island pattern
            as AuthSlot: no session read in the page body, so the route keeps
            prerendering. */}
        <Suspense fallback={<BuyerCTA />}>
          <CommissionRoleView />
        </Suspense>
      </div>
    </main>
  );
}

/**
 * Buyer or manager view of the commissions page (roadmap 5.24).
 *
 * Staff are the commissioner side themselves, so they never start a request:
 * they get the incoming queue where buyers get the CTA. Signed out and buyer
 * sessions render exactly the fallback above, with no flash.
 */
export async function CommissionRoleView() {
  const profile = await getProfile();

  if (profile?.role !== "staff") return <BuyerCTA />;

  return (
    <section aria-labelledby="kelola">
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
