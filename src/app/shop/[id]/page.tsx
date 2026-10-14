import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import AddToCart from "./AddToCart";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const supabase = createPublicClient();
  const { data: item } = await supabase
    .from("consignment_items")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return { title: item ? `${item.name} — Aruno Store` : "Produk — Aruno Store" };
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  condition: "baru" | "bekas";
  status: string;
  showcase: string;
  consignment_categories:
    | { name: string }
    | { name: string }[]
    | null;
  consignment_images: {
    id: string;
    image_url: string;
    is_thumbnail: boolean | null;
  }[];
  product_sizes: { size: string; stock: number }[];
};

async function ProductLoader({ id }: { id: string }) {
  if (!UUID.test(id)) {
    notFound();
  }

  const supabase = createPublicClient();

  const { data: item } = await supabase
    .from("consignment_items")
    .select(
      "id, name, description, price, condition, status, showcase, consignment_categories(name), consignment_images(id, image_url, is_thumbnail), product_sizes(size, stock)",
    )
    .eq("id", id)
    .maybeSingle<ProductDetail>();

  if (!item || item.status !== "tersedia") {
    notFound();
  }

  const images = [...item.consignment_images]
    .sort((a, b) =>
      a.is_thumbnail === b.is_thumbnail ? 0 : a.is_thumbnail ? -1 : 1,
    );

  const categoryName = Array.isArray(item.consignment_categories)
    ? item.consignment_categories[0]?.name
    : (item.consignment_categories as { name: string } | null)?.name;
  const isFashion = categoryName?.toLowerCase() === "fashion";
  const hasSizes =
    isFashion &&
    Array.isArray(item.product_sizes) &&
    item.product_sizes.length > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Gallery: main image + thumbnail strip, Cottonink-style. */}
      <div>
        <div className="relative aspect-square overflow-hidden border border-[#eeeae5] bg-cream">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
            <img
              src={images[0].image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-[#b0acb5]">
              Tanpa gambar
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                aria-label="Lihat gambar"
                className="relative h-20 w-20 shrink-0 overflow-hidden border border-[#eeeae5] bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL */}
                <img
                  src={img.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info: name, price, size, qty, Add to Cart. */}
      <div className="flex flex-col">
        <Link
          href={item.showcase === "titipan" ? "/shop/titipan" : "/shop/commission"}
          className="text-xs uppercase tracking-[0.14em] text-[#6c6870] hover:text-plum"
        >
          {item.showcase === "titipan" ? "Katalog Titipan" : "Katalog Commission"}
        </Link>

        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
          {item.name}
        </h1>

        <p className="mt-4 text-2xl font-semibold text-plum">
          {formatRupiah(item.price)}
        </p>

        {categoryName && (
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#6c6870]">
            {categoryName}
          </p>
        )}

        {item.condition === "bekas" && (
          <p className="mt-1 text-xs uppercase tracking-wider text-[#b0acb5]">
            Bekas
          </p>
        )}

        <AddToCart
          itemId={item.id}
          sizes={hasSizes ? item.product_sizes : undefined}
        />

        {item.description && (
          <div className="mt-8 border-t border-[#eeeae5] pt-6">
            <h2 className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
              Detail produk
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#6c6870]">
              {item.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

async function ProductContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductLoader id={id} />;
}

export default function ShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-[6%] sm:py-20">
      <Suspense>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}
