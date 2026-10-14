import { describe, expect, test } from "vitest";
import { safeNextPath } from "@/lib/nextPath";

describe("safeNextPath", () => {
  // The whole feature. These are the routes the proxy sends a signed-out
  // visitor away from, and they are the only destinations that come back.
  test.each([
    "/titipan/request",
    "/titipan/mine",
    "/shop/550e8400-e29b-41d4-a716-446655440000",
  ])("keeps the allowed route %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  // The attack this function exists to stop: a link that looks in-app in the
  // address bar and lands on somebody else's site after signing in.
  test.each([
    "//evil.example",
    "//evil.example/titipan/mine",
    "\\\\evil.example",
    "/\\evil.example",
    "\\\\/evil.example",
    "https://evil.example",
    "http://evil.example",
    "javascript:alert(1)",
  ])("refuses %o as a destination", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  // Not an in-app path at all. These are the destinations an open redirect aims
  // at: a login that can be pointed at /staff, or at a file:// URL, is a way
  // of handing somebody else's session a page it should never have reached.
  test.each([
    "/staff",
    "/staff/commissions/abc",
    "/account",
    "/commissions/mine",
    "/titipan",
    "/",
    "",
    "/titipan/../../staff",
    "/titipan/mine?next=/staff",
  ])("refuses %o as a destination", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  // It arrives from a query string into a FormData, and neither guarantees a
  // string. An array from ?next=a&next=b reaches the form as a File.
  test("refuses anything that is not a string", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(42)).toBeNull();
    expect(safeNextPath(["/titipan/mine"])).toBeNull();
    expect(safeNextPath({ toString: () => "/titipan/mine" })).toBeNull();
  });

  // No HTML, no spaces, no percent-encoding tricks: the value comes back out of
  // the database-free path of parse-query-then-string, and it is dropped into a
  // redirect(), so anything that needs decoding to be understood is refused.
  test("refuses a path carrying anything a browser would have to decode", () => {
    expect(safeNextPath("/titipan/mine ")).toBeNull();
    expect(safeNextPath("/titipan/mi ne")).toBeNull();
    expect(safeNextPath("/titipan/<script>")).toBeNull();
    expect(safeNextPath("/titipan/mine%2f")).toBeNull();
  });
});
