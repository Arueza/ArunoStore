/**
 * Client-side image prep for staff shop uploads.
 *
 * Server Actions cap the request body at 1 MB, so shop photos bypass the
 * action entirely: the browser compresses here, uploads straight to the
 * `shop-images` bucket, and the action receives only path strings. Gallery
 * uploads (`artworks`) are untouched — they keep full-size originals.
 *
 * ponytail: fixed 2000px / WebP q0.82, no AVIF or responsive derivatives.
 * Revisit when buyers open product images full-screen.
 */

export const SHOP_MAX_LONG_EDGE = 2000;
export const SHOP_WEBP_QUALITY = 0.82;

/** Scale so the long edge fits maxEdge, never upscaling. Pure. */
export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number = SHOP_MAX_LONG_EDGE,
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(maxEdge) ||
    maxEdge <= 0
  ) {
    return { width, height };
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** "IMG_1234.HEIC" -> "IMG-1234.webp". Pure. */
export function buildWebpName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? "";
  const stem = base.replace(/\.[^.]*$/, "") || "image";
  const clean =
    stem
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "image";

  return `${clean.slice(0, 120)}.webp`;
}

/** Browsers cannot decode HEIC via createImageBitmap. Pure. */
export function isHeicFile(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();

  if (type === "image/heic" || type === "image/heif") return true;

  return /\.(heic|heif)$/i.test(file.name);
}

/**
 * Storage paths the shop actions accept. Pure so actions and tests share it:
 * uuid folder from crypto.randomUUID(), one filename, webp/jpg/png only.
 */
export function isValidShopImagePath(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const path = value.trim();

  if (
    !path ||
    path.length > 220 ||
    path.includes("..") ||
    path.startsWith("/") ||
    path.includes("\\")
  ) {
    return false;
  }

  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/[^/]{1,150}\.(webp|jpe?g|png)$/.test(
    path,
  );
}

/**
 * Downscale to SHOP_MAX_LONG_EDGE and encode as WebP. Browser-only; never
 * called server-side. Returns the original when it is already a small-enough
 * WebP, to avoid a lossy round trip that buys nothing.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (isHeicFile(file)) {
    throw new Error(
      `${file.name}: format HEIC tidak didukung browser — simpan sebagai JPEG dulu.`,
    );
  }

  const bitmap = await createImageBitmap(file);

  try {
    const { width, height } = targetDimensions(
      bitmap.width,
      bitmap.height,
      SHOP_MAX_LONG_EDGE,
    );

    if (
      file.type === "image/webp" &&
      bitmap.width === width &&
      bitmap.height === height
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", SHOP_WEBP_QUALITY),
    );

    if (!blob) return file;

    return new File([blob], buildWebpName(file.name), {
      type: "image/webp",
    });
  } finally {
    bitmap.close();
  }
}
