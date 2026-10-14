import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
  getProfile: () => getProfile(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import Navbar from "./Navbar";
import { NAV_LINKS } from "./navLinks";
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
    expect(shell).toContain('href="/shop/commission"');
    expect(shell).toContain('href="/shop/titipan"');
  });

  // Cottonink split: the drawer serves mobile, the visible row serves desktop.
  // Both navs render server-side, so both labels are in the shell; the
  // responsive classes decide which one a visitor sees.
  test("the hamburger is mobile-only and the category row is desktop-only", () => {
    const shell = renderToStaticMarkup(<Navbar />);

    expect(shell.match(/Navigasi utama/g)?.length).toBe(2);
    expect(shell).toContain("justify-start md:hidden");
    expect(shell).toContain("md:block");
  });

  // Every nav target must either resolve or be declared pending. This is the
  // check task 1.11 added for the footer, now covering the hamburger too — the
  // dashboard chrome had three links that resolved to nothing and nothing
  // watching them.
  test("every nav target has a page or is declared pending", () => {
    for (const link of NAV_LINKS) {
      expect(
        PENDING.includes(link.href) || pageExists(link.href),
        `${link.href} has no page`,
      ).toBe(true);
    }
  });

  // One source for both navs: if a link is added to one and not the other,
  // the shell carries it an odd number of times and this fails.
  test("the drawer and the desktop row carry the same links", () => {
    const shell = renderToStaticMarkup(<Navbar />);
    const hrefs = shell.match(/href="\/(?:shop(?:\/(?:commission|titipan))?)"/g) ?? [];

    expect(hrefs.length).toBe(NAV_LINKS.length * 2);
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