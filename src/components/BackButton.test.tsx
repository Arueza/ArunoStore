import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

import BackButton from "./BackButton";

beforeEach(() => {
  mocks.back.mockClear();
  mocks.push.mockClear();
});

// document.referrer is read-only; redefine it per case.
function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", {
    value,
    configurable: true,
  });
}

function pressKembali() {
  fireEvent.click(screen.getByRole("button", { name: "← Kembali" }));
}

describe("BackButton", () => {
  test("same-origin referrer goes back through history", () => {
    setReferrer(`${window.location.origin}/shop?side=commission`);

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    pressKembali();

    expect(mocks.back).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  test("missing referrer pushes the fallback instead of leaving", () => {
    setReferrer("");

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    pressKembali();

    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });

  test("external referrer pushes the fallback instead of ejecting", () => {
    setReferrer("https://www.google.com/");

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    pressKembali();

    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });
});

describe("BackButton recallKey", () => {
  const KEY = "test-recall";

  beforeEach(() => {
    sessionStorage.removeItem(KEY);
  });

  test("stored list URL pushes fresh to the top of the exact list", () => {
    sessionStorage.setItem(KEY, `${window.location.origin}/shop?side=commission`);

    render(
      <BackButton fallback="/shop" recallKey={KEY}>
        ← Kembali
      </BackButton>,
    );
    pressKembali();

    expect(mocks.push).toHaveBeenCalledWith(
      `${window.location.origin}/shop?side=commission`,
    );
    expect(mocks.back).not.toHaveBeenCalled();
  });

  test("missing key falls back to the history logic", () => {
    setReferrer("");

    render(
      <BackButton fallback="/shop" recallKey={KEY}>
        ← Kembali
      </BackButton>,
    );
    pressKembali();

    // Single-entry jsdom history plus empty referrer: the static fallback.
    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });

  test("external stored URL is ignored", () => {
    sessionStorage.setItem(KEY, "https://www.google.com/");
    setReferrer("");

    render(
      <BackButton fallback="/shop" recallKey={KEY}>
        ← Kembali
      </BackButton>,
    );
    pressKembali();

    expect(mocks.push).toHaveBeenCalledWith("/shop");
    expect(mocks.back).not.toHaveBeenCalled();
  });
});

describe("BackButton in-app history", () => {
  // pushState bumps history.length for the rest of this file, so this block
  // stays last.
  test("in-app hops go back through history even with no referrer", () => {
    setReferrer("");
    window.history.pushState({}, "", "/shop/item-1");
    window.history.pushState({}, "", "/shop/item-2");

    render(<BackButton fallback="/shop">← Kembali</BackButton>);
    pressKembali();

    expect(mocks.back).toHaveBeenCalledTimes(1);
  });
});
