import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import DeleteArtwork from "./DeleteArtwork";

type Artwork = {
  id: string;
  title: string;
  storage_path: string;
};

/**
 * Grid of artworks for the staff gallery management page.
 *
 * Reads from the artworks table (title + storage path) and renders each
 * image from the public 'artworks' storage bucket. Staff can delete any
 * artwork; the delete button is a client component that removes both the
 * storage object and the metadata row.
 *
 * ponytail: no sorting controls. Add them when the gallery grows enough
 * that finding an artwork becomes hard.
 */
export default async function ArtworkGallery() {
  const supabase = await createClient();
  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, title, storage_path")
    .order("created_at", { ascending: false });

  if (!artworks || artworks.length === 0) {
    return (
      <p className="text-sm text-[#6c6870]">
        Belum ada karya. Upload karya pertama untuk mengisi galeri.
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
          <DeleteArtwork
            artworkId={artwork.id}
            storagePath={artwork.storage_path}
          />
        </div>
      ))}
    </div>
  );
}
