"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitTitipanRequest, type TitipanRequestState } from "./actions";

const initialState: TitipanRequestState = { message: "", sent: false };

const fieldClass =
  "w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors";

/**
 * The titipan request form: what the buyer wants bought in Japan.
 *
 * Five fields, because that is what staff needs to price a parcel: the link, the
 * variant, how many, and what they are expecting to pay. Everything else is the
 * shop's half of the row and starts out empty.
 *
 * No options arrive as props here, unlike the commission form — nothing in this
 * form is read from a table, so the page stays static and prerenders.
 */
export default function TitipanRequestForm() {
  const [state, formAction, pending] = useActionState(
    submitTitipanRequest,
    initialState,
  );

  if (state.sent) {
    return (
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Permintaan terkirim
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6c6870]">
          {state.message}
        </p>
        {/* ponytail: points at /titipan because /titipan/mine does not exist
            until 3.8. Swap this href and the sentence above it when the buyer's
            own list lands — until then this link is the only one that resolves. */}
        <Link
          href="/titipan"
          className="mt-5 inline-block text-sm font-semibold text-plum hover:underline"
        >
          Kembali ke halaman titipan
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="productLink"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Tautan produk
        </label>
        {/* type=url is a keyboard hint on a phone. The real check is the action:
            the value is stored and later rendered as an href by staff, so a
            javascript: link has to be refused before it reaches the column. */}
        <input
          id="productLink"
          name="productLink"
          type="url"
          required
          placeholder="https://store.example/item/1234"
          className={fieldClass}
        />
        <p className="mt-1.5 text-xs text-[#6c6870]">
          Tautan dari toko Jepang yang mau kamu titipkan.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="size"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Ukuran{" "}
            <span className="font-normal text-[#6c6870]">opsional</span>
          </label>
          <input
            id="size"
            name="size"
            type="text"
            placeholder="M / 38"
            className={fieldClass}
          />
        </div>

        <div>
          <label
            htmlFor="color"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Warna{" "}
            <span className="font-normal text-[#6c6870]">opsional</span>
          </label>
          <input
            id="color"
            name="color"
            type="text"
            placeholder="Hitam"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="quantity"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Jumlah
          </label>
          {/* A number input because this is a count, not money: min and step keep
              the browser's own stepper honest and the action refuses anything
              that is not a whole number at least 1. */}
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            className={fieldClass}
          />
        </div>

        <div>
          <label
            htmlFor="budget"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Perkiraan budget{" "}
            <span className="font-normal text-[#6c6870]">opsional</span>
          </label>
          {/* Text and inputMode numeric rather than type=number, for the reason
              the staff quote box gives: a number input accepts "e", so the
              browser will happily submit 1e5. Budget is money, and money is
              whole rupiah here (AGENTS.md), so the action's pattern is the real
              check and this only puts the right keyboard on a phone. */}
          <input
            id="budget"
            name="budget"
            type="text"
            inputMode="numeric"
            placeholder="500000"
            className={fieldClass}
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[#6c6870]">
        Budget hanya perkiraan. Harga sebenarnya keluar di kutipan, bersama
        ongkir dan biaya layanan.
      </p>

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