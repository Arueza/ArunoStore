"use client";

import Link from "next/link";
import { usePanels } from "@/components/Panels";
import { logout } from "@/app/logout/actions";

const ID = "account";

type Props = {
  userName: string;
  userEmail: string;
};

/**
 * The account icon and the menu it opens, for a signed-in visitor.
 *
 * Signed out there is no menu at all: AuthSlot renders a plain link to /login in
 * the same spot, so the header shows one icon either way.
 *
 * Cottonink sends the account icon straight to the account page. This opens a
 * menu instead because logging out has to live somewhere, and a dedicated page
 * for one button is not worth the route.
 */
export default function AccountDropdown({ userName, userEmail }: Props) {
  const { open, toggle, close } = usePanels();
  const isOpen = open === ID;

  return (
    <>
      <button
        type="button"
        aria-label="Akun"
        aria-expanded={isOpen}
        onClick={() => toggle(ID)}
        className="p-2 transition-colors hover:text-plum"
      >
        <AccountIcon />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-ink/25"
            onClick={close}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-3 w-64 rounded-lg border border-[#eeeae5] bg-cream shadow-lg">
            <div className="border-b border-[#eeeae5] px-5 py-4">
              <p className="truncate text-sm font-semibold text-ink">
                Halo, {userName || userEmail || "kamu"}!
              </p>
              {userName && userEmail && (
                <p className="mt-0.5 truncate text-xs text-[#6c6870]">
                  {userEmail}
                </p>
              )}
            </div>

            <ul className="py-2">
              <li>
                <Link
                  href="/account"
                  onClick={close}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-[#f3f0ec]"
                >
                  <AccountIcon className="h-4 w-4" />
                  Akun saya
                </Link>
              </li>
            </ul>

            <div className="border-t border-[#eeeae5] py-2">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-plum transition-colors hover:bg-[#f3f0ec]"
                >
                  <LogoutIcon />
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function AccountIcon({ className }: { className?: string }) {
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
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}