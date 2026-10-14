"use client";

import { useState } from "react";
import { addToCart } from "../actions";

export default function AddToCart({
  itemId,
  sizes,
}: {
  itemId: string;
  sizes?: { size: string; stock: number }[];
}) {
  const hasSizes = Array.isArray(sizes) && sizes.length > 0;
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentVariant = hasSizes
    ? sizes.find((s) => s.size === selectedSize)
    : null;
  const maxQty = hasSizes ? (currentVariant?.stock ?? 1) : 99;

  async function handleAdd() {
    setError(null);

    if (hasSizes && !selectedSize) {
      setError("Pilih ukuran dulu.");
      return;
    }

    if (hasSizes && currentVariant && currentVariant.stock <= 0) {
      setError("Stok untuk ukuran ini sedang habis.");
      return;
    }

    try {
      await addToCart(itemId, selectedSize, qty);
    } catch {
      setError("Gagal menambahkan ke keranjang.");
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {hasSizes && (
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
              Ukuran
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((s) => {
                const outOfStock = s.stock <= 0;
                const isSelected = selectedSize === s.size;

                return (
                  <button
                    key={s.size}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => {
                      setSelectedSize(s.size);
                      setQty(1);
                    }}
                    className={`border px-4 py-2 text-sm transition-colors ${
                      isSelected
                        ? "border-plum font-semibold text-plum"
                        : outOfStock
                          ? "cursor-not-allowed border-[#eeeae5] text-[#b0acb5] opacity-50"
                          : "border-[#e2ddd7] text-ink hover:border-plum"
                    }`}
                  >
                    {s.size}
                    {outOfStock && " (Habis)"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Jumlah
          </p>
          <div className="mt-2 inline-flex items-center border border-[#e2ddd7]">
            <button
              type="button"
              aria-label="Kurangi"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-ink hover:text-plum"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center text-sm">{qty}</span>
            <button
              type="button"
              aria-label="Tambah"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="px-3 py-2 text-ink hover:text-plum"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-plum" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="mt-6 w-full bg-plum px-6 py-3.5 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Tambah ke Keranjang
      </button>
    </div>
  );
}
