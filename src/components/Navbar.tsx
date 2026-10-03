import Image from "next/image";
import Link from "next/link";
import logo from "./aruno-logo.png";

const LINKS = [
  { href: "/commissions", label: "Commissions" },
  { href: "/titipan", label: "Titipan" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#eeeae5] bg-cream">
      <div className="flex min-h-20 flex-wrap items-center gap-x-8 gap-y-2 px-5 sm:px-[6%]">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="Aruno Store" width={73} height={40} priority />
        </Link>

        {/* ponytail: no hamburger. The links wrap onto a second row on narrow
            screens. Add a toggle when the nav grows past three links. */}
        <nav aria-label="Main" className="flex flex-wrap gap-8 text-sm text-[#6c6870]">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-6 text-sm">
          <Link href="/login" className="font-semibold hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-[9px] bg-ink px-4 py-2.5 font-bold text-white hover:bg-black"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
