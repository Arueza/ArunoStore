import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// The form posts through the server action, which is the only thing that writes.
// Stubbed here so this file tests the form's own behaviour: which options are
// offered, and how the reference link list grows and shrinks.
vi.mock("./actions", () => ({
  submitRequest: vi.fn(async () => ({ message: "", sent: false })),
}));

import CommissionRequestForm from "./CommissionRequestForm";

const services = [
  { id: "s1", name: "Half body", starting_price: 150000, duration_days: 7 },
  { id: "s2", name: "Chibi", starting_price: 75000, duration_days: 3 },
];

const renderForm = () => render(<CommissionRequestForm services={services} />);

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

const links = () => screen.getAllByRole("textbox", { name: /link referensi/i });

const click = (name: RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("CommissionRequestForm", () => {
  test("offers every service with its starting price", () => {
    renderForm();

    const options = screen.getAllByRole("option") as HTMLOptionElement[];

    expect(options.map((o) => o.value)).toEqual(["s1", "s2"]);
    // Prices formatted at display, per the whole-rupiah rule.
    expect(options[0].textContent).toContain(`Rp${nbsp}150.000`);
    expect(options[0].textContent).toContain("7 hari");
    expect(options[1].textContent).toContain(`Rp${nbsp}75.000`);
  });

  test("starts with one optional reference link", () => {
    renderForm();

    expect(links()).toHaveLength(1);
    // One input needs no remove button, there would be nothing left.
    expect(screen.queryByRole("button", { name: /hapus link/i })).toBeNull();
  });

  test("adds a link per click", () => {
    renderForm();

    click(/tambah link/i);
    click(/tambah link/i);

    expect(links()).toHaveLength(3);
  });

  test("removes the link whose number matches its button", () => {
    renderForm();
    click(/tambah link/i);
    click(/tambah link/i);

    fireEvent.click(screen.getByRole("button", { name: "Hapus link 2" }));

    // Labels are positional, so the two survivors renumber to 1 and 2 rather
    // than leaving a gap.
    expect(links()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Hapus link 3" })).toBeNull();
  });

  // Removing down to one leaves the last input with no remove button, so a buyer
  // cannot strand the form with nothing to type into.
  test("stops at one link", () => {
    renderForm();
    click(/tambah link/i);

    fireEvent.click(screen.getByRole("button", { name: "Hapus link 2" }));

    expect(links()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /hapus link/i })).toBeNull();
  });

  // Every input shares the name "link" so the action reads them all with getAll.
  // Distinct names would silently save only the first one.
  test("names every link input the same", () => {
    renderForm();

    const first = screen.getByRole("textbox", { name: "Link referensi 1" });
    expect(first).toHaveAttribute("name", "link");
    expect(first).toHaveAttribute("type", "url");
  });

  // Index-based keys are tempting here and wrong: removing the first link would
  // reuse the surviving inputs and shift their values.
  test("typing in one link does not touch another", () => {
    renderForm();
    click(/tambah link/i);

    fireEvent.change(screen.getByRole("textbox", { name: "Link referensi 2" }), {
      target: { value: "abc" },
    });

    expect(screen.getByRole("textbox", { name: "Link referensi 2" })).toHaveValue("abc");
    expect(screen.getByRole("textbox", { name: "Link referensi 1" })).toHaveValue("");
  });

  test("keeps the other links when one is removed", () => {
    renderForm();
    click(/tambah link/i);

    fireEvent.change(screen.getByRole("textbox", { name: "Link referensi 1" }), {
      target: { value: "https://a.example" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Link referensi 2" }), {
      target: { value: "https://b.example" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Hapus link 1" }));

    // Link 1's value moves to link 2 rather than disappearing with it.
    expect(screen.getByRole("textbox", { name: "Link referensi 1" })).toHaveValue(
      "https://b.example",
    );
  });
});
