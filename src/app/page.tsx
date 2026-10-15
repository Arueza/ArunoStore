import Link from "next/link";
import HeroSlideshow from "@/components/HeroSlideshow";

const SERVICES = [
  {
    href: "/commissions",
    name: "Commission",
    blurb:
      "Kirim ide dan referensi anda, kami akan memberikan kutipan harga dan waktu pengerjaan.",
  },
  {
    href: "/titipan",
    name: "Titipan",
    blurb:
      "Kirim tautan produk dari Jepang. Kami belikan, lalu kirim ke alamatmu di Indonesia.",
  },
] as const;

/**
 * The storefront. This is the page every visitor lands on and the page a signed-in
 * buyer is returned to after logging in — there is no separate dashboard, so the
 * shop is the app.
 *
 * Holds no session read on purpose: the header already carries the account
 * control, and awaiting Supabase here would put a round trip in front of the one
 * page that must render fastest and signed out.
 *
 * The service grid is two equal cards now that Belanja lives only in the
 * hero button and the nav — Commission and Titipan are both request-first
 * flows, so they sit side by side at equal weight.
 *
 * The hero carries the five photos as a crossfading backdrop (HeroSlideshow,
 * Cottonink-style) and pins to the top of the viewport while the grid slides
 * over it; the photos zoom slightly with the scroll. The headline and the
 * button stay light text over a darkened overlay so they read on any slide.
 */
export default function Home() {
  return (
    <main>
      <section className="sticky top-0 flex min-h-[92svh] flex-col items-center justify-center overflow-hidden bg-ink px-5 py-24 text-center text-white sm:px-[6%] sm:py-36">
        <HeroSlideshow />
        <h1 className="relative font-display text-5xl font-semibold tracking-wide sm:text-7xl">
          Aruno Store
        </h1>
        <p className="relative mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
          Commission seni dan titipan dari Jepang, dalam satu tempat.
        </p>
        <p className="relative mt-2 text-xs uppercase tracking-[0.18em] text-white/65">
          Harga ditentukan setelah permintaan ditinjau
        </p>
        <Link
          href="/shop"
          className="relative mt-9 inline-block bg-plum px-9 py-3.5 text-xs font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8d4e66]"
        >
          Mulai Belanja
        </Link>
      </section>

      <section
        aria-label="Layanan"
        className="relative z-10 mx-auto grid w-full max-w-5xl gap-px bg-[#eeeae5] px-0 py-px sm:grid-cols-2"
      >
        {SERVICES.map((service) => (
          <Link
            key={service.href}
            href={service.href}
            className="group bg-cream px-6 py-14 text-center transition-colors hover:bg-white sm:px-10 sm:py-16"
          >
            <h2 className="font-display text-2xl font-semibold text-ink">
              {service.name}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#6c6870]">
              {service.blurb}
            </p>
            <span className="mt-6 inline-block text-xs uppercase tracking-[0.18em] text-plum">
              Mulai
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}