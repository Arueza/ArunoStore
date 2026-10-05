"use client";

import { useEffect, useRef } from "react";
import { usePanels } from "@/components/Panels";

const ID = "search";

/**
 * The search icon and the search field it reveals.
 *
 * The field slides out under the header rather than over the page, so the
 * storefront stays visible behind it. Cottonink covers the whole viewport; a
 * panel is enough here and keeps the catalogue on screen while the buyer types.
 *
 * Its open state comes from Panels.tsx, like the cart and the account menu, so
 * opening one closes the others.
 */
export default function SearchPanel() {
  const { open, toggle } = usePanels();
  const isOpen = open === ID;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Cari"
        aria-expanded={isOpen}
        onClick={() => toggle(ID)}
        className="p-2 transition-colors hover:text-plum"
      >
        <SearchIcon />
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-[#eeeae5] bg-cream shadow-sm">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-4 sm:px-[6%]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="shrink-0 text-[#6c6870]"
              aria-hidden
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
              type="button"
              onClick={() => toggle(ID)}
              aria-label="Tutup pencarian"
              className="shrink-0 text-xs text-[#6c6870] transition-colors hover:text-ink"
            >
              Tutup
            </button>
          </div>

          {/* ponytail: no results yet. The catalogue arrives with Phase 2. */}
          <p className="mx-auto max-w-xl px-5 pb-4 text-center text-sm text-[#b0acb5]">
            Belum ada produk tersedia.
          </p>
        </div>
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}