import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: null,
        },
      })),
    },
  })),
}));

import Home from "./page";

describe("Home", () => {
  test("shows the shop name as the page heading", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { level: 1, name: "Aruno Store" }),
    ).toBeInTheDocument();
  });
});