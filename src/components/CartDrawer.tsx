"use client";

import { useSyncExternalStore } from "react";
import { usePanels } from "@/components/Panels";

const ID = "cart";

function readCartCount(): number {
  if (typeof document === "undefined") return 0;
  const match = document.cookie.match(/(?:^|;\s*)aruno_cart=([^;]*)/);
  if (!match) return 0;
  try {
    const items = JSON.parse(decodeURIComponent(match[1]));
    if (!Array.isArray(items)) return 0;
    return items.reduce(
      (sum: number, item: { qty?: number }) => sum + (item.qty ?? 0),
      0,
    );
  } catch {
    return 0;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("focus", callback);
  return () => window.removeEventListener("focus", callback);
}

function getSnapshot() {
  return readCartCount();
}

function getServerSnapshot() {
  return 0;
}

/**
 * The shopping bag and the cart panel it opens.
 *
 * Cottonink draws its cart in from the right with the page dimmed behind it,
 * which is what this does. The panel carries its own open state for the reason
 * MenuDrawer does.
 *
 * CartItems (a server component) reads the cookie cart and renders the lines,
 * subtotal, and Bayar button. revalidatePath in the cart actions keeps it
 * fresh after every mutation.
 */
export default function CartDrawer({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { open, toggle, close } = usePanels();
  const isOpen = open === ID;
  const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <>
      <button
        type="button"
        aria-label="Keranjang"
        aria-expanded={isOpen}
        onClick={() => toggle(ID)}
        className="relative p-2 transition-colors hover:text-plum"
      >
        <BagIcon />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-plum px-1 text-[10px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
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

            {children}
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