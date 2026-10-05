import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AuthSlot from "./AuthSlot";
import logo from "./aruno-logo.png";

const LINKS = [
  { href: "/commissions", label: "Commissions" },
  { href: "/titipan", label: "Titipan" },
];

// Navbar itself never awaits. Awaiting the session here used to hold the whole
// root segment, children included, behind a round trip to Supabase, so every
// page waited on it. The read now lives in AuthSlot behind a boundary, which
// leaves the logo and links free to render immediately.
export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#eeeae5] bg-cream">
      <div className="flex min-h-20 flex-wrap items-center gap-x-8 gap-y-2 px-5 sm:px-[6%]">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="Aruno Store" width={73} height={40} priority />
        </Link>

        {/* ponytail: no hamburger. The links wrap onto a second row on narrow
            screens. Add a toggle when the nav grows past three links. */}
        <nav
          aria-label="Main"
          className="flex flex-wrap gap-8 text-sm text-[#6c6870]"
        >
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-6 text-sm">
          <Suspense fallback={<AuthSlotFallback />}>
            <AuthSlot />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

// Reserves roughly the width of the signed-out links so the header does not
// jump when the slot resolves. It shows nothing rather than the signed-out
// links, because flashing a working sign-in button at someone who is already
// signed in is worse than a small layout shift.
function AuthSlotFallback() {
  return <div aria-hidden="true" className="h-10 w-[9.5rem]" />;
}