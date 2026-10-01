import { describe, expect, test } from "vitest";
import { formatRupiah } from "@/lib/format";

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