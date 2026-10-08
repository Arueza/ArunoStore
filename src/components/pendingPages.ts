import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Nav targets with no page yet, each waiting on its roadmap task. Shared by
 * Navbar.test.tsx and Footer.test.tsx so both halves of the chrome are held to
 * the same list. Once a page exists the second test fails until the entry comes
 * off this list, and then the first test holds it to the real file.
 */
export const PENDING: string[] = [];

export const pageFile = (href: string) =>
  path.resolve("src", "app", href === "/" ? "" : href.slice(1), "page.tsx");

export const pageExists = (href: string) => existsSync(pageFile(href));