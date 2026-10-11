/**
 * Whether a string is a web address the app is willing to store and later render
 * as a link.
 *
 * Two forms collect a buyer-typed URL and both end up as an `href` on a staff
 * page: `reference_links` on a commission (2.6) and `product_link` on a titipan
 * request (3.3). A `javascript:` value that reached either column would run in a
 * member of staff's session the moment they opened the request — the buyer's
 * typing, executed with staff's cookies.
 *
 * Checked when the form is submitted, not when the link is rendered. By render
 * time the row exists and every reader inherits whatever was stored.
 *
 * One definition rather than one per form: the rule is a security rule, and two
 * copies of a security rule are two chances to widen it by accident.
 */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}