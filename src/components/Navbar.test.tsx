import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import Navbar from "./Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getClaims.mockResolvedValue(null);
  });

  // The server renderer emits the static shell only: everything outside the
  // Suspense boundary, with the boundary's own content left out. That is
  // exactly what a visitor receives before Supabase answers, so asserting on
  // it checks the thing the boundary exists to protect.
  test("logo and nav links are in the static shell", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell).toContain("Aruno Store");
    expect(shell).toContain('href="/commissions"');
    expect(shell).toContain('href="/titipan"');
  });

  // If the session read ever moves back up into Navbar, this fails. That is the
  // regression that put a Supabase round trip in front of every page's TTFB.
  test("the signed-out controls are not in the static shell", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell).not.toContain('href="/login"');
    expect(shell).not.toContain('href="/auth/sign-up"');
  });

  test("the fallback reserves room so the header does not jump", () => {
    expect(renderToStaticMarkup(<Navbar />)).toContain("w-[9.5rem]");
  });
});