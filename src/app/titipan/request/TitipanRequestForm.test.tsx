import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PENDING, pageExists } from "@/components/pendingPages";

// The form posts through the server action, which is the only thing that writes.
// Stubbed here so this file tests the form's own behaviour: what it asks for,
// what its markup refuses to accept, and what it shows once the server answers.
const submitTitipanRequest = vi.fn();

vi.mock("./actions", () => ({
  submitTitipanRequest: (...args: unknown[]) => submitTitipanRequest(...args),
}));

import TitipanRequestForm from "./TitipanRequestForm";

/** Queues one answer from the server, then presses send. */
async function submit(answer: { message: string; sent: boolean }) {
  submitTitipanRequest.mockResolvedValueOnce(answer);
  render(<TitipanRequestForm />);

  // fireEvent.submit rather than a click on the button: React 19 runs a form
  // action off the submit event, and jsdom's own button click never produces one.
  fireEvent.submit(
    screen.getByRole("button", { name: /kirim permintaan/i }).closest("form")!,
  );

  // Waits for the queued answer to be applied.
  await screen.findByText(answer.message);
}

describe("TitipanRequestForm", () => {
  test("asks for everything staff needs to price a parcel", () => {
    render(<TitipanRequestForm />);

    for (const label of [
      /tautan produk/i,
      /ukuran/i,
      /warna/i,
      /jumlah/i,
      /budget/i,
    ]) {
      expect(screen.getByLabelText(label), `${label} is missing`).toBeInTheDocument();
    }
  });

  // One item is the common case, so it is the starting value rather than an
  // empty box the action has to interpret.
  test("starts the quantity at one", () => {
    render(<TitipanRequestForm />);

    expect(screen.getByLabelText(/jumlah/i)).toHaveValue(1);
  });

  // Budget is money. type=number accepts "e", so the browser will submit 1e5 for
  // a buyer who typed it; text plus inputMode="numeric" keeps that off the form
  // and leaves the action's whole-rupiah check as the only rule there is.
  test("takes the budget as text with a numeric keyboard", () => {
    render(<TitipanRequestForm />);

    const budget = screen.getByLabelText(/budget/i);

    expect(budget).toHaveAttribute("type", "text");
    expect(budget).toHaveAttribute("inputmode", "numeric");
  });

  // The link is stored and later rendered as an href by staff, so type=url is a
  // hint on a phone and the action's protocol check is the real gate.
  test("takes the product link as a url", () => {
    render(<TitipanRequestForm />);

    expect(screen.getByLabelText(/tautan produk/i)).toHaveAttribute("type", "url");
  });

  // Size and colour are genuinely optional, and 0006 made both columns nullable
  // for that. A required attribute here would refuse a buyer who has no idea.
  test("does not insist on a size or a colour", () => {
    render(<TitipanRequestForm />);

    expect(screen.getByLabelText(/ukuran/i)).not.toBeRequired();
    expect(screen.getByLabelText(/warna/i)).not.toBeRequired();
    expect(screen.getByLabelText(/budget/i)).not.toBeRequired();
  });

  test("shows what the server said when a request is refused", async () => {
    await submit({ message: "Jumlah harus angka bulat minimal 1.", sent: false });

    expect(screen.getByRole("button", { name: /kirim permintaan/i })).toBeInTheDocument();
  });

  // The form is replaced rather than left filled in, so a second click cannot
  // send the same request twice and staff never see a duplicate.
  test("replaces the form once the request is sent", async () => {
    await submit({ message: "Permintaan terkirim.", sent: true });

    expect(screen.queryByRole("button", { name: /kirim permintaan/i })).toBeNull();
  });

  // Every link the confirmation offers has to resolve. /titipan/mine does not
  // exist until 3.8, so this catches a link to it landing early — the same
  // guarantee 1.11 and 1.14 gave the footer and the storefront.
  test("only links to pages that exist", async () => {
    await submit({ message: "Permintaan terkirim.", sent: true });

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute("href")!;
      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });
});