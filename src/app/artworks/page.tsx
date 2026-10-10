import type { Metadata } from "next";
import Image from "next/image";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Galeri Karya — Aruno Store",
};

type Artwork = {
  id: string;
  title: string;
  storage_path: string;
};

/**
 * Public artwork gallery.
 *
 * Reads from the artworks table (title + storage path) and renders each
 * image from the public 'artworks' storage bucket. Uses a cookie-less
 * Supabase client so the page can prerender fully at build time with
 * 'use cache' — no session read, no <Suspense>.
 *
 * ponytail: no sorting controls. Add them when the gallery grows enough
 * that finding an artwork becomes hard.
 */
async function ArtworkGrid() {
  const supabase = createPublicClient();
  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, title, storage_path")
    .order("created_at", { ascending: false });

  if (!artworks || artworks.length === 0) {
    return (
      <p className="text-sm text-[#6c6870]">
        Belum ada karya. Kembali lagi nanti.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {artworks.map((artwork: Artwork) => (
        <div key={artwork.id}>
          <div className="relative aspect-[4/3] overflow-hidden border border-[#eeeae5] bg-cream">
            <Image
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artworks/${artwork.storage_path}`}
              alt={artwork.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{artwork.title}</p>
        </div>
      ))}
    </div>
  );
}

export default async function ArtworksPage() {
  'use cache';

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Galeri Karya
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Karya-karya yang sudah selesai. Setiap piece dibuat oleh Verrel untuk
        klien commission.
      </p>

      <div className="mt-10">
        <ArtworkGrid />
      </div>
    </main>
  );
}
