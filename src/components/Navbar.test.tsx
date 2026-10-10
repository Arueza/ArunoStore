import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
  getProfile: () => getProfile(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import Navbar from "./Navbar";
import { PENDING, pageExists } from "./pendingPages";

describe("Navbar", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getProfile.mockReset();
    getClaims.mockResolvedValue(null);
    getProfile.mockResolvedValue(null);
  });

  // The server renderer emits the static shell only: everything outside the
  // Suspense boundary, with the boundary's own content left out. That is
  // exactly what a visitor receives before Supabase answers, so asserting on
  // it checks the thing the boundary exists to protect.
  test("the wordmark and the announcement bar are in the static shell", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell).toContain("Aruno Store");
    expect(shell).toContain("Harga ditentukan setelah permintaan ditinjau");
  });

  test("the nav links are in the static shell", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell).toContain('href="/shop"');
    expect(shell).toContain('href="/commissions"');
    expect(shell).toContain('href="/titipan"');
  });

  // Every nav target must either resolve or be declared pending. This is the
  // check task 1.11 added for the footer, now covering the hamburger too — the
  // dashboard chrome had three links that resolved to nothing and nothing
  // watching them.
  test("every nav target has a page or is declared pending", () => {
    for (const href of ["/shop", "/commissions", "/titipan"]) {
      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });

  // If the session read ever moves back up into Navbar, this fails. That is the
  // regression that put a Supabase round trip in front of every page's TTFB.
  test("the signed-out controls are not in the static shell", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell).not.toContain('href="/login"');
    expect(shell).not.toContain('href="/account"');
  });

  test("the fallback reserves room so the icons do not jump", () => {
    expect(renderToStaticMarkup(<Navbar />)).toContain("w-[22px]");
  });
});