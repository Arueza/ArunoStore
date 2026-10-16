import { INSTAGRAM_URL } from "@/lib/contact";

function InstagramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/**
 * Manual shipping fallback shared by checkout, the buyer lists and the
 * payment history. Shown before payment (as what to do next) and after it
 * (as the action to take now): once paid, the buyer DMs the paid-checkout
 * screenshot on Instagram and staff resolves the delivery address there.
 */
export default function InstagramHelpBox({ orderId }: { orderId?: string }) {
  return (
    <section
      aria-label="Konfirmasi pembayaran via Instagram"
      className="mt-8 border border-[#eeeae5] bg-cream p-5"
    >
      <h2 className="font-display text-lg font-semibold text-ink">
        Sudah bayar? Konfirmasi via Instagram
      </h2>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[#6c6870]">
        <li>Screenshot halaman checkout yang lunas sebagai bukti bayar.</li>
        <li>Chat Instagram kami dan kirim screenshot beserta ID pesanan.</li>
        <li>Staff mengecek pembayaran lalu menyelesaikan alamat dan pengiriman di chat.</li>
      </ol>

      {orderId && (
        <p className="mt-3 text-xs text-[#6c6870]">
          Sertakan ID pesanan:{" "}
          <span className="font-mono font-medium text-ink">{orderId}</span>
        </p>
      )}

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        <InstagramIcon />
        Chat Instagram
      </a>
    </section>
  );
}
