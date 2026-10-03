import { existsSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Navbar from "./Navbar";

// Nav targets that have no page yet, each waiting on its roadmap task. Once a
// page exists the second test fails until the entry comes off this list, and
// then the first test holds it to the real file.
const PENDING = ["/commissions", "/login", "/register", "/titipan"];

const pageFile = (href: string) =>
  path.resolve("src", "app", href === "/" ? "" : href.slice(1), "page.tsx");

describe("Navbar", () => {
  test("every link points at a page that exists, or is pending", () => {
    render(<Navbar />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      if (PENDING.includes(href)) continue;
      expect(existsSync(pageFile(href)), `${href} has no page`).toBe(true);
    }
  });

  test("the pending list holds no page that already exists", () => {
    for (const href of PENDING) {
      expect(existsSync(pageFile(href)), `${href} is built, take it off PENDING`).toBe(false);
    }
  });
});
