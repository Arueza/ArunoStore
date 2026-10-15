"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidShopImagePath } from "@/lib/image";
import { FASHION_SIZES } from "@/lib/shop";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_RUPIAH = /^\d+$/;

const BUCKET = "shop-images";
const PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

/**
 * Adds a product to the staff shop catalogue.
 *
 * Roadmap 5.4. Staff fills in name, description, price, stock, condition,
 * category, and at least one image. Images arrive as storage paths, not
 * files: the form compresses to WebP in the browser and uploads straight to
 * the public bucket (staff-only write, 0032), so the action body stays tiny
 * and never hits the 1 MB Server Action limit.
 *
 * Six things are decided here and not in the form:
 *
 *   id       — none. This is an insert, so there is no id to check.
 *   price    — whole rupiah or nothing, like every money column in this
 *              project. parseInt would silently drop decimals.
 *   stock    — non-negative whole number.
 *   admin_id — from auth.uid(), never from FormData. RLS lets staff write
 *              any row; the owner is still set by the server so staff cannot
 *              attribute a product to someone else.
 *   status   — always 'tersedia'. A product added to the catalogue is
 *              sellable; 'ditarik' is a separate action.
 *   cleanup  — if the item insert fails, the uploaded files are removed so
 *              an orphan image does not sit in the bucket.
 *
 * A server action rather than a route handler, so there is no URL to bookmark
 * and no way to reach it with a GET.
 *
 * Returns a result instead of redirecting, so the client form can reset
 * itself and refresh the list without a full page navigation. Auth failures
 * still redirect to /login or /.
 */

function wholeRupiah(
  formData: FormData,
  key: string,
  label: string,
): { ok: true; amount: number } | { ok: false; message: string } {
  const raw = formData.get(key);

  if (typeof raw !== "string" || !WHOLE_RUPIAH.test(raw.trim())) {
    return {
      ok: false,
      message: `${label} harus angka bulat, tanpa pemisah ribuan atau desimal.`,
    };
  }

  const trimmed = raw.trim();
  const amount = Number(trimmed);

  if (!Number.isSafeInteger(amount)) {
    return { ok: false, message: `${label} terlalu besar.` };
  }

  return { ok: true, amount };
}

export type AddItemResult = { ok: true } | { ok: false; message: string };

export async function addItem(formData: FormData): Promise<AddItemResult> {
  const priceParsed = wholeRupiah(formData, "price", "Harga");
  if (!priceParsed.ok) return priceParsed;
  const stockParsed = wholeRupiah(formData, "stock", "Stok");
  if (!stockParsed.ok) return stockParsed;
  const price = priceParsed.amount;
  const stock = stockParsed.amount;
  const name = formData.get("name");
  const condition = formData.get("condition");
  const showcase = formData.get("showcase");
  const description = formData.get("description");
  const categoryId = formData.get("category_id");
  const categoryNew = formData.get("category_new");
  const imagePaths = formData
    .getAll("image_path")
    .filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    )
    .map((p) => p.trim());

  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, message: "Nama produk wajib diisi." };
  }

  if (stock < 0) {
    return { ok: false, message: "Stok tidak boleh negatif." };
  }

  if (condition !== "baru" && condition !== "bekas") {
    return { ok: false, message: "Kondisi tidak valid." };
  }

  if (
    showcase !== "commission" &&
    showcase !== "titipan" &&
    showcase !== "keduanya"
  ) {
    return { ok: false, message: "Pilihan tampil tidak valid." };
  }

  if (imagePaths.length === 0) {
    return { ok: false, message: "Minimal satu gambar wajib diunggah." };
  }

  if (imagePaths.length > 10 || imagePaths.some((p) => !isValidShopImagePath(p))) {
    return { ok: false, message: "Path gambar tidak valid." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Resolve category: use existing, or create new, or none.
  let finalCategoryId: string | null = null;
  const trimmedNew = typeof categoryNew === "string" ? categoryNew.trim() : "";

  if (trimmedNew) {
    const { data: existing } = await supabase
      .from("consignment_categories")
      .select("id")
      .eq("name", trimmedNew)
      .maybeSingle();

    if (existing) {
      finalCategoryId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("consignment_categories")
        .insert({ name: trimmedNew })
        .select("id")
        .maybeSingle();
      finalCategoryId = created?.id ?? null;
    }
  } else if (typeof categoryId === "string" && categoryId) {
    finalCategoryId = categoryId;
  }

  // Paths arrive from the client upload. If the insert fails, remove them so
  // an orphan image does not sit in the bucket.
  const uploadedPaths: string[] = [...imagePaths];

  const { data: item, error: insertError } = await supabase
    .from("consignment_items")
    .insert({
      admin_id: user.id,
      category_id: finalCategoryId,
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      price,
      stock,
      condition,
      showcase,
      status: "tersedia",
    })
    .select("id")
    .maybeSingle();

  if (insertError || !item) {
    await supabase.storage.from(BUCKET).remove(uploadedPaths);
    return {
      ok: false,
      message: `Gagal menyimpan produk: ${insertError?.message ?? "tidak diketahui"}`,
    };
  }

  // Insert image rows. The first image is the thumbnail.
  const imageRows = uploadedPaths.map((path, i) => ({
    item_id: item.id,
    image_url: `${PUBLIC_URL}/${path}`,
    is_thumbnail: i === 0,
  }));

  const { error: imageError } = await supabase
    .from("consignment_images")
    .insert(imageRows);

  if (imageError) {
    await supabase.storage.from(BUCKET).remove(uploadedPaths);
    await supabase.from("consignment_items").delete().eq("id", item.id);
    return {
      ok: false,
      message: `Gagal menyimpan gambar: ${imageError.message}`,
    };
  }

  // Insert size variants for Fashion items if provided.
  const sizesToInsert: { item_id: string; size: string; stock: number }[] = [];
  for (const s of FASHION_SIZES) {
    const raw = formData.get(`size_stock_${s}`);
    if (typeof raw === "string" && raw.trim() !== "") {
      const stockNum = Number(raw.trim());
      if (Number.isInteger(stockNum) && stockNum >= 0) {
        sizesToInsert.push({
          item_id: item.id,
          size: s,
          stock: stockNum,
        });
      }
    }
  }

  if (sizesToInsert.length > 0) {
    await supabase.from("product_sizes").insert(sizesToInsert);
  }

  revalidatePath("/staff/shop");
  revalidatePath("/shop");
  revalidatePath(`/shop/${item.id}`);
  revalidatePath("/commissions/catalog");
  revalidatePath("/titipan/catalog");
  return { ok: true };
}

/**
 * Updates a product's scalar fields.
 *
 * Roadmap 5.4. Name, description, price, stock, condition, category, and
 * status can all change. Images are managed separately via addImages,
 * deleteImage, and setThumbnail.
 *
 * Same server-side decisions as addItem: price is whole rupiah, stock is
 * non-negative, and the id is UUID-checked.
 */
export async function updateItem(formData: FormData): Promise<void> {
  const id = formData.get("id");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const path = `/staff/shop/${id}`;

  const name = formData.get("name");
  const priceParsed = wholeRupiah(formData, "price", "Harga");
  if (!priceParsed.ok) redirect(`${path}?error=${priceParsed.message}`);
  const stockParsed = wholeRupiah(formData, "stock", "Stok");
  if (!stockParsed.ok) redirect(`${path}?error=${stockParsed.message}`);
  const price = priceParsed.amount;
  const stock = stockParsed.amount;
  const condition = formData.get("condition");
  const status = formData.get("status");
  const showcase = formData.get("showcase");
  const description = formData.get("description");
  const categoryId = formData.get("category_id");
  const categoryNew = formData.get("category_new");

  if (typeof name !== "string" || !name.trim()) {
    redirect(`${path}?error=Nama produk wajib diisi.`);
  }

  if (stock < 0) {
    redirect(`${path}?error=Stok tidak boleh negatif.`);
  }

  if (condition !== "baru" && condition !== "bekas") {
    redirect(`${path}?error=Kondisi tidak valid.`);
  }

  if (status !== "tersedia" && status !== "terjual" && status !== "ditarik") {
    redirect(`${path}?error=Status tidak valid.`);
  }

  if (
    showcase !== "commission" &&
    showcase !== "titipan" &&
    showcase !== "keduanya"
  ) {
    redirect(`${path}?error=Pilihan tampil tidak valid.`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Resolve category, same logic as addItem.
  let finalCategoryId: string | null = null;
  const trimmedNew = typeof categoryNew === "string" ? categoryNew.trim() : "";

  if (trimmedNew) {
    const { data: existing } = await supabase
      .from("consignment_categories")
      .select("id")
      .eq("name", trimmedNew)
      .maybeSingle();

    if (existing) {
      finalCategoryId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("consignment_categories")
        .insert({ name: trimmedNew })
        .select("id")
        .maybeSingle();
      finalCategoryId = created?.id ?? null;
    }
  } else if (typeof categoryId === "string" && categoryId) {
    finalCategoryId = categoryId;
  }

  const { error } = await supabase
    .from("consignment_items")
    .update({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      price,
      stock,
      condition,
      status,
      showcase,
      category_id: finalCategoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  // Upsert or remove size variants for Fashion items.
  for (const s of FASHION_SIZES) {
    const raw = formData.get(`size_stock_${s}`);
    if (typeof raw === "string" && raw.trim() !== "") {
      const stockNum = Number(raw.trim());
      if (Number.isInteger(stockNum) && stockNum >= 0) {
        await supabase.from("product_sizes").upsert(
          {
            item_id: id,
            size: s,
            stock: stockNum,
          },
          { onConflict: "item_id,size" },
        );
      }
    } else if (typeof raw === "string" && raw.trim() === "") {
      await supabase
        .from("product_sizes")
        .delete()
        .eq("item_id", id)
        .eq("size", s);
    }
  }

  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  revalidatePath("/commissions/catalog");
  revalidatePath("/titipan/catalog");
  redirect(`${path}?saved=1`);
}

/**
 * Deletes a product and all its images.
 *
 * Roadmap 5.4. The row delete cascades to consignment_images via the FK in
 * 0012. The storage objects are removed separately — there is no cascade from
 * the database to Storage.
 *
 * Same UUID check and staff check as every other action here.
 */
export async function deleteItem(formData: FormData): Promise<void> {
  const id = formData.get("id");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Fetch image URLs before deleting, so we can clean up the bucket.
  const { data: images } = await supabase
    .from("consignment_images")
    .select("image_url")
    .eq("item_id", id);

  const { error } = await supabase
    .from("consignment_items")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/staff/shop?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Remove storage objects. Paths are extracted from the public URLs.
  if (images && images.length > 0) {
    const paths = images
      .map((img) => {
        const marker = `/object/public/${BUCKET}/`;
        const idx = img.image_url.indexOf(marker);
        return idx !== -1 ? img.image_url.slice(idx + marker.length) : null;
      })
      .filter((p): p is string => p !== null);

    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
  }

  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  revalidatePath("/commissions/catalog");
  revalidatePath("/titipan/catalog");
  redirect("/staff/shop?saved=1");
}

/**
 * Adds images to an existing product.
 *
 * Roadmap 5.4. Multiple paths at once, uploaded client-side like addItem.
 * The first image added does not become the thumbnail if one already
 * exists — setThumbnail handles that.
 */
export async function addImages(formData: FormData): Promise<void> {
  const id = formData.get("id");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const path = `/staff/shop/${id}`;

  const imagePaths = formData
    .getAll("image_path")
    .filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    )
    .map((p) => p.trim());

  if (imagePaths.length === 0) {
    redirect(`${path}?error=Minimal satu gambar wajib dipilih.`);
  }

  if (imagePaths.length > 10 || imagePaths.some((p) => !isValidShopImagePath(p))) {
    redirect(`${path}?error=Path gambar tidak valid.`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Check if product already has a thumbnail.
  const { data: existingImages } = await supabase
    .from("consignment_images")
    .select("is_thumbnail")
    .eq("item_id", id);

  const hasThumbnail = existingImages?.some((img) => img.is_thumbnail) ?? false;

  // Paths arrive from the client upload.
  const uploadedPaths: string[] = [...imagePaths];

  const imageRows = uploadedPaths.map((filePath, i) => ({
    item_id: id,
    image_url: `${PUBLIC_URL}/${filePath}`,
    // Only set thumbnail if none exists and this is the first batch.
    is_thumbnail: !hasThumbnail && i === 0,
  }));

  const { error: imageError } = await supabase
    .from("consignment_images")
    .insert(imageRows);

  if (imageError) {
    await supabase.storage.from(BUCKET).remove(uploadedPaths);
    await supabase.from("consignment_items").delete().eq("id", id);
    redirect(`${path}?error=Gagal menyimpan gambar: ${imageError.message}`);
  }

  redirect(`${path}?saved=1`);
}

/**
 * Deletes one image from a product.
 *
 * Roadmap 5.4. Refuses to delete the last image — a product must have at
 * least one. The storage object is removed after the row delete.
 */
export async function deleteImage(formData: FormData): Promise<void> {
  const imageId = formData.get("image_id");
  const itemId = formData.get("item_id");

  if (typeof imageId !== "string" || !UUID.test(imageId)) {
    redirect("/staff/shop?error=Gambar tidak valid.");
  }

  if (typeof itemId !== "string" || !UUID.test(itemId)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const path = `/staff/shop/${itemId}`;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Count images for this product. Refuse if this is the last one.
  const { data: images, error: countError } = await supabase
    .from("consignment_images")
    .select("image_url")
    .eq("item_id", itemId);

  if (countError || !images || images.length <= 1) {
    redirect(`${path}?error=Produk harus punya minimal satu gambar.`);
  }

  const target = images.find((img) => img.image_url.includes(imageId));

  const { error } = await supabase
    .from("consignment_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  // Remove from storage. Extract path from URL.
  if (target) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = target.image_url.indexOf(marker);
    if (idx !== -1) {
      const storagePath = target.image_url.slice(idx + marker.length);
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }
  }

  // If the deleted image was the thumbnail, promote the first remaining.
  const wasThumbnail = images.find(
    (img) => img.image_url.includes(imageId) && img.image_url === target?.image_url,
  );

  if (wasThumbnail) {
    const { data: remaining } = await supabase
      .from("consignment_images")
      .select("id")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      // Unset all thumbnails first, then set the first.
      await supabase
        .from("consignment_images")
        .update({ is_thumbnail: false })
        .eq("item_id", itemId);

      await supabase
        .from("consignment_images")
        .update({ is_thumbnail: true })
        .eq("id", remaining[0].id);
    }
  }

  redirect(`${path}?saved=1`);
}

/**
 * Sets one image as the product's thumbnail.
 *
 * Roadmap 5.4. Unsets all other thumbnails for the product, then sets the
 * chosen one. pickThumb() in src/lib/shop.ts renders the flagged image on
 * the shop grid.
 */
export async function setThumbnail(formData: FormData): Promise<void> {
  const imageId = formData.get("image_id");
  const itemId = formData.get("item_id");

  if (typeof imageId !== "string" || !UUID.test(imageId)) {
    redirect("/staff/shop?error=Gambar tidak valid.");
  }

  if (typeof itemId !== "string" || !UUID.test(itemId)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const path = `/staff/shop/${itemId}`;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Unset all thumbnails for this product, then set the chosen one.
  await supabase
    .from("consignment_images")
    .update({ is_thumbnail: false })
    .eq("item_id", itemId);

  const { error } = await supabase
    .from("consignment_images")
    .update({ is_thumbnail: true })
    .eq("id", imageId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${path}?saved=1`);
}
