"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Spinner } from "@/components/SubmitButton";

/**
 * Upload form for staff to add artworks to the gallery.
 *
 * Uploads the image to the 'artworks' storage bucket, then inserts a row
 * into the artworks table with the title and storage path. The gallery
 * page reads from that table to list artworks with their titles.
 *
 * ponytail: no image resizing or processing. The image is stored as-is.
 * Add sharp or similar if upload sizes become a problem.
 */
export default function ArtworkUpload() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;

    setUploading(true);
    setError(null);

    const supabase = createBrowserSupabase();
    const path = `${crypto.randomUUID()}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("artworks")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("artworks")
      .insert({ title: title.trim(), storage_path: path });

    if (insertError) {
      // Clean up the uploaded file if the insert fails
      await supabase.storage.from("artworks").remove([path]);
      setError(insertError.message);
      setUploading(false);
      return;
    }

    setTitle("");
    setFile(null);
    setUploadKey((k) => k + 1);
    setUploading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#eeeae5] bg-cream p-5"
    >
      <h2 className="font-display text-lg font-semibold text-ink">
        Upload karya
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul karya"
          className="border border-[#eeeae5] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#6c6870]"
        />

        <input
          key={uploadKey}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!title.trim() || !file || uploading}
          className="self-start bg-plum px-4 py-2 text-xs uppercase tracking-[0.18em] text-white transition-all duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Spinner />
              Mengupload...
            </>
          ) : (
            "Upload"
          )}
        </button>
      </div>
    </form>
  );
}
