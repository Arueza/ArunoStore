"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addImages } from "../actions";
import { compressAndUploadShopImages } from "../shopImages";

/**
 * Add-images form on the product detail page. Same compress-then-upload flow
 * as AddItemForm: bytes go straight to Storage, the action gets paths only.
 */
export default function AddImagesForm({ id }: { id: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || saving) return;

    setSaving(true);
    setError(null);

    try {
      const paths = await compressAndUploadShopImages(files);

      const data = new FormData();
      data.append("id", id);
      for (const path of paths) data.append("image_path", path);

      try {
        await addImages(data);
      } catch {
        // NEXT_REDIRECT carries ?saved=1 or ?error=….
      }

      setFiles([]);
      setUploadKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 flex flex-wrap items-end gap-3 border-t border-[#eeeae5] pt-5"
    >
      <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        Tambah gambar
        <input
          key={uploadKey}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="mt-1 block text-xs text-ink"
        />
      </label>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={files.length === 0 || saving}
        className="bg-plum px-4 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Mengunggah..." : "Unggah"}
      </button>
    </form>
  );
}
