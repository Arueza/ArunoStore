import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { deleteImage, deleteItem, setThumbnail, updateItem } from "../actions";
import AddImagesForm from "./AddImagesForm";
import { FASHION_SIZES } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Produk — Ruang Staf",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  condition: "baru" | "bekas";
  status: "tersedia" | "terjual" | "ditarik";
  showcase: string;
  category_id: string | null;
  consignment_categories: { id: string; name: string } | null;
  consignment_images: {
    id: string;
    image_url: string;
    is_thumbnail: boolean | null;
  }[];
  product_sizes: { size: string; stock: number }[];
};

const SHOWCASE_LABEL: Record<string, string> = {
  commission: "Commission",
  titipan: "Titipan",
  keduanya: "Keduanya",
};

type Category = {
  id: string;
  name: string;
};

async function ProductDetail({ id }: { id: string }) {
  if (!UUID.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("consignment_items")
    .select(
      "id, name, description, price, stock, condition, status, showcase, category_id, consignment_categories(id, name), consignment_images(id, image_url, is_thumbnail), product_sizes(size, stock)",
    )
    .eq("id", id)
    .maybeSingle<Product>();

  if (!product) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("consignment_categories")
    .select("id, name")
    .order("name");

  const sortedImages = [...product.consignment_images].sort((a, b) =>
    a.is_thumbnail === b.is_thumbnail ? 0 : a.is_thumbnail ? -1 : 1,
  );

  const conditionLabel = product.condition === "baru" ? "Baru" : "Bekas";
  const statusLabel =
    product.status === "tersedia"
      ? "Tersedia"
      : product.status === "terjual"
        ? "Terjual"
        : "Ditarik";

  return (
    <div className="mt-8 space-y-10">
      <Link
        href="/staff/shop"
        className="text-sm font-semibold text-plum hover:underline"
      >
        ← Semua produk
      </Link>

      <dl className="divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Nama</dt>
          <dd className="text-sm text-ink">{product.name}</dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Harga</dt>
          <dd className="text-sm text-ink">{formatRupiah(product.price)}</dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Stok</dt>
          <dd className="text-sm text-ink">{product.stock}</dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Kondisi</dt>
          <dd className="text-sm text-ink">{conditionLabel}</dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Status</dt>
          <dd className="text-sm text-ink">{statusLabel}</dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Tampil di</dt>
          <dd className="text-sm text-ink">
            {SHOWCASE_LABEL[product.showcase] ?? product.showcase}
          </dd>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Kategori</dt>
          <dd className="text-sm text-ink">
            {product.consignment_categories?.name ?? "Tanpa kategori"}
          </dd>
        </div>

        {product.product_sizes && product.product_sizes.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-4 py-4">
            <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Ukuran</dt>
            <dd className="text-sm text-ink">
              {product.product_sizes
                .map((s) => `${s.size} (${s.stock})`)
                .join(", ")}
            </dd>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-x-4 py-4">
          <dt className="w-36 shrink-0 text-sm text-[#6c6870]">Deskripsi</dt>
          <dd className="min-w-0 flex-1 text-sm text-ink">
            {product.description ? (
              <span className="whitespace-pre-wrap">{product.description}</span>
            ) : (
              <span className="text-[#b0acb5]">Tidak ada deskripsi.</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Gambar</h2>

        <p className="mt-1 text-sm text-[#6c6870]">
          {sortedImages.length} gambar. Gambar pertama dengan bintang adalah
          tampilan utama.
        </p>

        <div className="mt-4 flex flex-wrap gap-4">
          {sortedImages.map((image) => (
            <div key={image.id} className="space-y-1">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL */}
                <img
                  src={image.image_url}
                  alt={product.name}
                  className="h-24 w-24 border border-[#eeeae5] object-cover"
                />
                {image.is_thumbnail && (
                  <span className="absolute left-1 top-1 bg-plum px-1 text-[10px] text-white">
                    ★
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {!image.is_thumbnail && (
                  <form action={setThumbnail}>
                    <input type="hidden" name="image_id" value={image.id} />
                    <input type="hidden" name="item_id" value={product.id} />
                    <button
                      type="submit"
                      className="text-xs text-plum hover:underline"
                    >
                      Jadikan utama
                    </button>
                  </form>
                )}

                <form action={deleteImage}>
                  <input type="hidden" name="image_id" value={image.id} />
                  <input type="hidden" name="item_id" value={product.id} />
                  <button
                    type="submit"
                    disabled={sortedImages.length <= 1}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <AddImagesForm id={product.id} />
      </div>

      <form action={updateItem} className="border border-[#eeeae5] bg-cream p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Edit produk
        </h2>

        <input type="hidden" name="id" value={product.id} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Nama
            <input
              type="text"
              name="name"
              defaultValue={product.name}
              required
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            />
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Harga (Rp)
            <input
              type="text"
              name="price"
              inputMode="numeric"
              defaultValue={product.price}
              required
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            />
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Stok
            <input
              type="text"
              name="stock"
              inputMode="numeric"
              defaultValue={product.stock}
              required
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            />
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Kondisi
            <select
              name="condition"
              defaultValue={product.condition}
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            >
              <option value="baru">Baru</option>
              <option value="bekas">Bekas</option>
            </select>
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Status
            <select
              name="status"
              defaultValue={product.status}
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            >
              <option value="tersedia">Tersedia</option>
              <option value="ditarik">Ditarik</option>
              <option value="terjual">Terjual</option>
            </select>
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Tampil di
            <select
              name="showcase"
              defaultValue={product.showcase}
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            >
              <option value="commission">Commission</option>
              <option value="titipan">Titipan</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </label>

          <label className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Kategori
            <select
              name="category_id"
              defaultValue={product.category_id ?? ""}
              className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none"
            >
              <option value="">Tanpa kategori</option>
              {(categories ?? []).map((category: Category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 border-t border-[#eeeae5] pt-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            Stok per Ukuran (Khusus Kategori Fashion)
          </p>
          <p className="mt-1 text-xs text-[#b0acb5]">
            Kosongkan jika produk bukan pakaian.
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {FASHION_SIZES.map((size) => {
              const current = product.product_sizes?.find(
                (s) => s.size === size,
              );
              return (
                <label key={size} className="text-center text-xs text-[#6c6870]">
                  <span className="font-semibold">{size}</span>
                  <input
                    type="number"
                    name={`size_stock_${size}`}
                    min="0"
                    defaultValue={current ? current.stock : ""}
                    placeholder="0"
                    className="mt-1 w-full border border-[#e2ddd7] bg-white px-2 py-1.5 text-center text-sm text-ink focus:border-plum focus:outline-none"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <label className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Deskripsi
          <textarea
            name="description"
            defaultValue={product.description ?? ""}
            rows={4}
            className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm leading-relaxed text-ink focus:border-plum focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-6 bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        >
          Simpan perubahan
        </button>
      </form>

      <div className="border border-red-200 bg-red-50 p-5">
        <h2 className="font-display text-lg font-semibold text-red-700">
          Hapus produk
        </h2>
        <p className="mt-1 text-sm text-red-600">
          Menghapus produk juga menghapus semua gambarnya. Tindakan ini tidak
          bisa dibatalkan.
        </p>

        <form action={deleteItem} className="mt-4">
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            className="bg-red-600 px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
          >
            Hapus produk ini
          </button>
        </form>
      </div>
    </div>
  );
}

async function ProductLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductDetail id={id} />;
}

export default function StaffShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Produk
      </h1>

      <Suspense>
        <ProductLoader params={params} />
      </Suspense>
    </main>
  );
}
