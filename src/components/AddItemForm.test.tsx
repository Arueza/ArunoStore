import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// AddItemForm navigates on success; stubbed here so this file tests the
// showcase default, not the router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// CategorySelect reads the public client in an effect; empty rows keep it
// quiet without touching the network.
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [] }),
      }),
    }),
  }),
}));

import AddItemForm from "./AddItemForm";

describe("AddItemForm showcase default", () => {
  test("preselects the embedding side", () => {
    render(<AddItemForm defaultShowcase="commission" />);

    expect(screen.getByRole("combobox", { name: /tampil di/i })).toHaveValue(
      "commission",
    );
  });

  test("defaults to Keduanya with no side", () => {
    render(<AddItemForm />);

    expect(screen.getByRole("combobox", { name: /tampil di/i })).toHaveValue(
      "keduanya",
    );
  });
});
