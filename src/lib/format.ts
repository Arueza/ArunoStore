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

const day = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // Pinned to UTC, not to whatever region the server happens to run in. The
  // column is timestamptz: without this, the same row shows two different dates
  // depending on who asked, and "newest first" stops meaning the same thing on
  // the staff queue and the buyer's list.
  //
  // Switch to "Asia/Jakarta" if a staff member quotes a date back to a buyer and
  // the two of them disagree about which day it was.
  timeZone: "UTC",
});

// The queues at 2.8 and 2.11 are ordered newest first, so a date sits next to
// every row. Renders UTC because the formatter above is pinned to it; see the
// comment there for why that is not Asia/Jakarta.
export function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  return day.format(parsed);
}