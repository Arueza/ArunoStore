import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: null,
        },
      })),
    },
  })),
}));

import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import { PENDING, pageExists } from "./pendingPages";

// The footer once pointed at /register, which no task ever builds, so the link
// 404ed with nothing tracking it. Same check the Navbar gets.
describe("Footer", () => {
  test("every link points at a page that exists, or is pending", () => {
    render(<Footer />);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "");

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      if (PENDING.includes(href)) continue;
      expect(pageExists(href), `${href} has no page`).toBe(true);
    }
  });
});

describe("pendingPages", () => {
  test("the pending list holds no page that already exists", () => {
    for (const href of PENDING) {
      expect(pageExists(href), `${href} is built, take it off PENDING`).toBe(false);
    }
  });
});