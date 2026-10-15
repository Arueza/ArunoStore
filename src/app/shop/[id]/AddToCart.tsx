"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "../actions";

const FAILURE_MESSAGE: Record<string, string> = {
  unavailable: "Produk ini sudah tidak tersedia.",
  "invalid-size": "Ukuran ini tidak tersedia.",
  invalid: "Produk tidak valid.",
};

export default function AddToCart({
  itemId,
  sizes,
}: {
  itemId: string;
  sizes?: { size: string; stock: number }[];
}) {
  const router = useRouter();
  const hasSizes = Array.isArray(sizes) && sizes.length > 0;
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentVariant = hasSizes
    ? sizes.find((s) => s.size === selectedSize)
    : null;
  const maxQty = hasSizes ? (currentVariant?.stock ?? 1) : 99;

  async function handleAdd() {
    setError(null);
    setSuccess(false);

    if (hasSizes && !selectedSize) {
      setError("Pilih ukuran dulu.");
      return;
    }

    if (hasSizes && currentVariant && currentVariant.stock <= 0) {
      setError("Stok untuk ukuran ini sedang habis.");
      return;
    }

    setLoading(true);

    try {
      const result = await addToCart(itemId, selectedSize, qty);

      if (result.ok) {
        setSuccess(true);
        router.refresh();
        window.dispatchEvent(new Event("aruno:cart-changed"));
        return;
      }

      if (result.reason === "login" && result.next) {
        router.push(result.next);
        return;
      }

      if (result.next) {
        router.push(result.next);
      }
      setError(FAILURE_MESSAGE[result.reason] ?? "Gagal menambahkan ke keranjang.");
    } catch {
      setError("Gagal menambahkan ke keranjang.");
    } finally {
      setLoading(false);
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
                    disabled={outOfStock || loading}
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
              disabled={loading}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-ink hover:text-plum disabled:opacity-50"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center text-sm">{qty}</span>
            <button
              type="button"
              aria-label="Tambah"
              disabled={loading}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="px-3 py-2 text-ink hover:text-plum disabled:opacity-50"
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

      {success && (
        <p className="mt-3 text-sm text-[#2d6a4f]" role="status">
          Ditambahkan ke keranjang ✓
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        className="mt-6 w-full bg-plum px-6 py-3.5 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Menambahkan…" : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}
