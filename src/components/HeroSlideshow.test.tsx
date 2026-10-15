import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HeroSlideshow, { zoomForScroll } from "./HeroSlideshow";

describe("HeroSlideshow", () => {
  // All five photos render server-side, so the hero is never an empty box —
  // with or without JavaScript the visitor sees at least the first slide.
  test("renders all five photos", () => {
    const shell = renderToStaticMarkup(<HeroSlideshow />);
    const images = shell.match(/<img/g) ?? [];

    expect(images.length).toBe(5);
  });

  test("only the first slide is visible at first", () => {
    const shell = renderToStaticMarkup(<HeroSlideshow />);
    const visible = shell.match(/opacity-100/g) ?? [];
    const hidden = shell.match(/opacity-0/g) ?? [];

    expect(visible.length).toBe(1);
    expect(hidden.length).toBe(4);
  });

  // The scroll zoom runs from 1x at the top to 1.12x after one viewport of
  // scrolling, then holds — clamped so overscroll never blows the photo up.
  test("zoom curve starts at 1, grows with scroll, clamps at one viewport", () => {
    expect(zoomForScroll(0, 800)).toBe(1);
    expect(zoomForScroll(400, 800)).toBeCloseTo(1.06, 5);
    expect(zoomForScroll(800, 800)).toBeCloseTo(1.12, 5);
    expect(zoomForScroll(5000, 800)).toBeCloseTo(1.12, 5);
  });

  test("zoom curve ignores negative scroll and zero viewport", () => {
    expect(zoomForScroll(-100, 800)).toBe(1);
    expect(zoomForScroll(400, 0)).toBe(1);
  });
});
