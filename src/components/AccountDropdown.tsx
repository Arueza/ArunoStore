"use client";

import Link from "next/link";
import { usePanels } from "@/components/Panels";
import { logout } from "@/app/logout/actions";

const ID = "account";

type Props = {
  userName: string;
  userEmail: string;
  /** Staff run the shop halves themselves, so buyer-only links stay hidden. */
  isStaff?: boolean;
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
export default function AccountDropdown({ userName, userEmail, isStaff = false }: Props) {
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
              <li>
                <Link
                  href="/account/edit"
                  onClick={close}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-[#f3f0ec]"
                >
                  <EditIcon />
                  Ubah data akun
                </Link>
              </li>
              {/* Where a buyer goes to see whether a quote has arrived. The menu
                  only renders signed in, and the page is guarded anyway, so no
                  signed-out link is created by this. Hidden for staff: they
                  run these halves and never hold a buyer row. */}
              {!isStaff && (
                <li>
                  <Link
                    href="/commissions/mine"
                    onClick={close}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-[#f3f0ec]"
                  >
                    <CommissionsIcon />
                    Commissions saya
                  </Link>
                </li>
              )}
              {!isStaff && (
                <li>
                  <Link
                    href="/titipan/mine"
                    onClick={close}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-[#f3f0ec]"
                  >
                    <TitipanIcon />
                    Titipan saya
                  </Link>
                </li>
              )}
              {/* One history for every payment, whichever half it belongs to.
                  The menu only renders signed in, and the page is guarded
                  anyway, so no signed-out link is created by this. Buyers
                  only: staff rows never exist, so there is nothing to list. */}
              {!isStaff && (
                <li>
                  <Link
                    href="/payments"
                    onClick={close}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-[#f3f0ec]"
                  >
                    <ReceiptIcon />
                    Riwayat transaksi
                  </Link>
                </li>
              )}
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

function EditIcon() {
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function CommissionsIcon() {
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 19l7-7-3-3" />
      <path d="M18 13H6a2 2 0 00-2 2v3" />
    </svg>
  );
}

function TitipanIcon() {
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ReceiptIcon() {
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21Z" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
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