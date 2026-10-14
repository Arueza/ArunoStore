/**
 * The page a buyer asked to come back to after signing in, or null for none.
 *
 * One function, read by both the login page and the login action, for the
 * reason 2.6 and 3.3 share `isHttpUrl()`: two copies of a security rule is how
 * one of them ends up stricter than the other, and a value the page accepts but
 * the action refuses is a form that silently drops where the buyer was going.
 *
 * Four refusals, in order of how much damage they would do:
 *
 *   not a string        — it arrives from a query string into a FormData, and
 *                         neither is guaranteed to have held a string.
 *   not a single slash  — "//evil.example" is a protocol-relative URL. It starts
 *                         with a slash and it leaves the site, which is exactly
 *                         what an open redirect is for. Backslashes are refused
 *                         with it: some browsers normalise "\" to "/", so
 *                         "\\evil.example" would slip past a check that only
 *                         looks at the first character.
 *   not a known route  — deliberately narrow. A crafted link must not be able
 *                         to walk a buyer into /staff or anywhere else after a
 *                         login, so only the routes this feature was built for
 *                         are honoured. Widening it means adding the route here
 *                         and nothing else.
 *
 * The path is returned whole rather than trimmed: "/titipan/mine?x=1" is a
 * legitimate destination, and there is no whitespace in a path that starts with
 * a slash and survives the checks above.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  if (!value.startsWith("/")) return null;

  // One rule covering both separators, so the browser never gets the chance to
  // disagree with us about which one it treats as a separator.
  if (/^[/\\]{2}/.test(value)) return null;

  // "/titipan" exactly is the public explanation page and needs no return trip;
  // "/titipan/..." is the guarded pair this exists for.
  // "/shop/<uuid>" is where Add to Cart sends a signed-out buyer.
  const UUID = "[0-9a-fA-F-]{36}";
  if (
    !/^\/titipan\/[A-Za-z0-9/_-]*$/.test(value) &&
    !new RegExp(`^\\/shop\\/${UUID}$`).test(value)
  ) {
    return null;
  }

  return value;
}
