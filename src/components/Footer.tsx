import Image from "next/image";
import Link from "next/link";
import logo from "./aruno-logo.png";

const GROUPS = [
  {
    heading: "Explore",
    links: [
      { href: "/commissions", label: "Commissions" },
      { href: "/titipan", label: "Titipan" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/auth/sign-up", label: "Sign up" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#eeeae6] bg-white px-5 pt-12 pb-6 sm:px-[8%]">
      <div className="flex flex-wrap justify-between gap-10 pb-11">
        <div>
          <Link href="/" className="flex items-center">
            <Image src={logo} alt="Aruno Store" width={58} height={32} />
          </Link>
          <p className="mt-3 text-xs text-[#8a858b]">
            Art commissions and titipan from Japan, in one place.
          </p>
        </div>

        <div className="flex gap-16 sm:gap-24">
          {GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-2.5 text-xs text-[#777]">
              <b className="mb-1 text-[#222]">{group.heading}</b>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-ink">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between border-t border-[#eee] pt-5 text-[10px] text-[#aaa]">
        <span>© 2026 Aruno Store</span>
        <span>Made for creators ✦</span>
      </div>
    </footer>
  );
}
