/**
 * The pink strip above the header, carrying one scrolling line of text.
 *
 * Cottonink puts social icons on the left, a marquee in the middle and a help
 * link on the right. Only the middle is built here: the shop has no social
 * accounts and no FAQ page yet, and a link to a page that does not exist is the
 * same bug task 1.11 fixed in the footer. Add the two sides when the pages land.
 *
 * Marquee rather than static text because the copy is short enough to read in one
 * glance, so repeating it is decoration only. It is paused for anyone who asked
 * for reduced motion, and hidden from screen readers, which would otherwise
 * read the line six times.
 */
export default function AnnouncementBar() {
  return (
    <div className="bg-[#f6d9de] text-ink">
      <div className="overflow-hidden py-2.5">
        <p
          className="animate-marquee whitespace-nowrap text-center text-[11px] uppercase tracking-[0.18em] motion-reduce:animate-none"
          aria-hidden
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="px-6">
              Commissions &amp; Titipan dari Jepang
              <span className="px-6" aria-hidden>
                ✦
              </span>
              Harga ditentukan setelah permintaan ditinjau
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}