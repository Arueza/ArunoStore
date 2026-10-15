"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategorySelect from "@/components/CategorySelect";
import { Spinner } from "@/components/SubmitButton";
import { FASHION_SIZES } from "@/lib/shop";
import { addItem } from "@/app/staff/shop/actions";
import { compressAndUploadShopImages } from "@/app/staff/shop/shopImages";

/**
 * New-product form. Same fields as the old server `<form action={addItem}>`;
 * only the image path changed: files are compressed to WebP in the browser
 * and uploaded straight to Storage, so the Server Action receives path
 * strings and never hits the 1 MB body limit.
 *
 * Used on the Kelola tab on /shop. `defaultShowcase` preselects the embedding page's side; every option stays
 * choosable, because `keduanya` items need a home somewhere.
 *
 * On success the form resets and the catalogue list refreshes in place, so
 * staff can immediately enter the next product with no manual reload.
 */
export default function AddItemForm({
  defaultShowcase = "keduanya",
}: {
  defaultShowcase?: "commission" | "titipan" | "keduanya";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const form = e.currentTarget;
    const picked = new FormData(form)
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (picked.length === 0) {
      setError("Minimal satu gambar wajib diunggah.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const paths = await compressAndUploadShopImages(picked);

      const data = new FormData(form);
      data.delete("images");
      for (const path of paths) data.append("image_path", path);

      const result = await addItem(data);

      if (!result.ok) {
        setError(result.message);
        setSaving(false);
        return;
      }

      form.reset();
      setSuccess("Produk ditambah ke katalog.");
      setSaving(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Nama produk
          <input
            type="text"
            name="name"
            required
            placeholder="Contoh: Figma Jinx (Arcane)"
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#b0acb5] focus:border-plum focus:outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Harga (Rp)
          <input
            type="text"
            name="price"
            inputMode="numeric"
            required
            placeholder="150000"
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#b0acb5] focus:border-plum focus:outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Stok
          <input
            type="text"
            name="stock"
            inputMode="numeric"
            required
            defaultValue="1"
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Kondisi
          <select
            name="condition"
            defaultValue="baru"
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          >
            <option value="baru">Baru</option>
            <option value="bekas">Bekas</option>
          </select>
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Tampil di
          <select
            name="showcase"
            defaultValue={defaultShowcase}
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
          >
            <option value="commission">Commission</option>
            <option value="titipan">Titipan</option>
            <option value="keduanya">Keduanya</option>
          </select>
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Kategori
          <CategorySelect />
        </label>

        <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Atau buat kategori baru
          <input
            type="text"
            name="category_new"
            placeholder="Contoh: Keychain"
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#b0acb5] focus:border-plum focus:outline-none"
          />
        </label>
      </div>

      <div className="border-t border-[#eeeae5] pt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Stok per Ukuran (Khusus Kategori Fashion)
        </p>
        <p className="mt-1 text-xs text-[#b0acb5]">
          Kosongkan jika produk bukan pakaian.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {FASHION_SIZES.map((size) => (
            <label key={size} className="text-center text-xs text-[#6c6870]">
              <span className="font-semibold">{size}</span>
              <input
                type="number"
                name={`size_stock_${size}`}
                min="0"
                placeholder="0"
                className="mt-1 w-full border border-[#e2ddd7] bg-white px-2 py-1.5 text-center text-sm text-ink focus:border-plum focus:outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        Deskripsi
        <textarea
          name="description"
          rows={3}
          placeholder="Kondisi barang, ukuran, merk, dll."
          className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-[#b0acb5] focus:border-plum focus:outline-none"
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.14em] text-[#6c6870]">
        Gambar produk (minimal 1)
        <input
          type="file"
          name="images"
          multiple
          accept="image/*"
          required
          className="mt-1 text-sm text-ink"
        />
        <span className="mt-1 block text-[11px] normal-case tracking-normal text-[#b0acb5]">
          Foto dikompres ke WebP (sisi panjang 2000px) sebelum diunggah.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-all duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <>
            <Spinner />
            Mengunggah...
          </>
        ) : (
          "Tambah produk"
        )}
      </button>
    </form>
  );
}
