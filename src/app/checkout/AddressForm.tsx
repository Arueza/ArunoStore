"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShopOrderAddress } from "../shop/actions";

export type SavedAddress = {
  recipient_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  note: string | null;
};

/**
 * Shipping-address form on the shop checkout. The order already exists
 * (createShopOrder wrote it address-less); this fills the seven address
 * columns via saveShopOrderAddress. Nothing here is trusted — the action
 * re-validates every field and checks ownership plus pending status.
 *
 * On success the server re-renders the receipt with the address summary and
 * the Snap button, so the buyer cannot pay before saying where to send it.
 */
export default function AddressForm({
  orderId,
  initial,
}: {
  orderId: string;
  initial: SavedAddress;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    const result = await saveShopOrderAddress(orderId, new FormData(e.currentTarget));

    if (!result.ok) {
      setError(result.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  const inputClass =
    "mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#b0acb5] focus:border-plum focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Nama penerima
          <input
            type="text"
            name="recipient_name"
            required
            maxLength={100}
            defaultValue={initial.recipient_name ?? ""}
            placeholder="Contoh: Budi Santoso"
            className={inputClass}
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          No. HP / WA
          <input
            type="tel"
            name="phone"
            required
            defaultValue={initial.phone ?? ""}
            placeholder="Contoh: 08123456789"
            className={inputClass}
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Kota / Kabupaten
          <input
            type="text"
            name="city"
            required
            maxLength={100}
            defaultValue={initial.city ?? ""}
            placeholder="Contoh: Bandung"
            className={inputClass}
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Provinsi
          <input
            type="text"
            name="province"
            required
            maxLength={100}
            defaultValue={initial.province ?? ""}
            placeholder="Contoh: Jawa Barat"
            className={inputClass}
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Kode pos
          <input
            type="text"
            name="postal_code"
            required
            inputMode="numeric"
            maxLength={5}
            pattern="\d{5}"
            title="Kode pos harus 5 digit angka."
            defaultValue={initial.postal_code ?? ""}
            placeholder="Contoh: 40111"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        Alamat lengkap
        <textarea
          name="address"
          required
          rows={3}
          maxLength={500}
          defaultValue={initial.address ?? ""}
          placeholder="Jalan, nomor rumah, RT/RW, patokan"
          className={inputClass}
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        Catatan (opsional)
        <input
          type="text"
          name="note"
          maxLength={500}
          defaultValue={initial.note ?? ""}
          placeholder="Contoh: titip di satpam"
          className={inputClass}
        />
      </label>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan alamat"}
      </button>
    </form>
  );
}
