"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { quoteTotal } from "@/lib/quote";
import { saveTitipanQuote } from "./actions";

const FIELDS = [
  { name: "quoteItemPrice", label: "Harga barang (Rp)", placeholder: "500000" },
  { name: "quoteShipping", label: "Ongkir (Rp)", placeholder: "180000" },
  { name: "quoteServiceFee", label: "Biaya layanan (Rp)", placeholder: "25000" },
] as const;

/**
 * A money field is a number the action will accept. Anything else counts as
 * zero here, which is the same rule the action enforces — it just refuses the
 * save rather than showing a total it would not write.
 */
function toAmount(value: string): number {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : 0;
}

/**
 * The quote box: three figures, a note, and the total the buyer will be shown.
 *
 * The commission box at 2.9 is a plain form because it holds one number. This one
 * holds three, so the sum has to move as staff type — which is the whole point
 * of "total computed automatically" at 3.6. The total comes from quoteTotal(),
 * the same function the public /titipan page uses for its worked example, so
 * there is one sum in the repository and not two that can drift apart.
 *
 * The boxes are controlled, but the form posts natively: React still hands
 * saveTitipanQuote every name, and the action re-reads and re-checks all three.
 * The state here is for showing a total, not for deciding what gets saved.
 */
export default function QuoteBox({
  id,
  status,
  quantity,
  quoteItemPrice,
  quoteShipping,
  quoteServiceFee,
  quoteNote,
}: {
  id: string;
  status: string;
  quantity: number;
  quoteItemPrice: number | null;
  quoteShipping: number | null;
  quoteServiceFee: number | null;
  quoteNote: string | null;
}) {
  const [amounts, setAmounts] = useState({
    quoteItemPrice: quoteItemPrice === null ? "" : String(quoteItemPrice),
    quoteShipping: quoteShipping === null ? "" : String(quoteShipping),
    quoteServiceFee: quoteServiceFee === null ? "" : String(quoteServiceFee),
  });

  const total = quoteTotal({
    itemPrice: toAmount(amounts.quoteItemPrice),
    shipping: toAmount(amounts.quoteShipping),
    serviceFee: toAmount(amounts.quoteServiceFee),
  });

  return (
    <form action={saveTitipanQuote} className="lg:sticky lg:top-24 lg:self-start">
      <h2 className="font-display text-lg font-semibold text-ink">Kutipan</h2>

      <input type="hidden" name="id" value={id} />

      {FIELDS.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
          >
            {field.label}
          </label>
          {/* inputMode numeric rather than type number: a number input allows "e"
              and the browser will happily submit 1e5. The pattern in the action is
              the real check; this just puts the right keyboard on a phone. */}
          <input
            id={field.name}
            name={field.name}
            type="text"
            inputMode="numeric"
            value={amounts[field.name]}
            onChange={(e) =>
              setAmounts((all) => ({ ...all, [field.name]: e.target.value }))
            }
            placeholder={field.placeholder}
            className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          />
        </div>
      ))}

      {/* The fee is a number for the whole parcel, not a number per item. The
          published rate lives on /titipan; repeating it here would be a second
          copy of a price that can change, so the box only says which parcel it
          is for and leaves the figure to staff. */}
      <p className="mt-3 text-xs leading-relaxed text-[#6c6870]">
        Pesanan ini {quantity} barang. Biaya layanan ditulis untuk seluruh
        pesanan, bukan per barang.
      </p>

      <div className="mt-6 flex items-baseline justify-between border-t border-[#eeeae5] pt-4">
        <span className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Total
        </span>
        <span className="font-medium text-ink">{formatRupiah(total)}</span>
      </div>

      <label
        htmlFor="quoteNote"
        className="mt-6 block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
      >
        Catatan untuk buyer
      </label>
      <textarea
        id="quoteNote"
        name="quoteNote"
        rows={5}
        defaultValue={quoteNote ?? ""}
        placeholder="Opsional. Contoh: harga sudah termasuk pajak Trekker."
        className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm leading-relaxed text-ink focus:border-plum focus:outline-none"
      />

      <button
        type="submit"
        className="mt-6 w-full bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        {status === "quoted" ? "Perbarui kutipan" : "Kirim kutipan"}
      </button>

      {status === "quoted" && (
        <p className="mt-3 text-xs leading-relaxed text-[#6c6870]">
          Kutipan sudah terkirim. Memperbarui akan menimpanya, dan buyer melihat
          angka yang baru.
        </p>
      )}
    </form>
  );
}