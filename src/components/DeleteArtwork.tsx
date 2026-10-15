"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Spinner } from "@/components/SubmitButton";

type Props = {
  artworkId: string;
  storagePath: string;
};

/**
 * Delete button for a single artwork.
 *
 * Removes the image from the storage bucket and the metadata row from the
 * artworks table, then refreshes the page so the gallery re-renders without
 * the deleted artwork.
 */
export default function DeleteArtwork({ artworkId, storagePath }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createBrowserSupabase();

    await supabase.storage.from("artworks").remove([storagePath]);
    await supabase.from("artworks").delete().eq("id", artworkId);

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="mt-1 text-xs text-plum hover:underline disabled:opacity-50"
    >
      {deleting ? (
        <>
          <Spinner />
          Menghapus...
        </>
      ) : (
        "Hapus"
      )}
    </button>
  );
}
