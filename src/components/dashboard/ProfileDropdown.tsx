"use client";

import Link from "next/link";
import { logout } from "@/app/logout/actions";

type Props = {
  userName: string;
  userEmail: string;
  onClose: () => void;
};

export default function ProfileDropdown({ userName, userEmail, onClose }: Props) {
  return (
    <div className="absolute right-0 top-full mt-3 w-60 rounded-lg border border-[#eeeae5] bg-cream shadow-lg z-40">
      {/* Greeting. The profile's full name arrives with task 1.9; until then
          the email stands in for it. */}
      <div className="px-5 py-4 border-b border-[#eeeae5]">
        <p className="text-sm font-semibold text-ink">
          Halo, {userName || userEmail || "kamu"}!
        </p>
        {userName && userEmail && (
          <p className="mt-0.5 truncate text-xs text-[#6c6870]">{userEmail}</p>
        )}
      </div>

      {/* Menu */}
      <ul className="py-2">
        <li>
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-[#f3f0ec] transition-colors"
          >
            <AccountIcon />
            Manage Account
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/address"
            onClick={onClose}
            className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-[#f3f0ec] transition-colors"
          >
            <AddressIcon />
            Manage Address
          </Link>
        </li>
      </ul>

      {/* Logout */}
      <div className="border-t border-[#eeeae5] py-2">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-plum hover:bg-[#f3f0ec] transition-colors"
          >
            <LogoutIcon />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}

function AccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
