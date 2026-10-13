"use client";

import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/components/navLinks";
import { usePanels } from "@/components/Panels";
import logo from "@/components/aruno-logo.png";

const ID = "menu";

/**
 * The hamburger and the panel it opens, mobile only.
 *
 * Desktop shows the same links as a visible row below the header (Navbar,
 * Cottonink-style), so this drawer hides from md up. The link list lives in
 * navLinks.ts, shared with that row so the two cannot drift apart.
 *
 * Holds no open state of its own: Panels.tsx decides which panel is open, so
 * opening the cart closes this one without either component knowing the other
 * exists.
 */
export default function MenuDrawer() {
  const { open, toggle, close } = usePanels();
  const isOpen = open === ID;

  return (
    <>
      <button
        type="button"
        aria-label="Buka menu"
        aria-expanded={isOpen}
        onClick={() => toggle(ID)}
        className="-ml-2 p-2 transition-colors hover:text-plum"
      >
        <MenuIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink/25"
            onClick={close}
          aria-hidden
        />
      )}

      {/* The panel stays in the markup and is hidden with visibility, rather
          than being mounted on click. The links are then part of the HTML the
          server sends, which a crawler and a visitor without JavaScript both
          need, and opening the menu costs no layout work. visibility:hidden also
          keeps the closed panel out of the tab order, so its links and its close
          button cannot be reached by keyboard until the menu is open. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-cream shadow-xl transition-transform ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isOpen ? "" : "invisible"}`}
      >
        <div className="flex items-center justify-between border-b border-[#eeeae5] px-6 py-5">
          <Image src={logo} alt="Aruno Store" width={73} height={40} priority />
          <button
            type="button"
            onClick={close}
            aria-label="Tutup menu"
            className="p-1 transition-colors hover:text-plum"
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="block px-6 py-3.5 text-sm transition-colors hover:bg-[#f3f0ec]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="15" y2="17" />
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