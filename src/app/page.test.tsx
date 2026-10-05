import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import Home from "./page";
import SignedInAs from "./signed-in-as";

describe("Home", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getClaims.mockResolvedValue(null);
  });

  test("shows the shop name in the static shell", () => {
    expect(renderToStaticMarkup(<Home />)).toContain("Aruno Store");
  });

  test("the greeting is not in the static shell", () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });

    expect(renderToStaticMarkup(<Home />)).not.toContain("Signed in as");
  });
});

describe("SignedInAs", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getClaims.mockResolvedValue(null);
  });

  test("says nothing while signed out", async () => {
    render(await SignedInAs());

    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
  });

  test("names the signed-in visitor", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });

    render(await SignedInAs());

    expect(
      screen.getByText("Signed in as buyer@example.com"),
    ).toBeInTheDocument();
  });
});