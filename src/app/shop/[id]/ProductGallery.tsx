"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryImage = {
  id: string;
  image_url: string;
};

/**
 * Carousel-esque gallery for the product detail page.
 *
 * Client-side on purpose: the server passes the already-sorted images and this
 * keeps the active index in state. Arrows wrap around, thumbnails jump to an
 * image, and a counter shows the position. A single image (or none) renders
 * with no controls, so the layout never promises navigation it cannot do.
 */
export default function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden border border-[#eeeae5] bg-cream">
        <span className="absolute inset-0 flex items-center justify-center text-sm text-[#b0acb5]">
          Tanpa gambar
        </span>
      </div>
    );
  }

  const current = images[active] ?? images[0];
  const showControls = images.length > 1;

  const goTo = (index: number) =>
    setActive(((index % images.length) + images.length) % images.length);

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden border border-[#eeeae5] bg-cream"
        role="region"
        aria-roledescription="carousel"
        aria-label={`Galeri ${name}`}
      >
        <Image
          key={current.id}
          src={current.image_url}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {showControls && (
          <>
            <button
              type="button"
              aria-label="Gambar sebelumnya"
              onClick={() => goTo(active - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-2 text-lg text-ink transition-opacity hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Gambar berikutnya"
              onClick={() => goTo(active + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-2 text-lg text-ink transition-opacity hover:bg-white"
            >
              ›
            </button>
            <p
              aria-live="polite"
              className="absolute bottom-3 right-3 bg-ink/60 px-2 py-1 text-xs text-white"
            >
              {active + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {showControls && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Lihat gambar ${index + 1}`}
              aria-current={index === active}
              className={`relative h-20 w-20 shrink-0 overflow-hidden border bg-cream ${
                index === active
                  ? "border-plum ring-1 ring-plum"
                  : "border-[#eeeae5]"
              }`}
            >
              <Image
                src={img.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
