import type { Metadata } from "next";
import { Suspense } from "react";
import ArtworkUpload from "@/components/ArtworkUpload";
import ArtworkGallery from "@/components/ArtworkGallery";

export const metadata: Metadata = {
  title: "Galeri Karya — Aruno Store",
};

/**
 * Staff gallery management page.
 *
 * Staff can upload new artworks and delete existing ones. The page is
 * behind the /staff guard in proxy.ts, so only staff can reach it.
 *
 * Access is decided entirely by the proxy, never here. This component
 * renders only after the guard has let the request through, so a role
 * check in this file would be a second, weaker copy of the same decision.
 */
export default function StaffArtworksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Galeri Karya
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6c6870] sm:text-base">
        Upload karya yang sudah selesai untuk ditampilkan di galeri. Hapus karya
        yang sudah tidak ditampilkan.
      </p>

      <div className="mt-10">
        <ArtworkUpload />
      </div>

      <div className="mt-10">
        <Suspense>
          <ArtworkGallery />
        </Suspense>
      </div>
    </main>
  );
}
