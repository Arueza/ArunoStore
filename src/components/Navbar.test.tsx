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
import Navbar from "./Navbar";
import { PENDING, pageExists } from "./pendingPages";

describe("Navbar", () => {
  test("every link points at a page that exists, or is pending", async () => {
    render(await Navbar());

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

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