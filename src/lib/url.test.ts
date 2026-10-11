import { describe, expect, test } from "vitest";
import { isHttpUrl } from "@/lib/url";

describe("isHttpUrl", () => {
  test.each([
    "https://shop.japan.example/item/1",
    "http://shop.japan.example/item/1",
    // A Japanese store link with query parameters and a fragment is still the
    // link the buyer meant to send.
    "https://store.example/item?id=1&size=m#reviews",
  ])("accepts %s", (url) => {
    expect(isHttpUrl(url)).toBe(true);
  });

  // The reason this function exists. Both forms render a stored link as an href
  // on a staff page, so a javascript: value would run in a staff session.
  test.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ])("refuses %s", (url) => {
    expect(isHttpUrl(url)).toBe(false);
  });

  // new URL() throws on these, so the catch is load-bearing rather than tidy.
  test.each(["", "   ", "shop.japan.example", "/item/1", "https://", "not a url"])(
    "refuses %o because it is not a URL at all",
    (value) => {
      expect(isHttpUrl(value)).toBe(false);
    },
  );

  // A protocol-relative URL parses fine once it has a base and has no scheme of
  // its own. Stored as-is it renders as a link that silently leaves the site.
  test("refuses a protocol-relative URL", () => {
    expect(isHttpUrl("//shop.japan.example/item")).toBe(false);
  });
});