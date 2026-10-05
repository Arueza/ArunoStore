"use client";

type Props = {
  onClose: () => void;
};

export default function CartDrawer({ onClose }: Props) {
  return (
    <div className="fixed right-0 top-0 z-30 flex h-full w-80 max-w-full flex-col bg-cream shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eeeae5] px-6 py-5">
        <h2 className="font-semibold tracking-wide">Keranjang</h2>
        <button
          onClick={onClose}
          aria-label="Tutup keranjang"
          className="hover:text-plum transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        {/* ponytail: keranjang kosong untuk sekarang; diisi Phase 2/3 */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#b0acb5]"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        <p className="text-sm text-[#6c6870]">Keranjang kamu masih kosong.</p>
      </div>

      {/* Footer */}
      <div className="border-t border-[#eeeae5] px-6 py-5">
        <button
          disabled
          className="w-full rounded bg-plum px-4 py-2.5 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
