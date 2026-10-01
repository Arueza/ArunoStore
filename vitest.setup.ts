import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without this, one test's DOM leaks into the next and the suite passes green
// while asserting against stale markup.
afterEach(() => {
  cleanup();
});