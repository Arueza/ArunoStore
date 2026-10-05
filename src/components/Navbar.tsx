import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import AuthSlot from "@/components/AuthSlot";
import CartDrawer from "@/components/CartDrawer";
import MenuDrawer from "@/components/MenuDrawer";
import { PanelProvider } from "@/components/Panels";
import SearchPanel from "@/components/SearchPanel";
import logo from "@/components/aruno-logo.png";

// Navbar itself never awaits. Awaiting the session here used to hold the whole
// root segment, children included, behind a round trip to Supabase, so every
// page waited on it. The read now lives in AuthSlot behind a boundary, which
// leaves the wordmark and icons free to render immediately.
export default function Navbar() {
  return (
    <header className="sticky top-0 z-30">
      <AnnouncementBar />

      {/* Three equal columns so the wordmark sits dead centre whatever the side
          columns measure. justify-between would drift it, because the icon row
          is wider than the single hamburger.

          relative on the row anchors the search panel, which drops below the bar.
          z-30 on each of the three columns is what keeps the header usable while a
          drawer is open: the drawer backdrops are fixed z-20 inside this row's
          stacking context, and a positioned child with no z-index loses to them.
          Without it, dimming the page also swallows the icons that close it. */}
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#eeeae5] bg-cream px-5 py-4 sm:px-[6%]">
        {/* One open panel at a time across the search field, the cart and the
            account menu. AuthSlot renders inside it, so the account menu shares
            the same switch. */}
        <PanelProvider>
          <div className="relative z-30 flex justify-start">
            <MenuDrawer />
          </div>

          <Link
            href="/"
            className="relative z-30 flex items-center justify-center"
          >
            <Image
              src={logo}
              alt="Aruno Store"
              width={110}
              height={40}
              priority
            />
          </Link>

          <div className="relative z-30 flex items-center justify-end gap-1 sm:gap-2">
            <SearchPanel />
            <CartDrawer />
            <Suspense fallback={<AccountFallback />}>
              <AuthSlot />
            </Suspense>
          </div>
        </PanelProvider>
      </div>
    </header>
  );
}

// Reserves the width of the account icon so the icons do not jump sideways when
// the session resolves. It holds space rather than drawing a signed-out control,
// because flashing a working sign-in link at someone who is already signed in is
// worse than a small layout shift.
function AccountFallback() {
  return <div aria-hidden="true" className="h-[22px] w-[22px]" />;
}