import { describe, expect, test } from "vitest";
import {
  buildWebpName,
  isHeicFile,
  isValidShopImagePath,
  targetDimensions,
} from "./image";

describe("targetDimensions", () => {
  test("downscales a wide photo to the long edge", () => {
    expect(targetDimensions(4000, 3000, 2000)).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  test("downscales a tall photo to the long edge", () => {
    expect(targetDimensions(3000, 6000, 2000)).toEqual({
      width: 1000,
      height: 2000,
    });
  });

  test("never upscales a small photo", () => {
    expect(targetDimensions(800, 600, 2000)).toEqual({
      width: 800,
      height: 600,
    });
  });

  test("leaves invalid input untouched", () => {
    expect(targetDimensions(0, 600, 2000)).toEqual({ width: 0, height: 600 });
  });
});

describe("buildWebpName", () => {
  test("swaps the extension for webp", () => {
    expect(buildWebpName("figma-jinx.JPG")).toBe("figma-jinx.webp");
  });

  test("strips directories and blanks", () => {
    expect(buildWebpName("C:\\photos\\ IMG  12 .png")).toBe("IMG-12.webp");
  });

  test("falls back when there is no stem", () => {
    expect(buildWebpName(".png")).toBe("image.webp");
  });
});

describe("isHeicFile", () => {
  test("catches HEIC by type and by extension", () => {
    expect(isHeicFile({ name: "a.heic", type: "" })).toBe(true);
    expect(isHeicFile({ name: "a.jpg", type: "image/heic" })).toBe(true);
  });

  test("passes ordinary photos", () => {
    expect(isHeicFile({ name: "a.jpg", type: "image/jpeg" })).toBe(false);
  });
});

describe("isValidShopImagePath", () => {
  const good = "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b/foto.webp";

  test("accepts a uuid-folder webp path", () => {
    expect(isValidShopImagePath(good)).toBe(true);
  });

  test("accepts jpg and png from older uploads", () => {
    expect(
      isValidShopImagePath(
        "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b/foto.jpg",
      ),
    ).toBe(true);
  });

  // The path lands in a public image URL, so traversal or absolute paths
  // would point the row at storage the uploader never owned.
  test("refuses traversal, absolute paths, and bad extensions", () => {
    expect(isValidShopImagePath("../etc/passwd")).toBe(false);
    expect(isValidShopImagePath("/shop-images/x.webp")).toBe(false);
    expect(
      isValidShopImagePath(
        "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b/foto.gif",
      ),
    ).toBe(false);
    expect(isValidShopImagePath("not-a-path.webp")).toBe(false);
    expect(isValidShopImagePath("   ")).toBe(false);
    expect(isValidShopImagePath(undefined)).toBe(false);
  });
});
