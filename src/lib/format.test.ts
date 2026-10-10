import { describe, expect, test } from "vitest";
import { formatDate, formatRupiah } from "@/lib/format";

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

describe("formatRupiah", () => {
  test("groups thousands with a dot and shows no decimals", () => {
    expect(formatRupiah(15000)).toBe(`Rp${nbsp}15.000`);
  });

  test("rounds a stray decimal rather than printing one", () => {
    expect(formatRupiah(15000.5)).toBe(`Rp${nbsp}15.001`);
  });

  test("keeps a value under one thousand ungrouped", () => {
    expect(formatRupiah(999)).toBe(`Rp${nbsp}999`);
  });
});

// The queues at 2.8 and 2.11 read timestamptz straight out of Postgres and render
// one date per row.
describe("formatDate", () => {
  test("renders a UTC instant as the UTC date", () => {
    // Pinned to UTC rather than the server's zone. Without a time zone on the
    // formatter, the same row reads as two different dates depending on which
    // region answers, and "newest first" stops meaning the same thing.
    expect(formatDate("2026-10-09T23:30:00Z")).toBe("9 Okt 2026");
  });

  // A midnight-UTC instant rendered in a zone behind UTC would show the day
  // before, which is how a request submitted on the 9th gets filed as the 8th.
  test("does not roll the date backwards at the start of the day", () => {
    expect(formatDate("2026-10-09T00:00:00Z")).toBe("9 Okt 2026");
  });

  // An unreadable value renders as nothing rather than "Invalid Date" or a thrown
  // RangeError taking the whole queue down with it.
  test("renders an unparseable value as empty", () => {
    expect(formatDate("not a date")).toBe("");
  });
});