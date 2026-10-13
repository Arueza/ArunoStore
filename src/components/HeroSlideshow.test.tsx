import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HeroSlideshow from "./HeroSlideshow";

describe("HeroSlideshow", () => {
  // All three photos render server-side, so the hero is never an empty box —
  // with or without JavaScript the visitor sees at least the first slide.
  test("renders all three photos", () => {
    const shell = renderToStaticMarkup(<HeroSlideshow />);
    const images = shell.match(/<img/g) ?? [];

    expect(images.length).toBe(3);
  });

  test("only the first slide is visible at first", () => {
    const shell = renderToStaticMarkup(<HeroSlideshow />);
    const visible = shell.match(/opacity-100/g) ?? [];
    const hidden = shell.match(/opacity-0/g) ?? [];

    expect(visible.length).toBe(1);
    expect(hidden.length).toBe(2);
  });
});
