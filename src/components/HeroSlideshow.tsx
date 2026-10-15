"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ghiblik from "@/components/hero/ghiblik.jpg";
import nadeko from "@/components/hero/nadeko.jpg";
import pricon from "@/components/hero/pricon.jpg";
import kimono from "@/components/hero/kimono-1.jpg";
import rando from "@/components/hero/rando.webp";

const ZOOM_MAX = 0.12;

const SLIDES = [
  { src: ghiblik, alt: "Ilustrasi gaya Ghibli" },
  { src: pricon, alt: "Ilustrasi karakter" },
  { src: nadeko, alt: "Ilustrasi Nadeko" },
  { src: kimono, alt: "Ilustrasi kimono" },
  { src: rando, alt: "Ilustrasi rando" },
];

/**
 * Scroll progress clamped to [0, 1]: 0 at the top of the page, 1 after one
 * viewport of scrolling. Pure on purpose, so the zoom curve is unit-testable
 * without a DOM.
 */
export function zoomForScroll(scrollY: number, viewportHeight: number): number {
  if (!(viewportHeight > 0)) return 1;
  const progress = Math.min(Math.max(scrollY / viewportHeight, 0), 1);
  return 1 + progress * ZOOM_MAX;
}

/**
 * The hero backdrop: the five photos crossfade behind the headline.
 *
 * Client-side on purpose, but the first slide renders from the server too, so
 * a visitor without JavaScript still sees a full photo, not an empty hero. The
 * rotation pauses for reduced motion — one static photo beats a slideshow the
 * visitor asked not to see.
 *
 * The photo layer also zooms slightly as the visitor scrolls (the homepage
 * pins the hero while the services grid slides over it). The zoom is a direct
 * style write behind a rAF-throttled scroll listener, never state, so
 * scrolling does not re-render the slideshow. Reduced motion skips it too.
 */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % SLIDES.length),
      6000,
    );
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (zoomRef.current) {
          zoomRef.current.style.transform = `scale(${zoomForScroll(window.scrollY, window.innerHeight)})`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div ref={zoomRef} className="absolute inset-0 will-change-transform">
        {SLIDES.map((slide, index) => (
          <Image
            key={slide.alt}
            src={slide.src}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-1000 ${index === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
      {/* Darkens the photos so the headline stays readable on any slide. */}
      <div className="absolute inset-0 bg-ink/55" />
    </div>
  );
}
