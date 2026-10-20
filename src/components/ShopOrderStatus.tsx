import { shopOrderStatusLabel } from "@/lib/paymentStatus";

/**
 * Colour-coded status chip for shop_orders. Text is always present, so colour
 * is reinforcement rather than the only signal. Unknown statuses fall back to
 * the grey chip and the raw word, the same visible-but-wrong rule as the
 * payment labels.
 */
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#fff7e6] text-[#8a5a00]",
  settled: "bg-[#f0f9f4] text-[#2d6a4f]",
  deny: "bg-[#fdf0ef] text-[#a33a32]",
  expire: "bg-[#f5f3f1] text-[#6c6870]",
};

export default function ShopOrderStatus({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ?? "bg-[#f5f3f1] text-[#6c6870]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ${style}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {shopOrderStatusLabel(status)}
    </span>
  );
}
