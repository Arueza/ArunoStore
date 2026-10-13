"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import ghiblik from "@/components/hero/ghiblik.jpg";
import nadeko from "@/components/hero/nadeko.jpg";
import pricon from "@/components/hero/pricon.jpg";

const SLIDES = [
  { src: ghiblik, alt: "Ilustrasi gaya Ghibli" },
  { src: pricon, alt: "Ilustrasi karakter" },
  { src: nadeko, alt: "Ilustrasi Nadeko" },
];

/**
 * The hero backdrop: the three photos crossfade behind the headline.
 *
 * Client-side on purpose, but the first slide renders from the server too, so
 * a visitor without JavaScript still sees a full photo, not an empty hero. The
 * rotation pauses for reduced motion — one static photo beats a slideshow the
 * visitor asked not to see.
 */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % SLIDES.length),
      6000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0">
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
      {/* Darkens the photos so the headline stays readable on any slide. */}
      <div className="absolute inset-0 bg-ink/55" />
    </div>
  );
}
