"use client";

import { usePanels } from "@/components/Panels";

const ID = "cart";

/**
 * The shopping bag and the cart panel it opens.
 *
 * Cottonink draws its cart in from the right with the page dimmed behind it,
 * which is what this does. The panel carries its own open state for the reason
 * MenuDrawer does.
 *
 * ponytail: the cart is decorative until the quote flow in Phase 4 decides what
 * actually goes in it. A commission and a titipan are both quoted by staff
 * before anything is payable, so there is nothing to add to a basket yet — the
 * buyer accepts a quote instead. Delete this file if Phase 4 lands on that.
 */
export default function CartDrawer() {
  const { open, toggle, close } = usePanels();
  const isOpen = open === ID;

  return (
    <>
      <button
        type="button"
        aria-label="Keranjang"
        aria-expanded={isOpen}
        onClick={() => toggle(ID)}
        className="p-2 transition-colors hover:text-plum"
      >
        <BagIcon />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-ink/25"
            onClick={close}
            aria-hidden
          />
          <div className="fixed inset-y-0 right-0 z-40 flex w-80 max-w-full flex-col bg-cream shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eeeae5] px-6 py-5">
              <h2 className="font-semibold tracking-wide">Keranjang</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup keranjang"
                className="p-1 transition-colors hover:text-plum"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <BagIcon className="text-[#b0acb5]" />
              <p className="text-sm text-[#6c6870]">
                Keranjang kamu masih kosong.
              </p>
            </div>

            <div className="border-t border-[#eeeae5] px-6 py-5">
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded bg-plum px-4 py-2.5 text-sm font-semibold text-white opacity-40"
              >
                Bayar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}