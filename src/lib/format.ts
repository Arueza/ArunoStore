const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// Money is stored as whole rupiah, so rounding here only guards against a bad
// value reaching the screen. Do not use this for maths: add whole rupiah only.
export function formatRupiah(amount: number): string {
  return rupiah.format(Math.round(amount));
}