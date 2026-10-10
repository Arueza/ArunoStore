import Link from "next/link";

const SERVICES = [
  {
    href: "/shop",
    name: "Belanja",
    blurb:
      "Barang siap kirim dari endorse kami — merchandise seni dan barang dari Jepang.",
  },
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

const [shop, ...quotes] = SERVICES;

/**
 * The storefront. This is the page every visitor lands on and the page a signed-in
 * buyer is returned to after logging in — there is no separate dashboard, so the
 * shop is the app.
 *
 * Holds no session read on purpose: the header already carries the account
 * control, and awaiting Supabase here would put a round trip in front of the one
 * page that must render fastest and signed out.
 *
 * The service grid gives Belanja a full-width lead row and splits the row below
 * between Commission and Titipan. Belanja leads because it is the browsable one —
 * a visitor with a product in mind reaches the catalogue without reading anything
 * else. Commission and Titipan are both request-first flows, so they sit side by
 * side under it at equal weight.
 *
 * ponytail: the tiles are flat tinted panels. Real photography goes behind each
 * one via `next/image` once the catalogue has images — the tint is only here so
 * the block is not a wall of unbroken cream.
 */
export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f6d9de]/45 via-cream to-cream px-5 py-24 text-center sm:px-[6%] sm:py-36">
        <h1 className="font-display text-5xl font-semibold tracking-wide text-ink sm:text-7xl">
          Aruno Store
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
          Commission seni dan titipan dari Jepang, dalam satu tempat.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#b0acb5]">
          Harga ditentukan setelah permintaan ditinjau
        </p>
        <Link
          href={shop.href}
          className="mt-9 inline-block bg-plum px-9 py-3.5 text-xs font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8d4e66]"
        >
          Mulai Belanja
        </Link>
      </section>

      <section
        aria-label="Layanan"
        className="mx-auto grid w-full max-w-5xl gap-px bg-[#eeeae5] px-0 py-px sm:grid-cols-2"
      >
        <Link
          href={shop.href}
          className="group bg-cream px-6 py-16 text-center transition-colors hover:bg-white sm:col-span-2 sm:px-10 sm:py-24"
        >
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            {shop.name}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#6c6870] sm:text-base">
            {shop.blurb}
          </p>
          <span className="mt-7 inline-block text-xs uppercase tracking-[0.18em] text-plum">
            Mulai
          </span>
        </Link>

        {quotes.map((service) => (
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