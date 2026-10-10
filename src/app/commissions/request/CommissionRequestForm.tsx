"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRequest, type RequestState } from "./actions";
import { formatRupiah } from "@/lib/format";

type ServiceOption = {
  id: string;
  name: string;
  starting_price: number;
  duration_days: number | null;
};

const initialState: RequestState = { message: "", sent: false };

const fieldClass =
  "w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors";

/**
 * The commission request form.
 *
 * Service options arrive as props from the server component, so no fetch and no
 * Supabase client ship to the browser. Submitting goes through the server
 * action, which is the only place a row gets written.
 */
export default function CommissionRequestForm({
  services,
}: {
  services: ServiceOption[];
}) {
  const [state, formAction, pending] = useActionState(submitRequest, initialState);
  const [links, setLinks] = useState<string[]>([""]);

  if (state.sent) {
    return (
      <div className="border border-[#eeeae5] bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Permintaan terkirim
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
          {state.message} Kamu bisa memantau statusnya di halaman commissions
          kamu.
        </p>
        <Link
          href="/commissions/mine"
          className="mt-5 inline-block text-sm font-semibold text-plum hover:underline"
        >
          Lihat commissions kamu
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="serviceId" className="mb-1.5 block text-sm font-medium text-ink">
          Layanan
        </label>
        <select id="serviceId" name="serviceId" required className={fieldClass}>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — mulai dari {formatRupiah(service.starting_price)}
              {service.duration_days ? `, ${service.duration_days} hari` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="brief" className="mb-1.5 block text-sm font-medium text-ink">
          Brief
        </label>
        <textarea
          id="brief"
          name="brief"
          required
          rows={6}
          placeholder="Ceritakan idemu: karakter, suasana, warna, pose, dan apa pun yang penting bagimu."
          className={fieldClass}
        />
        <p className="mt-1.5 text-xs text-[#6c6870]">
          Semakin jelas briefnya, semakin tepat kutipannya.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Link referensi
          <span className="ml-2 font-normal text-[#6c6870]">opsional</span>
        </span>

        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                name="link"
                value={link}
                onChange={(e) =>
                  setLinks((all) => all.map((old, i) => (i === index ? e.target.value : old)))
                }
                placeholder="https://pinterest.com/..."
                aria-label={`Link referensi ${index + 1}`}
                className={fieldClass}
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLinks((all) => all.filter((_, i) => i !== index))}
                  aria-label={`Hapus link ${index + 1}`}
                  className="shrink-0 rounded border border-[#d6d0ca] px-3 text-sm text-[#6c6870] transition-colors hover:border-plum hover:text-plum"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLinks((all) => [...all, ""])}
          className="mt-2 text-sm font-semibold text-plum hover:underline"
        >
          + Tambah link
        </button>
      </div>

      {state.message && (
        <p aria-live="polite" className="text-sm text-plum">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-plum px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8f4f67] disabled:opacity-50 transition-colors sm:w-auto"
      >
        {pending ? "Mengirim..." : "Kirim permintaan"}
      </button>
    </form>
  );
}