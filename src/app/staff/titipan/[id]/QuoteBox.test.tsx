import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

// The quote posts through the server action, which is the only thing that writes.
// Stubbed here so this file tests the box's own job: showing a total that moves
// as staff type, and refusing to invent one from a half-typed figure.
vi.mock("./actions", () => ({
  saveTitipanQuote: vi.fn(async () => undefined),
}));

import QuoteBox from "./QuoteBox";

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

// Typed from the component rather than written out, because the interesting
// cases below pass numbers and strings where a hand-written object literal would
// infer null-only and fail type check. The props are the contract; this is a
// fixture.
const NO_QUOTE: Pick<
  ComponentProps<typeof QuoteBox>,
  "quoteItemPrice" | "quoteShipping" | "quoteServiceFee" | "quoteNote"
> = {
  quoteItemPrice: null,
  quoteShipping: null,
  quoteServiceFee: null,
  quoteNote: null,
};

const renderBox = (overrides: Partial<typeof NO_QUOTE> = {}, quantity = 1) =>
  render(
    <QuoteBox id="r1" status="requested" quantity={quantity} {...NO_QUOTE} {...overrides} />,
  );

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

// "Total" and the figure are two elements in one row, so no single element holds
// both. Read the row's textContent: a text matcher normalises U+00A0 into a
// plain space, which would leave this assertion about nothing at all.
const total = () => screen.getByText("Total").parentElement!.textContent!;

describe("QuoteBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The three boxes are the quote. A total computed from two of them is a wrong
  // total, and one computed from none is worse.
  test("offers one box per figure and adds them up as staff type", () => {
    renderBox();

    type(/harga barang/i, "500000");
    type(/ongkir/i, "180000");
    type(/biaya layanan/i, "25000");

    expect(total()).toContain(`Rp${nbsp}705.000`);
  });

  // Same function the public /titipan page uses for its worked example, so the
  // figure a buyer is shown and the figure this box shows cannot drift apart.
  test("sums through quoteTotal", () => {
    renderBox();

    type(/harga barang/i, "1000");
    type(/ongkir/i, "20");
    type(/biaya layanan/i, "3");

    expect(total()).toContain(`Rp${nbsp}1.023`);
  });

  test("starts at zero with every box empty", () => {
    renderBox();

    expect(total()).toContain(`Rp${nbsp}0`);
  });

  // A half-typed figure is refused by the action, so the box must not quietly
  // add it up and show a number nobody can save.
  test.each(["15000.50", "150,000", "-5000", "1e5", "abc", ""])(
    "counts %o as nothing rather than as a figure",
    (value) => {
      renderBox();

      type(/harga barang/i, "500000");
      type(/ongkir/i, value);
      type(/biaya layanan/i, "25000");

      expect(total()).toContain(`Rp${nbsp}525.000`);
    },
  );

  // Staff re-open a request to change one figure; the others must already be
  // there or the new quote silently loses money.
  test("opens a quote that already exists, with its total", () => {
    renderBox({
      quoteItemPrice: 500000,
      quoteShipping: 180000,
      quoteServiceFee: 25000,
      quoteNote: "Sudah termasuk pajak.",
    });

    expect(screen.getByLabelText(/harga barang/i)).toHaveValue("500000");
    expect(screen.getByLabelText(/ongkir/i)).toHaveValue("180000");
    expect(screen.getByLabelText(/biaya layanan/i)).toHaveValue("25000");
    expect(screen.getByLabelText(/catatan/i)).toHaveValue("Sudah termasuk pajak.");
    expect(total()).toContain(`Rp${nbsp}705.000`);
  });

  // The fee is quoted for the whole parcel. Staff have to be told that while they
  // type it, or they quote the published per-item rate for a three-item order.
  test("names the quantity the fee covers", () => {
    renderBox({}, 3);

    expect(screen.getByText(/3 barang/)).toBeInTheDocument();
    expect(screen.getByText(/bukan per barang/i)).toBeInTheDocument();
  });

  // Money is whole rupiah, so a number input is the wrong control: it accepts "e"
  // and the browser will submit 1e5.
  test.each([/harga barang/i, /ongkir/i, /biaya layanan/i])(
    "takes %s as text with a numeric keyboard",
    (label) => {
      renderBox();

      const input = screen.getByLabelText(label);

      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputmode", "numeric");
    },
  );

  // Re-quoting is normal, so the button says what it will do.
  test("offers to update a quote that was already sent", () => {
    render(
      <QuoteBox
        id="r1"
        status="quoted"
        quantity={1}
        {...NO_QUOTE}
        quoteItemPrice={500000}
      />,
    );

    expect(screen.getByRole("button", { name: /perbarui kutipan/i })).toBeInTheDocument();
  });
});