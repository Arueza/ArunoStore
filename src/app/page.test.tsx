import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "./page";
import { PENDING, pageExists } from "@/components/pendingPages";

describe("Home", () => {
  test("shows the shop name", () => {
    expect(renderToStaticMarkup(<Home />)).toContain("Aruno Store");
  });

  test("offers both halves of the shop", () => {
    const shell = renderToStaticMarkup(<Home />);

    expect(shell).toContain('href="/shop"');
    expect(shell).toContain('href="/commissions"');
    expect(shell).toContain('href="/titipan"');
  });

  // Same guarantee task 1.11 gave the footer. Both services are unbuilt until
  // Phase 2 and 3, so this only holds while they are declared pending.
  test("every link on the page has a page or is declared pending", () => {
    for (const href of ["/", "/shop", "/commissions", "/titipan"]) {
      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });

  // The storefront must render identically signed out and signed in: signing in
  // returns the buyer here, so a session read would only add a Supabase round
  // trip to the most-visited page.
  test("carries no session read at all", () => {
    expect(renderToStaticMarkup(<Home />)).not.toContain("Signed in as");
  });
});