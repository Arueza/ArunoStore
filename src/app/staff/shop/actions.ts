"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_RUPIAH = /^\d+$/;

const BUCKET = "shop-images";
const PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

/**
 * Adds a product to the staff shop catalogue.
 *
 * Roadmap 5.4. Staff fills in name, description, price, stock, condition,
 * category, and at least one image. The image goes to a public bucket so
 * /shop can render it without a signed URL; only staff can write to it.
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
 */

function wholeRupiah(formData: FormData, key: string, label: string, path: string) {
  const raw = formData.get(key);

  if (typeof raw !== "string" || !WHOLE_RUPIAH.test(raw.trim())) {
    redirect(
      `${path}?error=${label} harus angka bulat, tanpa pemisah ribuan atau desimal.`,
    );
  }

  const trimmed = raw.trim();
  const amount = Number(trimmed);

  if (!Number.isSafeInteger(amount)) {
    redirect(`${path}?error=${label} terlalu besar.`);
  }

  return amount;
}

export async function addItem(formData: FormData): Promise<void> {
  const name = formData.get("name");
  const price = wholeRupiah(formData, "price", "Harga", "/staff/shop");
  const stock = wholeRupiah(formData, "stock", "Stok", "/staff/shop");
  const condition = formData.get("condition");
  const showcase = formData.get("showcase");
  const description = formData.get("description");
  const categoryId = formData.get("category_id");
  const categoryNew = formData.get("category_new");
  const files = formData.getAll("images").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (typeof name !== "string" || !name.trim()) {
    redirect("/staff/shop?error=Nama produk wajib diisi.");
  }

  if (stock < 0) {
    redirect("/staff/shop?error=Stok tidak boleh negatif.");
  }

  if (condition !== "baru" && condition !== "bekas") {
    redirect("/staff/shop?error=Kondisi tidak valid.");
  }

  if (
    showcase !== "commission" &&
    showcase !== "titipan" &&
    showcase !== "keduanya"
  ) {
    redirect("/staff/shop?error=Pilihan tampil tidak valid.");
  }

  if (files.length === 0) {
    redirect("/staff/shop?error=Minimal satu gambar wajib diunggah.");
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

  // Upload all files first, then insert. If the insert fails, remove the files.
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const path = `${crypto.randomUUID()}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file);

    if (uploadError) {
      // Clean up files uploaded so far in this loop.
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
      redirect(`/staff/shop?error=Gagal mengunggah gambar: ${uploadError.message}`);
    }

    uploadedPaths.push(path);
  }

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
    redirect(
      `/staff/shop?error=Gagal menyimpan produk: ${insertError?.message ?? "tidak diketahui"}`,
    );
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
    redirect(
      `/staff/shop?error=Gagal menyimpan gambar: ${imageError.message}`,
    );
  }

  redirect("/staff/shop?saved=1");
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
  const price = wholeRupiah(formData, "price", "Harga", path);
  const stock = wholeRupiah(formData, "stock", "Stok", path);
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

  redirect("/staff/shop?saved=1");
}

/**
 * Adds images to an existing product.
 *
 * Roadmap 5.4. Multiple files at once. The first image added does not become
 * the thumbnail if one already exists — setThumbnail handles that.
 */
export async function addImages(formData: FormData): Promise<void> {
  const id = formData.get("id");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff/shop?error=Produk tidak valid.");
  }

  const path = `/staff/shop/${id}`;

  const files = formData.getAll("images").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (files.length === 0) {
    redirect(`${path}?error=Minimal satu gambar wajib dipilih.`);
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

  // Upload all files.
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const filePath = `${crypto.randomUUID()}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
      redirect(`${path}?error=Gagal mengunggah gambar: ${uploadError.message}`);
    }

    uploadedPaths.push(filePath);
  }

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
