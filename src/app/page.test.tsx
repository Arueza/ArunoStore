import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "./page";

describe("Home", () => {
  test("shows the shop name as the page heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Aruno Store" }),
    ).toBeInTheDocument();
  });
});