import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CommissionRequestForm from "./CommissionRequestForm";

export const metadata: Metadata = {
  title: "Minta commission — Aruno Store",
};

/**
 * The commission request form, task 2.6.
 *
 * Behind the /commissions/request guard in proxy.ts, so a signed-out visitor
 * never reaches the form — the server action re-reads the session anyway, but
 * the guard saves them a dead page.
 *
 * Heading, intro and the frame are static. The service dropdown needs the
 * session cookie to read `services`, so it sits behind the boundary, which is
 * what lets this route prerender.
 */
export default function CommissionRequestPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Minta commission
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Pilih layanan, ceritakan idemu, lalu kirim. Nobu akan menjawab dengan
        kutipan harga dan perkiraan waktu pengerjaan.
      </p>

      <div className="mt-10 border border-[#eeeae5] bg-white p-6">
        <Suspense fallback={null}>
          <RequestForm />
        </Suspense>
      </div>

      <Link
        href="/commissions"
        className="mt-8 inline-block text-sm font-semibold text-plum hover:underline"
      >
        Kembali ke layanan
      </Link>
    </main>
  );
}

type ServiceOption = {
  id: string;
  name: string;
  starting_price: number;
  duration_days: number | null;
};

async function RequestForm() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, starting_price, duration_days")
    .eq("active", true)
    .order("created_at");

  const options: ServiceOption[] = services ?? [];

  // No active service means no dropdown worth showing, and 6.1 has not seeded
  // the table yet. Saying so beats a form that cannot be submitted.
  if (options.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[#6c6870]">
        Belum ada layanan yang aktif. Cek lagi nanti.
      </p>
    );
  }

  return <CommissionRequestForm services={options} />;
}