import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

import BackButton from "./BackButton";

// document.referrer is read-only; redefine it per case like the page tests
// redefine their Supabase selects.
function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", {
    value,
    configurable: true,
  });
}

describe("BackButton", () => {
  test("same-origin referrer goes back through history", () => {
    setReferrer(`${window.location.origin}/shop?side=commission`);

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    fireEvent.click(screen.getByRole("button", { name: "← Kembali" }));

    expect(mocks.back).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  test("missing referrer pushes the fallback instead of leaving", () => {
    setReferrer("");

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    fireEvent.click(screen.getByRole("button", { name: "← Kembali" }));

    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });

  test("external referrer pushes the fallback instead of ejecting", () => {
    setReferrer("https://www.google.com/");

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    fireEvent.click(screen.getByRole("button", { name: "← Kembali" }));

    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });
});
