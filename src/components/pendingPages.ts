import { existsSync, readdirSync } from "node:fs";
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

/**
 * Whether a dynamic route would answer this href.
 *
 * /staff/titipan/r1 has no page.tsx of its own, because the route that answers it
 * is /staff/titipan/[id]. Without this the link tests call every row in a queue a
 * dead end, and the fix would be to delete the assertion — which is exactly how
 * the one link that really was broken would have survived.
 *
 * Any bracketed directory counts, one level down, which is every dynamic route in
 * this app. Deliberately does not match the parameter name: it answers "would a
 * route here render this href", not "would it render this exact value". A row id
 * that is not a uuid is the 404 the page already returns, and that is a page
 * answering.
 */
function dynamicPageExists(href: string) {
  const segments = href.split("/").filter(Boolean);

  // Nothing to sit under, so there is no dynamic route to find either.
  if (segments.length < 2) return false;

  const parent = path.resolve("src", "app", ...segments.slice(0, -1));

  if (!existsSync(parent)) return false;

  return readdirSync(parent, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      /^\[.+\]$/.test(entry.name) &&
      existsSync(path.join(parent, entry.name, "page.tsx")),
  );
}

export const pageExists = (href: string) =>
  existsSync(pageFile(href)) || dynamicPageExists(href);
