"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Spinner } from "@/components/SubmitButton";
import { saveDeliveryImage } from "./actions";

/**
 * Upload form for staff to deliver the finished drawing.
 *
 * Uploads the image to the private 'commission-deliveries' bucket (staff-only
 * insert, 0021's storage policy), then calls the saveDeliveryImage server
 * action to write the storage path on the commission row.
 *
 * Only shown when the commission status is 'accepted' or 'paid' — the drawing
 * starts after the buyer agrees to the price.
 *
 * ponytail: no image resizing or processing. The image is stored as-is.
 * Add sharp or similar if upload sizes become a problem.
 */
export default function DeliveryUpload({
  commissionId,
  existingPath,
}: {
  commissionId: string;
  existingPath: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createBrowserSupabase();
    const path = `${crypto.randomUUID()}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("commission-deliveries")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    // Hand the path to the server action. The action writes it on the row and
    // cleans up the old image if one is being replaced.
    const formData = new FormData();
    formData.append("id", commissionId);
    formData.append("path", path);

    // saveDeliveryImage redirects, so calling it from the client throws a
    // NEXT_REDIRECT error. That is expected — the redirect navigates to the
    // detail page with ?saved=1. Catch it so it does not surface as an error.
    try {
      await saveDeliveryImage(formData);
    } catch {
      // NEXT_REDIRECT throws to trigger navigation. router.refresh covers the
      // case where the action redirected without throwing (defensive).
    }

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
        {existingPath ? "Ganti gambar" : "Upload gambar"}
      </h2>

      {existingPath && (
        <p className="mt-2 text-xs leading-relaxed text-[#6c6870]">
          Gambar sudah diupload. Mengganti akan menghapus yang lama.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
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
          disabled={!file || uploading}
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
