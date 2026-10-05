"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import logo from "@/components/aruno-logo.png";
import SearchDrawer from "./SearchDrawer";
import CartDrawer from "./CartDrawer";
import ProfileDropdown from "./ProfileDropdown";

const NAV_LINKS = [
  { href: "/dashboard/hot-item", label: "Hot Item" },
  { href: "/commissions", label: "Commission" },
  { href: "/titipan", label: "Titipan" },
];

type Props = {
  userName: string;
  userEmail: string;
};

export default function DashboardNavbar({ userName, userEmail }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function closeAll() {
    setSearchOpen(false);
    setCartOpen(false);
    setProfileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-cream border-b border-[#eeeae5]">
        {/* Top row */}
        <div className="flex items-center gap-x-6 px-5 sm:px-[6%] h-16">
          <Link href="/dashboard" className="flex items-center shrink-0">
            <Image src={logo} alt="Aruno Store" width={73} height={40} priority />
          </Link>

          <div className="flex-1" />

          {/* Icons */}
          <div className="flex items-center gap-5">
            {/* Search */}
            <button
              aria-label="Search"
              onClick={() => {
                setCartOpen(false);
                setProfileOpen(false);
                setSearchOpen((v) => !v);
              }}
              className="hover:text-plum transition-colors"
            >
              <SearchIcon />
            </button>

            {/* Cart */}
            <button
              aria-label="Cart"
              onClick={() => {
                setSearchOpen(false);
                setProfileOpen(false);
                setCartOpen((v) => !v);
              }}
              className="hover:text-plum transition-colors"
            >
              <CartIcon />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                aria-label="Profile"
                onClick={() => {
                  setSearchOpen(false);
                  setCartOpen(false);
                  setProfileOpen((v) => !v);
                }}
                className="hover:text-plum transition-colors"
              >
                <ProfileIcon />
              </button>

              {profileOpen && (
                <ProfileDropdown
                  userName={userName}
                  userEmail={userEmail}
                  onClose={() => setProfileOpen(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom row — nav links */}
        <div className="flex items-center gap-8 px-5 sm:px-[6%] h-10 text-sm text-[#6c6870] border-t border-[#eeeae5]">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Search expand — muncul dari bawah navbar */}
        {searchOpen && <SearchDrawer onClose={() => setSearchOpen(false)} />}
      </header>

      {/* Cart drawer — overlay dari kanan */}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}

      {/* Overlay gelap untuk tutup drawer/dropdown */}
      {(cartOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-20 bg-ink/20"
          onClick={closeAll}
          aria-hidden
        />
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
