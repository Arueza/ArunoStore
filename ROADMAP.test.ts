import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// ROADMAP.md and NOTES.md are the context budget of every future session:
// whatever is in them is read before any code is written, and prose is the
// thing that bloats. The caps are the whole point of this file, so a test that
// fails past them turns "keep it short" from a request into the build loop.

const CAPS: Array<[file: string, max: number]> = [
  ["ROADMAP.md", 200],
  ["NOTES.md", 150],
];

/** Lines of text, not bytes: the trailing newline that ends a POSIX file is a
 * terminator, not an empty final line, and CRLF counts the same as LF. */
function countLines(file: string): number {
  const text = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  return body === "" ? 0 : body.split(/\r?\n/).length;
}

describe("the markdown agents read stays short", () => {
  it.each(CAPS)("%s is at most %d lines", (file, max) => {
    expect(countLines(file), `${file} is over its cap — trim it and say where the content went, do not raise the cap`).toBeLessThanOrEqual(max);
  });

  // A deleted file reads as 0 lines and would pass the cap silently, leaving
  // the agent with no plan at all.
  it.each(CAPS)("%s still exists", (file) => {
    expect(countLines(file)).toBeGreaterThan(0);
  });
});
