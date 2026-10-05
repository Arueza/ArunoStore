"use client";

import { useRef, useEffect } from "react";

type Props = {
  onClose: () => void;
};

export default function SearchDrawer({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border-t border-[#eeeae5] bg-cream px-5 sm:px-[6%] py-4 shadow-sm">
      <div className="flex items-center gap-3 max-w-xl mx-auto">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-[#6c6870]"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          placeholder="Cari produk..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0acb5]"
        />

        <button
          onClick={onClose}
          aria-label="Tutup pencarian"
          className="text-xs text-[#6c6870] hover:text-ink transition-colors"
        >
          Tutup
        </button>
      </div>

      {/* ponytail: hasil pencarian kosong untuk sekarang; diisi Phase 2/3 */}
      <p className="mt-4 text-center text-sm text-[#b0acb5] max-w-xl mx-auto">
        Belum ada produk tersedia.
      </p>
    </div>
  );
}
