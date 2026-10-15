"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
 *
 * Submitting navigates to /shop?q=, which filters the catalogue grid by
 * product name — one results page covers every showcase, so a search from any
 * page finds belanja, commission and titipan items alike. The plain form
 * action keeps it working without JavaScript; with it, the submit handler
 * routes client-side and shuts the panel.
 */
export default function SearchPanel() {
  const { open, toggle, close } = usePanels();
  const isOpen = open === ID;
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = term.trim();
    close();
    if (search) {
      router.push(`/shop?q=${encodeURIComponent(search)}`);
    }
  };

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
          <form
            action="/shop"
            method="get"
            onSubmit={submit}
            className="mx-auto flex max-w-xl items-center gap-3 px-5 py-4 sm:px-[6%]"
          >
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
              name="q"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Cari produk..."
              aria-label="Cari produk"
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
          </form>
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