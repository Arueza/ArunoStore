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
];

/**
 * The storefront. This is the page every visitor lands on and the page a signed-in
 * buyer is returned to after logging in — there is no separate dashboard, so the
 * shop is the app.
 *
 * Holds no session read on purpose: the header already carries the account
 * control, and awaiting Supabase here would put a round trip in front of the one
 * page that must render fastest and signed out.
 *
 * ponytail: the hero is text only. The catalogue, and the artwork gallery behind
 * it, arrive with Phase 2 — this is the frame they go in, not the shop itself.
 */
export default function Home() {
  return (
    <main>
      <section className="border-b border-[#eeeae5] px-5 py-20 text-center sm:px-[6%] sm:py-28">
        <h1 className="font-display text-4xl font-semibold tracking-wide text-ink sm:text-5xl">
          Aruno Store
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
          Commission seni dan titipan dari Jepang, dalam satu tempat.
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#b0acb5]">
          Harga ditentukan setelah permintaan ditinjau
        </p>
      </section>

      <section
        aria-label="Layanan"
        className="mx-auto grid w-full max-w-4xl gap-px bg-[#eeeae5] px-0 py-px sm:grid-cols-2"
      >
        {SERVICES.map((service) => (
          <Link
            key={service.href}
            href={service.href}
            className="group bg-cream px-6 py-12 text-center transition-colors hover:bg-white sm:px-10"
          >
            <h2 className="font-display text-2xl font-semibold text-ink">
              {service.name}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#6c6870]">
              {service.blurb}
            </p>
            <span className="mt-5 inline-block text-xs uppercase tracking-[0.18em] text-plum">
              Mulai
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}